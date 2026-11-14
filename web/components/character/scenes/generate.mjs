// Generates public/scenes/*.svg (day and night variants). Run: node components/character/scenes/generate.mjs
// Original flat illustrations, no outside artwork. Each file stays far below the 150 KB limit (SPEC 11.4).
// Layout rule: the upper two thirds hold the room, the lower third is a calm floor where the character stands.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../public/scenes');

let night = false;
const NIGHT_BASE = '#17162e';
function mixHex(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const pa = p(a);
  const pb = p(b);
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
/** Colour in the current theme: night pulls every colour towards deep indigo and keeps lights warm. */
const c = (hex, keep = false) => (night && !keep ? mixHex(hex, NIGHT_BASE, 0.8) : hex);

const rect = (x, y, w, h, f, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c(f)}" ${extra}/>`;
const circ = (x, y, r, f, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c(f)}" ${extra}/>`;
const ell = (x, y, rx, ry, f, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c(f)}" ${extra}/>`;
const path_ = (d, f, extra = '') => `<path d="${d}" fill="${c(f)}" ${extra}/>`;
const line = (x1, y1, x2, y2, s, w = 4) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c(s)}" stroke-width="${w}" stroke-linecap="round"/>`;
const glow = (x, y, r) => (night ? `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#glow)"/>` : '');

// walls and floor shared by the indoor scenes
const room = (wall, floor, baseboard) =>
  rect(0, 0, 800, 600, wall) + rect(0, 430, 800, 170, floor) + rect(0, 424, 800, 10, baseboard);

const window_ = (x, y, w, h, sky = '#bfe3ff') =>
  rect(x - 8, y - 8, w + 16, h + 16, '#ffffff', 14) +
  rect(x, y, w, h, sky, 8) +
  (night ? circ(x + w - 36, y + 38, 18, '#fff3c4', '') + circ(x + 30, y + 30, 3, '#ffffff') + circ(x + 70, y + 70, 2.5, '#ffffff') : circ(x + w - 36, y + 38, 20, '#ffe08a')) +
  line(x + w / 2, y, x + w / 2, y + h, '#ffffff', 6) +
  line(x, y + h / 2, x + w, y + h / 2, '#ffffff', 6);

