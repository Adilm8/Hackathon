"""Step 1-2 of the Story friend pipeline (docs/design/avatar-prompts.md, section 6).

Cuts every 4x2 sheet into cells, removes the magenta key and the grey mannequin, aligns
each cell to the mannequin of the template sheet and writes one transparent PNG per layer
on the shared character canvas (viewBox 240x300, see ids.json "canvas").

Output: web/scripts/avatar/.cache/<level>/<id>.png (canvas space, 1 source px = 1 canvas px)
Re-runnable: replace a sheet (same file name) and run `npm run avatar` again.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SHEETS = ROOT / "docs" / "design" / "avatar" / "sheets"
CACHE = HERE / ".cache"
CFG = json.loads((HERE / "ids.json").read_text())
CANVAS = CFG["canvas"]
K = 1 / CANVAS["unitsPerPx"]  # canvas pixels per view unit
OUT_W, OUT_H = round(CANVAS["width"] * K), round(CANVAS["height"] * K)
MARGIN = 0.3  # look this far into neighbouring cells for parts that stick out


SHEET_SIZE = (2752, 1536)  # size of the template sheet; other sheets are scaled to it


def open_sheet(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    if im.size != SHEET_SIZE:
        print(f"{path.name}: {im.size[0]}x{im.size[1]}, scaled to {SHEET_SIZE[0]}x{SHEET_SIZE[1]} (use full-size downloads for best quality)")
        im = im.resize(SHEET_SIZE, Image.LANCZOS)
    return im


def load(name: str) -> np.ndarray:
    """A sheet plus single-cell fixes: <stem>.cell<N>.png|jpg is a whole sheet from which only
    cell N (1-8) is taken, so a re-generated cell never re-encodes the other seven."""
    im = open_sheet(SHEETS / name)
    stem = Path(name).stem
    cw, ch = SHEET_SIZE[0] // 4, SHEET_SIZE[1] // 2
    for fix in sorted(SHEETS.glob(f"{stem}.cell*.*")):
        n = int(fix.stem.split(".cell")[1]) - 1
        r, c = divmod(n, 4)
        box = (c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)
        im.paste(open_sheet(fix).crop(box), box[:2])
        print(f"{name}: cell {n + 1} from {fix.name}")
    return np.asarray(im).astype(np.int16)


def background(a: np.ndarray) -> np.ndarray:
    """Magenta key: high red and blue, low green."""
    r, g, b = (a[..., i].astype(np.int32) for i in range(3))
    dist = np.sqrt((r - 255) ** 2 + g ** 2 + (b - 255) ** 2)
    # bright magenta only: a dark outline blended with the key stays part of the figure
    keyish = (np.minimum(r, b) - g > 120) & (np.abs(r - b) < 90) & (np.minimum(r, b) > 200)
    return (dist < 110) | keyish


def mannequin(a: np.ndarray) -> np.ndarray:
    """Neutral light grey fill (#C8C8C8) plus its slightly darker grey edge."""
    mx, mn = a.max(-1), a.min(-1)
    return (mx - mn < 22) & (mx > 118) & (mx < 226)


def cells(a: np.ndarray):
    h, w = a.shape[:2]
    ch, cw = h // 2, w // 4
    for i in range(8):
        r, c = divmod(i, 4)
        yield i, (c * cw, r * ch, cw, ch)


def window(a: np.ndarray, box):
    """The cell plus a margin, clipped to the sheet. Returns crop and its origin."""
    x, y, cw, ch = box
    mx, my = int(cw * MARGIN), int(ch * MARGIN)
    x0, y0 = max(0, x - mx), max(0, y - my)
    x1, y1 = min(a.shape[1], x + cw + mx), min(a.shape[0], y + ch + my)
    return a[y0:y1, x0:x1], (x0, y0)


def keep_own(mask: np.ndarray, box, origin) -> np.ndarray:
    """Keep connected parts whose centre lies inside this cell (parts may cross cell lines)."""
    lab, n = ndimage.label(mask)
    if n == 0:
        return mask
    idx = np.arange(1, n + 1)
    cy_cx = ndimage.center_of_mass(mask, lab, idx)
    area = ndimage.sum(mask, lab, idx)
    x, y, cw, ch = box
    ox, oy = origin
    keep = np.zeros(n + 1, bool)
    for j, ((cy, cx), ar) in enumerate(zip(cy_cx, area), start=1):
        gx, gy = cx + ox, cy + oy
        keep[j] = ar >= 60 and x <= gx < x + cw and y <= gy < y + ch
    return keep[lab]


def best_shift(mov: np.ndarray, ref: np.ndarray, reach: int, subset: bool) -> tuple[int, int]:
    """Integer shift (dx, dy) that moves `mov` onto `ref`.

    subset=True: `mov` is a visible part of the same shape (the grey mannequin with items on
    top), so pixels outside `ref` cost and pixels inside score. subset=False: plain overlap.
    """
    s = 4
    m = mov[::s, ::s].astype(np.int32)
    r = ref[::s, ::s].astype(np.int32)
    best, arg = -1e18, (0, 0)
    rr = reach // s
    for dy in range(-rr, rr + 1):
        for dx in range(-rr, rr + 1):
            sh = np.roll(np.roll(m, dy, 0), dx, 1)
            inside = (sh & r).sum()
            score = inside - (sh & (1 - r)).sum() * (2 if subset else 1) - ((1 - sh) & r).sum() * (0 if subset else 1)
            if score > best:
                best, arg = score, (dx * s, dy * s)
    # refine at full resolution around the coarse answer
    m, r = mov.astype(np.int32), ref.astype(np.int32)
    bx, by = arg
    for dy in range(by - s, by + s + 1):
        for dx in range(bx - s, bx + s + 1):
            sh = np.roll(np.roll(m, dy, 0), dx, 1)
            inside = (sh & r).sum()
            score = inside - (sh & (1 - r)).sum() * (2 if subset else 1) - ((1 - sh) & r).sum() * (0 if subset else 1)
            if score > best:
                best, arg = score, (dx, dy)
    return arg


def to_canvas(rgb: np.ndarray, alpha: np.ndarray, origin, shift, anchor) -> Image.Image:
    """Place a window on the canvas. anchor = (centre x, feet y) of the template mannequin."""
    ox, oy = origin
    dx, dy = shift
    ax, ay = anchor
    # sheet px -> canvas px: X = (gx + dx) - ax + centerX*K
    tx = round(ox + dx - ax + CANVAS["centerX"] * K)
    ty = round(oy + dy - ay + CANVAS["feetY"] * K)
    rgba = np.dstack([rgb.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])
    tile = Image.fromarray(rgba, "RGBA")
    out = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 0))
    out.paste(tile, (tx, ty), tile)
    return out


