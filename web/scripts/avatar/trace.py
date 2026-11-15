"""Steps 3-5 of the Story friend pipeline (docs/design/avatar-prompts.md, section 6).

For every layer PNG from slice.py: reduce to a few flat colours, trace to SVG with vtracer
(MIT), give each fill a colour role and write the final layer files:

  web/public/avatar/<level>/<id>.svg                 one file per item (species: classic fur)
  web/public/avatar/<level>/<id>--<colour>.svg       recoloured outfits, headwear, accessories
  web/public/avatar/species/<id>--<fur>.svg          the two magic fur variants per species
  web/public/avatar/backdrop/<id>.webp               backdrop cards (not traced)

and web/scripts/avatar/.cache/manifest.json for build.mjs.
"""
from __future__ import annotations

import colorsys
import json
import re
import sys
import tempfile
from pathlib import Path

import numpy as np
import vtracer
from PIL import Image
from scipy import ndimage
from scipy.cluster.vq import kmeans2

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CACHE = HERE / ".cache"
PUBLIC = HERE.parent.parent / "public" / "avatar"
CFG = json.loads((HERE / "ids.json").read_text())
COLORS = json.loads((HERE / "colors.json").read_text())
CANVAS = CFG["canvas"]
K = 1 / CANVAS["unitsPerPx"]
VIEW_W, VIEW_H = CANVAS["width"] * K, CANVAS["height"] * K
INK = (0x2B, 0x2A, 0x3A)


def hex_(c) -> str:
    return "#%02x%02x%02x" % tuple(int(round(v)) for v in c)


def rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def flatten(img: Image.Image, k: int, seed: int = 7) -> tuple[np.ndarray, np.ndarray, list]:
    """Flat colours: k-means on inner pixels, merge near-duplicates, snap every pixel."""
    a = np.asarray(img)
    alpha = a[..., 3] > 0
    px = a[..., :3].astype(np.float64)
    inner = ndimage.binary_erosion(alpha, iterations=2)
    # skip antialiased edges between colours: low local contrast only
    grad = sum(np.abs(ndimage.sobel(px[..., i], axis=ax)) for i in range(3) for ax in (0, 1))
    sample = px[inner & (grad < 60)]
    if len(sample) < k * 20:
        sample = px[alpha]
    rng = np.random.default_rng(seed)
    if len(sample) > 60000:
        sample = sample[rng.choice(len(sample), 60000, replace=False)]
    cents, lab = kmeans2(sample, k, minit="++", seed=seed, iter=30)
    counts = np.bincount(lab, minlength=k)
    cents = cents[counts > max(30, len(sample) * 0.002)]
    # merge centres that are visually the same colour
    merged: list[np.ndarray] = []
    for c in sorted(cents, key=lambda c: c.sum()):
        if merged and min(np.linalg.norm(c - m) for m in merged) < 22:
            continue
        merged.append(c)
    # the outline is always the style-lock ink
    pal = np.array(merged)
    d_ink = np.linalg.norm(pal - INK, axis=1)
    if d_ink.min() < 70:
        pal[d_ink.argmin()] = INK
    # the outer outline picks up magenta spill from the key; dark pixels near the edge are ink
    ring = alpha & ~ndimage.binary_erosion(alpha, iterations=6)
    lum = px.max(-1) / 255
    px[ring & (lum < 0.5)] = INK
    flat = px[alpha]
    idx = np.argmin(((flat[:, None, :] - pal[None]) ** 2).sum(-1), axis=1)
    out = np.zeros(alpha.shape, np.int16) - 1
    out[alpha] = idx
    # antialiased pixels between two colours (e.g. fur next to the outline) take the colour
    # of the flat area next to them instead of a third colour that happens to be nearest
    edge = alpha & (grad >= 90)
    core = alpha & ~edge
    votes = np.stack([ndimage.uniform_filter(((out == j) & core).astype(float), 7) for j in range(len(pal))])
    has = votes.max(0) > 0
    out = np.where(edge & has, votes.argmax(0), out)
    # majority filter removes single-pixel specks left by JPEG noise
    for _ in range(2):
        votes = np.stack([ndimage.uniform_filter((out == j).astype(float), 3) for j in range(len(pal))])
        best = votes.argmax(0)
        out = np.where(alpha, best, -1)
    return out, alpha, [tuple(int(round(v)) for v in c) for c in pal]