const scenes = {
  dentist() {
    return (
      room('#d9f1f0', '#eaf6f4', '#b9dedb') +
      window_(70, 90, 170, 130, '#cfeeff') +
      // poster: friendly tooth
      rect(560, 80, 130, 160, '#ffffff', 14) +
      path_('M625 112 C600 104 588 128 596 152 C600 176 606 196 612 206 C616 214 622 214 625 202 C628 214 634 214 638 206 C644 196 650 176 654 152 C662 128 650 104 625 112 Z', '#fffdf5', `stroke="${c('#9fc9c6')}" stroke-width="4"`) +
      circ(612, 142, 4, '#2b2a3a') + circ(638, 142, 4, '#2b2a3a') +
      path_('M614 158 Q625 170 636 158', 'none', `stroke="${c('#2b2a3a')}" stroke-width="4" stroke-linecap="round"`) +
      // overhead lamp
      line(400, 0, 400, 70, '#8aa7b8', 8) +
      line(400, 70, 330, 120, '#8aa7b8', 8) +
      ell(318, 134, 52, 20, '#f3f6f8') + glow(318, 150, 90) +
      // dentist chair
      rect(300, 330, 190, 40, '#5b6cff', 20) +
      path_('M470 330 Q520 320 540 270 L560 280 Q548 350 490 372 Z', '#4453e0') +
      rect(380, 366, 28, 66, '#8aa7b8') +
      ell(394, 436, 70, 12, '#8aa7b8') +
      rect(278, 300, 40, 90, '#4453e0', 18) +
      // tray with tools
      rect(590, 330, 130, 12, '#8aa7b8', 6) +
      rect(650, 342, 12, 90, '#8aa7b8') +
      rect(608, 306, 24, 24, '#ffffff', 5) + rect(640, 312, 18, 18, '#ffb547', 5) + rect(668, 300, 30, 30, '#ffffff', 6) +
      // stool
      ell(180, 400, 44, 14, '#ffb547') + rect(176, 400, 8, 34, '#8aa7b8') + ell(180, 438, 36, 8, '#8aa7b8')
    );
  },
  school() {
    return (
      room('#fff0cf', '#f3d6a0', '#d9b676') +
      // chalkboard
      rect(150, 70, 360, 210, '#c99d62', 16) +
      rect(164, 84, 332, 182, '#2f6b57', 10) +
      `<text x="190" y="150" font-family="Nunito, sans-serif" font-weight="800" font-size="52" fill="${c('#fbfbf3')}">A B C</text>` +
      `<text x="190" y="215" font-family="Nunito, sans-serif" font-weight="800" font-size="46" fill="${c('#ffe08a')}">1 2 3</text>` +
      circ(440, 150, 26, '#ffd36b') +
      line(180, 250, 480, 250, '#fbfbf3', 4) +
      // clock
      circ(620, 120, 46, '#ffffff') + circ(620, 120, 40, '#fff9f0') +
      line(620, 120, 620, 90, '#2b2a3a', 5) + line(620, 120, 644, 130, '#2b2a3a', 5) +
      // cubbies with backpacks
      rect(560, 230, 190, 200, '#c99d62', 12) +
      rect(572, 244, 78, 84, '#fff0cf', 8) + rect(660, 244, 78, 84, '#fff0cf', 8) +
      rect(572, 338, 78, 84, '#fff0cf', 8) + rect(660, 338, 78, 84, '#fff0cf', 8) +
      rect(586, 258, 50, 60, '#e5565b', 14) + rect(674, 352, 50, 66, '#3dbe8b', 14) + rect(586, 350, 50, 68, '#5b6cff', 14) +
      // small table and chairs
      rect(60, 340, 170, 18, '#e9a95c', 8) + rect(80, 358, 12, 74, '#c98a3e') + rect(198, 358, 12, 74, '#c98a3e') +
      rect(260, 380, 64, 14, '#5b6cff', 6) + rect(262, 394, 8, 40, '#4453e0') + rect(314, 394, 8, 40, '#4453e0') +
      // sun on the floor
      ell(400, 520, 230, 28, '#ffffff', 'opacity="0.35"')
    );
  },
  flight() {
    const sky = night ? '#1f2150' : '#a9d9ff';
    return (
      rect(0, 0, 800, 600, '#e8eefc') +
      rect(0, 430, 800, 170, '#cfd8f0') + rect(0, 424, 800, 10, '#aebbe0') +
      // big airport window
      rect(60, 60, 520, 300, '#ffffff', 22) +
      rect(76, 76, 488, 268, sky, 14) +
      (night ? circ(500, 130, 24, '#fff3c4', '') : circ(500, 130, 30, '#ffe08a')) +
      ell(190, 130, 60, 22, night ? '#3b3f7a' : '#ffffff', 'opacity="0.9"') + ell(240, 140, 40, 16, night ? '#3b3f7a' : '#ffffff', 'opacity="0.9"') +
      rect(76, 280, 488, 64, '#9aa6c6', 0) + rect(76, 292, 488, 6, '#ffffff', 0, 'opacity="0.5"') +
      // plane on the runway
      ell(330, 262, 130, 30, '#ffffff') + path_('M200 262 Q170 232 150 226 L150 262 Z', '#ffffff') +
      path_('M330 262 L290 214 L316 214 L372 262 Z', '#dfe6f8') +
      rect(240, 250, 150, 8, '#5b6cff', 4) +
      [250, 276, 302, 328, 354].map((x) => ell(x, 258, 5, 6, '#7c8cff')).join('') +
      // seats
      rect(600, 250, 80, 110, '#5b6cff', 18) + rect(590, 300, 100, 120, '#4453e0', 20) + rect(680, 320, 80, 100, '#5b6cff', 18) +
      // suitcase and boarding sign
      rect(640, 380, 100, 62, '#ffb547', 12) + rect(678, 368, 24, 16, '#c98a3e', 6) + rect(652, 392, 76, 6, '#ffffff', 3, 'opacity="0.6"') +
      rect(90, 400, 56, 36, '#3dbe8b', 8) + rect(106, 390, 24, 14, '#2b8a64', 5)
    );
  },
  sibling() {
    return (
      room('#ffe9ee', '#f6d7c4', '#e8bba2') +
      window_(70, 80, 160, 140, '#d9ecff') +
      // balloons and garland
      [[470, 110, '#ffb547'], [520, 90, '#5b6cff'], [570, 112, '#3dbe8b']].map(([x, y, f]) => ell(x, y, 26, 32, f) + line(x, y + 32, 520, 200, '#8a7a82', 2)).join('') +
      // crib
      rect(430, 250, 280, 170, '#ffffff', 12) +
      rect(448, 268, 244, 12, '#e8d0c0', 6) +
      [460, 500, 540, 580, 620, 660].map((x) => rect(x, 270, 10, 130, '#e8d0c0', 4)).join('') +
      rect(430, 392, 280, 16, '#e8d0c0', 6) +
      rect(446, 340, 248, 56, '#ffc2d1', 14) +
      // mobile
      line(570, 0, 570, 180, '#c9a99a', 4) + line(520, 180, 620, 180, '#c9a99a', 4) +
      circ(520, 200, 12, '#ffb547') + circ(570, 206, 12, '#3dbe8b') + circ(620, 200, 12, '#5b6cff') +
      // toy blocks and rocking horse shape
      rect(110, 360, 60, 60, '#ffb547', 8) + rect(150, 330, 56, 56, '#5b6cff', 8) + rect(180, 380, 50, 50, '#3dbe8b', 8) +
      `<text x="125" y="404" font-family="Nunito, sans-serif" font-weight="800" font-size="36" fill="${c('#ffffff')}">A</text>`
    );
  },
  haircut() {
    return (
      room('#e7f1ff', '#dfe6f4', '#bccae6') +
      // mirror with frame and bulbs
      rect(210, 50, 380, 280, '#c99d62', 190) +
      rect(226, 66, 348, 248, '#eaf6ff', 178) +
      path_('M270 120 L330 80 L360 80 L270 170 Z', '#ffffff', 'opacity="0.7"') +
      // chair (booster seat)
      rect(330, 330, 150, 50, '#e5565b', 24) + rect(350, 250, 110, 110, '#e5565b', 30) +
      rect(388, 380, 34, 56, '#8a8fa8') + ell(405, 440, 60, 12, '#8a8fa8') +
      // cape on a hook
      line(120, 120, 120, 160, '#8a8fa8', 8) +
      path_('M80 160 L160 160 L180 330 Q120 350 60 330 Z', '#5b6cff') +
      // shelf with combs and scissors
      rect(620, 160, 150, 12, '#c99d62', 6) +
      rect(640, 126, 14, 34, '#ffb547', 5) + rect(666, 114, 14, 46, '#3dbe8b', 5) + rect(700, 130, 40, 30, '#ffffff', 8) +
      // plant
      rect(654, 360, 70, 70, '#c98a3e', 10) + ell(690, 350, 40, 30, '#3dbe8b') + ell(670, 332, 20, 26, '#2b8a64') + ell(712, 330, 18, 26, '#2b8a64')
    );
  },
  shot() {
    return (
      room('#e6f4ee', '#dcebe4', '#b6d2c6') +
      window_(70, 100, 150, 120, '#d5efff') +
      // exam table with paper roll
      rect(320, 330, 280, 44, '#ffffff', 20) + rect(330, 374, 260, 14, '#3dbe8b', 7) +
      rect(350, 388, 14, 46, '#8aa7b8') + rect(556, 388, 14, 46, '#8aa7b8') +
      rect(300, 318, 40, 70, '#f3f6f8', 18) +
      // rainbow poster
      rect(520, 60, 180, 140, '#ffffff', 16) +
      ['#e5565b', '#ffb547', '#3dbe8b', '#5b6cff'].map((f, i) => `<path d="M${540 + i * 10} 170 a${50 - i * 10} ${50 - i * 10} 0 0 1 ${(50 - i * 10) * 2} 0" fill="none" stroke="${c(f)}" stroke-width="9"/>`).join('') +
      ell(560, 176, 20, 9, '#ffffff', `stroke="${c('#dfe6f4')}" stroke-width="3"`) + ell(660, 176, 20, 9, '#ffffff', `stroke="${c('#dfe6f4')}" stroke-width="3"`) +
      // cabinet with jar of stickers
      rect(80, 280, 180, 150, '#ffffff', 12) + line(170, 280, 170, 430, '#dfe6f4', 3) + circ(160, 356, 5, '#8aa7b8') + circ(180, 356, 5, '#8aa7b8') +
      rect(110, 240, 70, 44, '#fff9f0', 10, `stroke="${c('#c98a3e')}" stroke-width="3"`) + circ(130, 266, 7, '#ffb547') + circ(148, 262, 7, '#e5565b') + circ(160, 272, 6, '#5b6cff') +
      // stool
      ell(670, 400, 40, 12, '#ffb547') + rect(666, 400, 8, 32, '#8aa7b8') + ell(670, 436, 32, 7, '#8aa7b8')
    );
  },
  'home-evening'() {
    return (
      room('#ffe6cc', '#e9c9a4', '#d3a97a') +
      // window with the evening sky
      rect(300, 60, 260, 190, '#ffffff', 18) +
      rect(314, 74, 232, 162, night ? '#262a5c' : '#ffb98a', 10) +
      (night ? '' : rect(314, 160, 232, 76, '#ff9d73', 10)) +
      circ(500, 130, 22, night ? '#fff3c4' : '#ffe9a8') + circ(350, 110, 3, '#ffffff', 'opacity="0.9"') + circ(420, 100, 2.5, '#ffffff', 'opacity="0.9"') +
      line(430, 74, 430, 236, '#ffffff', 6) +
      // sofa
      rect(70, 290, 280, 130, '#5b6cff', 40) + rect(70, 350, 280, 80, '#4453e0', 30) + rect(54, 336, 40, 90, '#4453e0', 20) + rect(326, 336, 40, 90, '#4453e0', 20) +
      rect(120, 300, 70, 56, '#ffb547', 16) +
      // bookshelf
      rect(620, 140, 140, 290, '#c98a3e', 10) +
      [180, 262, 344].map((y) => rect(632, y, 116, 8, '#a96f2b', 3)).join('') +
      [[640, 140, '#e5565b'], [662, 150, '#3dbe8b'], [684, 138, '#5b6cff'], [706, 146, '#ffb547']].map(([x, y, f]) => rect(x, y + 4, 18, 36, f, 3)).join('') +
      [[640, 222, '#ffb547'], [668, 214, '#5b6cff'], [696, 224, '#e5565b']].map(([x, y, f]) => rect(x, y, 22, 36, f, 3)).join('') +
      // lamp with glow
      rect(440, 270, 10, 160, '#8a7a82') + path_('M410 270 L480 270 L462 220 L428 220 Z', '#ffe9a8', night ? '' : '') +
      glow(445, 250, 130) +
      // rug
      ell(400, 540, 260, 36, '#ffffff', 'opacity="0.35"')
    );
  },
  outside() {
    return (
      rect(0, 0, 800, 600, night ? '#17162e' : '#cdeaff') +
      (night ? '' : ell(130, 110, 70, 26, '#ffffff') + ell(190, 120, 46, 20, '#ffffff') + ell(650, 90, 64, 24, '#ffffff')) +
      circ(690, 120, 36, night ? '#fff3c4' : '#ffe08a') +
      // building
      rect(200, 130, 400, 300, '#f4d7b8', 14) +
      rect(200, 130, 400, 30, '#e5565b', 14) +
      [[240, 190], [440, 190]].map(([x, y]) => rect(x, y, 120, 90, '#ffffff', 10) + rect(x + 8, y + 8, 104, 74, night ? '#262a5c' : '#bfe3ff', 6) + line(x + 60, y + 8, x + 60, y + 82, '#ffffff', 5)).join('') +
      // door
      rect(350, 270, 100, 160, '#5b6cff', 14) + circ(432, 354, 6, '#ffe08a') + rect(366, 290, 68, 40, '#bfe3ff', 8) +
      rect(330, 428, 140, 14, '#e8e2d6', 4) +
      // tree
      rect(90, 280, 22, 150, '#a96f2b') + ell(101, 240, 70, 80, '#3dbe8b') + ell(70, 270, 36, 40, '#2b8a64') +
      // ground
      rect(0, 440, 800, 160, '#d9e8c0') + rect(0, 470, 800, 130, '#e8e2d6') +
      line(0, 470, 800, 470, '#cfc7b6', 6)
    );
  },
  'cosy-room'() {
    return (
      room('#efe8ff', '#e2d4c0', '#c9b79a') +
      window_(540, 80, 170, 150, '#d9ecff') +
      // bed with blanket
      rect(60, 290, 300, 140, '#ffffff', 26) + rect(60, 340, 300, 90, '#5b6cff', 22) +
      path_('M60 340 Q120 320 180 340 Q240 360 300 336 L360 340 L360 360 L60 360 Z', '#7c8cff') +
      rect(80, 280, 110, 50, '#ffe9a8', 22) + rect(52, 240, 18, 190, '#c98a3e', 8) +
      // night lamp on the wall
      ell(400, 170, 24, 24, '#ffe9a8') + glow(400, 170, 120) + rect(392, 190, 16, 22, '#c98a3e', 4) +
      // star garland
      path_('M400 40 L406 56 L424 56 L410 66 L416 82 L400 72 L384 82 L390 66 L376 56 L394 56 Z', '#ffb547') +
      // shelf with books
      rect(420, 270, 150, 10, '#c98a3e', 5) + rect(436, 226, 16, 44, '#e5565b', 3) + rect(456, 218, 16, 52, '#3dbe8b', 3) + rect(476, 230, 16, 40, '#5b6cff', 3) + circ(530, 246, 22, '#ffb547') +
      // round rug
      ell(520, 520, 190, 34, '#ffffff', 'opacity="0.4"') + ell(520, 520, 130, 22, '#ffb547', 'opacity="0.25"') +
      // toy
      circ(620, 410, 22, '#3dbe8b') + circ(620, 380, 14, '#3dbe8b')
    );
  },
};

const DESC = {
  dentist: 'A friendly dentist room with a big blue chair and a lamp',
  school: 'A bright classroom with a chalkboard, cubbies and little tables',
  flight: 'An airport window with a plane waiting outside and cosy seats',
  sibling: 'A soft nursery with a crib, a mobile and building blocks',
  haircut: 'A hair salon with a big mirror and a small red chair',
  shot: 'A calm clinic room with an exam table and a rainbow poster',
  'home-evening': 'A living room in the evening with a sofa and a warm lamp',
  outside: 'A friendly building with a blue door and a tree in front',
  'cosy-room': 'A cosy bedroom with a bed, a night lamp and a shelf of books',
};

fs.mkdirSync(outDir, { recursive: true });
for (const id of Object.keys(scenes)) {
  for (const n of [false, true]) {
    night = n;
    const body = scenes[id]();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${DESC[id]}${n ? ' at night' : ''}">${n ? '<defs><radialGradient id="glow"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs>' : ''}${body}</svg>\n`;
    fs.writeFileSync(path.join(outDir, `${id}${n ? '-night' : ''}.svg`), svg);
  }
}
console.log('scenes written:', Object.keys(scenes).length * 2);