def main(only: set[str] | None = None) -> None:
    tpl = load(CFG["sheets"]["template"]["file"])
    tpl_bg = background(tpl)
    tpl_fig = {}
    anchors = {}
    for i, box in cells(tpl):
        win, origin = window(tpl, box)
        fig = keep_own(~background(win), box, origin)
        tpl_fig[i] = (fig, origin)
        ys, xs = np.nonzero(fig)
        anchors[i] = ((xs.min() + xs.max()) / 2 + origin[0], ys.max() + origin[1])
    del tpl_bg

    for key, sheet in CFG["sheets"].items():
        level = sheet.get("level", key)
        if sheet.get("optional") and not (SHEETS / sheet["file"]).exists():
            print(f"{key}: {sheet['file']} not found, skipped")
            continue
        if level in ("template", "backdrop") or (only and level not in only):
            continue
        a = load(sheet["file"])
        (CACHE / level).mkdir(parents=True, exist_ok=True)
        report = []
        for i, box in cells(a):
            win, origin = window(a, box)
            fig = keep_own(~background(win), box, origin)
            ref, ref_origin = tpl_fig[i]
            assert origin == ref_origin, "sheets must share one size"
            if sheet["align"] == "mannequin":
                grey = mannequin(win) & fig
                shift = best_shift(grey, ref, 40, subset=True)
                art = fig & ~grey
            else:
                shift = best_shift(fig, ref, 60, subset=False)
                art = fig
            # shave the 1 px magenta-tinted rim around every part
            art = ndimage.binary_erosion(art, iterations=1)
            art = ndimage.binary_opening(art, iterations=1)
            # drop leftover specks of the mannequin edge
            lab, n = ndimage.label(art)
            if n:
                area = ndimage.sum(art, lab, np.arange(1, n + 1))
                art = np.isin(lab, np.nonzero(area >= 50)[0] + 1)
            img = to_canvas(win, art.astype(float), origin, shift, anchors[i])
            name = sheet["ids"][i]
            img.save(CACHE / level / f"{name}.png")
            report.append(f"{name}:{shift}")
        print(level, " ".join(report))


if __name__ == "__main__":
    main(set(sys.argv[1:]) or None)