TRACE_SCALE = 1.0  # trace at canvas pixels (half size leaves wedges where stacked shapes meet)


def trace(index: np.ndarray, alpha: np.ndarray, pal: list) -> list[tuple[str, str]]:
    """vtracer on the flat image; returns (fill, d) pairs in canvas pixels."""
    h, w = index.shape
    rgba = np.zeros((h, w, 4), np.uint8)
    for j, c in enumerate(pal):
        rgba[index == j, :3] = c
    rgba[..., 3] = alpha * 255
    small = Image.fromarray(rgba, "RGBA").resize((round(w * TRACE_SCALE), round(h * TRACE_SCALE)), Image.BOX)
    sa = np.asarray(small).copy()
    # back to flat colours after the box filter: nearest palette colour, hard alpha
    pal_arr0 = np.array(pal, float)
    flat = sa[..., :3].reshape(-1, 3).astype(float)
    near = np.argmin(((flat[:, None, :] - pal_arr0[None]) ** 2).sum(-1), axis=1)
    sa[..., :3] = pal_arr0[near].reshape(sa.shape[0], sa.shape[1], 3).astype(np.uint8)
    sa[..., 3] = np.where(sa[..., 3] >= 128, 255, 0)
    with tempfile.TemporaryDirectory() as td:
        src, dst = Path(td) / "in.png", Path(td) / "out.svg"
        Image.fromarray(sa, "RGBA").save(src)
        vtracer.convert_image_to_svg_py(
            str(src), str(dst), colormode="color", hierarchical="stacked", mode="spline",
            filter_speckle=4, color_precision=8, layer_difference=1, corner_threshold=60,
            length_threshold=4.0, splice_threshold=45, path_precision=1,
        )
        svg = dst.read_text()
    paths = []
    pal_arr = np.array(pal, float)
    for m in re.finditer(r'<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"/>', svg):
        d, fill, tx, ty = m.group(1), m.group(2), float(m.group(3)), float(m.group(4))
        c = np.array(rgb(fill), float)
        snapped = pal[int(np.argmin(((pal_arr - c) ** 2).sum(1)))]
        paths.append((hex_(snapped), shift_path(d, tx, ty, 1 / TRACE_SCALE)))
    return paths


NUM = re.compile(r"-?\d+(?:\.\d+)?")


def shift_path(d: str, tx: float, ty: float, scale: float = 1.0) -> str:
    """Bake vtracer's translate into absolute coordinates (vtracer only writes M, L, C, Z)."""
    out, i = [], 0
    for tok in re.findall(r"[MLCZ]|-?\d+(?:\.\d+)?", d):
        if tok in "MLCZ":
            out.append(tok)
            i = 0
            continue
        v = (float(tok) + (tx if i % 2 == 0 else ty)) * scale
        i += 1
        out.append(str(int(round(v))))
    s = " ".join(out)
    return re.sub(r" ?([MLCZ]) ?", r"\1", s)


def svg_doc(paths: list[tuple[str, str]], fills: dict[str, str] | None = None) -> str:
    fills = fills or {}
    body = "".join(f'<path fill="{fills.get(f, f)}" d="{d}"/>' for f, d in paths)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W:.2f} {VIEW_H:.2f}">{body}</svg>'
    )


# ---------- colour roles ----------

def hls(c):
    return colorsys.rgb_to_hls(*(v / 255 for v in c))


def from_hls(h, l, s):
    return tuple(round(v * 255) for v in colorsys.hls_to_rgb(h % 1, min(max(l, 0), 1), min(max(s, 0), 1)))


def indigo_roles(pal: list) -> dict[str, str]:
    """Fills in the indigo key family -> role light/main/dark (by lightness)."""
    roles = {}
    refs = {k: hls(rgb(v)) for k, v in COLORS["key"].items()}
    for c in pal:
        h, l, s = hls(c)
        if s < 0.25 or not (0.58 < h < 0.75) or l < 0.2:
            continue
        roles[hex_(c)] = min(refs, key=lambda k: abs(refs[k][1] - l))
    return roles


def recolor_indigo(pal: list, roles: dict[str, str], swatch: dict[str, str]) -> dict[str, str]:
    """Move every indigo fill onto the chosen colour, keeping its lightness offset to its role."""
    refs = {k: hls(rgb(v)) for k, v in COLORS["key"].items()}
    out = {}
    for c in pal:
        key = hex_(c)
        if key not in roles:
            continue
        role = roles[key]
        h, l, s = hls(c)
        th, tl, ts = hls(rgb(swatch[role]))
        out[key] = hex_(from_hls(th, tl + (l - refs[role][1]), ts))
    return out


def fur_family(pal: list, index: np.ndarray) -> tuple[tuple, list]:
    """Main fur = the most used colour that is not ink; its family = close in hue and chroma."""
    counts = np.bincount(index[index >= 0], minlength=len(pal))
    order = [j for j in np.argsort(-counts) if pal[j] != INK]
    fur = pal[order[0]]
    fh, fl, fs = hls(fur)
    fam = []
    for c in pal:
        if c == INK:
            continue
        h, l, s = hls(c)
        dh = min(abs(h - fh), 1 - abs(h - fh))
        if (dh < 0.06 and abs(s - fs) < 0.35 and abs(l - fl) < 0.3) or c == fur:
            fam.append(c)
    return fur, fam


def recolor_fur(fur: tuple, fam: list, target: str) -> dict[str, str]:
    fh, fl, fs = hls(fur)
    th, tl, ts = hls(rgb(target))
    out = {}
    for c in fam:
        h, l, s = hls(c)
        out[hex_(c)] = hex_(from_hls(th + (h - fh), tl + (l - fl), ts + (s - fs) * 0.5))
    return out


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def main(only: set[str] | None = None) -> None:
    manifest_path = CACHE / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    swatches = COLORS["clothes"]
    for level, sheet in CFG["sheets"].items():
        if level == "template" or (only and level not in only):
            continue
        if level == "backdrop":
            backdrops(sheet)
            continue
        entry = manifest.setdefault(level, {})
        for name in sheet["ids"]:
            img = Image.open(CACHE / level / f"{name}.png")
            k = 14 if level in ("species", "companion") else 10
            index, alpha, pal = flatten(img, k)
            paths = trace(index, alpha, pal)
            ys, xs = np.nonzero(alpha)
            bbox = [round(v / K, 1) for v in (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)]
            item = {"bbox": bbox, "files": {}}
            base = PUBLIC / level / f"{name}.svg"
            write(base, svg_doc(paths))
            item["files"]["default"] = f"/avatar/{level}/{name}.svg"
            if sheet.get("recolor") and name not in sheet.get("keepColors", []):
                roles = indigo_roles(pal)
                item["recolor"] = True
                for cname, sw in swatches.items():
                    fills = recolor_indigo(pal, roles, sw)
                    write(PUBLIC / level / f"{name}--{cname}.svg", svg_doc(paths, fills))
                    item["files"][cname] = f"/avatar/{level}/{name}--{cname}.svg"
            if level == "species":
                fur, fam = fur_family(pal, index)
                item["fur"] = {"classic": hex_(fur)}
                for vname, target in COLORS["fur"][name].items():
                    fills = recolor_fur(fur, fam, target)
                    write(PUBLIC / level / f"{name}--{vname}.svg", svg_doc(paths, fills))
                    item["files"][vname] = f"/avatar/{level}/{name}--{vname}.svg"
                    item["fur"][vname] = target
            entry[name] = item
            size = base.stat().st_size
            print(f"{level}/{name}: {len(pal)} colours, {len(paths)} paths, {size // 1024} KB")
    manifest_path.write_text(json.dumps(manifest, indent=1))


def backdrops(sheet) -> None:
    from slice import SHEETS, background, cells, load

    a = load(sheet["file"])
    (PUBLIC / "backdrop").mkdir(parents=True, exist_ok=True)
    for i, (x, y, cw, ch) in cells(a):
        cell = a[y : y + ch, x : x + cw]
        card = ~background(cell)
        card = ndimage.binary_opening(card, iterations=3)
        ys, xs = np.nonzero(card)
        # inset past the rounded corners and the outline so no magenta survives
        inset = int(0.045 * (xs.max() - xs.min()))
        crop = cell[ys.min() + inset : ys.max() - inset, xs.min() + inset : xs.max() - inset]
        im = Image.fromarray(crop.clip(0, 255).astype(np.uint8)).resize((480, 600), Image.LANCZOS)
        im.save(PUBLIC / "backdrop" / f"{sheet['ids'][i]}.webp", "WEBP", quality=78, method=6)
    print("backdrop: 8 cards")


if __name__ == "__main__":
    sys.path.insert(0, str(HERE))
    main(set(sys.argv[1:]) or None)
