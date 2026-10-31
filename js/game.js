'use strict';
// みんなの モントモ — 導入ムービー〜チュートリアル〜うらいちば の試作

// ===== きほん =====
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
}
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();

// iPad の Safari 対策：ダブルタップの ズーム・ページの スクロール・ピンチを とめる
// （とめないと、がめんの したを 2かい タップした ときに ページが うえに ずれて したが まっくろに なる）
const isFormEl = el => el && el.closest && el.closest('.ui-html'); // なまえの はこ・おしらせ・こうしん りれき は ふつうに さわれる
for (const ev of ['touchstart', 'touchmove', 'touchend']) {
  document.addEventListener(ev, e => { if (!isFormEl(e.target) && e.cancelable) e.preventDefault(); }, { passive: false });
}
for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
// それでも ずれて しまったら すぐ もどす
const unscroll = () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); };
window.addEventListener('scroll', unscroll);
if (window.visualViewport) window.visualViewport.addEventListener('scroll', unscroll);

const FONT = '"M PLUS Rounded 1c","Hiragino Maru Gothic ProN","Meiryo",sans-serif';
const font = (px, w = 800) => `${w} ${Math.round(px)}px ${FONT}`;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const hash = (i, j) => (((i * 73856093) ^ (j * 19349663)) >>> 0) % 1000;

// ゲームの ばんごう（あげる ときは node tools/bump.mjs 0.9 で sw.js・version.json・index.html も いっしょに）
const GAME_VERSION = '0.8';

const G = {
  name: 'ソラ', firstBattle: true, gear: false, bonus: { hp: 0, atk: 0, def: 0 }, quest: null,
  items: { iron: 0, vine: 0, gem: 0 }, lv: { weapon: 1, armor: 1 }, cleared: {},
  nets: { s: 1, m: 0, l: 0 }, coins: 0,
  box: [{ uid: 1, kind: 'pomuru' }], team: [1], uid: 1, // box：もっている モンスター、team：つれていく なかま（3にんまで）
};
const GEAR_BONUS = { hp: 5, atk: 1, def: 1 }; // かけだしの そうびで なかま みんなに つく
const sub = s => s.replace(/\{N\}/g, G.name);

// ===== えを かく どうぐ =====
function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function ell(x, y, rx, ry, fill, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function rr(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function tri(x1, y1, x2, y2, x3, y3, fill) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
function text(s, x, y, px, col = '#fff', align = 'center', outline = null) {
  ctx.font = font(px); ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (outline) { ctx.lineWidth = px * 0.25; ctx.lineJoin = 'round'; ctx.strokeStyle = outline; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
// はばに おさまるように もじを ちいさくする
function fitPx(s, px, maxW) { ctx.font = font(px); const w = ctx.measureText(s).width; return w > maxW ? px * maxW / w : px; }
function star(x, y, r, col) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}
function sky(w, h, top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
function clouds(w, h, t, speed = 18) {
  for (let k = 0; k < 4; k++) {
    const x = ((k * w * 0.31 + t * speed) % (w + 200)) - 100, y = h * (0.1 + 0.07 * (k % 3));
    ell(x, y, h * 0.08, h * 0.03, 'rgba(255,255,255,.9)'); ell(x + h * 0.05, y - h * 0.02, h * 0.05, h * 0.03, 'rgba(255,255,255,.9)');
  }
}
function smoke(x, y, s, t, col = '120,120,130') {
  for (let k = 0; k < 6; k++) {
    const p = (t * 0.45 + k / 6) % 1;
    circle(x + Math.sin(p * 6 + k) * s * 0.3, y - p * s * 4, s * (0.4 + p * 0.9), `rgba(${col},${0.55 * (1 - p)})`);
  }
}

// ----- キャラクター（すべて オリジナル） -----
// ポムル：さいしょの なかま。みどりの まるい モンスター
function drawPomuru(x, y, s, t, flip = false, col = '#8fdc7a', dark = '#4f9e45') {
  const b = Math.abs(Math.sin(t * 5)) * s * 0.12;
  ell(x, y, s * 0.8, s * 0.2, 'rgba(0,0,0,.18)');
  ctx.save(); ctx.translate(x, y - s - b); if (flip) ctx.scale(-1, 1);
  ell(-s * 0.72, -s * 0.62, s * 0.18, s * 0.32, col, -0.6);
  ell(s * 0.72, -s * 0.62, s * 0.18, s * 0.32, col, 0.6);
  circle(-s * 0.95, s * 0.35, s * 0.26, col);
  ell(-s * 0.45, s * 0.88, s * 0.3, s * 0.17, dark);
  ell(s * 0.45, s * 0.88, s * 0.3, s * 0.17, dark);
  circle(0, 0, s, col);
  ell(0, s * 0.38, s * 0.6, s * 0.48, '#fbf6d9');
  ctx.strokeStyle = dark; ctx.lineWidth = s * 0.08; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -s * 0.95); ctx.quadraticCurveTo(s * 0.06, -s * 1.15, 0, -s * 1.28); ctx.stroke();
  ell(-s * 0.22, -s * 1.3, s * 0.25, s * 0.12, '#5cc24a', -0.5);
  ell(s * 0.22, -s * 1.3, s * 0.25, s * 0.12, '#5cc24a', 0.5);
  const blink = (t % 3.2) > 3.05 ? 0.15 : 1;
  for (const sx of [-1, 1]) {
    ell(sx * s * 0.33, -s * 0.12, s * 0.2, s * 0.24 * blink, '#fff');
    ell(sx * s * 0.33 + s * 0.04, -s * 0.1, s * 0.12, s * 0.15 * blink, '#2b2b3a');
    if (blink > 0.5) circle(sx * s * 0.33 + s * 0.08, -s * 0.17, s * 0.045, '#fff');
  }
  ell(-s * 0.58, s * 0.12, s * 0.14, s * 0.09, 'rgba(255,120,140,.6)');
  ell(s * 0.58, s * 0.12, s * 0.14, s * 0.09, 'rgba(255,120,140,.6)');
  ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = s * 0.06;
  ctx.beginPath(); ctx.arc(0, s * 0.08, s * 0.14, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}

// イガボン：ざこ。とげとげの くりの ような モンスター
function drawIgabon(x, y, s, t, flip = false) {
  const b = Math.abs(Math.sin(t * 7)) * s * 0.1;
  ell(x, y, s * 0.8, s * 0.2, 'rgba(0,0,0,.2)');
  ctx.save(); ctx.translate(x, y - s - b); if (flip) ctx.scale(-1, 1);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    if (Math.sin(a) > 0.55) continue;
    tri(Math.cos(a - 0.2) * s * 0.85, Math.sin(a - 0.2) * s * 0.85, Math.cos(a) * s * 1.4, Math.sin(a) * s * 1.4,
      Math.cos(a + 0.2) * s * 0.85, Math.sin(a + 0.2) * s * 0.85, '#6b3f1d');
  }
  ell(-s * 0.4, s * 0.92, s * 0.25, s * 0.14, '#4a2a12');
  ell(s * 0.4, s * 0.92, s * 0.25, s * 0.14, '#4a2a12');
  circle(0, 0, s, '#a8642f');
  ell(0, s * 0.5, s * 0.7, s * 0.42, '#e3b77e');
  for (const sx of [-1, 1]) {
    circle(sx * s * 0.32, -s * 0.05, s * 0.19, '#fff');
    circle(sx * s * 0.32 - s * 0.04, -s * 0.02, s * 0.1, '#2b1a0e');
    ctx.strokeStyle = '#3a1f0b'; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx * s * 0.12, -s * 0.22); ctx.lineTo(sx * s * 0.5, -s * 0.36); ctx.stroke();
  }
  ctx.strokeStyle = '#3a1f0b'; ctx.lineWidth = s * 0.07;
  ctx.beginPath(); ctx.arc(0, s * 0.42, s * 0.16, Math.PI + 0.3, -0.3); ctx.stroke();
  tri(-s * 0.08, s * 0.3, -s * 0.02, s * 0.3, -s * 0.05, s * 0.4, '#fff');
  ctx.restore();
}

// ドンゴラ：チュートリアルの ボス。いわを せおった 小さな トカゲ（ひだりむき）
function drawDongora(x, y, s, t, flip = false) {
  const b = Math.sin(t * 3) * s * 0.04;
  ell(x, y, s * 1.2, s * 0.25, 'rgba(0,0,0,.25)');
  ctx.save(); ctx.translate(x, y - s * 0.9 + b); if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = '#6d5a8c'; ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.25);
  ctx.quadraticCurveTo(s * 1.5, s * 0.35 + Math.sin(t * 4) * s * 0.15, s * 1.65, -s * 0.3);
  ctx.quadraticCurveTo(s * 1.3, s * 0.1, s * 0.5, -s * 0.2); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const px = -s * 0.25 + i * s * 0.3;
    tri(px - s * 0.18, -s * 0.5, px, -s * 1.0 - (i % 2) * s * 0.12, px + s * 0.18, -s * 0.5, i % 2 ? '#8d8270' : '#a99d88');
  }
  ell(-s * 0.5, s * 0.7, s * 0.26, s * 0.18, '#5e4a80');
  ell(s * 0.4, s * 0.7, s * 0.26, s * 0.18, '#5e4a80');
  ell(0, 0, s * 0.95, s * 0.75, '#8a73b0');
  ell(-s * 0.15, s * 0.28, s * 0.58, s * 0.4, '#cdbde8');
  const hx = -s * 0.8, hy = -s * 0.35;
  tri(hx - s * 0.05, hy - s * 0.3, hx + s * 0.05, hy - s * 0.75, hx + s * 0.2, hy - s * 0.3, '#f2e6c9');
  tri(hx + s * 0.18, hy - s * 0.3, hx + s * 0.35, hy - s * 0.68, hx + s * 0.42, hy - s * 0.25, '#f2e6c9');
  ell(hx, hy, s * 0.52, s * 0.42, '#8a73b0');
  ell(hx - s * 0.2, hy + s * 0.12, s * 0.35, s * 0.2, '#9d88c2');
  ell(hx + s * 0.02, hy - s * 0.1, s * 0.15, s * 0.13, '#ffd23f');
  ell(hx - s * 0.01, hy - s * 0.1, s * 0.04, s * 0.11, '#222');
  ctx.strokeStyle = '#3d2c5a'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx - s * 0.18, hy - s * 0.3); ctx.lineTo(hx + s * 0.2, hy - s * 0.2); ctx.stroke();
  ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(hx - s * 0.5, hy + s * 0.15); ctx.lineTo(hx - s * 0.05, hy + s * 0.2); ctx.stroke();
  tri(hx - s * 0.32, hy + s * 0.16, hx - s * 0.24, hy + s * 0.17, hx - s * 0.28, hy + s * 0.3, '#fff');
  circle(hx - s * 0.42, hy - s * 0.02, s * 0.03, '#3d2c5a');
  ctx.restore();
}

// トルピー：本人の原画（参考資料/トルピー_原画.jpg）。あおい ふちの みどりの しかく、ギザギザの つばさと はねの つばさ、やじるしを もつ
function drawToruppy(x, y, s, t, flip = false) {
  const b = Math.sin(t * 4) * s * 0.08, fl = Math.sin(t * 8) * 0.22;
  ell(x, y, s * 0.9, s * 0.2, 'rgba(0,0,0,.2)');
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  ctx.strokeStyle = '#222'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-s * 0.42, -s * 0.5 + b); ctx.quadraticCurveTo(-s * 0.5, -s * 0.2, -s * 0.42, 0); ctx.lineTo(-s * 0.58, s * 0.04); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.42, -s * 0.5 + b); ctx.quadraticCurveTo(s * 0.48, -s * 0.2, s * 0.42, 0); ctx.lineTo(s * 0.5, -s * 0.06); ctx.stroke();
  ctx.translate(0, -s * 1.28 + b);
  // ひだりの つばさ（ギザギザ）
  ctx.save(); ctx.translate(-s * 0.68, -s * 0.35); ctx.rotate(-fl);
  ctx.beginPath();
  for (const [px, py] of [[0, 0], [-0.9, -0.95], [-1.15, -0.75], [-1.0, -0.2], [-0.78, -0.4], [-0.86, 0.12], [-0.52, -0.06], [-0.56, 0.32], [0, 0.18]]) ctx.lineTo(px * s, py * s);
  ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
  ctx.restore();
  // みぎの つばさ（はね）
  ctx.save(); ctx.translate(s * 0.68, -s * 0.3); ctx.rotate(fl);
  ctx.beginPath(); ctx.moveTo(0, 0.1 * s); ctx.quadraticCurveTo(s * 0.35, -s * 0.85, s * 1.05, -s * 0.95); ctx.lineTo(s * 0.9, -s * 0.7);
  ctx.lineTo(s * 0.8, -s * 0.05); ctx.lineTo(s * 0.62, -s * 0.5); ctx.lineTo(s * 0.5, s * 0.05); ctx.lineTo(s * 0.38, -s * 0.38); ctx.lineTo(s * 0.2, s * 0.15); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
  ctx.restore();
  // からだ
  rr(-s * 0.75, -s * 0.75, s * 1.5, s * 1.5, s * 0.25); ctx.fillStyle = '#5aa6d6'; ctx.fill();
  rr(-s * 0.63, -s * 0.63, s * 1.26, s * 1.26, s * 0.2); ctx.fillStyle = '#86dcb0'; ctx.fill();
  // かお
  ctx.lineWidth = s * 0.055;
  ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.42); ctx.lineTo(-s * 0.18, -s * 0.2); ctx.lineTo(-s * 0.38, s * 0.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.08, -s * 0.12); ctx.lineTo(s * 0.2, -s * 0.48); ctx.lineTo(s * 0.3, -s * 0.12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.18); ctx.lineTo(-s * 0.22, s * 0.36); ctx.lineTo(-s * 0.12, s * 0.17); ctx.lineTo(s * 0.12, s * 0.12); ctx.lineTo(s * 0.18, s * 0.32); ctx.lineTo(s * 0.26, s * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.18); ctx.lineTo(s * 0.32, s * 0.08); ctx.stroke();
  // うで と やじるし
  ctx.beginPath(); ctx.moveTo(-s * 0.72, -s * 0.05); ctx.quadraticCurveTo(-s * 0.3, s * 0.5, s * 0.15, s * 0.52); ctx.stroke();
  ctx.lineWidth = s * 0.09;
  ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 1.0); ctx.lineTo(s * 0.92, -s * 0.32); ctx.stroke();
  tri(s * 1.12, -s * 0.58, s * 0.78, -s * 0.42, s * 1.0, -s * 0.22, '#222');
  ctx.restore();
}

// イエロール：本人の原画（参考資料/イエロール_原画.jpg）。きいろい まるに オレンジの わ、こしに て
function drawYellowl(x, y, s, t, flip = false) {
  const b = Math.abs(Math.sin(t * 5)) * s * 0.08;
  ell(x, y, s * 0.9, s * 0.2, 'rgba(0,0,0,.2)');
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  ctx.strokeStyle = '#222'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.45); ctx.quadraticCurveTo(-s * 0.55, -s * 0.2, -s * 0.5, -s * 0.02); ctx.lineTo(-s * 0.62, s * 0.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.45, -s * 0.45); ctx.lineTo(s * 0.55, -s * 0.02); ctx.lineTo(s * 0.72, -s * 0.02); ctx.stroke();
  ctx.translate(0, -s * 1.35 - b);
  // こしに あてた うで
  ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 0.15); ctx.lineTo(-s * 1.15, s * 0.05); ctx.lineTo(-s * 0.75, s * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.35); ctx.lineTo(s * 1.15, -s * 0.25); ctx.lineTo(s * 1.0, s * 0.3); ctx.lineTo(s * 1.1, s * 0.4); ctx.stroke();
  // からだ（3つの まる）
  ctx.lineWidth = s * 0.035;
  circle(0, 0, s, '#f0cf3c'); ctx.stroke();
  circle(s * 0.12, s * 0.1, s * 0.86, '#e88a1a'); ctx.stroke();
  circle(s * 0.24, s * 0.2, s * 0.68, '#f2d640'); ctx.stroke();
  // かお
  const fx = s * 0.24, fy = s * 0.2;
  ctx.lineWidth = s * 0.045;
  ctx.beginPath(); ctx.moveTo(fx - s * 0.45, fy - s * 0.45); ctx.lineTo(fx - s * 0.1, fy - s * 0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx + s * 0.45, fy - s * 0.62); ctx.lineTo(fx + s * 0.22, fy - s * 0.22); ctx.stroke();
  ell(fx - s * 0.18, fy - s * 0.12, s * 0.1, s * 0.07, '#fff'); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx + s * 0.1, fy - s * 0.08); ctx.lineTo(fx + s * 0.22, fy - s * 0.2); ctx.lineTo(fx + s * 0.25, fy - s * 0.04); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx - s * 0.05, fy + s * 0.1); ctx.quadraticCurveTo(fx - s * 0.02, fy + s * 0.3, fx + s * 0.08, fy + s * 0.28); ctx.quadraticCurveTo(fx + s * 0.16, fy + s * 0.26, fx + s * 0.16, fy + s * 0.06); ctx.stroke();
  ctx.strokeStyle = '#e63946'; ctx.lineWidth = s * 0.04;
  for (const [bx, by] of [[-0.48, 0.05], [0.42, 0.02]]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(fx + (bx + i * 0.08) * s, fy + by * s); ctx.lineTo(fx + (bx + i * 0.08 - 0.01) * s, fy + (by + 0.12) * s); ctx.stroke(); }
  ctx.restore();
}

const MONSTER_DRAW = { pomuru: drawPomuru, igabon: drawIgabon, dongora: drawDongora, toruppy: drawToruppy, yellowl: drawYellowl };
const MONSTER_NAME = { pomuru: 'ポムル', igabon: 'イガボン', dongora: 'ドンゴラ', toruppy: 'トルピー', yellowl: 'イエロール' };

// しゅじんこう
function drawHero(x, y, s, dir = 'down', ph = 0, moving = false, bag = false) {
  ell(x, y, s * 0.45, s * 0.13, 'rgba(0,0,0,.2)');
  ctx.save(); ctx.translate(x, y);
  const side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const sw = moving ? Math.sin(ph) : 0;
  const bob = moving ? Math.abs(Math.cos(ph)) * s * 0.05 : 0;
  ctx.translate(0, -bob);
  ctx.fillStyle = '#3a3f55';
  if (side) {
    rr(-s * 0.08 + sw * s * 0.16, -s * 0.32, s * 0.16, s * 0.32 + bob, s * 0.06); ctx.fill();
    rr(-s * 0.08 - sw * s * 0.16, -s * 0.32, s * 0.16, s * 0.32 + bob, s * 0.06); ctx.fill();
  } else {
    rr(-s * 0.2, -s * 0.32 - Math.max(0, sw) * s * 0.07, s * 0.15, s * 0.32, s * 0.06); ctx.fill();
    rr(s * 0.05, -s * 0.32 - Math.max(0, -sw) * s * 0.07, s * 0.15, s * 0.32, s * 0.06); ctx.fill();
  }
  if (G.gear) { // せなかの こんぼう
    ctx.save(); ctx.rotate(dir === 'up' ? 0.5 : -0.5);
    ctx.fillStyle = '#8b5a2b'; rr(-s * 0.07, -s * 1.3, s * 0.14, s * 0.75, s * 0.06); ctx.fill();
    ctx.fillStyle = '#6b4220'; rr(-s * 0.11, -s * 1.38, s * 0.22, s * 0.28, s * 0.08); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#3b82f6'; rr(-s * 0.3, -s * 0.86, s * 0.6, s * 0.6, s * 0.16); ctx.fill();
  ctx.fillStyle = '#ffd166'; ctx.fillRect(-s * 0.3, -s * 0.5, s * 0.6, s * 0.07);
  if (G.gear) { // かけだしの よろい
    ctx.fillStyle = '#b07a45'; rr(-s * 0.27, -s * 0.84, s * 0.54, s * 0.44, s * 0.12); ctx.fill();
    ctx.strokeStyle = '#7a4f26'; ctx.lineWidth = s * 0.04; ctx.beginPath(); ctx.moveTo(0, -s * 0.82); ctx.lineTo(0, -s * 0.42); ctx.stroke();
    circle(-s * 0.3, -s * 0.8, s * 0.13, '#8d6a4a'); circle(s * 0.3, -s * 0.8, s * 0.13, '#8d6a4a');
  }
  circle(-s * 0.35 + (side ? sw * s * 0.1 : 0), -s * 0.55 + (side ? 0 : sw * s * 0.06), s * 0.11, '#f2c9a0');
  circle(s * 0.35 - (side ? sw * s * 0.1 : 0), -s * 0.55 - (side ? 0 : sw * s * 0.06), s * 0.11, '#f2c9a0');
  if (bag) {
    ctx.fillStyle = '#ff8fb1'; rr(s * 0.32, -s * 0.52, s * 0.3, s * 0.32, s * 0.05); ctx.fill();
    ctx.strokeStyle = '#d4547c'; ctx.lineWidth = s * 0.04; ctx.beginPath(); ctx.arc(s * 0.47, -s * 0.52, s * 0.09, Math.PI, 0); ctx.stroke();
  }
  circle(0, -s * 1.15, s * 0.42, '#f2c9a0');
  if (dir === 'up') { ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.arc(0, -s * 1.13, s * 0.43, -0.1, Math.PI + 0.1); ctx.fill(); }
  ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(0, -s * 1.2, s * 0.45, Math.PI, 0); ctx.fill();
  if (dir !== 'up') {
    ell(side * s * 0.28, -s * 1.2, s * (side ? 0.3 : 0.4), s * 0.1, '#c1121f');
    const fx = side * s * 0.12;
    ell(-s * 0.14 + fx, -s * 1.06, s * 0.05, s * 0.07, '#222');
    ell(s * 0.14 + fx, -s * 1.06, s * 0.05, s * 0.07, '#222');
    ctx.strokeStyle = '#a0522d'; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(fx, -s * 0.96, s * 0.07, 0.3, Math.PI - 0.3); ctx.stroke();
  } else {
    ell(0, -s * 1.22, s * 0.35, s * 0.08, '#c1121f');
  }
  ctx.restore();
}

function drawChief(x, y, s, t) {
  ell(x, y, s * 0.5, s * 0.13, 'rgba(0,0,0,.2)');
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = '#7a4a21'; ctx.lineWidth = s * 0.08; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s * 0.5, 0); ctx.lineTo(s * 0.5, -s * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(s * 0.4, -s * 1.5, s * 0.1, -Math.PI * 0.1, Math.PI * 1.3); ctx.stroke();
  ctx.fillStyle = '#5b8c51'; ctx.beginPath();
  ctx.moveTo(-s * 0.42, 0); ctx.lineTo(s * 0.42, 0); ctx.lineTo(s * 0.28, -s * 0.9); ctx.lineTo(-s * 0.28, -s * 0.9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d4a017'; ctx.fillRect(-s * 0.33, -s * 0.5, s * 0.66, s * 0.07);
  circle(s * 0.46, -s * 0.72, s * 0.1, '#f0c8a0');
  circle(0, -s * 1.15, s * 0.38, '#f0c8a0');
  ell(-s * 0.36, -s * 1.15, s * 0.12, s * 0.2, '#eee');
  ell(s * 0.36, -s * 1.15, s * 0.12, s * 0.2, '#eee');
  ctx.strokeStyle = '#6b5a4a'; ctx.lineWidth = s * 0.035;
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * s * 0.14, -s * 1.17, s * 0.06, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ell(-s * 0.15, -s * 1.27, s * 0.12, s * 0.045, '#fafafa'); ell(s * 0.15, -s * 1.27, s * 0.12, s * 0.045, '#fafafa');
  ctx.fillStyle = '#fff'; ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 1.03); ctx.quadraticCurveTo(-s * 0.05, -s * 0.38 + Math.sin(t * 2) * s * 0.03, 0, -s * 0.35);
  ctx.quadraticCurveTo(s * 0.05, -s * 0.38, s * 0.3, -s * 1.03); ctx.fill();
  circle(0, -s * 1.08, s * 0.07, '#e0a98a');
  ctx.restore();
}

function drawVillager(x, y, s, t) {
  ell(x, y, s * 0.45, s * 0.13, 'rgba(0,0,0,.2)');
  ctx.save(); ctx.translate(x, y - Math.abs(Math.sin(t * 2)) * s * 0.02);
  ctx.fillStyle = '#e07a5f'; ctx.beginPath();
  ctx.moveTo(-s * 0.38, 0); ctx.lineTo(s * 0.38, 0); ctx.lineTo(s * 0.24, -s * 0.85); ctx.lineTo(-s * 0.24, -s * 0.85); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; rr(-s * 0.18, -s * 0.6, s * 0.36, s * 0.5, s * 0.06); ctx.fill();
  circle(0, -s * 1.12, s * 0.38, '#f2c9a0');
  ctx.fillStyle = '#7b4b2a'; ctx.beginPath(); ctx.arc(0, -s * 1.17, s * 0.4, Math.PI, 0); ctx.fill();
  circle(0, -s * 1.55, s * 0.16, '#7b4b2a');
  ell(-s * 0.13, -s * 1.08, s * 0.045, s * 0.06, '#222'); ell(s * 0.13, -s * 1.08, s * 0.045, s * 0.06, '#222');
  ctx.strokeStyle = '#a0522d'; ctx.lineWidth = s * 0.04; ctx.beginPath(); ctx.arc(0, -s * 0.98, s * 0.07, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.restore();
}

// レン：うらいちばの せんぱい。ゴーグルと オレンジの マフラー
function drawRen(x, y, s, t, flip = false) {
  ell(x, y, s * 0.45, s * 0.13, 'rgba(0,0,0,.2)');
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  ctx.save(); ctx.rotate(0.35); drawNet(0, -s * 0.95, s * 0.32, 0, ''); ctx.restore();
  ctx.fillStyle = '#2d3142'; rr(-s * 0.2, -s * 0.34, s * 0.15, s * 0.34, s * 0.06); ctx.fill(); rr(s * 0.05, -s * 0.34, s * 0.15, s * 0.34, s * 0.06); ctx.fill();
  ctx.fillStyle = '#1f9e8f'; rr(-s * 0.32, -s * 0.9, s * 0.64, s * 0.62, s * 0.16); ctx.fill();
  ctx.fillStyle = '#167a6e'; ctx.fillRect(-s * 0.03, -s * 0.88, s * 0.06, s * 0.58);
  circle(-s * 0.37, -s * 0.55, s * 0.11, '#e8b98f'); circle(s * 0.37, -s * 0.55, s * 0.11, '#e8b98f');
  circle(0, -s * 1.17, s * 0.42, '#e8b98f');
  for (let i = -3; i <= 3; i++) tri(i * s * 0.13 - s * 0.12, -s * 1.3, i * s * 0.15, -s * 1.72 + Math.abs(i) * s * 0.06, i * s * 0.13 + s * 0.12, -s * 1.3, '#2b2233');
  ctx.fillStyle = '#2b2233'; ctx.beginPath(); ctx.arc(0, -s * 1.22, s * 0.44, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#6b6f80'; ctx.fillRect(-s * 0.44, -s * 1.42, s * 0.88, s * 0.09);
  circle(-s * 0.16, -s * 1.38, s * 0.12, '#9fe3ff'); circle(s * 0.16, -s * 1.38, s * 0.12, '#9fe3ff');
  ell(-s * 0.14, -s * 1.08, s * 0.05, s * 0.07, '#222'); ell(s * 0.14, -s * 1.08, s * 0.05, s * 0.07, '#222');
  ctx.strokeStyle = '#a0522d'; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -s * 0.98, s * 0.08, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = '#ff8c42'; rr(-s * 0.36, -s * 0.9, s * 0.72, s * 0.16, s * 0.08); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.8); ctx.quadraticCurveTo(s * 0.55, -s * 0.7 + Math.sin(t * 5) * s * 0.06, s * 0.62, -s * 0.5); ctx.lineTo(s * 0.45, -s * 0.5); ctx.quadraticCurveTo(s * 0.4, -s * 0.68, s * 0.12, -s * 0.74); ctx.fill();
  ctx.restore();
}

// かじや
function drawSmith(x, y, s, t, swing = true) {
  ell(x, y, s * 0.55, s * 0.14, 'rgba(0,0,0,.2)');
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#3a3a3a'; rr(-s * 0.25, -s * 0.34, s * 0.2, s * 0.34, s * 0.06); ctx.fill(); rr(s * 0.05, -s * 0.34, s * 0.2, s * 0.34, s * 0.06); ctx.fill();
  ctx.fillStyle = '#c44536'; rr(-s * 0.42, -s * 0.95, s * 0.84, s * 0.68, s * 0.2); ctx.fill();
  ctx.fillStyle = '#6b4a2b'; rr(-s * 0.3, -s * 0.78, s * 0.6, s * 0.6, s * 0.08); ctx.fill();
  circle(0, -s * 1.22, s * 0.4, '#d9a066');
  ctx.fillStyle = '#2f5d8a'; ctx.beginPath(); ctx.arc(0, -s * 1.27, s * 0.42, Math.PI, 0); ctx.fill();
  tri(s * 0.3, -s * 1.3, s * 0.6, -s * 1.42, s * 0.55, -s * 1.15, '#2f5d8a');
  ell(-s * 0.14, -s * 1.16, s * 0.05, s * 0.06, '#222'); ell(s * 0.14, -s * 1.16, s * 0.05, s * 0.06, '#222');
  ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.arc(0, -s * 1.02, s * 0.2, 0, Math.PI); ctx.fill();
  const a = swing ? -1.2 + Math.abs(Math.sin(t * 4)) * 1.6 : -0.3;
  ctx.save(); ctx.translate(s * 0.42, -s * 0.72); ctx.rotate(a);
  circle(0, 0, s * 0.14, '#d9a066');
  ctx.fillStyle = '#7a4a21'; ctx.fillRect(-s * 0.04, -s * 0.05, s * 0.08, s * 0.6);
  ctx.fillStyle = '#777'; rr(-s * 0.18, s * 0.5, s * 0.36, s * 0.2, s * 0.04); ctx.fill();
  ctx.restore();
  ctx.restore();
}

// そざい の アイコン
function drawMaterial(kind, x, y, s) {
  if (kind === 'iron') {
    ctx.beginPath(); ctx.moveTo(x - s * 0.5, y + s * 0.2); ctx.lineTo(x - s * 0.2, y - s * 0.45); ctx.lineTo(x + s * 0.4, y - s * 0.3); ctx.lineTo(x + s * 0.5, y + s * 0.3); ctx.lineTo(x - s * 0.1, y + s * 0.45); ctx.closePath();
    ctx.fillStyle = '#9aa5b1'; ctx.fill(); ctx.lineWidth = s * 0.06; ctx.strokeStyle = '#5c6670'; ctx.stroke();
    tri(x - s * 0.15, y - s * 0.3, x + s * 0.2, y - s * 0.2, x - s * 0.05, y, '#d5dde5');
  } else if (kind === 'vine') {
    ctx.strokeStyle = '#3f8f3a'; ctx.lineWidth = s * 0.14; ctx.lineCap = 'round';
    ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU * 1.6, r = s * (0.15 + i / 24 * 0.32); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8); } ctx.stroke();
    ell(x + s * 0.4, y - s * 0.3, s * 0.18, s * 0.1, '#6cc24a', -0.6);
  } else if (kind === 'gem') {
    ctx.beginPath(); ctx.moveTo(x, y - s * 0.5); ctx.lineTo(x + s * 0.35, y - s * 0.1); ctx.lineTo(x, y + s * 0.5); ctx.lineTo(x - s * 0.35, y - s * 0.1); ctx.closePath();
    ctx.fillStyle = '#7fd8ff'; ctx.fill(); ctx.lineWidth = s * 0.06; ctx.strokeStyle = '#2f86b8'; ctx.stroke();
    tri(x, y - s * 0.5, x + s * 0.35, y - s * 0.1, x, y - s * 0.1, '#c9f0ff');
  } else {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.15);
    rr(-s * 0.5, -s * 0.35, s, s * 0.7, s * 0.2); ctx.fillStyle = '#c58c55'; ctx.fill(); ctx.lineWidth = s * 0.06; ctx.strokeStyle = '#8a5a2b'; ctx.stroke();
    ctx.setLineDash([s * 0.1, s * 0.08]); rr(-s * 0.38, -s * 0.23, s * 0.76, s * 0.46, s * 0.14); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
}

// うらいちば の そら・かべ・じめん・ちょうちん（sx は よこに スクロール した ぶん）
function marketSkyline(w, h, t, sx = 0) {
  sky(w, h, '#2b2d5c', '#c86b85');
  for (let k = 0; k < 14; k++) circle((hash(k, 3) / 1000) * w, (hash(k, 7) / 1000) * h * 0.25, 1.5, 'rgba(255,255,255,.8)');
  const gy = h * 0.7;
  ctx.fillStyle = '#3b2f45'; ctx.fillRect(0, h * 0.18, w, gy - h * 0.18);
  ctx.fillStyle = '#5a4a3a'; ctx.fillRect(0, gy, w, h - gy);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;
  for (let x = -((sx % 40) + 40) ; x < w + 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x - 30, h); ctx.stroke(); }
  ctx.strokeStyle = '#2a1e18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, h * 0.1); ctx.quadraticCurveTo(w / 2, h * 0.2, w, h * 0.1); ctx.stroke();
  for (let k = 1; k < 8; k++) {
    const px = w * k / 8, py = h * 0.1 + Math.sin(k / 8 * Math.PI) * h * 0.05;
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.sin(t * 2 + k) * 0.08);
    ell(0, h * 0.025, h * 0.018, h * 0.026, k % 2 ? '#ff5a4e' : '#ffb347');
    ctx.restore();
  }
}
// おみせ 1けん（やね・のれん・かんばん）
function marketShop(x, y, bw, bh, a1, a2, sign, h) {
  ctx.fillStyle = '#7a5c43'; ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = '#2a1e18'; ctx.fillRect(x + bw * 0.12, y + bh * 0.42, bw * 0.76, bh * 0.58);
  const n = 6, aw = bw / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? a1 : a2; ctx.beginPath();
    ctx.moveTo(x + i * aw, y + bh * 0.2); ctx.lineTo(x + (i + 1) * aw, y + bh * 0.2); ctx.lineTo(x + (i + 1) * aw, y + bh * 0.36);
    ctx.quadraticCurveTo(x + (i + 0.5) * aw, y + bh * 0.44, x + i * aw, y + bh * 0.36); ctx.fill();
  }
  const sp = fitPx(sign, Math.min(h * 0.045, 26), bw * 0.85);
  ctx.font = font(sp); const tw = ctx.measureText(sign).width + sp * 1.2;
  rr(x + bw / 2 - tw / 2, y + bh * 0.02, tw, sp * 1.6, 8); ctx.fillStyle = '#f2d398'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
  text(sign, x + bw / 2, y + bh * 0.02 + sp * 0.82, sp, '#4a2500');
  return { x, y, w: bw, h: bh };
}
// おみせ ごとの かざり
function marketDetail(id, r, h, t) {
  if (id === 'quest') {
    for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(r.x + r.w * (0.3 + i * 0.2), r.y + r.h * 0.6); ctx.rotate((i - 1) * 0.12); ctx.fillStyle = '#fff8e1'; ctx.fillRect(-r.w * 0.07, -r.h * 0.08, r.w * 0.14, r.h * 0.16); ctx.restore(); }
  } else if (id === 'smith') {
    const fl = 0.6 + Math.sin(t * 9) * 0.2 + Math.sin(t * 23) * 0.1;
    const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h * 0.85, 0, r.x + r.w / 2, r.y + r.h * 0.85, r.w * 0.4);
    g.addColorStop(0, `rgba(255,150,40,${fl})`); g.addColorStop(1, 'rgba(255,150,40,0)'); ctx.fillStyle = g; ctx.fillRect(r.x, r.y + r.h * 0.4, r.w, r.h * 0.6);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(r.x + r.w * 0.75, r.y - h * 0.08, r.w * 0.1, h * 0.08);
    smoke(r.x + r.w * 0.8, r.y - h * 0.08, h * 0.02, t);
  } else if (id === 'shop') {
    for (let i = 0; i < 3; i++) drawNet(r.x + r.w * (0.3 + i * 0.2), r.y + r.h * 0.62, r.w * 0.07, -0.2, '');
  } else if (id === 'school') {
    ctx.fillStyle = '#2f5d3a'; ctx.fillRect(r.x + r.w * 0.2, r.y + r.h * 0.48, r.w * 0.6, r.h * 0.22);
    ctx.strokeStyle = '#c8a26b'; ctx.lineWidth = 3; ctx.strokeRect(r.x + r.w * 0.2, r.y + r.h * 0.48, r.w * 0.6, r.h * 0.22);
    text('あいうえお', r.x + r.w / 2, r.y + r.h * 0.56, fitPx('あいうえお', r.h * 0.07, r.w * 0.5), '#fff');
    circle(r.x + r.w * 0.35, r.y + r.h * 0.65, r.h * 0.025, '#fff'); circle(r.x + r.w * 0.6, r.y + r.h * 0.65, r.h * 0.025, '#ffe066');
  }
}
// ムービーで つかう：3けんが ひとつの がめんに おさまる うらいちば
function drawMarketBg(w, h, t) {
  marketSkyline(w, h, t);
  const gy = h * 0.7, r = {};
  for (const [id, x0, x1, top, a1, a2, sign] of [['shop', 0.02, 0.3, 0.34, '#3f7cac', '#f4f1de', 'どうぐや'], ['quest', 0.35, 0.65, 0.22, '#e07a5f', '#f4f1de', 'クエスト うけつけ'], ['smith', 0.7, 0.98, 0.34, '#555', '#f4a259', 'かじや']]) {
    r[id] = marketShop(w * x0, h * top, w * (x1 - x0), gy - h * top, a1, a2, sign, h);
    marketDetail(id, r[id], h, t);
  }
  return r;
}
// うらいちばの とおり（よこに ながい。4けん）
const SHOPS = [
  { id: 'shop', sign: 'どうぐや', a1: '#3f7cac', a2: '#f4f1de', top: 0.34 },
  { id: 'quest', sign: 'クエスト うけつけ', a1: '#e07a5f', a2: '#f4f1de', top: 0.22 },
  { id: 'smith', sign: 'かじや', a1: '#555', a2: '#f4a259', top: 0.34 },
  { id: 'school', sign: 'モンスター きょうしつ', a1: '#2f9e44', a2: '#f4f1de', top: 0.28 },
];
function marketLayout() {
  const SW = clamp(W * 0.24, 170, 290), gap = SW * 0.06, total = SHOPS.length * SW + (SHOPS.length + 1) * gap;
  return { SW, gap, total, maxScroll: Math.max(0, total - W) };
}
function drawMarketStreet(t, sx) {
  marketSkyline(W, H, t, sx);
  const L = marketLayout(), gy = H * 0.7, r = {};
  SHOPS.forEach((s, i) => {
    const x = L.gap + i * (L.SW + L.gap) - sx;
    r[s.id] = marketShop(x, H * s.top, L.SW, gy - H * s.top, s.a1, s.a2, s.sign, H);
    marketDetail(s.id, r[s.id], H, t);
  });
  return r;
}

// いえ（x,y は やねを ふくめた ひだりうえ）
function drawHouse(x, y, w, h, roof, damaged, t) {
  const wy = y + h * 0.42;
  ctx.fillStyle = damaged ? '#d9c7a8' : '#f6e7c8'; ctx.fillRect(x + w * 0.06, wy, w * 0.88, h - h * 0.42);
  tri(x - w * 0.04, wy + 2, x + w / 2, y, x + w * 1.04, wy + 2, roof);
  ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x + w * 0.42, y + h * 0.66, w * 0.16, h * 0.34);
  ctx.fillStyle = '#9fd3ef'; ctx.fillRect(x + w * 0.16, y + h * 0.56, w * 0.16, h * 0.16); ctx.fillRect(x + w * 0.68, y + h * 0.56, w * 0.16, h * 0.16);
  if (damaged) {
    tri(x + w * 0.55, y + h * 0.12, x + w * 0.75, y + h * 0.3, x + w * 0.5, y + h * 0.36, '#3d2b1f');
    ctx.strokeStyle = '#6b5a45'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + w * 0.2, wy + h * 0.05); ctx.lineTo(x + w * 0.27, wy + h * 0.18); ctx.lineTo(x + w * 0.22, wy + h * 0.28); ctx.stroke();
    smoke(x + w * 0.62, y + h * 0.2, w * 0.1, t + x * 0.01);
  }
}

function drawTree(x, y, s) {
  ell(x, y, s * 0.6, s * 0.18, 'rgba(0,0,0,.2)');
  ctx.fillStyle = '#7a4a21'; ctx.fillRect(x - s * 0.12, y - s * 0.7, s * 0.24, s * 0.7);
  circle(x, y - s * 1.2, s * 0.62, '#3f8f3a');
  circle(x - s * 0.35, y - s * 0.9, s * 0.42, '#4ea546');
  circle(x + s * 0.35, y - s * 0.95, s * 0.45, '#4ea546');
  circle(x - s * 0.1, y - s * 1.35, s * 0.3, '#64bd58');
}

// モンスターとりあみ
function drawNet(x, y, s, rot = 0, label = '小') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = '#a0682c'; ctx.lineWidth = s * 0.13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, s * 0.35); ctx.lineTo(0, s * 1.3); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(0, -s * 0.2, s * 0.55, 0, TAU); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-s, -s, 2 * s, 2 * s);
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = s * 0.035;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath(); ctx.moveTo(i * s * 0.14 - s, -s * 1.2); ctx.lineTo(i * s * 0.14 + s, s * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * s * 0.14 + s, -s * 1.2); ctx.lineTo(i * s * 0.14 - s, s * 0.8); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = s * 0.11; ctx.beginPath(); ctx.arc(0, -s * 0.2, s * 0.55, 0, TAU); ctx.stroke();
  ctx.restore();
  if (label) { circle(x + s * 0.55, y - s * 0.75, s * 0.25, '#e63946'); text(label, x + s * 0.55, y - s * 0.73, s * 0.3, '#fff'); }
}
function drawNetBall(x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  circle(0, 0, s, '#d8f0ff');
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.clip();
  ctx.strokeStyle = '#7aa7c7'; ctx.lineWidth = s * 0.06;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath(); ctx.moveTo(i * s * 0.3 - s, -s); ctx.lineTo(i * s * 0.3 + s, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * s * 0.3 + s, -s); ctx.lineTo(i * s * 0.3 - s, s); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = s * 0.14; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.stroke();
  circle(0, -s, s * 0.2, '#ffcc33');
  ctx.restore();
}

// むらの けしき（ムービー と クリアで つかう）
function drawVillageBg(w, h, t) {
  sky(w, h, '#86d0ff', '#e8f7ff'); clouds(w, h, t, 10);
  const gy = h * 0.66;
  ctx.fillStyle = '#9fd67a'; ctx.beginPath(); ctx.moveTo(0, gy); ctx.quadraticCurveTo(w * 0.5, h * 0.48, w, gy); ctx.fill();
  drawHouse(w * 0.04, h * 0.3, w * 0.22, h * 0.36, '#c9a35a', false, t);
  drawHouse(w * 0.72, h * 0.32, w * 0.24, h * 0.34, '#b8864b', false, t);
  drawTree(w * 0.5, h * 0.6, h * 0.14);
  ctx.fillStyle = '#b8e08f'; ctx.fillRect(0, gy, w, h - gy);
  ctx.fillStyle = '#e8d3a3'; ctx.fillRect(0, gy + h * 0.04, w, h * 0.06);
}

// ===== ボタン・ことば・フェード =====
let hits = [], T = 0;
function button(x, y, w, h, label, cb, o = {}) {
  ctx.save();
  if (o.blink) { const g = Math.sin(T * 8) * 0.5 + 0.5; ctx.shadowColor = '#fff36b'; ctx.shadowBlur = 12 + g * 22; }
  rr(x, y, w, h, Math.min(16, h * 0.3)); ctx.fillStyle = o.off ? '#c4c4c4' : (o.col || '#ffb347'); ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = 3; ctx.strokeStyle = o.off ? '#8a8a8a' : (o.line || '#8a4b0f'); ctx.stroke();
  ctx.restore();
  text(label, x + w / 2, o.sub ? y + h * 0.4 : y + h / 2 + 1, fitPx(label, o.px || clamp(h * 0.34, 13, 24), w * 0.9), o.off ? '#f4f4f4' : (o.fg || '#4a2500'));
  if (o.sub) text(o.sub, x + w / 2, y + h * 0.78, fitPx(o.sub, clamp(h * 0.2, 10, 15), w * 0.9), o.off ? '#eee' : '#6a3a10');
  hits.push({ x, y, w, h, cb });
}

function wrap(s, maxW) {
  const out = []; let line = '';
  for (const word of s.match(/[^ ]+ *| +/g) || []) {
    if (ctx.measureText(line + word).width <= maxW) { line += word; continue; }
    if (line) { out.push(line.trimEnd()); line = ''; }
    for (const ch of word) {
      if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ''; }
      line += ch;
    }
  }
  if (line.trim()) out.push(line.trimEnd());
  return out;
}

const WHO_COL = { 'そんちょう': '#5b8c51', 'そんちょうの こえ': '#5b8c51', 'むらびと': '#e07a5f', 'ポムル': '#4f9e45', 'レン': '#1f9e8f', 'かじや': '#c44536', 'うけつけ': '#8e6bbf' };
const Talk = {
  q: [], cur: null, shown: 0, done: null, idx: -1, lt: 0,
  say(lines, done) {
    this.q = lines.map(l => typeof l === 'string' ? { t: l } : l);
    this.done = done || null; this.idx = -1; this.next();
  },
  next() {
    this.cur = this.q.shift() || null; this.shown = 0; this.lt = 0;
    if (this.cur) { this.idx++; this.cur.text = sub(this.cur.t); this.cur.whoText = this.cur.who ? sub(this.cur.who) : ''; if (this.cur.fx) this.cur.fx(); }
    else { const d = this.done; this.done = null; if (d) d(); }
  },
  active() { return !!this.cur; },
  tap() {
    if (!this.cur) return false;
    const n = [...this.cur.text].length;
    if (this.shown < n) this.shown = n; else this.next();
    return true;
  },
  update(dt) { if (this.cur) { this.shown += dt * 26; this.lt += dt; } },
  clear() { this.q = []; this.cur = null; this.done = null; },
  draw(x, y, w, h) {
    if (!this.cur) return;
    const c = this.cur;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 10;
    rr(x, y, w, h, 16); ctx.fillStyle = 'rgba(255,252,242,.97)'; ctx.fill(); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = '#6b4a2b'; rr(x, y, w, h, 16); ctx.stroke();
    const px = clamp(h * 0.19, 15, 24);
    if (c.whoText) {
      ctx.font = font(px * 0.85);
      const tw = ctx.measureText(c.whoText).width + px * 1.2;
      rr(x + 14, y - px * 0.9, tw, px * 1.5, 10); ctx.fillStyle = WHO_COL[c.who] || '#3b82f6'; ctx.fill();
      text(c.whoText, x + 14 + tw / 2, y - px * 0.15, px * 0.85, '#fff');
    }
    // ぎょうが おおくて はこから はみでる ときは、もじを ちいさくする
    let tp = px, lines;
    for (; ;) {
      ctx.font = font(tp, 700); lines = wrap(c.text, w - tp * 2);
      if (tp <= 11 || tp * (c.whoText ? 1.0 : 0.8) + lines.length * tp * 1.45 <= h - 6) break;
      tp -= 1;
    }
    let left = Math.floor(this.shown);
    lines.forEach((ln, i) => {
      if (left <= 0) return;
      const part = [...ln].slice(0, left).join(''); left -= [...ln].length;
      ctx.font = font(tp, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#3a2410';
      ctx.fillText(part, x + tp, y + tp * (c.whoText ? 1.0 : 0.8) + i * tp * 1.45);
    });
    if (this.shown >= [...c.text].length && Math.sin(T * 6) > -0.3) tri(x + w - px * 1.6, y + h - px * 1.3, x + w - px * 0.8, y + h - px * 1.3, x + w - px * 1.2, y + h - px * 0.7, '#e07a1f');
  }
};

const Fade = {
  a: 0, dir: 0, cb: null,
  to(cb) { if (this.dir) return; this.dir = 1; this.cb = cb; },
  update(dt) {
    if (this.dir === 1) { this.a += dt * 3; if (this.a >= 1) { this.a = 1; this.dir = -1; const c = this.cb; this.cb = null; if (c) c(); } }
    else if (this.dir === -1) { this.a -= dt * 3; if (this.a <= 0) { this.a = 0; this.dir = 0; } }
  },
  draw() { if (this.a > 0) { ctx.fillStyle = `rgba(0,0,0,${this.a})`; ctx.fillRect(0, 0, W, H); } }
};

function talkBox() { const h = clamp(H * 0.22, 92, 150), m = Math.min(16, W * 0.03); return [m, H - h - m, W - m * 2, h]; }

// ===== タイトル =====
const Title = {
  t: 0, menu: false, slots: null, confirm: null,
  enter() { this.t = 0; this.menu = false; this.slots = null; this.confirm = null; },
  jump(id) { this.menu = false; Save.slot = null; Fade.to(() => startAt(id)); }, // テストよう：セーブ しない
  hasSave() { return [1, 2, 3].some(n => Save.read(n)); },
  update(dt) { this.t += dt; },
  draw() {
    const t = this.t;
    sky(W, H, '#6ec3ff', '#e0f6ff'); clouds(W, H, t, 14);
    const gy = H * 0.72;
    ctx.fillStyle = '#8fd16a'; ctx.beginPath(); ctx.moveTo(0, gy); ctx.quadraticCurveTo(W * 0.5, H * 0.55, W, gy); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    const s = Math.min(W, H) * 0.08;
    drawPomuru(W * 0.3, gy + s * 0.6, s, t);
    drawIgabon(W * 0.55, gy + s * 0.7, s * 0.7, t + 1, true);
    drawDongora(W * 0.78, gy + s * 0.8, s * 1.1, t);
    const tp = clamp(Math.min(W * 0.085, H * 0.1), 26, 64);
    text('みんなの モントモ', W / 2, H * 0.22, tp, '#ffe066', 'center', '#7a3b00');
    const bw = Math.min(320, W * 0.6), bh = clamp(H * 0.09, 42, 60), gap = bh * 0.22;
    let by = H * 0.22 + tp * 1.5;
    const half = (bw - 10) / 2, saved = this.hasSave();
    button(W / 2 - bw / 2, by, half, bh, 'はじめから', () => { this.slots = 'new'; }, { col: '#ffe08a', blink: !saved });
    button(W / 2 - bw / 2 + half + 10, by, half, bh, 'つづきから', () => { this.slots = 'load'; }, { col: '#ffb347', blink: saved, off: !saved });
    by += bh + gap;
    // テストよう（セーブ されない）
    const sh = bh * 0.8;
    button(W / 2 - bw / 2, by, half, sh, 'あたらしい ところから', () => this.jump(NEWEST.id), { col: '#e8f0fa', line: '#4a5a72', sub: NEWEST.name, px: clamp(sh * 0.28, 11, 16) });
    button(W / 2 - bw / 2 + half + 10, by, half, sh, 'ばめんを えらぶ', () => { this.menu = true; }, { col: '#e8f0fa', line: '#4a5a72', px: clamp(sh * 0.28, 11, 16) });
    text('↑ テストよう（セーブ されません）', W / 2, by + sh + 12, 12, '#3a6ea5', 'center', '#fff');
    // こうしん りれき と バージョン
    const lw = Math.min(190, W * 0.3);
    button(10, H - 50, lw, 40, 'こうしん りれき 📜', () => openLog(), { col: '#fff3c4', px: 15 }); // うえは おしらせの おびが でるので した
    if (!logSeen()) { rr(lw - 36, H - 58, 46, 20, 8); ctx.fillStyle = '#e63946'; ctx.fill(); text('NEW', lw - 13, H - 48, 12, '#fff'); }
    text(`ver ${GAME_VERSION}`, W - 12, H - 14, 14, '#fff', 'right', 'rgba(0,0,0,.45)');
    if (this.menu) this.drawMenu();
    if (this.slots) this.drawSlots();
  },
  // セーブを えらぶ（はじめから／つづきから）
  drawSlots() {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
    const isNew = this.slots === 'new', rowH = clamp((H - 190) / 4, 44, 70);
    const pw = Math.min(460, W - 32), ph = 66 + 3 * (rowH + 10) + rowH + 10, px = (W - pw) / 2, py = Math.max(8, (H - ph) / 2);
    rr(px, py, pw, ph, 18); ctx.fillStyle = '#fff8e8'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
    rr(px, py, pw, 50, 18); ctx.fillStyle = isNew ? '#e0a020' : '#e07a1f'; ctx.fill();
    text(isNew ? 'はじめから：どの セーブに する？' : 'つづきから：どの セーブで あそぶ？', px + pw / 2, py + 26, fitPx('はじめから：どの セーブに する？', 20, pw - 30), '#fff');
    if (this.confirm) {
      const msg = `セーブ${this.confirm}を けして、はじめから あそぶ？`;
      text(msg, px + pw / 2, py + ph * 0.42, fitPx(msg, 20, pw - 40), '#c0392b');
      const hw = (pw - 52) / 2;
      button(px + 20, py + ph - rowH - 16, hw, rowH, 'はい', () => { const n = this.confirm; this.confirm = null; Save.erase(n); openName(n); }, { col: '#ff7a59', line: '#8a2b12', fg: '#fff' });
      button(px + 32 + hw, py + ph - rowH - 16, hw, rowH, 'いいえ', () => { this.confirm = null; }, { col: '#c9d6e8', line: '#4a5a72' });
      return;
    }
    [1, 2, 3].forEach((n, i) => {
      const d = Save.read(n), y = py + 62 + i * (rowH + 10);
      const when = d ? new Date(d.at) : null;
      const sub = d ? `${d.G.name}　コイン ${d.G.coins}　なかま ${d.G.box.length}ひき　${when.getMonth() + 1}/${when.getDate()} ${when.getHours()}:${String(when.getMinutes()).padStart(2, '0')}` : 'まだ なにも ない';
      const cb = isNew ? () => (d ? (this.confirm = n) : openName(n)) : () => (d ? (this.slots = null, Fade.to(() => Save.load(n))) : null);
      button(px + 16, y, pw - 32, rowH, `セーブ${n}：${Save.label(d)}`, cb, { col: d ? '#fff3c4' : '#fff', sub, off: !isNew && !d, px: clamp(rowH * 0.32, 14, 20) });
    });
    button(px + pw / 2 - 70, py + 62 + 3 * (rowH + 10), 140, rowH, 'とじる', () => { this.slots = null; }, { col: '#c9d6e8', line: '#4a5a72' });
  },
  drawMenu() {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
    // ひくい がめん（スマホを よこに した とき）は 2れつに ならべる
    const n = CHAPTERS.length, cols = 66 + (n + 1) * 48 + 10 > H - 16 ? 2 : 1, rows = Math.ceil(n / cols);
    const rowH = clamp((H - 100) / (rows + 1) - 8, 34, 56);
    const pw = Math.min(cols === 2 ? 680 : 420, W - 24), ph = 62 + (rows + 1) * (rowH + 8) + 6, px = (W - pw) / 2, py = Math.max(6, (H - ph) / 2);
    rr(px, py, pw, ph, 18); ctx.fillStyle = '#fff8e8'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
    rr(px, py, pw, 48, 18); ctx.fillStyle = '#3f7cac'; ctx.fill();
    text('ばめんを えらぶ', px + pw / 2, py + 25, 22, '#fff');
    const cw = (pw - 32 - (cols - 1) * 10) / cols;
    CHAPTERS.forEach((c, i) => {
      const x = px + 16 + Math.floor(i / rows) * (cw + 10), y = py + 58 + (i % rows) * (rowH + 8);
      button(x, y, cw, rowH, `${i + 1}. ${c.name}`, () => this.jump(c.id), { col: c.isNew ? '#ffe08a' : '#fff', px: clamp(rowH * 0.36, 12, 19) });
      if (c.isNew) { rr(x + cw - 54, y - 8, 58, 22, 8); ctx.fillStyle = '#e63946'; ctx.fill(); text('NEW', x + cw - 25, y + 3, 14, '#fff'); }
    });
    button(px + pw / 2 - 70, py + 58 + rows * (rowH + 8), 140, rowH, 'とじる', () => { this.menu = false; }, { col: '#c9d6e8', line: '#4a5a72' });
  }
};

let nameOpen = false, nameSlot = null;
function openName(slot) {
  const box = document.getElementById('namebox'), inp = document.getElementById('nameinput');
  nameSlot = slot; Title.slots = null;
  box.hidden = false; nameOpen = true; inp.value = G.name; setTimeout(() => inp.focus(), 50);
}
document.getElementById('nameok').addEventListener('click', () => {
  const v = document.getElementById('nameinput').value.trim().slice(0, 6);
  G.name = v || 'ソラ'; saveName();
  document.getElementById('namebox').hidden = true; nameOpen = false;
  Save.slot = nameSlot; Save.write('movie');
  Fade.to(() => Movie.play(CARDS, () => go(Field)));
});
document.getElementById('nameinput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('nameok').click(); });

// ===== 導入ムービー（みじかい うごく え を かみしばいの ように つなぐ） =====
const CARDS = [
  { // 1. ショッピングモール
    lines: [
      { t: 'ある日、{N}は いつもの ショッピングモールへ かいものに きていた。' },
      { who: '{N}', t: 'きょうは なにを かおうかな～♪' },
    ],
    draw(w, h, t, idx) {
      sky(w, h, '#7cc8ff', '#e3f5ff'); circle(w * 0.1, h * 0.14, h * 0.07, '#ffe066'); clouds(w, h, t);
      const gy = h * 0.66;
      const mx = w * 0.42, my = h * 0.2, mw = w * 0.54, mh = gy - my;
      ctx.fillStyle = '#f4e3c9'; ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = '#e76f51'; ctx.fillRect(mx - w * 0.01, my - h * 0.03, mw + w * 0.02, h * 0.06);
      text('ショッピングモール', mx + mw / 2, my, Math.min(h * 0.045, mw * 0.08), '#fff');
      ctx.fillStyle = '#a9d8f0';
      for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) ctx.fillRect(mx + mw * (0.05 + c * 0.19), my + mh * (0.15 + r * 0.28), mw * 0.13, mh * 0.18);
      ctx.fillStyle = '#7fc4e8'; ctx.fillRect(mx + mw * 0.4, gy - mh * 0.32, mw * 0.2, mh * 0.32);
      ctx.fillStyle = '#9ad06a'; ctx.fillRect(0, gy - h * 0.02, w, h * 0.02);
      ctx.fillStyle = '#d8d2c4'; ctx.fillRect(0, gy, w, h - gy);
      const p = Math.min(1, t / 3), hx = w * (0.06 + 0.26 * ease(p));
      drawHero(hx, gy + h * 0.08, h * 0.13, 'right', t * 10, p < 1, true);
      if (idx >= 1) text('♪', hx + h * 0.1, gy - h * 0.13 - Math.abs(Math.sin(t * 3)) * h * 0.03, h * 0.06, '#ff5d8f', 'center', '#fff');
    }
  },
  { // 2. むこうの まちが おそわれている
    lines: [
      { who: '{N}', t: 'あれ？ むこうの まちから けむりが…！' },
      { t: 'とおくの まちが、モンスターに おそわれていた！' },
      { who: '{N}', t: 'たいへんだ！ たすけに いかなきゃ！' },
    ],
    draw(w, h, t, idx) {
      sky(w, h, '#ff9f6e', '#ffe2c4');
      const gy = h * 0.66;
      ctx.fillStyle = '#b58db0'; ctx.beginPath(); ctx.moveTo(-w * 0.05, gy); ctx.quadraticCurveTo(w * 0.27, h * 0.3, w * 0.6, gy); ctx.fill();
      if (Math.sin(t * 7) > 0.85) { const g = ctx.createRadialGradient(w * 0.27, h * 0.45, 0, w * 0.27, h * 0.45, h * 0.2); g.addColorStop(0, 'rgba(255,140,40,.7)'); g.addColorStop(1, 'rgba(255,140,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
      for (const [px, bw, bh] of [[0.15, 0.05, 0.06], [0.21, 0.04, 0.08], [0.27, 0.06, 0.05], [0.34, 0.045, 0.07]]) {
        const bx = w * px, base = h * 0.5;
        ctx.fillStyle = '#6d5378'; ctx.fillRect(bx, base - h * bh, w * bw, h * bh);
        tri(bx - w * 0.006, base - h * bh, bx + w * bw / 2, base - h * bh - h * 0.035, bx + w * bw + w * 0.006, base - h * bh, '#5a4364');
      }
      for (const px of [0.18, 0.27, 0.36]) smoke(w * px, h * 0.45, h * 0.025, t + px * 10, '90,80,90');
      for (let k = 0; k < 3; k++) {
        const mx = w * (0.22 + 0.1 * Math.sin(t * 1.3 + k * 2)), my = h * 0.5 - Math.abs(Math.sin(t * 5 + k)) * h * 0.05;
        circle(mx, my, h * 0.018, '#3a2440');
        tri(mx - h * 0.02, my - h * 0.005, mx, my - h * 0.04, mx + h * 0.02, my - h * 0.005, '#3a2440');
      }
      ctx.fillStyle = '#7fb85a'; ctx.fillRect(0, gy, w, h - gy);
      const hx = w * 0.74, hy = gy + h * 0.08, s = Math.min(h * 0.13, w * 0.12);
      drawHero(hx, hy, s, 'left', t * 14, idx >= 2);
      if (idx >= 0) {
        const pul = 1 + Math.sin(t * 10) * 0.08;
        circle(hx + s * 0.4, hy - s * 1.9, s * 0.32 * pul, '#fff');
        text('！', hx + s * 0.4, hy - s * 1.88, s * 0.42 * pul, '#e63946');
      }
    }
  },
  { // 3. となりの むらへ はしる
    lines: [{ t: '{N}は いそいで、ちかくの むらへ むかった。' }],
    draw(w, h, t) {
      sky(w, h, '#6ec3ff', '#d8f1ff');
      const gy = h * 0.66;
      const scroll = (speed, gap, fn) => { for (let x = -((t * speed) % gap) - gap; x < w + gap; x += gap) fn(x); };
      scroll(30, w * 0.35, x => tri(x, gy, x + w * 0.17, h * 0.28, x + w * 0.34, gy, '#a8c8de'));
      scroll(90, w * 0.3, x => ell(x, gy, w * 0.2, h * 0.12, '#86c268'));
      scroll(280, w * 0.33, x => drawTree(x, gy + h * 0.02, h * 0.11));
      ctx.fillStyle = '#a5d873'; ctx.fillRect(0, gy, w, h - gy);
      ctx.fillStyle = '#e3c48f'; ctx.fillRect(0, gy + h * 0.03, w, h * 0.1);
      ctx.fillStyle = '#f3dcae'; scroll(500, w * 0.12, x => ctx.fillRect(x, gy + h * 0.075, w * 0.05, h * 0.012));
      const hx = w * 0.45, hy = gy + h * 0.1, s = Math.min(h * 0.13, w * 0.12);
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3;
      for (let k = 0; k < 4; k++) { const ly = hy - s * (0.3 + k * 0.35), off = ((t * 3 + k * 0.3) % 1) * s; ctx.beginPath(); ctx.moveTo(hx - s * 0.8 - off, ly); ctx.lineTo(hx - s * 1.6 - off, ly); ctx.stroke(); }
      drawHero(hx, hy, s, 'right', t * 20, true);
    }
  },
  { // 4. むら
    lines: [
      { who: 'むらびと', t: 'この むらには、人と なかよしの モンスターが いるんだよ。' },
      { who: '{N}', t: 'モンスターと なかよし…？' },
    ],
    draw(w, h, t) {
      drawVillageBg(w, h, t);
      const gy = h * 0.66, s = Math.min(h * 0.13, w * 0.12);
      drawPomuru(w * 0.52, gy + h * 0.02, s * 0.35, t + 0.5, false, '#ffb3c7', '#d97a96');
      drawPomuru(w * 0.88, gy + h * 0.03, s * 0.32, t + 1.3, true, '#9fd4ff', '#5f9ccc');
      for (let k = 0; k < 3; k++) {
        const p = (t * 0.5 + k / 3) % 1;
        text('♥', w * (0.52 + 0.18 * k) % w, gy - h * 0.1 - p * h * 0.2, h * 0.04, `rgba(255,95,140,${1 - p})`);
      }
      drawVillager(w * 0.3, gy + h * 0.08, s, t);
      drawHero(w * 0.68, gy + h * 0.08, s, 'left');
    }
  },
  { // 5. そんちょう
    lines: [
      { who: 'そんちょう', t: 'となりの まちが モンスターに おそわれて いるとな？' },
      { who: '{N}', t: 'はい！ たすけたいんです！' },
      { who: 'そんちょう', t: 'よし。とりあえず この モンスターを つかって、となりの まちを まもってきて やれ！' },
      { who: 'そんちょう', t: 'それと、これも もっていけ。' },
    ],
    draw(w, h, t, idx, lt) {
      drawVillageBg(w, h, t);
      const gy = h * 0.66, s = Math.min(h * 0.13, w * 0.12);
      drawChief(w * 0.26, gy + h * 0.08, s, t);
      const p = idx < 2 ? 0 : idx > 2 ? 1 : ease(Math.min(1, lt / 1.2));
      drawPomuru(w * lerp(0.42, 0.58, p), gy + h * 0.08, s * 0.42, t);
      drawHero(w * 0.74, gy + h * 0.08, s, 'left');
      if (idx >= 3) drawNet(w * 0.34, gy - h * 0.05, s * 0.4, -0.4, '小');
    }
  },
  { // 6. もらった！
    lines: [
      { t: 'そんちょうから ポムルを かりた！' },
      { t: 'モンスターとりあみ［小］を もらった！' },
      { who: 'そんちょう', t: 'その あみは 小さい モンスター せんよう じゃ。' },
      { who: '{N}', t: 'よし、いこう ポムル！' },
      { who: 'ポムル', t: 'ポムー！' },
    ],
    draw(w, h, t, idx, lt) {
      ctx.fillStyle = '#2a3a6b'; ctx.fillRect(0, 0, w, h);
      ctx.save(); ctx.translate(w / 2, h * 0.4); ctx.rotate(t * 0.3);
      for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); tri(0, 0, -h * 0.08, -h * 1.2, h * 0.08, -h * 1.2, 'rgba(255,240,150,.18)'); }
      ctx.restore();
      const s = Math.min(h * 0.13, w * 0.12);
      const showNet = idx >= 1, pp = showNet ? ease(Math.min(1, idx > 1 ? 1 : lt / 0.6)) : 0;
      drawPomuru(w * lerp(0.5, 0.36, pp), h * 0.58, s * 0.9, t);
      if (showNet) drawNet(w * 0.66, h * 0.4, s * 0.9 * pp, Math.sin(t * 2) * 0.2, '小');
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU + t, r = h * (0.28 + 0.04 * Math.sin(t * 3 + k));
        star(w / 2 + Math.cos(a) * r * 1.4, h * 0.42 + Math.sin(a) * r, h * 0.02 * (1 + Math.sin(t * 6 + k) * 0.4), '#fff6a5');
      }
    }
  },
];

// ===== うらいちば ムービー（チュートリアルの あと） =====
const CARDS2 = [
  { // 1. きみには さいのうが ある
    lines: [
      { who: 'そんちょう', t: '{N}、あの ボスを つかまえて しまうとは…！' },
      { who: 'そんちょう', t: 'きみには さいのうが ある！' },
      { who: 'そんちょう', t: 'ついてきなさい。とっておきの ばしょへ つれていって やろう。' },
    ],
    draw(w, h, t, idx) {
      drawVillageBg(w, h, t);
      const gy = h * 0.66, s = Math.min(h * 0.13, w * 0.12);
      drawChief(w * 0.3, gy + h * 0.08, s, t);
      drawPomuru(w * 0.52, gy + h * 0.08, s * 0.38, t);
      drawHero(w * 0.7, gy + h * 0.08, s, 'left');
      if (idx === 1) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + t * 2; star(w * 0.7 + Math.cos(a) * s * 0.9, gy - s * 0.5 + Math.sin(a) * s * 0.9, s * 0.12, '#ffe066'); }
    }
  },
  { // 2. ひみつの いりぐち
    lines: [
      { t: 'そんちょうに つれられて、{N}は ほそい うらみちを すすんだ。' },
      { who: 'そんちょう', t: 'ここが「うらいちば」じゃ。クエストを うけられる ばしょ なんじゃよ。' },
    ],
    draw(w, h, t, idx) {
      sky(w, h, '#3b3f7a', '#e08a7a');
      const gy = h * 0.68;
      ctx.fillStyle = '#4a3b52'; ctx.fillRect(0, h * 0.15, w * 0.3, gy); ctx.fillRect(w * 0.7, h * 0.15, w * 0.3, gy);
      ctx.fillStyle = '#2a1e18'; rr(w * 0.38, h * 0.3, w * 0.24, gy - h * 0.3 + 4, w * 0.12); ctx.fill();
      const glow = ctx.createRadialGradient(w * 0.5, gy - h * 0.12, 0, w * 0.5, gy - h * 0.12, w * 0.14);
      glow.addColorStop(0, 'rgba(255,190,90,.9)'); glow.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = glow; ctx.fillRect(w * 0.36, h * 0.3, w * 0.28, gy - h * 0.3);
      ell(w * 0.4, h * 0.3, h * 0.025, h * 0.035, '#ff5a4e'); ell(w * 0.6, h * 0.3, h * 0.025, h * 0.035, '#ff5a4e');
      ctx.fillStyle = '#6b5a4a'; ctx.fillRect(0, gy, w, h - gy);
      const p = Math.min(1, t / 3.5), s = Math.min(h * 0.13, w * 0.12);
      drawChief(w * lerp(0.12, 0.42, ease(p)), gy + h * 0.08, s, t);
      drawHero(w * lerp(0.0, 0.3, ease(p)), gy + h * 0.08, s, 'right', t * 10, p < 1);
      if (idx >= 1) text('うらいちば', w * 0.5, h * 0.24, Math.min(h * 0.06, w * 0.07), '#ffe066', 'center', '#4a2500');
    }
  },
  { // 3. レンが くる
    lines: [
      { t: 'あかりが ゆれる、にぎやかな いちば だ。' },
      { who: 'レン', t: 'おーい！ きみが うわさの しんいり だね！' },
      { who: 'レン', t: 'レン だよ。この うらいちばの せんぱい なんだ。よろしく！' },
      { who: 'レン', t: 'ここでは クエストを うけたり、かじやで そうびを つくったり できるんだ。' },
    ],
    draw(w, h, t, idx, lt) {
      drawMarketBg(w, h, t);
      const gy = h * 0.7, s = Math.min(h * 0.13, w * 0.12);
      const p = idx < 1 ? 0 : idx > 1 ? 1 : ease(Math.min(1, lt / 1));
      drawRen(w * lerp(1.1, 0.68, p), gy + h * 0.1, s, t, true);
      drawChief(w * 0.15, gy + h * 0.1, s, t);
      drawHero(w * 0.36, gy + h * 0.1, s, 'right');
    }
  },
  { // 4. そうびが ない！ → そざいを もらう
    lines: [
      { who: 'レン', t: 'あれ？ きみ、そうびを なにも つけて ないじゃないか！' },
      { who: 'レン', t: 'それじゃ あぶないよ。この そざいを あげる！' },
      { t: 'てつの かけら ×3 と、じょうぶな かわ ×2 を もらった！' },
      { who: 'レン', t: 'かじやに もっていけば、そうびを つくって もらえるよ。' },
    ],
    draw(w, h, t, idx) {
      drawMarketBg(w, h, t);
      const gy = h * 0.7, s = Math.min(h * 0.13, w * 0.12);
      drawHero(w * 0.36, gy + h * 0.1, s, 'right');
      drawRen(w * 0.62, gy + h * 0.1, s, t, true);
      if (idx === 0) { const pul = 1 + Math.sin(t * 10) * 0.08; circle(w * 0.62 - s * 0.4, gy - s * 1.6, s * 0.3 * pul, '#fff'); text('？', w * 0.62 - s * 0.4, gy - s * 1.58, s * 0.4 * pul, '#1f9e8f'); }
      if (idx >= 2) {
        const bx = w * 0.5, by = h * 0.32;
        rr(bx - h * 0.2, by - h * 0.09, h * 0.4, h * 0.18, 14); ctx.fillStyle = 'rgba(255,252,242,.95)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
        drawMaterial('iron', bx - h * 0.1, by - h * 0.01, h * 0.08); text('×3', bx - h * 0.1, by + h * 0.055, h * 0.03, '#4a2500');
        drawMaterial('hide', bx + h * 0.1, by - h * 0.01, h * 0.08); text('×2', bx + h * 0.1, by + h * 0.055, h * 0.03, '#4a2500');
        for (let k = 0; k < 4; k++) star(bx + Math.cos(t * 2 + k * 1.6) * h * 0.24, by + Math.sin(t * 2 + k * 1.6) * h * 0.1, h * 0.015, '#ffe066');
      }
    }
  },
  { // 5. かじやで つくる
    lines: [
      { who: 'かじや', t: 'おう、しんいりか！ その そざいで そうびを つくって やるよ。' },
      { t: 'カン！ カン！ カン！' },
      { t: '「かけだしの よろい」が できた！' },
      { t: '「かけだしの こんぼう」が できた！' },
    ],
    draw(w, h, t, idx) {
      ctx.fillStyle = '#2b1f1a'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3d2c24'; for (let y = 0; y < h * 0.7; y += h * 0.08) for (let x = (y / (h * 0.08)) % 2 ? -w * 0.05 : 0; x < w; x += w * 0.1) { ctx.fillRect(x + 2, y + 2, w * 0.1 - 4, h * 0.08 - 4); }
      const fl = 0.7 + Math.sin(t * 9) * 0.15 + Math.sin(t * 21) * 0.1;
      ctx.fillStyle = '#555'; rr(w * 0.05, h * 0.3, w * 0.28, h * 0.4, 18); ctx.fill();
      const g = ctx.createRadialGradient(w * 0.19, h * 0.55, 0, w * 0.19, h * 0.55, w * 0.25);
      g.addColorStop(0, `rgba(255,170,50,${fl})`); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.fillRect(0, h * 0.2, w * 0.5, h * 0.6);
      ell(w * 0.19, h * 0.56, w * 0.07, h * 0.06, '#ffcf5a');
      const gy = h * 0.7;
      ctx.fillStyle = '#4a3a30'; ctx.fillRect(0, gy, w, h - gy);
      const s = Math.min(h * 0.13, w * 0.12), ax = w * 0.55;
      ctx.fillStyle = '#5a5f66'; ctx.beginPath(); ctx.moveTo(ax - s * 0.6, gy - s * 0.55); ctx.lineTo(ax + s * 0.7, gy - s * 0.55); ctx.lineTo(ax + s * 0.4, gy - s * 0.35); ctx.lineTo(ax - s * 0.4, gy - s * 0.35); ctx.fill();
      ctx.fillRect(ax - s * 0.2, gy - s * 0.35, s * 0.4, s * 0.35);
      const hitting = idx === 1;
      drawSmith(ax + s * 1.0, gy + h * 0.08, s * 1.1, t, hitting || idx === 0);
      if (hitting && Math.sin(t * 4) > 0.7) for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.35; star(ax + Math.cos(a) * s * 0.7, gy - s * 0.6 + Math.sin(a) * s * 0.5, s * 0.08, '#ffd23f'); }
      drawHero(w * 0.85, gy + h * 0.08, s * 0.8, 'left');
      if (idx >= 2) {
        const bx = w * 0.5, by = h * 0.22;
        rr(bx - h * 0.22, by - h * 0.1, h * 0.44, h * 0.2, 14); ctx.fillStyle = 'rgba(255,252,242,.95)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
        ctx.fillStyle = '#b07a45'; rr(bx - h * 0.15, by - h * 0.06, h * 0.1, h * 0.11, h * 0.025); ctx.fill();
        circle(bx - h * 0.15, by - h * 0.05, h * 0.022, '#8d6a4a'); circle(bx - h * 0.05, by - h * 0.05, h * 0.022, '#8d6a4a');
        if (idx >= 3) { ctx.save(); ctx.translate(bx + h * 0.1, by); ctx.rotate(-0.6); ctx.fillStyle = '#8b5a2b'; rr(-h * 0.012, -h * 0.07, h * 0.024, h * 0.14, 3); ctx.fill(); ctx.fillStyle = '#6b4220'; rr(-h * 0.022, -h * 0.085, h * 0.044, h * 0.05, 5); ctx.fill(); ctx.restore(); }
      }
    }
  },
  { // 6. そうびして ステータス アップ
    lines: [
      { t: '{N}は そうびを みに つけた！', fx: () => { G.gear = true; } },
      { t: 'なかまの モンスター みんなの ステータスが すこし アップした！', fx: () => { G.bonus = { ...GEAR_BONUS }; } },
    ],
    draw(w, h, t, idx, lt) {
      ctx.fillStyle = '#25305e'; ctx.fillRect(0, 0, w, h);
      ctx.save(); ctx.translate(w * 0.3, h * 0.45); ctx.rotate(t * 0.3);
      for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); tri(0, 0, -h * 0.07, -h * 1.1, h * 0.07, -h * 1.1, 'rgba(255,240,150,.16)'); }
      ctx.restore();
      const s = Math.min(h * 0.16, w * 0.15);
      drawHero(w * 0.3, h * 0.62, s, 'down');
      drawPomuru(w * 0.15, h * 0.64, s * 0.3, t);
      drawDongora(w * 0.45, h * 0.65, s * 0.38, t, true);
      if (idx >= 1) {
        const px = w * 0.56, py = h * 0.14, pw = w * 0.4, ph = h * 0.46, fp = Math.min(h * 0.05, pw * 0.09);
        const p = idx > 1 ? 1 : ease(Math.min(1, lt / 0.5));
        ctx.save(); ctx.globalAlpha = p;
        rr(px, py, pw, ph, 16); ctx.fillStyle = 'rgba(255,252,242,.96)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
        text('なかま みんな', px + pw / 2, py + ph * 0.15, fp, '#4a2500');
        const rows = [['HP', `40 → ${40 + GEAR_BONUS.hp}`], ['こうげき', `+${GEAR_BONUS.atk}`], ['ぼうぎょ', `+${GEAR_BONUS.def}`]];
        rows.forEach(([k, v], i) => {
          const ry = py + ph * (0.38 + i * 0.2);
          text(k, px + pw * 0.1, ry, fp * 0.9, '#4a2500', 'left');
          text(v + ' ▲', px + pw * 0.9, ry, fp * 0.9, '#2f9e44', 'right');
        });
        ctx.restore();
      }
    }
  },
  { // 7. まだ よわい → いっしょに そざいあつめへ
    lines: [
      { who: 'レン', t: 'うんうん、にあってる！ …でも、その そうびは まだ あまり つよくないね。' },
      { who: 'レン', t: 'こんぼうも、もうちょっと つよい ものが ほしいなあ。' },
      { who: 'レン', t: 'そうだ！ いっしょに そざいを あつめに いこう！' },
      { who: '{N}', t: 'うん！ いこう、レン！' },
    ],
    draw(w, h, t, idx) {
      drawMarketBg(w, h, t);
      const gy = h * 0.7, s = Math.min(h * 0.13, w * 0.12);
      drawHero(w * 0.36, gy + h * 0.1, s, 'right', t * 12, idx >= 3);
      drawRen(w * 0.62, gy + h * 0.1, s, t, true);
      drawPomuru(w * 0.2, gy + h * 0.1, s * 0.35, t);
      if (idx >= 2) text('！', w * 0.62, gy - s * 1.9, s * 0.5, '#ffe066', 'center', '#4a2500');
    }
  },
];

const Movie = {
  i: 0, t: 0, tr: -1, snap: [0, 0], cards: CARDS, after: () => go(Field),
  play(cards, after) { this.cards = cards; this.after = after; go(this); },
  enter() { this.i = 0; this.tr = -1; this.startCard(); },
  startCard() { this.t = 0; Talk.say(this.cards[this.i].lines, () => this.nextCard()); },
  nextCard() {
    if (this.i >= this.cards.length - 1) { Fade.to(() => this.after()); return; }
    this.snap = [this.cards[this.i].lines.length - 1, 99]; this.tr = 0; this.oldT = this.t;
  },
  skip() {
    // とばしても、セリフの なかで おきる こと（そうびなど）は すませる
    for (let k = this.i; k < this.cards.length; k++) for (const l of this.cards[k].lines) if (l.fx) l.fx();
    Talk.clear(); Fade.to(() => this.after());
  },
  update(dt) {
    this.t += dt;
    if (this.tr >= 0) { this.tr += dt / 0.8; if (this.tr >= 1) { this.tr = -1; this.i++; this.startCard(); } }
  },
  draw() {
    const m = Math.max(8, Math.min(W, H) * 0.035), x0 = m, y0 = m, w = W - m * 2, h = H - m * 2;
    ctx.fillStyle = '#9a6533'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(70,40,15,.25)'; ctx.lineWidth = 2;
    for (let y = 6; y < H; y += 11) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + Math.sin(y) * 3); ctx.stroke(); }
    const card = (k, offX, t, idx, lt) => {
      ctx.save(); ctx.translate(x0 + offX, y0); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
      this.cards[k].draw(w, h, t, idx, lt); ctx.restore();
    };
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    if (this.tr >= 0) {
      const p = ease(Math.min(1, this.tr));
      card(this.i + 1, 0, 0, -1, 0);
      card(this.i, -p * (w + m * 2), this.oldT + this.tr * 0.8, this.snap[0], this.snap[1]);
    } else card(this.i, 0, this.t, Talk.idx, Talk.lt);
    ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = '#5a3412'; ctx.strokeRect(x0, y0, w, h);
    if (this.tr < 0) {
      const bh = clamp(H * 0.22, 92, 150);
      Talk.draw(x0 + 10, y0 + h - bh - 10, w - 20, bh);
    }
    text(`${this.i + 1} / ${this.cards.length}`, x0 + 34, y0 + 22, 14, '#fff', 'center', 'rgba(0,0,0,.5)');
    button(x0 + w - 118, y0 + 8, 110, 38, 'スキップ ▶▶', () => this.skip(), { col: 'rgba(255,255,255,.85)', px: 15 });
  }
};

// ===== フィールド（おそわれた まち） =====
const WW = 1800, WH = 1400;
const HOUSES = [
  { x: 150, y: 430, w: 200, h: 170, roof: '#c0504d', dmg: true }, { x: 420, y: 430, w: 200, h: 170, roof: '#4d79c0', dmg: false },
  { x: 1180, y: 430, w: 200, h: 170, roof: '#6aa84f', dmg: true }, { x: 1450, y: 430, w: 200, h: 170, roof: '#c0504d', dmg: false },
  { x: 200, y: 960, w: 200, h: 170, roof: '#b8864b', dmg: false }, { x: 1400, y: 960, w: 200, h: 170, roof: '#4d79c0', dmg: true },
  { x: 560, y: 1040, w: 180, h: 150, roof: '#8e6bbf', dmg: true }, { x: 1060, y: 1040, w: 180, h: 150, roof: '#c0504d', dmg: false },
];
const TREES = [[100, 160], [300, 210], [1500, 190], [1700, 300], [150, 1320], [1650, 1270], [690, 240], [1110, 230], [80, 720], [1720, 720], [460, 1320], [1340, 1330]];
const BOSS_POS = { x: 900, y: 330 }, FOG_R = 165;

const Field = {
  ready: false, pending: null,
  reset() {
    this.hero = { x: 900, y: 1250, dir: 'up', ph: 0, moving: false };
    this.foes = [
      { kind: 'igabon', hx: 520, hy: 820, x: 520, y: 820, ph: 0, alive: true },
      { kind: 'igabon', hx: 1280, hy: 840, x: 1280, y: 840, ph: 2.1, alive: true },
      { kind: 'dongora', hx: BOSS_POS.x, hy: BOSS_POS.y, x: BOSS_POS.x, y: BOSS_POS.y, ph: 0, alive: true, boss: true },
    ];
    this.t = 0; this.inv = 0; this.toast = null; this.fogA = 1;
    this.stick = { id: null, dx: 0, dy: 0 };
    this.ready = true;
  },
  zakoLeft() { return this.foes.filter(f => !f.boss && f.alive).length; },
  enter() {
    if (!this.ready) {
      this.reset(); Save.write('field');
      Talk.say([
        { t: 'おそわれた まちに ついた！' },
        { t: 'ひだりしたの スティックで {N}を うごかそう。（パソコンは やじるしキーでも うごくよ）' },
        { t: 'モンスターに ぶつかると、たたかいが はじまるよ。' },
        { t: 'まずは、ざこモンスターの イガボンを 2ひき たおそう！' },
      ]);
    } else if (this.pending) { Talk.say(this.pending); this.pending = null; }
    this.stick.id = null; this.stick.dx = this.stick.dy = 0;
  },
  onWin(foe) {
    foe.alive = false; this.inv = 1.2;
    if (!foe.boss && this.zakoLeft() === 0) this.pending = [{ t: 'ボスの まわりの くろい けむりが はれた！' }, { t: 'ボスの ドンゴラに ちかづこう！' }];
  },
  stickGeo() { const R = clamp(Math.min(W, H) * 0.11, 48, 80); return { R, cx: R + 28, cy: H - R - 28 }; },
  down(x, y, id) {
    if (Talk.active()) return false;
    const g = this.stickGeo();
    if (Math.hypot(x - g.cx, y - g.cy) < g.R * 1.8) { this.stick.id = id; this.move(x, y, id); return true; }
    return false;
  },
  move(x, y, id) {
    if (id !== this.stick.id) return;
    const g = this.stickGeo(); let dx = (x - g.cx) / g.R, dy = (y - g.cy) / g.R;
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    this.stick.dx = dx; this.stick.dy = dy;
  },
  up(id) { if (id === this.stick.id) { this.stick.id = null; this.stick.dx = this.stick.dy = 0; } },
  blocked(x, y) {
    const r = 16;
    if (x < 40 || y < 40 || x > WW - 40 || y > WH - 40) return true;
    for (const b of HOUSES) if (x > b.x + 10 - r && x < b.x + b.w - 10 + r && y > b.y + b.h * 0.45 - r && y < b.y + b.h + r * 0.3) return true;
    for (const [tx, ty] of TREES) if (Math.hypot(x - tx, y - ty) < 26 + r) return true;
    return false;
  },
  update(dt) {
    this.t += dt; this.inv = Math.max(0, this.inv - dt);
    if (this.toast) { this.toast.time -= dt; if (this.toast.time <= 0) this.toast = null; }
    if (this.zakoLeft() === 0) this.fogA = Math.max(0, this.fogA - dt);
    for (const f of this.foes) {
      if (f.boss) continue;
      f.x = f.hx + Math.sin(this.t * 0.8 + f.ph) * 70; f.y = f.hy + Math.cos(this.t * 0.6 + f.ph) * 35;
    }
    const h = this.hero;
    let dx = this.stick.dx, dy = this.stick.dy;
    if (keys.ArrowLeft || keys.a) dx = -1; if (keys.ArrowRight || keys.d) dx = 1;
    if (keys.ArrowUp || keys.w) dy = -1; if (keys.ArrowDown || keys.s) dy = 1;
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    h.moving = !Talk.active() && !Fade.dir && l > 0.15;
    if (!h.moving) return;
    const sp = 240 * Math.min(1, l) * dt;
    if (!this.blocked(h.x + dx * sp, h.y)) h.x += dx * sp;
    if (!this.blocked(h.x, h.y + dy * sp)) h.y += dy * sp;
    h.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    h.ph += dt * 14;
    // ボスの けむり
    const bd = Math.hypot(h.x - BOSS_POS.x, h.y - BOSS_POS.y);
    if (this.zakoLeft() > 0 && bd < FOG_R) {
      const k = FOG_R / Math.max(1, bd); h.x = BOSS_POS.x + (h.x - BOSS_POS.x) * k; h.y = BOSS_POS.y + (h.y - BOSS_POS.y) * k;
      if (!this.toast) this.toast = { t: 'くろい けむりで ちかづけない！ さきに イガボンを たおそう！', time: 2.5 };
    }
    if (this.inv > 0) return;
    for (const f of this.foes) {
      if (!f.alive) continue;
      if (f.boss && this.zakoLeft() > 0) continue;
      if (Math.hypot(h.x - f.x, h.y - (f.y - 10)) < (f.boss ? 70 : 48)) { this.inv = 99; Fade.to(() => Battle.begin(f)); break; }
    }
  },
  target() {
    const z = this.foes.filter(f => f.alive && (!f.boss || this.zakoLeft() === 0));
    let best = null, bd = 1e9;
    for (const f of z) { const d = Math.hypot(f.x - this.hero.x, f.y - this.hero.y); if (d < bd) { bd = d; best = f; } }
    return best;
  },
  draw() {
    const h = this.hero, t = this.t;
    const ZS = clamp(Math.min(W, H) / 560, 0.62, 1.5);
    ctx.fillStyle = '#2f6b3a'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(ZS, ZS); ctx.translate(-h.x, -h.y);
    const vx0 = h.x - W / 2 / ZS - 100, vy0 = h.y - H / 2 / ZS - 100, vx1 = h.x + W / 2 / ZS + 100, vy1 = h.y + H / 2 / ZS + 100;
    // もりの そと
    for (let gx = Math.floor(vx0 / 90) * 90; gx < vx1; gx += 90) for (let gy = Math.floor(vy0 / 90) * 90; gy < vy1; gy += 90) {
      if (gx > -60 && gx < WW + 60 && gy > -60 && gy < WH + 60) continue;
      const k = hash(gx, gy); circle(gx + k % 40, gy + (k >> 3) % 40, 55, k % 2 ? '#2a5e33' : '#367a40');
    }
    ctx.fillStyle = '#94d36b'; ctx.fillRect(0, 0, WW, WH);
    for (let gx = Math.max(0, Math.floor(vx0 / 70) * 70); gx < Math.min(WW, vx1); gx += 70) for (let gy = Math.max(0, Math.floor(vy0 / 70) * 70); gy < Math.min(WH, vy1); gy += 70) {
      const k = hash(gx, gy); if (k % 3) continue;
      const px = gx + k % 50, py = gy + (k >> 2) % 50;
      ctx.strokeStyle = '#6fb34a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 6, py); ctx.lineTo(px - 2, py - 10); ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 12); ctx.moveTo(px + 6, py); ctx.lineTo(px + 9, py - 8); ctx.stroke();
    }
    ctx.fillStyle = '#e0c28a'; ctx.fillRect(860, 330, 80, WH - 330); ctx.fillRect(160, 780, 1480, 80);
    circle(BOSS_POS.x, BOSS_POS.y, 215, '#d6cdb8'); ctx.strokeStyle = '#b9ae96'; ctx.lineWidth = 6;
    for (const r of [80, 150]) { ctx.beginPath(); ctx.arc(BOSS_POS.x, BOSS_POS.y, r, 0, TAU); ctx.stroke(); }
    // おくゆきの じゅんに ならべる
    const list = [];
    for (const b of HOUSES) list.push({ y: b.y + b.h, f: () => drawHouse(b.x, b.y, b.w, b.h, b.roof, b.dmg, t) });
    for (const [tx, ty] of TREES) list.push({ y: ty, f: () => drawTree(tx, ty, 46) });
    for (const f of this.foes) if (f.alive) list.push({
      y: f.y, f: () => {
        const flip = f.boss ? h.x > f.x : h.x < f.x;
        if (f.boss) drawDongora(f.x, f.y, 52, t, flip); else drawIgabon(f.x, f.y, 26, t + f.ph, flip);
        if (f.boss) text('ボス', f.x, f.y - 130, 24, '#fff', 'center', '#b0241b');
      }
    });
    list.push({ y: h.y, f: () => { if (this.inv > 0 && this.inv < 99 && Math.sin(t * 40) > 0) return; drawHero(h.x, h.y, 44, h.dir, h.ph, h.moving); } });
    list.sort((a, b) => a.y - b.y).forEach(o => o.f());
    if (this.fogA > 0) {
      ctx.save(); ctx.globalAlpha = this.fogA;
      const g = ctx.createRadialGradient(BOSS_POS.x, BOSS_POS.y, 40, BOSS_POS.x, BOSS_POS.y, FOG_R + 20);
      g.addColorStop(0, 'rgba(60,20,80,.55)'); g.addColorStop(0.8, 'rgba(60,20,80,.45)'); g.addColorStop(1, 'rgba(60,20,80,0)');
      ctx.fillStyle = g; circle(BOSS_POS.x, BOSS_POS.y, FOG_R + 20, g);
      for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + t * 0.6; circle(BOSS_POS.x + Math.cos(a) * FOG_R * 0.9, BOSS_POS.y + Math.sin(a) * FOG_R * 0.9, 30 + Math.sin(t * 2 + k) * 8, 'rgba(50,15,70,.45)'); }
      ctx.restore();
    }
    // みちあんない の やじるし
    const tg = this.target();
    if (tg && !Talk.active()) {
      const a = Math.atan2(tg.y - h.y, tg.x - h.x), d = Math.hypot(tg.y - h.y, tg.x - h.x);
      if (d > 230) {
        ctx.save(); ctx.translate(h.x + Math.cos(a) * 80, h.y - 30 + Math.sin(a) * 80); ctx.rotate(a);
        ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.3; tri(22, 0, -10, -16, -10, 16, '#ffdd33'); ctx.restore();
      }
    }
    ctx.restore();
    // がめんの うえ
    const goal = this.zakoLeft() > 0 ? `もくひょう：イガボンを たおそう（のこり ${this.zakoLeft()}ひき）` : 'もくひょう：ボスの ドンゴラを つかまえよう！';
    const gp = fitPx(goal, clamp(Math.min(W, H) * 0.04, 13, 20), W - 48);
    ctx.font = font(gp); const gw = ctx.measureText(goal).width + gp * 2;
    rr(W / 2 - gw / 2, 12, gw, gp * 2.1, 14); ctx.fillStyle = 'rgba(30,40,60,.75)'; ctx.fill();
    text(goal, W / 2, 12 + gp * 1.05, gp, '#fff');
    if (this.toast) {
      const tp = fitPx(this.toast.t, gp * 0.9, W - 48);
      ctx.font = font(tp); const tw = ctx.measureText(this.toast.t).width + tp * 2;
      rr(W / 2 - tw / 2, 20 + gp * 2.4, tw, gp * 2.1, 14); ctx.fillStyle = 'rgba(176,36,27,.9)'; ctx.fill();
      text(this.toast.t, W / 2, 20 + gp * 3.45, tp, '#fff');
    }
    // スティック
    const s = this.stickGeo();
    circle(s.cx, s.cy, s.R, 'rgba(255,255,255,.28)');
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(s.cx, s.cy, s.R, 0, TAU); ctx.stroke();
    circle(s.cx + this.stick.dx * s.R * 0.6, s.cy + this.stick.dy * s.R * 0.6, s.R * 0.45, this.stick.id !== null ? 'rgba(255,221,51,.95)' : 'rgba(255,255,255,.85)');
    if (Talk.active()) { const [bx, by, bw, bh] = talkBox(); Talk.draw(bx, by, bw, bh); }
  }
};

// ===== たたかい（コマンドを えらぶ ターンせい） =====
// ぞくせい：くさ → いわ → かぜ → くさ の じゃんけん。ひかり と ふつう は どれにも ふつう
const TYPES = {
  normal: { name: 'ふつう', col: '#9a9aa6' },
  kusa: { name: 'くさ', col: '#3fa34d' },
  iwa: { name: 'いわ', col: '#9c6b3c' },
  kaze: { name: 'かぜ', col: '#3a9fd6' },
  hikari: { name: 'ひかり', col: '#e0a800' },
};
const STRONG = { kusa: 'iwa', iwa: 'kaze', kaze: 'kusa' }; // ひだりが みぎに つよい
function typeEff(atk, def) {
  if (STRONG[atk] === def) return 1.5;
  if (STRONG[def] === atk) return 0.67;
  return 1;
}
const MON_TYPE = { pomuru: 'kusa', igabon: 'kusa', dongora: 'iwa', toruppy: 'kaze', yellowl: 'hikari' };
// わざ：type ぞくせい、pow いりょく、acc めいちゅう（1＝かならず）、heal かいふく、fx その ほかの こうか
//   fx：guard＝つぎに うける ダメージが はんぶん、atkdown＝あいての こうげきを 2 さげる
const FX_TEXT = { guard: 'つぎの ダメージ はんぶん', atkdown: 'あいての こうげき ダウン' };
const FOES = {
  igabon: { name: 'イガボン', hp: 18, lv: 2, moves: [{ n: 'トゲトゲころがり', type: 'kusa', pow: 4, acc: 1 }, { n: 'イガイガタックル', type: 'normal', pow: 3, acc: 1 }] },
  dongora: { name: 'ドンゴラ', hp: 48, lv: 4, moves: [{ n: 'いわおとし', type: 'iwa', pow: 7, acc: 0.9 }, { n: 'しっぽバシン', type: 'normal', pow: 5, acc: 1 }] },
  // ここから 本人が かいた モンスター（参考資料/ に 原画）
  yellowl: { name: 'イエロール', hp: 24, lv: 3, catchBase: 0.35, moves: [{ n: 'ぐるぐるローリング', type: 'hikari', pow: 5, acc: 1 }, { n: 'こしに てを あてて タックル', type: 'normal', pow: 4, acc: 1 }] },
  toruppy: { name: 'トルピー', hp: 60, lv: 6, catchBase: 0.15, moves: [{ n: 'ギザギザつばさ', type: 'kaze', pow: 7, acc: 1 }, { n: 'やじるしストライク', type: 'normal', pow: 8, acc: 0.85 }, { n: 'キバキバかみつき', type: 'normal', pow: 6, acc: 1 }] },
};
// なかまに なった ときの つよさと わざ
const ALLIES = {
  pomuru: {
    hp: 40, lv: 5, moves: [
      { n: 'ころころアタック', type: 'normal', pow: 8, acc: 1 },
      { n: 'はっぱシュート', type: 'kusa', pow: 11, acc: 0.8 },
      { n: 'げんきチャージ', type: 'kusa', heal: 15 },
    ]
  },
  dongora: {
    hp: 48, lv: 4, moves: [
      { n: 'しっぽバシン', type: 'normal', pow: 7, acc: 1 },
      { n: 'いわおとし', type: 'iwa', pow: 11, acc: 0.85 },
      { n: 'かたい いわの かまえ', type: 'iwa', fx: 'guard' },
    ]
  },
  toruppy: {
    hp: 55, lv: 6, moves: [
      { n: 'ギザギザつばさ', type: 'kaze', pow: 9, acc: 1 },
      { n: 'やじるしストライク', type: 'normal', pow: 13, acc: 0.8 },
      { n: 'キバキバかみつき', type: 'normal', pow: 7, acc: 0.95, fx: 'atkdown' },
    ]
  },
  yellowl: {
    hp: 32, lv: 3, moves: [
      { n: 'ぐるぐるローリング', type: 'hikari', pow: 7, acc: 1 },
      { n: 'にっこりパワー', type: 'hikari', heal: 12 },
      { n: 'ピカッと にらめっこ', type: 'hikari', fx: 'atkdown', acc: 1 },
    ]
  },
  igabon: { hp: 25, lv: 2, moves: [{ n: 'トゲトゲころがり', type: 'kusa', pow: 6, acc: 1 }] },
};
// わざの せつめい（いりょく・めいちゅう・こうか）
function moveInfo(m) {
  const out = [];
  if (m.pow) out.push(`いりょく ${m.pow}`);
  if (m.pow || m.fx === 'atkdown') out.push(`めいちゅう ${Math.round((m.acc || 1) * 100)}%`);
  if (m.heal) out.push(`HPを ${m.heal} かいふく`);
  if (m.fx) out.push(FX_TEXT[m.fx]);
  return out.join('・');
}
// ぞくせいの しるし（いろつきの ちいさな ふだ）
function typeChip(type, x, y, px) {
  const t = TYPES[type]; ctx.font = font(px);
  const w = ctx.measureText(t.name).width + px * 0.9;
  rr(x, y - px * 0.75, w, px * 1.5, px * 0.4); ctx.fillStyle = t.col; ctx.fill();
  text(t.name, x + w / 2, y + 1, px, '#fff');
  return w;
}
const ALLY_FLIP = { dongora: true };            // ひだりむきに かいて ある モンスター
const ALLY_SCALE = { pomuru: 1.05, dongora: 0.85, toruppy: 0.62, yellowl: 0.85, igabon: 0.9 };
// とりあみ：大きさ せんよう（［小］は 小さい モンスター だけ）
const NETS = {
  s: { short: '［小］', price: 100 },
  m: { short: '［中］', price: 300 },
  l: { short: '［大］', price: 800 },
};
const SIZE_NAME = { s: '小さい', m: '中くらいの', l: '大きい' };

function addMonster(kind) {
  const m = { uid: ++G.uid, kind };
  G.box.push(m);
  if (G.team.length < 3) G.team.push(m.uid);
  return m;
}
function teamMons() { return G.team.map(u => G.box.find(m => m.uid === u)).filter(Boolean); }
function makeAlly(m) {
  const d = ALLIES[m.kind], mx = d.hp + G.bonus.hp;
  return { uid: m.uid, kind: m.kind, type: MON_TYPE[m.kind], name: MONSTER_NAME[m.kind], hp: mx, max: mx, dhp: mx, lv: d.lv, moves: d.moves };
}

const Battle = {
  // from：たたかいの まえに いた ばめん（Field＝チュートリアル、Hunt＝ふつうの クエスト）
  begin(foe, from = Field) {
    const d = FOES[foe.kind];
    this.foe = foe; this.from = from; this.tut = from === Field;
    this.e = { kind: foe.kind, type: MON_TYPE[foe.kind], name: d.name, hp: d.hp, max: d.hp, dhp: d.hp, lv: d.lv, boss: !!foe.boss, moves: d.moves, catchBase: d.catchBase || 0.2, size: d.size || 's', atkDown: 0 };
    this.allies = teamMons().map(makeAlly); this.a = this.allies[0];
    this.phase = 'talk'; this.fx = { aL: 0, eL: 0, aH: 0, eH: 0, eF: 0 }; this.pops = []; this.t = 0; this.guard = false;
    this.halfTip = false; this.netHint = false; this.cap = null; this.forced = false;
    go(this);
    const lines = [{ t: this.e.boss ? `ボスの ${d.name}が あらわれた！` : `${d.name}が あらわれた！` }, { who: '{N}', t: `いけっ、${this.a.name}！` }];
    if (this.tut) {
      if (!this.e.boss && G.firstBattle) {
        G.firstBattle = false;
        lines.push({ who: 'そんちょうの こえ', t: '「わざ」を えらんで たたかうんじゃ！' }, { who: 'そんちょうの こえ', t: `${this.a.name}と あいてが、こうたいで こうげき するぞ。` });
      }
      if (this.e.boss) lines.push(
        { who: 'そんちょうの こえ', t: 'あいつが ボスじゃ！ たおすのではなく、つかまえるんじゃ！' },
        { who: 'そんちょうの こえ', t: 'モンスターは、よわい モンスターほど つかまえやすい。' },
        { who: 'そんちょうの こえ', t: 'つよい モンスターでも、よわらせれば どんな モンスターでも つかまえやすく なるんじゃ。' },
        { who: 'そんちょうの こえ', t: 'わざで よわらせてから、モンスターとりあみ［小］で つかまえよう！' },
        { who: 'そんちょうの こえ', t: 'ドンゴラは「いわ」の モンスター。「くさ」の わざが よく きくぞ！ わざの ボタンの ◎を みるんじゃ。' },
      );
    } else if (this.e.boss) lines.push({ who: 'レン', t: 'ボスだ！ たおしても いいし、よわらせて あみで つかまえても いいよ！' });
    Talk.say(lines, () => this.cmd());
  },
  cmd() { this.phase = 'cmd'; },
  pop(who, s, col) { this.pops.push({ who, s, col, t: 0 }); },
  useMove(m) {
    this.phase = 'talk';
    const a = this.a, e = this.e, lines = [{ t: `${a.name}の ${m.n}！`, fx: () => { this.fx.aL = 0.4; } }];
    if (m.heal) lines.push({ t: `${a.name}の げんきが ${m.heal} もどった！`, fx: () => { a.hp = Math.min(a.max, a.hp + m.heal); this.pop('a', '+' + m.heal, '#2fbf4a'); } });
    else if (m.fx === 'guard') lines.push({ t: `${a.name}は みを まもる かまえ！ つぎに うける ダメージが はんぶんに なる。`, fx: () => { this.guard = true; this.pop('a', 'ガード', '#3a9fd6'); } });
    else if (Math.random() > (m.acc || 1)) lines.push({ t: 'こうげきは はずれた！', fx: () => this.pop('e', 'ミス', '#888') });
    else {
      if (m.pow) {
        const ef = typeEff(m.type, e.type), d = Math.max(1, Math.round(m.pow * ef) + rnd(-1, 1) + G.bonus.atk);
        lines.push({ t: `${e.name}に ${d}の ダメージ！`, fx: () => { e.hp = Math.max(e.boss && this.tut ? 1 : 0, e.hp - d); this.fx.eH = 0.45; this.pop('e', '-' + d, '#e63946'); } });
        if (ef > 1) lines.push({ t: 'よく きいた！' });
        else if (ef < 1) lines.push({ t: 'あまり きいて いない みたい…' });
      }
      if (m.fx === 'atkdown') lines.push({ t: `${e.name}の こうげきが さがった！`, fx: () => { e.atkDown = Math.min(4, e.atkDown + 2); this.pop('e', 'こうげき↓', '#3a9fd6'); } });
    }
    Talk.say(lines, () => this.afterAlly());
  },
  afterAlly() {
    const e = this.e;
    if (e.hp <= 0) return this.win();
    if (!this.tut) {
      if (e.hp <= e.max / 2 && !this.halfTip && G.nets[e.size] > 0) {
        this.halfTip = true; this.netHint = true;
        return Talk.say([{ who: 'レン', t: `${e.name}が よわってきた！ いまなら あみで つかまえやすいよ！` }], () => this.enemyTurn());
      }
      return this.enemyTurn();
    }
    if (e.boss) {
      const say = [];
      if (e.hp <= e.max / 2 && !this.halfTip) {
        this.halfTip = true; this.netHint = true;
        say.push({ who: 'そんちょうの こえ', t: 'ドンゴラが よわってきたぞ！' }, { who: 'そんちょうの こえ', t: 'いまじゃ！ 「とりあみ」を えらんで、モンスターとりあみ［小］を なげるんじゃ！' });
      } else if (e.hp === 1) {
        this.netHint = true;
        say.push({ t: 'ドンゴラは ふんばった！' }, { who: 'そんちょうの こえ', t: 'もう ひといきじゃ！ 「とりあみ」で つかまえるんじゃ！' });
      }
      if (say.length) return Talk.say(say, () => this.enemyTurn());
    }
    this.enemyTurn();
  },
  enemyTurn() {
    const a = this.a, e = this.e, m = e.moves[rnd(0, e.moves.length - 1)], ef = typeEff(m.type, a.type);
    const lines = [{ t: `${e.name}の ${m.n}！`, fx: () => { this.fx.eL = 0.4; } }];
    if (Math.random() > (m.acc || 1)) lines.push({ t: 'こうげきは はずれた！', fx: () => this.pop('a', 'ミス', '#888') });
    else {
      let d = Math.max(1, Math.round(m.pow * ef) + rnd(-1, 1) - G.bonus.def - e.atkDown);
      if (this.guard) { d = Math.max(1, Math.round(d / 2)); this.guard = false; lines.push({ t: 'かまえで ダメージが へった！' }); }
      lines.push({ t: `${a.name}に ${d}の ダメージ！`, fx: () => { a.hp = Math.max(0, a.hp - d); this.fx.aH = 0.45; this.pop('a', '-' + d, '#e63946'); } });
      if (ef > 1) lines.push({ t: 'よく きいた！' });
      else if (ef < 1) lines.push({ t: 'あまり きいて いない みたい…' });
    }
    Talk.say(lines, () => this.afterEnemy());
  },
  // なかまが たおれたら：ほかに げんきな なかまが いれば こうたい、いなければ たすけて もらう（まけて おわりには しない）
  afterEnemy() {
    const a = this.a;
    if (a.hp > 0) return this.cmd();
    if (this.tut) return Talk.say([
      { t: `${a.name}は たおれそうだ…！` },
      { who: 'そんちょうの こえ', t: `まけるな、${a.name}！ がんばれ！` },
      { t: `${a.name}の げんきが もどった！`, fx: () => { a.hp = a.max; this.pop('a', 'げんき！', '#2fbf4a'); } },
    ], () => this.cmd());
    if (this.allies.some(x => x.hp > 0)) return Talk.say([{ t: `${a.name}は たおれて しまった！` }, { who: 'レン', t: 'ほかの なかまと こうたい しよう！' }], () => this.openSwap(true));
    Talk.say([
      { t: 'なかまが みんな たおれそうだ…！' },
      { who: 'レン', t: 'まかせて！ げんきの でる くすりを つかうよ！' },
      { t: 'なかま みんなの げんきが もどった！', fx: () => { for (const x of this.allies) x.hp = x.max; this.pop('a', 'げんき！', '#2fbf4a'); } },
    ], () => this.cmd());
  },
  openSwap(forced) {
    if (!this.allies.some(x => x !== this.a && x.hp > 0)) {
      this.phase = 'talk';
      return Talk.say([{ t: this.allies.length > 1 ? 'こうたい できる げんきな なかまが いない！' : 'いっしょに きている なかまが いない！' }], () => this.cmd());
    }
    this.forced = forced; this.phase = 'swap';
  },
  doSwap(n) {
    const old = this.a, forced = this.forced;
    this.phase = 'talk'; this.forced = false;
    Talk.say([
      { who: '{N}', t: old.hp > 0 ? `もどれ、${old.name}！` : `ありがとう、${old.name}。` },
      { who: '{N}', t: `いけっ、${n.name}！`, fx: () => { this.a = n; this.fx.aL = 0.4; this.guard = false; } },
    ], () => forced ? this.cmd() : this.enemyTurn()); // じぶんで こうたい すると あいての ばん
  },
  useNet(sz) {
    this.phase = 'talk';
    const e = this.e;
    if (this.tut && !e.boss) return Talk.say([{ t: 'この あみは、ボスを つかまえる ために とっておこう！' }], () => this.cmd());
    if (G.nets[sz] <= 0) return Talk.say([{ t: `とりあみ${NETS[sz].short}は もっていない！` }], () => this.cmd());
    if (sz !== e.size) return Talk.say([{ t: `とりあみ${NETS[sz].short}は ${SIZE_NAME[sz]} モンスター せんよう。${e.name}は ${SIZE_NAME[e.size]} モンスターだから、${NETS[e.size].short}を つかおう！` }], () => this.cmd());
    G.nets[sz]--; this.netHint = false;
    // つかまえやすさ：よわい モンスター（catchBase が たかい）ほど、よわらせる ほど たかい
    this.capOk = this.tut || Math.random() < Math.min(0.95, e.catchBase + (1 - e.hp / e.max) * 0.75);
    Talk.say([{ t: `{N}は モンスターとりあみ${NETS[sz].short}を なげた！` }], () => { this.phase = 'capture'; this.cap = 0; });
  },
  run() {
    this.phase = 'talk';
    if (this.tut) return Talk.say([{ t: 'いまは にげられない！ まちを まもろう！' }], () => this.cmd());
    Talk.say([{ t: 'うまく にげきれた！' }], () => Fade.to(() => { this.from.inv = 1.5; go(this.from); }));
  },
  win() {
    Talk.say([{ t: `${this.e.name}を たおした！`, fx: () => { this.fx.eF = 0.001; } }], () => Fade.to(() => { this.from.onWin(this.foe); go(this.from); }));
  },
  update(dt) {
    this.t += dt;
    for (const k of ['aL', 'eL', 'aH', 'eH']) this.fx[k] = Math.max(0, this.fx[k] - dt);
    if (this.fx.eF > 0) this.fx.eF = Math.min(1, this.fx.eF + dt * 1.5);
    for (const u of [...this.allies, this.e]) { const sp = u.max * 1.2 * dt; u.dhp = u.dhp > u.hp ? Math.max(u.hp, u.dhp - sp) : Math.min(u.hp, u.dhp + sp); }
    this.pops = this.pops.filter(p => (p.t += dt) < 1.1);
    if (this.phase === 'capture') {
      this.cap += dt;
      if (!this.capOk && this.cap >= 2.1) { // しっぱい：あみから にげだす
        this.phase = 'talk'; this.cap = null; this.fx.eH = 0.45;
        Talk.say([{ t: `あっ！ ${this.e.name}は あみから にげだした！` }], () => this.enemyTurn());
      } else if (this.cap >= 3.3) {
        this.phase = 'talk';
        const e = this.e;
        if (this.tut) return Talk.say([{ t: 'やった！ ドンゴラを つかまえた！' }], () => Fade.to(() => { addMonster('dongora'); go(Clear); }));
        const m = addMonster(e.kind), inTeam = G.team.includes(m.uid);
        Talk.say([
          { t: `やった！ ${e.name}を つかまえた！` },
          { t: inTeam ? `${e.name}が つれていく なかまに くわわった！` : `${e.name}は うらいちばの モンスターきょうしつで まっているよ。` },
        ], () => Fade.to(() => { if (this.from.caught) this.from.caught.push(e.kind); this.from.onWin(this.foe, true); go(this.from); }));
      }
    }
  },
  geo() {
    const CA = clamp(H * 0.3, 140, 220), AH = H - CA, S = Math.min(W * 0.11, AH * 0.16);
    return { CA, AH, S, ex: W * 0.7, ey: AH * 0.55, ax: W * 0.27, ay: AH * 0.93 };
  },
  panel(x, y, w, u, showNum) {
    const h = showNum ? 66 : 54;
    rr(x, y, w, h, 12); ctx.fillStyle = 'rgba(255,252,242,.95)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
    text(u.name, x + 12, y + 17, 17, '#3a2410', 'left');
    ctx.font = font(17); typeChip(u.type, x + 18 + ctx.measureText(u.name).width, y + 17, 12);
    text(`Lv${u.lv}`, x + w - 12, y + 17, 15, '#3a2410', 'right');
    const bx = x + 40, bw = w - 52, by = y + 32;
    text('HP', x + 12, by + 6, 13, '#e07a1f', 'left');
    rr(bx, by, bw, 12, 6); ctx.fillStyle = '#555'; ctx.fill();
    const p = clamp(u.dhp / u.max, 0, 1);
    rr(bx, by, Math.max(0.01, bw * p), 12, 6); ctx.fillStyle = p > 0.5 ? '#3ccf5a' : p > 0.2 ? '#f5c02c' : '#e63946'; ctx.fill();
    if (showNum) text(`${Math.ceil(u.dhp)} / ${u.max}`, x + w - 12, y + 54, 14, '#3a2410', 'right');
  },
  // したの ばしょに ボタンを 2れつで ならべる（it.move が ある ときは わざの ボタンに する）
  grid(items, bx, by, bw, bh, m) {
    const rows = Math.ceil(items.length / 2), half = (bw - m) / 2, rowH = (bh - m * (rows - 1)) / rows;
    items.forEach((it, i) => {
      const x = bx + (i % 2) * (half + m), y = by + Math.floor(i / 2) * (rowH + m);
      if (it.move) this.moveButton(x, y, half, rowH, it.move);
      else button(x, y, half, rowH, it.label, it.cb, { px: clamp(rowH * 0.32, 13, 22), ...it.o });
    });
  },
  // わざの ボタン：ぞくせい・なまえ・いりょく・めいちゅう・こうか、あいてに よく きくかの しるし
  moveButton(x, y, w, h, mv) {
    button(x, y, w, h, '', () => this.useMove(mv), { col: '#ffe08a' });
    hits[hits.length - 1].label = mv.n;
    const px = clamp(h * 0.3, 12, 22), cy = y + h * 0.36;
    const cw = typeChip(mv.type, x + 10, cy, px * 0.68);
    let right = x + w - 8;
    if (mv.pow) {
      const ef = typeEff(mv.type, this.e.type);
      if (ef !== 1) {
        const label = ef > 1 ? '◎よくきく' : '△いまいち', bp = px * 0.6;
        ctx.font = font(bp); const bw = ctx.measureText(label).width + bp;
        rr(right - bw, cy - bp * 0.8, bw, bp * 1.6, bp * 0.5); ctx.fillStyle = ef > 1 ? '#e63946' : '#6b7a99'; ctx.fill();
        text(label, right - bw / 2, cy + 1, bp, '#fff');
        right -= bw + 6;
      }
    }
    const nx = x + 16 + cw, nw = right - nx;
    text(mv.n, nx, cy + 1, fitPx(mv.n, px, nw), '#4a2500', 'left');
    const info = moveInfo(mv);
    text(info, x + 10, y + h * 0.74, fitPx(info, px * 0.72, w - 20), '#6a3a10', 'left');
  },
  draw() {
    const g = this.geo(), t = this.t, e = this.e, a = this.a;
    sky(W, g.AH, e.boss ? '#7a6fae' : '#8fd3ff', e.boss ? '#e8c9d8' : '#e9f8ff');
    ctx.fillStyle = e.boss ? '#9bbf7a' : '#a6dc7f'; ctx.fillRect(0, g.AH * 0.55, W, g.AH * 0.45);
    ell(g.ex, g.ey, g.S * 2.1, g.S * 0.5, 'rgba(90,140,60,.6)');
    ell(g.ax, g.ay, g.S * 2.2, g.S * 0.5, 'rgba(90,140,60,.6)');
    // てき
    const capOn = this.phase === 'capture' || (this.cap !== null && this.cap >= 0.6);
    const enemyHidden = this.cap !== null && this.cap >= 0.6;
    if (!enemyHidden) {
      let ox = 0, oy = 0;
      if (this.fx.eL > 0) ox = -Math.sin((1 - this.fx.eL / 0.4) * Math.PI) * g.S * 0.9;
      if (this.fx.eH > 0) ox += Math.sin(t * 60) * g.S * 0.12;
      ctx.save();
      if (this.fx.eF > 0) { ctx.globalAlpha = 1 - this.fx.eF; oy = this.fx.eF * g.S * 0.6; }
      if (this.fx.eH > 0 && Math.sin(t * 40) > 0) ctx.globalAlpha *= 0.4;
      const sz = (e.boss ? g.S * 1.25 : g.S * 0.9) * (e.kind === 'toruppy' ? 0.62 : 1); // トルピーは つばさが おおきいので ちいさめ
      MONSTER_DRAW[e.kind](g.ex + ox, g.ey + oy, sz, t, false);
      ctx.restore();
    }
    // なかま
    {
      let ox = 0;
      if (this.fx.aL > 0) ox = Math.sin((1 - this.fx.aL / 0.4) * Math.PI) * g.S * 0.9;
      if (this.fx.aH > 0) ox += Math.sin(t * 60) * g.S * 0.12;
      ctx.save(); if (this.fx.aH > 0 && Math.sin(t * 40) > 0) ctx.globalAlpha = 0.4;
      MONSTER_DRAW[a.kind](g.ax + ox, g.ay, g.S * (ALLY_SCALE[a.kind] || 1), t, !!ALLY_FLIP[a.kind]);
      ctx.restore();
    }
    // つかまえる えんしゅつ
    if (capOn && this.cap !== null) {
      const c = this.cap, sx = g.ax + g.S, sy = g.ay - g.S * 2, tx = g.ex, ty = g.ey - g.S * 1.1;
      if (c < 0.6) {
        const p = c / 0.6;
        drawNet(lerp(sx, tx, p), lerp(sy, ty, p) - Math.sin(p * Math.PI) * g.S * 2, g.S * 0.7, p * TAU * 1.5, '');
      } else {
        let rot = 0;
        for (const s0 of [0.9, 1.6, 2.3]) if (c > s0 && c < s0 + 0.4) rot = Math.sin((c - s0) / 0.4 * TAU) * 0.35;
        drawNetBall(tx, ty + g.S * 0.4, g.S * 0.75, rot);
        if (c > 2.9) for (let k = 0; k < 6; k++) { const ang = k / 6 * TAU, r = g.S * (0.8 + (c - 2.9) * 2); star(tx + Math.cos(ang) * r, ty + g.S * 0.4 + Math.sin(ang) * r, g.S * 0.18, '#ffe066'); }
      }
    }
    // ダメージの すうじ
    for (const p of this.pops) {
      const x = p.who === 'e' ? g.ex : g.ax, y = (p.who === 'e' ? g.ey : g.ay) - g.S * 2.4 - p.t * 30;
      ctx.save(); ctx.globalAlpha = 1 - Math.max(0, p.t - 0.7) / 0.4; text(p.s, x, y, g.S * 0.5, p.col, 'center', '#fff'); ctx.restore();
    }
    const pw = Math.min(260, W * 0.44);
    this.panel(14, 14, pw, e, false);
    if (e.boss) text('ボス', 14 + pw - 60, 14 + 17, 14, '#fff', 'center', '#b0241b');
    this.panel(W - pw - 14, g.AH - 80, pw, a, true);
    // つれてきた なかまの げんき（まる）
    this.allies.forEach((x, i) => circle(W - pw - 14 + 14 + i * 18, g.AH - 92, 6, x.hp > 0 ? (x === a ? '#ffd23f' : '#3ccf5a') : '#888'));
    // したの ばしょ
    ctx.fillStyle = '#3d2b1f'; ctx.fillRect(0, g.AH, W, g.CA);
    const m = 12, bx = m, by = g.AH + m, bw = W - m * 2, bh = g.CA - m * 2;
    const back = { label: 'もどる', cb: () => { this.phase = 'cmd'; }, o: { col: '#c9d6e8', line: '#4a5a72' } };
    if (this.phase === 'cmd') {
      const half = (bw - m) / 2, rowH = (bh - m * 2) / 3, rx = bx + half + m;
      button(bx, by, half, bh, 'わざ', () => { this.phase = 'moves'; }, { col: '#ff7a59', line: '#8a2b12', px: clamp(bh * 0.22, 18, 32), fg: '#fff' });
      button(rx, by, half, rowH, 'とりあみ', () => { this.phase = 'nets'; }, { col: '#7fd36b', line: '#2f6b2a', blink: this.netHint });
      button(rx, by + rowH + m, half, rowH, 'こうたい', () => this.openSwap(false), { col: '#9fd4ff', line: '#2f5d8a', off: this.allies.length < 2 });
      button(rx, by + (rowH + m) * 2, half, rowH, 'にげる', () => this.run(), { col: '#c9d6e8', line: '#4a5a72' });
    } else if (this.phase === 'moves') {
      this.grid([...a.moves.map(mv => ({ move: mv })), back], bx, by, bw, bh, m);
    } else if (this.phase === 'nets') {
      this.grid([...['s', 'm', 'l'].map(k => ({
        label: `とりあみ${NETS[k].short} ×${G.nets[k]}`, cb: () => this.useNet(k),
        o: { col: '#7fd36b', line: '#2f6b2a', off: G.nets[k] <= 0, sub: `${SIZE_NAME[k]} モンスター よう`, blink: this.netHint && k === e.size && G.nets[k] > 0 }
      })), back], bx, by, bw, bh, m);
    } else if (this.phase === 'swap') {
      const others = this.allies.filter(x => x !== a);
      const items = others.map(x => ({ label: x.name, cb: () => x.hp > 0 ? this.doSwap(x) : null, o: { col: '#9fd4ff', line: '#2f5d8a', off: x.hp <= 0, sub: x.hp > 0 ? `${TYPES[x.type].name}・HP ${x.hp} / ${x.max}` : 'たおれている' } }));
      if (!this.forced) items.push(back);
      this.grid(items, bx, by, bw, bh, m);
    } else if (Talk.active()) Talk.draw(bx, by, bw, bh);
  }
};

// ===== チュートリアル クリア =====
const Clear = {
  t: 0, end: false,
  enter() {
    this.t = 0; this.end = false;
    Talk.say([
      { who: 'そんちょう', t: 'よくやった、{N}！ まちは すくわれたぞ！' },
      { who: 'そんちょう', t: 'その ポムルは、もう きみの なかまじゃ。きみに あげよう。' },
      { t: 'ポムルを もらった！' },
      { t: 'ドンゴラが なかまに なった！' },
      { who: 'そんちょう', t: 'よわい モンスターほど つかまえやすい。つよい モンスターでも、よわらせれば つかまえやすく なる。わすれるでないぞ。' },
      { who: '{N}', t: 'はい！ これからも よろしくね、ポムル、ドンゴラ！' },
    ], () => { this.end = true; Save.write('movie2'); });
  },
  update(dt) { this.t += dt; },
  draw() {
    const t = this.t;
    drawVillageBg(W, H, t);
    const gy = H * 0.66, s = Math.min(H * 0.13, W * 0.12);
    drawChief(W * 0.2, gy + H * 0.08, s, t);
    drawPomuru(W * 0.46, gy + H * 0.08, s * 0.42, t);
    drawDongora(W * 0.84, gy + H * 0.09, s * 0.5, t, false);
    drawHero(W * 0.65, gy + H * 0.08, s, 'left');
    if (Talk.active()) { const [bx, by, bw, bh] = talkBox(); Talk.draw(bx, by, bw, bh); }
    if (this.end) {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);
      const tp = clamp(Math.min(W * 0.08, H * 0.1), 26, 60);
      text('チュートリアル クリア！', W / 2, H * 0.32, tp, '#ffe066', 'center', '#7a3b00');
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + t; star(W / 2 + Math.cos(a) * tp * 4.5, H * 0.34 + Math.sin(a) * tp * 1.6, tp * 0.2, '#fff6a5'); }
      text('つぎは うらいちばへ！', W / 2, H * 0.32 + tp * 1.1, tp * 0.45, '#fff', 'center', '#333');
      const bw = Math.min(280, W * 0.7), bh = clamp(H * 0.09, 48, 66);
      button(W / 2 - bw / 2, H * 0.58, bw, bh, 'つぎへ', () => Fade.to(() => Movie.play(CARDS2, () => go(Market))), { blink: true });
    }
  }
};

// ===== うらいちば（クエストを うける ばしょ） =====
const QUESTS = [
  { id: 'sozai', name: 'そざいあつめ', special: true, info: 'レンと いっしょに そざいを あつめよう', star: 1, show: () => true },
  { id: 'hunt', name: 'トルピーを さがせ', info: 'そうげんで あばれる トルピーを たおすか つかまえよう', star: 2, show: () => G.lv.weapon > 1 },
];
const HUNT_REWARD = 500; // クエスト「トルピーを さがせ」の ほうしゅう（コイン）
const Market = {
  t: 0, panel: null, greeted: false, back: null, sx: 0, tx: 0, drag: null, seen: {}, msg: null,
  enter() {
    this.t = 0; this.panel = null; this.msg = null; this.drag = null; this.saveT = 0;
    Save.write('market');
    const back = this.back; this.back = null;
    if (back === 'sozai') {
      Talk.say([
        { who: 'レン', t: 'おつかれさま！ そざいが たくさん あつまったね。' },
        { who: 'レン', t: 'この そざいで、そうびを つよく しに いこう！' },
      ], () => { this.panel = 'done'; });
    } else if (back === 'forge') {
      Talk.say([
        { who: 'うけつけ', t: '{N}さーん！ つぎの クエストが ありますよ！' },
        { who: 'レン', t: 'お、きたきた！ うけつけで うけてみよう！' },
      ]);
    } else if (back === 'hunt') {
      Talk.say([
        { who: 'うけつけ', t: 'おかえりなさい！ クエスト クリアです！ おつかれさまでした！' },
        { who: 'うけつけ', t: `これは ほうしゅうの ${HUNT_REWARD}コイン です！`, fx: () => { G.coins += HUNT_REWARD; } },
        { t: `${HUNT_REWARD}コイン もらった！` },
        { who: 'レン', t: 'コインが あれば、どうぐやで とりあみが かえるよ！' },
        { who: 'レン', t: 'つかまえた なかまは、「モンスター きょうしつ」で つれていく メンバーに できるよ。' },
      ], () => { this.panel = 'done2'; });
    } else if (!this.greeted) {
      this.greeted = true;
      Talk.say([
        { who: 'レン', t: 'ここが うらいちばの まんなかだよ。' },
        { who: 'レン', t: 'まんなかの「クエスト うけつけ」を タップして、クエストを うけてみよう！' },
      ]);
    }
    const tg = this.hintTarget();
    this.tx = this.sx = tg ? this.centerOn(tg) : this.centerOn('quest');
  },
  // つぎに いく おみせ（やじるしを だす）
  hintTarget() {
    if (G.cleared.sozai && G.lv.weapon === 1) return 'smith';
    if (!G.cleared.hunt) return 'quest';
    if (!this.seen.school) return 'school';
    if (!this.seen.shop) return 'shop';
    return null;
  },
  centerOn(id) {
    const L = marketLayout(), i = SHOPS.findIndex(s => s.id === id);
    return clamp(L.gap + i * (L.SW + L.gap) + L.SW / 2 - W / 2, 0, L.maxScroll);
  },
  // じめんや そらを ドラッグすると よこに うごく
  down(x, y, id) { if (this.panel || Talk.active()) return false; this.drag = { id, x, sx: this.sx }; return true; },
  move(x, y, id) { if (this.drag && this.drag.id === id) this.tx = this.sx = clamp(this.drag.sx - (x - this.drag.x), 0, marketLayout().maxScroll); },
  up(id) { if (this.drag && this.drag.id === id) this.drag = null; },
  // セリフを おくる れんだが、そのまま たてものの タップに ならないように すこし まつ
  update(dt) {
    this.t += dt; this.quiet = Talk.active() ? 0.4 : Math.max(0, (this.quiet || 0) - dt);
    if ((this.saveT += dt) > 3) { this.saveT = 0; Save.write('market', true); } // かいもの・なかまの いれかえも こまめに セーブ
    this.tx = clamp(this.tx, 0, marketLayout().maxScroll);
    if (!this.drag) this.sx = lerp(this.sx, this.tx, Math.min(1, dt * 8));
    if (this.msg) { this.msg.time -= dt; if (this.msg.time <= 0) this.msg = null; }
  },
  open(id) {
    this.seen[id] = true;
    if (id === 'quest') this.panel = 'board';
    else if (id === 'shop') this.panel = 'shop';
    else if (id === 'school') this.panel = 'school';
    else if (id === 'smith') {
      if (G.cleared.sozai && G.lv.weapon === 1) Fade.to(() => go(Forge));
      else Talk.say([{ who: 'かじや', t: 'そざいを あつめたら、また きな！ もっと つよい そうびに して やるよ。' }]);
    }
  },
  say(t) { this.msg = { t, time: 2.2 }; },
  draw() {
    const t = this.t, sx = this.sx, r = drawMarketStreet(t, sx), gy = H * 0.7, s = Math.min(H * 0.13, W * 0.13);
    // おみせの ひと
    const inside = (b, f) => { ctx.save(); ctx.beginPath(); ctx.rect(b.x + b.w * 0.12, b.y + b.h * 0.42, b.w * 0.76, b.h * 0.58); ctx.clip(); f(); ctx.restore(); };
    inside(r.quest, () => drawVillager(r.quest.x + r.quest.w * 0.5, gy + s * 0.5, s * 0.8, t));
    inside(r.shop, () => drawVillager(r.shop.x + r.shop.w * 0.5, gy + s * 0.55, s * 0.75, t + 1));
    for (const id of ['quest', 'shop']) { const b = r[id]; ctx.fillStyle = '#9c7a55'; ctx.fillRect(b.x + b.w * 0.08, gy - b.h * 0.18, b.w * 0.84, b.h * 0.18); }
    drawSmith(r.smith.x + r.smith.w * 0.5, gy + s * 0.15, s * 0.75, t, false);
    // きょうしつ には つれていく なかまが ならぶ
    teamMons().forEach((m, i) => { const b = r.school; MONSTER_DRAW[m.kind](b.x + b.w * (0.25 + i * 0.25), gy + s * 0.05, s * 0.22 * (ALLY_SCALE[m.kind] || 1), t + i, !!ALLY_FLIP[m.kind]); });
    drawRen(W * 0.3, gy + H * 0.12, s, t, false);
    drawHero(W * 0.5, gy + H * 0.14, s, 'up');
    drawPomuru(W * 0.68, gy + H * 0.13, s * 0.3, t);
    text('うらいちば', 70, 26, 18, '#ffe066', 'center', '#4a2500');
    // コイン
    const ct = `${G.coins}`;
    ctx.font = font(18); const cw = ctx.measureText(ct).width + 52;
    rr(W - cw - 12, 10, cw, 34, 17); ctx.fillStyle = 'rgba(30,20,40,.7)'; ctx.fill();
    circle(W - cw + 6, 27, 10, '#ffd23f'); text('C', W - cw + 6, 28, 12, '#a0680a');
    text(ct, W - 22, 28, 18, '#fff', 'right');
    const L = marketLayout();
    if (!Talk.active() && !this.panel && !this.quiet && !Fade.dir) {
      for (const s0 of SHOPS) hits.push({ ...r[s0.id], label: s0.sign, cb: () => this.open(s0.id) });
      if (L.maxScroll > 0) { // よこの やじるし
        if (this.tx > 1) button(6, H * 0.45, 40, 56, '◀', () => { this.tx -= L.SW + L.gap; }, { col: 'rgba(255,255,255,.8)' });
        if (this.tx < L.maxScroll - 1) button(W - 46, H * 0.45, 40, 56, '▶', () => { this.tx += L.SW + L.gap; }, { col: 'rgba(255,255,255,.8)' });
      }
      const tg = this.hintTarget();
      if (tg) {
        const q = r[tg], by = q.y - 18 - Math.abs(Math.sin(t * 4)) * 12;
        tri(q.x + q.w / 2 - 16, by - 20, q.x + q.w / 2 + 16, by - 20, q.x + q.w / 2, by, '#ffe066');
        text('タップ！', q.x + q.w / 2, by - 36, 16, '#fff', 'center', '#4a2500');
      }
    }
    if (this.panel) this.drawPanel();
    if (Talk.active()) { const [bx, by, bw, bh] = talkBox(); Talk.draw(bx, by, bw, bh); }
  },
  drawPanel() {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
    const kind = this.panel === 'shop' ? 'shop' : this.panel === 'school' ? 'school' : 'quest';
    const title = { shop: 'どうぐや', school: 'モンスター きょうしつ', quest: 'クエスト うけつけ' }[kind];
    const col = { shop: '#3f7cac', school: '#2f9e44', quest: '#e07a5f' }[kind];
    const pw = Math.min(480, W - 24), ph = Math.min(kind === 'school' ? 520 : 400, H - 40), px = (W - pw) / 2, py = (H - ph) / 2;
    rr(px, py, pw, ph, 18); ctx.fillStyle = '#fff8e8'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#6b4a2b'; ctx.stroke();
    rr(px, py, pw, 52, 18); ctx.fillStyle = col; ctx.fill();
    text(title, px + pw / 2, py + 27, fitPx(title, 24, pw - 40), '#fff');
    const bx = px + 20, bw = pw - 40, half = (bw - 16) / 2;
    const close = () => button(px + pw / 2 - 80, py + ph - 62, 160, 48, 'とじる', () => { this.panel = null; this.msg = null; }, { col: '#c9d6e8', line: '#4a5a72' });
    if (this.panel === 'board') {
      text('どの クエストを うける？', px + pw / 2, py + 84, fitPx('どの クエストを うける？', 18, bw), '#4a2500');
      QUESTS.filter(qq => qq.show()).forEach((qq, i) => {
        const y = py + 110 + i * 90, done = G.cleared[qq.id];
        button(bx, y, bw, 78, questTitle(qq), () => done ? Talk.say([{ who: 'うけつけ', t: 'その クエストは もう クリアずみですよ！' }]) : (this.pick = qq, this.panel = 'confirm'),
          { col: '#ffe08a', sub: done ? 'クリアずみ' : '★'.repeat(qq.star) + ' ' + qq.info, px: 22, blink: !done, off: done });
        if (qq.special) { // とくべつクエストの リボン
          rr(bx - 6, y - 12, 126, 26, 8); ctx.fillStyle = '#e63946'; ctx.fill();
          text('★ とくべつ ★', bx + 57, y + 1, 15, '#fff');
        }
      });
      close();
    } else if (this.panel === 'confirm') {
      const msg = `${questTitle(this.pick)}を うけますか？`;
      text(msg, px + pw / 2, py + ph * 0.38, fitPx(msg, 22, bw), '#4a2500');
      button(bx, py + ph - 90, half, 64, 'はい', () => this.accept(), { col: '#7fd36b', line: '#2f6b2a', px: 24 });
      button(bx + half + 16, py + ph - 90, half, 64, 'いいえ', () => { this.panel = 'board'; }, { col: '#c9d6e8', line: '#4a5a72', px: 24 });
    } else if (this.panel === 'done') {
      const a = 'とくべつクエスト クリア！';
      text(a, px + pw / 2, py + ph * 0.3, fitPx(a, 28, bw), '#e63946');
      const it = `てつ ${G.items.iron}　つる ${G.items.vine}　きらきら いし ${G.items.gem}`;
      text(it, px + pw / 2, py + ph * 0.45, fitPx(it, 18, bw), '#2f6b2a');
      button(bx, py + ph - 86, bw, 60, 'かじやで そうびを きょうか する', () => { this.panel = null; Fade.to(() => go(Forge)); }, { col: '#ffb347', blink: true });
    } else if (this.panel === 'done2') {
      const a = 'クエスト クリア！';
      text(a, px + pw / 2, py + ph * 0.24, fitPx(a, 30, bw), '#e63946');
      const rw = `ほうしゅう：${HUNT_REWARD}コイン`;
      text(rw, px + pw / 2, py + ph * 0.38, fitPx(rw, 20, bw), '#a0680a');
      const got = (Hunt.caught || []).map(k => MONSTER_NAME[k]);
      const c = got.length ? `なかまに なった：${got.join('、')}` : 'こんどは つかまえて みよう！';
      text(c, px + pw / 2, py + ph * 0.5, fitPx(c, 18, bw), '#2f6b2a');
      const b = 'つぎの クエストは これから つくるよ！';
      text(b, px + pw / 2, py + ph * 0.61, fitPx(b, 18, bw), '#4a2500');
      button(bx, py + ph - 86, half, 60, 'うらいちばに もどる', () => { this.panel = null; }, { col: '#ffe08a' });
      button(bx + half + 16, py + ph - 86, half, 60, 'さいしょから', () => { location.hash = ''; location.reload(); }, { col: '#c9d6e8', line: '#4a5a72' });
    } else if (this.panel === 'shop') this.drawShop(px, py, pw, ph, close);
    else if (this.panel === 'school') this.drawSchool(px, py, pw, ph, close);
    if (this.msg) {
      const tp = fitPx(this.msg.t, 16, pw - 30);
      rr(px + 12, py + ph - 108, pw - 24, 36, 12); ctx.fillStyle = '#1f9e8f'; ctx.fill();
      text(this.msg.t, px + pw / 2, py + ph - 90, tp, '#fff');
    }
  },
  // どうぐや：とりあみ［小］［中］［大］を コインで かう
  drawShop(px, py, pw, ph, close) {
    const ct = `もっている コイン：${G.coins}`;
    text(ct, px + pw / 2, py + 76, fitPx(ct, 18, pw - 40), '#a0680a');
    const rowH = Math.min(70, (ph - 240) / 3);
    ['s', 'm', 'l'].forEach((k, i) => {
      const y = py + 98 + i * (rowH + 8), n = NETS[k];
      rr(px + 14, y, pw - 28, rowH, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d9c3a0'; ctx.stroke();
      drawNet(px + 44, y + rowH * 0.52, rowH * 0.3, -0.3, n.short.slice(1, 2));
      const name = `とりあみ${n.short}`;
      text(name, px + 80, y + rowH * 0.32, fitPx(name, 18, pw * 0.4), '#3a2410', 'left');
      text(`${SIZE_NAME[k]} モンスター よう　もっている ×${G.nets[k]}`, px + 80, y + rowH * 0.72, fitPx(`${SIZE_NAME[k]} モンスター よう　もっている ×${G.nets[k]}`, 12, pw - 210), '#6a4a2a', 'left');
      const bw2 = Math.min(110, pw * 0.27);
      button(px + pw - 22 - bw2, y + 8, bw2, rowH - 16, `${n.price}コイン`, () => this.buy(k), { col: '#ffb347', off: G.coins < n.price, sub: 'かう' });
    });
    close();
  },
  buy(k) {
    const n = NETS[k];
    if (G.coins < n.price) return this.say('コインが たりないよ… クエストで もらえるよ！');
    G.coins -= n.price; G.nets[k]++;
    this.say(`とりあみ${n.short}を かった！（もっている ×${G.nets[k]}）`);
  },
  // モンスター きょうしつ：つれていく なかま（3にんまで）を えらぶ
  drawSchool(px, py, pw, ph, close) {
    const t = this.t;
    text('つれていく なかま（3にんまで）', px + pw / 2, py + 72, fitPx('つれていく なかま（3にんまで）', 17, pw - 30), '#2f6b2a');
    const team = teamMons(), sw = (pw - 40) / 3, sh = Math.min(110, ph * 0.24), ty = py + 88;
    for (let i = 0; i < 3; i++) {
      const x = px + 20 + i * sw, m = team[i];
      rr(x + 4, ty, sw - 8, sh, 12); ctx.fillStyle = m ? '#e7f7e0' : '#f1ebe0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = m ? '#2f9e44' : '#c8b89c'; ctx.stroke();
      if (i === 0 && m) { rr(x + 8, ty + 4, 46, 18, 6); ctx.fillStyle = '#ffb347'; ctx.fill(); text('せんとう', x + 31, ty + 13, 11, '#4a2500'); }
      if (m) {
        MONSTER_DRAW[m.kind](x + sw / 2, ty + sh * 0.72, sh * 0.2 * (ALLY_SCALE[m.kind] || 1), t + i, !!ALLY_FLIP[m.kind]);
        text(MONSTER_NAME[m.kind], x + sw / 2, ty + sh * 0.88, fitPx(MONSTER_NAME[m.kind], 14, sw - 16), '#3a2410');
        hits.push({ x: x + 4, y: ty, w: sw - 8, h: sh, label: `team:${i}`, cb: () => this.toggle(m) });
      } else text('あき', x + sw / 2, ty + sh / 2, 16, '#a89878');
    }
    text('もっている モンスター（タップで いれる・はずす）', px + pw / 2, ty + sh + 20, fitPx('もっている モンスター（タップで いれる・はずす）', 14, pw - 30), '#6a4a2a');
    const cols = 4, cw = (pw - 40) / cols, ch = Math.min(84, (ph - (sh + 230)) / Math.max(1, Math.ceil(G.box.length / cols))), gy0 = ty + sh + 34;
    G.box.forEach((m, i) => {
      const x = px + 20 + (i % cols) * cw, y = gy0 + Math.floor(i / cols) * ch, inTeam = G.team.includes(m.uid);
      rr(x + 3, y, cw - 6, ch - 6, 10); ctx.fillStyle = inTeam ? '#fff3c4' : '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = inTeam ? '#ffb347' : '#d9c3a0'; ctx.stroke();
      MONSTER_DRAW[m.kind](x + cw / 2, y + ch * 0.62, ch * 0.17 * (ALLY_SCALE[m.kind] || 1), t + i * 0.7, !!ALLY_FLIP[m.kind]);
      text(MONSTER_NAME[m.kind], x + cw / 2, y + ch * 0.8, fitPx(MONSTER_NAME[m.kind], 12, cw - 12), '#3a2410');
      if (inTeam) text('✓', x + cw - 16, y + 12, 14, '#2f9e44');
      hits.push({ x: x + 3, y, w: cw - 6, h: ch - 6, label: `box:${m.kind}:${i}`, cb: () => this.toggle(m) });
    });
    close();
  },
  toggle(m) {
    const i = G.team.indexOf(m.uid);
    if (i >= 0) {
      if (G.team.length <= 1) return this.say('さいごの 1ひきは はずせないよ！');
      G.team.splice(i, 1); this.say(`${MONSTER_NAME[m.kind]}を はずした`);
    } else {
      if (G.team.length >= 3) return this.say('いっぱいだよ！ うえの だれかを タップして はずしてね');
      G.team.push(m.uid); this.say(`${MONSTER_NAME[m.kind]}を つれていく！`);
    }
  },
  accept() {
    G.quest = this.pick.id; this.panel = null;
    if (this.pick.id === 'hunt') return Talk.say([
      { who: 'うけつけ', t: `${questTitle(this.pick)}を うけつけました！` },
      { who: 'うけつけ', t: 'そうげんで トルピーが あばれて いるそうです。イエロールも たくさん いるので きを つけて！' },
      { who: 'うけつけ', t: 'これを どうぞ。', fx: () => { G.nets.s += 3; } },
      { t: 'モンスターとりあみ［小］を 3こ もらった！' },
      { who: 'レン', t: 'いこう、{N}！ げんばへ しゅっぱつだ！' },
    ], () => Fade.to(() => go(Hunt)));
    Talk.say([
      { who: 'うけつけ', t: `${questTitle(this.pick)}を うけつけました！ いってらっしゃい！` },
      { who: 'レン', t: 'よし、いこう！ そざいが ある ばしょへ しゅっぱつだ！' },
    ], () => Fade.to(() => go(Gather)));
  }
};
function questTitle(q) { return (q.special ? 'とくべつクエスト' : 'クエスト') + `「${q.name}」`; }

// ===== かじやで そうびを きょうか（レンが やりかたを おしえる） =====
const UPGRADES = {
  weapon: { name: 'かけだしの こんぼう', kind: 'ぶき', need: { iron: 2, gem: 1 }, gainText: 'こうげき +1' },
  armor: { name: 'かけだしの よろい', kind: 'ぼうぐ', need: { vine: 3, iron: 1, gem: 1 }, gainText: 'ぼうぎょ +1　HP +5' },
};
const MAT_SHORT = { iron: 'てつ', vine: 'つる', gem: 'きらきら いし' };
// そうびの レベルから、なかま みんなに つく ステータスを けいさんする
function recalcBonus() {
  if (!G.gear) { G.bonus = { hp: 0, atk: 0, def: 0 }; return; }
  G.bonus = { hp: GEAR_BONUS.hp + (G.lv.armor - 1) * 5, atk: GEAR_BONUS.atk + (G.lv.weapon - 1), def: GEAR_BONUS.def + (G.lv.armor - 1) };
}
const Forge = {
  enter() {
    this.t = 0; this.step = 'intro'; this.ham = 0;
    Talk.say([
      { who: 'かじや', t: 'おう、そざいを もってきたな！' },
      { who: 'レン', t: 'あたらしい そうびを つくるには、そざいが たくさん ひつよう なんだ。' },
      { who: 'レン', t: 'だから いまは、ぶきと ぼうぐを「きょうか」して つよく しよう！' },
      { who: 'レン', t: 'まずは ぶきの「きょうか」ボタンを おしてみて！' },
    ], () => { this.step = 'weapon'; });
  },
  have(need) { return Object.entries(need).every(([k, n]) => G.items[k] >= n); },
  // なまえを up に しない（up は ゆびを はなした ときに よばれる）
  upgrade(k) {
    if (this.step === 'weapon' && k === 'armor') return Talk.say([{ who: 'レン', t: 'さきに ぶきの ほうから やってみよう！' }]);
    if (this.step !== k) return;
    const u = UPGRADES[k];
    if (!this.have(u.need)) return Talk.say([{ who: 'かじや', t: 'そざいが たりないな…。' }]);
    for (const [m, n] of Object.entries(u.need)) G.items[m] -= n;
    G.lv[k]++; recalcBonus();
    this.step = 'busy'; this.ham = 1.6;
    const next = k === 'weapon'
      ? [{ who: 'レン', t: 'いいね！ つぎは ぼうぐの「きょうか」ボタンを おしてね。' }]
      : [{ who: 'レン', t: 'ばっちり！ ぶきも ぼうぐも つよく なったね！' }, { t: 'なかまの モンスター みんなが さっきより つよく なった！' }];
    Talk.say([{ who: 'かじや', t: 'まかせとけ！ カン！ カン！ カン！' }, { t: `${u.name}が Lv${G.lv[k]}に なった！（${u.gainText}）` }, ...next],
      () => { this.step = k === 'weapon' ? 'armor' : 'done'; });
  },
  update(dt) { this.t += dt; this.ham = Math.max(0, this.ham - dt); },
  card(k, x, y, w, h) {
    const u = UPGRADES[k], active = this.step === k, idle = !Talk.active();
    rr(x, y, w, h, 14); ctx.fillStyle = active ? '#fff3c4' : 'rgba(255,252,242,.95)'; ctx.fill();
    ctx.lineWidth = active ? 5 : 3; ctx.strokeStyle = active ? '#ffb347' : '#6b4a2b'; ctx.stroke();
    const fp = clamp(h * 0.12, 12, 18);
    text(u.kind, x + w / 2, y + fp * 1.0, fp * 0.85, '#8a4b0f');
    const nm = `${u.name} Lv${G.lv[k]}`;
    text(nm, x + w / 2, y + fp * 2.3, fitPx(nm, fp, w - 16), '#3a2410');
    const ent = Object.entries(u.need), cw = (w - 16) / ent.length;
    ent.forEach(([m, n], i) => {
      const cx = x + 8 + cw * (i + 0.5), cy = y + fp * 4.1;
      drawMaterial(m, cx, cy, fp * 1.4);
      const s = `${G.items[m]}/${n}`;
      text(s, cx, cy + fp * 1.35, fp * 0.8, G.items[m] >= n ? '#2f6b2a' : '#c0392b');
    });
    const bh = clamp(h * 0.24, 32, 46), by = y + h - bh - 8;
    if (G.lv[k] > 1) text(`きょうか ずみ！ ${u.gainText}`, x + w / 2, by + bh / 2, fitPx(`きょうか ずみ！ ${u.gainText}`, fp * 0.85, w - 16), '#2f9e44');
    else if (idle) button(x + 10, by, w - 20, bh, 'きょうか', () => this.upgrade(k), { blink: active, off: !active, col: '#ff7a59', line: '#8a2b12', fg: '#fff' });
  },
  draw() {
    CARDS2[4].draw(W, H, this.t, this.ham > 0 ? 1 : 0);
    const portrait = H > W, m = 12;
    const cw = portrait ? W - m * 2 : Math.min(300, (W - m * 3) / 2), ch = clamp(H * (portrait ? 0.2 : 0.36), 150, 210);
    const x1 = portrait ? m : W / 2 - cw - m / 2, x2 = portrait ? m : W / 2 + m / 2, y1 = 12, y2 = portrait ? y1 + ch + 8 : y1;
    this.card('weapon', x1, y1, cw, ch);
    this.card('armor', x2, y2, cw, ch);
    if (this.step === 'done' && !Talk.active()) {
      const bw = Math.min(300, W - 40), bh = 54;
      button(W / 2 - bw / 2, H - bh - 24, bw, bh, 'うらいちばへ もどる', () => Fade.to(() => { Market.back = 'forge'; go(Market); }), { blink: true });
    }
    if (Talk.active()) { const [bx, by, bw, bh] = talkBox(); Talk.draw(bx, by, bw, bh); }
  }
};

// ===== クエスト「トルピーを さがせ」（そうげん） =====
const HW = 2400, HH = 1900, HSTART = { x: 1200, y: 1780 };
const HROCKS = [[500, 1300, 55], [1900, 1250, 60], [1200, 900, 50], [700, 500, 55], [1750, 520, 50]];
const HTREES = (() => {
  const out = [];
  for (let gx = 140; gx < HW - 100; gx += 260) for (let gy = 140; gy < HH - 100; gy += 260) {
    const k = hash(gx + 11, gy + 5); if (k % 10 < 6) continue;
    const x = gx + k % 90 - 45, y = gy + (k >> 3) % 90 - 45;
    if (Math.hypot(x - HSTART.x, y - HSTART.y) < 260 || Math.hypot(x - 1200, y - 300) < 260 || HROCKS.some(r => Math.hypot(x - r[0], y - r[1]) < 140)) continue;
    out.push([x, y]);
  }
  return out;
})();
const Hunt = {
  t: 0, inv: 0,
  enter() {
    if (this.ready) return;
    this.ready = true;
    this.hero = { x: HSTART.x, y: HSTART.y, dir: 'up', ph: 0, moving: false };
    this.trail = []; this.ren = { x: HSTART.x - 60, y: HSTART.y + 40 };
    this.stick = { id: null, dx: 0, dy: 0 };
    this.foes = [
      { kind: 'yellowl', hx: 450, hy: 1500, ph: 0 }, { kind: 'yellowl', hx: 1950, hy: 1450, ph: 1.7 }, { kind: 'yellowl', hx: 1150, hy: 1150, ph: 3.1 },
      { kind: 'yellowl', hx: 450, hy: 750, ph: 2.2 }, { kind: 'yellowl', hx: 2000, hy: 800, ph: 0.9 },
      { kind: 'toruppy', hx: 1200, hy: 300, ph: 0, boss: true },
    ].map(f => ({ ...f, x: f.hx, y: f.hy, alive: true }));
    this.t = 0; this.inv = 0; this.toast = null; this.caught = [];
    Talk.say([
      { t: 'そうげんに ついた！' },
      { who: 'レン', t: 'きいろい まるいのが イエロール だよ。ぶつかると たたかいに なるからね。' },
      { who: 'レン', t: 'ボスの トルピーは、そうげんの いちばん おく に いるみたい。' },
      { who: 'レン', t: 'トルピーを たおすか つかまえたら、クエスト クリアだ！' },
    ]);
  },
  down: Field.down, move: Field.move, up: Field.up, stickGeo: Field.stickGeo,
  blocked(x, y) {
    const r = 16;
    if (x < 50 || y < 50 || x > HW - 50 || y > HH - 50) return true;
    for (const [rx, ry, rad] of HROCKS) if (Math.hypot(x - rx, (y - ry) * 1.3) < rad + r) return true;
    for (const [tx, ty] of HTREES) if (Math.hypot(x - tx, y - ty) < 26 + r) return true;
    return false;
  },
  onWin(foe, caught) {
    foe.alive = false; this.inv = 1.5;
    if (foe.boss) {
      Talk.say([
        { who: 'レン', t: caught ? 'すごい！ トルピーを つかまえたね！' : 'やった！ トルピーを たおしたね！' },
        { t: 'クエスト クリア！' },
        { who: 'レン', t: 'うらいちばに もどって ほうこく しよう！' },
      ], () => Fade.to(() => { G.cleared.hunt = true; this.ready = false; Market.back = 'hunt'; go(Market); }));
    }
  },
  update(dt) {
    this.t += dt; this.inv = Math.max(0, this.inv - dt);
    if (this.toast) { this.toast.time -= dt; if (this.toast.time <= 0) this.toast = null; }
    for (const f of this.foes) {
      if (f.boss) { f.x = f.hx + Math.sin(this.t * 0.7) * 120; f.y = f.hy + Math.sin(this.t * 1.4) * 30; continue; }
      f.x = f.hx + Math.sin(this.t * 0.9 + f.ph) * 90; f.y = f.hy + Math.cos(this.t * 0.7 + f.ph) * 45;
    }
    const h = this.hero;
    let dx = this.stick.dx, dy = this.stick.dy;
    if (keys.ArrowLeft || keys.a) dx = -1; if (keys.ArrowRight || keys.d) dx = 1;
    if (keys.ArrowUp || keys.w) dy = -1; if (keys.ArrowDown || keys.s) dy = 1;
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    h.moving = !Talk.active() && !Fade.dir && l > 0.15;
    if (h.moving) {
      const sp = 250 * Math.min(1, l) * dt;
      if (!this.blocked(h.x + dx * sp, h.y)) h.x += dx * sp;
      if (!this.blocked(h.x, h.y + dy * sp)) h.y += dy * sp;
      h.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      h.ph += dt * 14;
      this.trail.push({ x: h.x, y: h.y }); if (this.trail.length > 18) this.trail.shift();
    }
    const goal = this.trail.length ? this.trail[0] : h;
    if (Math.hypot(goal.x - h.x, goal.y - h.y) > 40) { this.ren.x = lerp(this.ren.x, goal.x, Math.min(1, dt * 6)); this.ren.y = lerp(this.ren.y, goal.y, Math.min(1, dt * 6)); }
    if (this.inv > 0 || Talk.active() || Fade.dir) return;
    for (const f of this.foes) {
      if (!f.alive) continue;
      if (Math.hypot(h.x - f.x, h.y - (f.y - 10)) < (f.boss ? 75 : 50)) { this.inv = 99; Fade.to(() => Battle.begin(f, Hunt)); break; }
    }
  },
  draw() {
    const h = this.hero, t = this.t;
    const ZS = clamp(Math.min(W, H) / 560, 0.62, 1.5);
    ctx.fillStyle = '#3d7a3a'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(ZS, ZS); ctx.translate(-h.x, -h.y);
    const vx0 = h.x - W / 2 / ZS - 120, vy0 = h.y - H / 2 / ZS - 120, vx1 = h.x + W / 2 / ZS + 120, vy1 = h.y + H / 2 / ZS + 120;
    for (let gx = Math.floor(vx0 / 90) * 90; gx < vx1; gx += 90) for (let gy = Math.floor(vy0 / 90) * 90; gy < vy1; gy += 90) {
      if (gx > -60 && gx < HW + 60 && gy > -60 && gy < HH + 60) continue;
      const k = hash(gx, gy); circle(gx + k % 40, gy + (k >> 3) % 40, 55, k % 2 ? '#2f6b38' : '#3a7d42');
    }
    ctx.fillStyle = '#b5e07a'; ctx.fillRect(0, 0, HW, HH);
    for (let gx = Math.max(0, Math.floor(vx0 / 60) * 60); gx < Math.min(HW, vx1); gx += 60) for (let gy = Math.max(0, Math.floor(vy0 / 60) * 60); gy < Math.min(HH, vy1); gy += 60) {
      const k = hash(gx + 3, gy + 9); if (k % 3) continue;
      const px = gx + k % 40, py = gy + (k >> 2) % 40, sw = Math.sin(t * 2 + px * 0.01) * 3;
      ctx.strokeStyle = '#8cc65a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 3 + sw, py - 14); ctx.moveTo(px + 5, py); ctx.lineTo(px + 7 + sw, py - 12); ctx.stroke();
    }
    ctx.fillStyle = '#e0c891'; ctx.beginPath(); ctx.ellipse(1200, 300, 230, 150, 0, 0, TAU); ctx.fill();
    const list = [];
    for (const [rx, ry, rad] of HROCKS) list.push({ y: ry, f: () => drawRock(rx, ry, rad) });
    for (const [tx, ty] of HTREES) list.push({ y: ty, f: () => drawTree(tx, ty, 50) });
    for (const f of this.foes) if (f.alive) list.push({
      y: f.y, f: () => {
        const flip = h.x < f.x;
        if (f.boss) { drawToruppy(f.x, f.y, 50, t, flip); text('ボス', f.x, f.y - 175, 24, '#fff', 'center', '#b0241b'); }
        else drawYellowl(f.x, f.y, 28, t + f.ph, flip);
      }
    });
    list.push({ y: this.ren.y, f: () => drawRen(this.ren.x, this.ren.y, 40, t, this.ren.x > h.x) });
    list.push({ y: h.y, f: () => { if (this.inv > 0 && this.inv < 99 && Math.sin(t * 40) > 0) return; drawHero(h.x, h.y, 44, h.dir, h.ph, h.moving); } });
    list.sort((a, b) => a.y - b.y).forEach(o => o.f());
    const boss = this.foes.find(f => f.boss);
    if (boss.alive && !Talk.active()) {
      const a = Math.atan2(boss.y - h.y, boss.x - h.x), d = Math.hypot(boss.y - h.y, boss.x - h.x);
      if (d > 300) {
        ctx.save(); ctx.translate(h.x + Math.cos(a) * 80, h.y - 30 + Math.sin(a) * 80); ctx.rotate(a);
        ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.3; tri(22, 0, -10, -16, -10, 16, '#ff5a4e'); ctx.restore();
      }
    }
    ctx.restore();
    const goal = `もくひょう：トルピーを たおすか つかまえよう（あみ［小］×${G.nets.s}）`;
    const gp = fitPx(goal, clamp(Math.min(W, H) * 0.04, 13, 20), W - 32);
    ctx.font = font(gp); const gw = ctx.measureText(goal).width + gp * 2;
    rr(W / 2 - gw / 2, 12, gw, gp * 2.1, 14); ctx.fillStyle = 'rgba(30,40,60,.75)'; ctx.fill();
    text(goal, W / 2, 12 + gp * 1.05, gp, '#fff');
    const st = this.stickGeo();
    circle(st.cx, st.cy, st.R, 'rgba(255,255,255,.28)');
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(st.cx, st.cy, st.R, 0, TAU); ctx.stroke();
    circle(st.cx + this.stick.dx * st.R * 0.6, st.cy + this.stick.dy * st.R * 0.6, st.R * 0.45, this.stick.id !== null ? 'rgba(255,221,51,.95)' : 'rgba(255,255,255,.85)');
    if (Talk.active()) { const [bx, by, bw, bh] = talkBox(); Talk.draw(bx, by, bw, bh); }
  }
};

// ===== そざいあつめ（モンスターの でない ひろい もり） =====
const GW = 3000, GH = 2400, GSTART = { x: 1500, y: 2250 };
const POND = { x: 1500, y: 1500, rx: 260, ry: 150 };
const ROCKS = [[2450, 2000, 60], [1700, 1750, 50], [800, 700, 55], [2600, 1300, 65], [300, 1500, 50], [2150, 350, 55]];
const BUSHES = [[350, 800], [2000, 900], [1250, 1950], [2800, 2200], [600, 300]];
const HIDE_TREES = [[1100, 440], [900, 1350]];
// そざい：あちこちに はなして おく。hide は「なにの うらに かくれているか」
const SPOTS = [
  { k: 'iron', x: 600, y: 1900 },
  { k: 'iron', x: 2450, y: 1945, hide: 'いわ' },
  { k: 'gem', x: 1500, y: 1270 },
  { k: 'vine', x: 350, y: 790, hide: 'しげみ' },
  { k: 'gem', x: 1100, y: 390, hide: 'き' },
  { k: 'vine', x: 2700, y: 500 },
  { k: 'iron', x: 2000, y: 890, hide: 'しげみ' },
  { k: 'vine', x: 900, y: 1300, hide: 'き' },
];
const ITEM_NAME = { iron: 'てつの かけら', vine: 'じょうぶな つる', gem: 'きらきら いし' };
const GTREES = (() => {
  const out = HIDE_TREES.slice();
  for (let gx = 150; gx < GW - 100; gx += 230) for (let gy = 150; gy < GH - 100; gy += 230) {
    const k = hash(gx, gy); if (k % 10 < 5) continue;
    const x = gx + k % 90 - 45, y = gy + (k >> 3) % 90 - 45;
    const near = (px, py, d) => Math.hypot(x - px, y - py) < d;
    if (SPOTS.some(s => near(s.x, s.y, 150)) || near(GSTART.x, GSTART.y, 260)) continue;
    if (((x - POND.x) / (POND.rx + 90)) ** 2 + ((y - POND.y) / (POND.ry + 90)) ** 2 < 1) continue;
    if (ROCKS.some(r => near(r[0], r[1], 140)) || BUSHES.some(b => near(b[0], b[1], 140)) || HIDE_TREES.some(t => near(t[0], t[1], 140))) continue;
    out.push([x, y]);
  }
  return out;
})();

function drawRock(x, y, r) {
  ell(x, y, r * 1.1, r * 0.3, 'rgba(0,0,0,.2)');
  ctx.fillStyle = '#8d8f99'; ctx.beginPath();
  ctx.moveTo(x - r * 1.05, y); ctx.quadraticCurveTo(x - r * 1.1, y - r * 1.1, x - r * 0.3, y - r * 1.35);
  ctx.quadraticCurveTo(x + r * 0.6, y - r * 1.5, x + r * 1.05, y - r * 0.6); ctx.lineTo(x + r * 1.05, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a9abb5'; ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - r * 0.5); ctx.quadraticCurveTo(x - r * 0.6, y - r * 1.1, x - r * 0.1, y - r * 1.2); ctx.quadraticCurveTo(x - r * 0.3, y - r * 0.7, x - r * 0.7, y - r * 0.5); ctx.fill();
}
function drawBush(x, y, t) {
  const sw = Math.sin(t * 1.5 + x) * 2;
  for (const [dx, dy, r, c] of [[-45, -20, 45, '#3f8f3a'], [45, -20, 45, '#3f8f3a'], [0, -45, 52, '#4ea546'], [-20, -10, 40, '#4ea546'], [25, -12, 40, '#5cb352']]) circle(x + dx + sw, y + dy, r, c);
  circle(x - 15, y - 60, 6, '#ff9fb5'); circle(x + 30, y - 40, 6, '#fff');
}
function drawItem(k, x, y, s, t) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 1.6);
  g.addColorStop(0, `rgba(255,250,180,${0.6 + Math.sin(t * 4) * 0.2})`); g.addColorStop(1, 'rgba(255,250,180,0)');
  ctx.fillStyle = g; ctx.fillRect(x - s * 1.6, y - s * 1.6, s * 3.2, s * 3.2);
  drawMaterial(k, x, y, s);
}

const Gather = {
  enter() {
    this.hero = { x: GSTART.x, y: GSTART.y, dir: 'up', ph: 0, moving: false };
    this.trail = []; this.ren = { x: GSTART.x - 60, y: GSTART.y + 40 };
    this.spots = SPOTS.map(s => ({ ...s, got: false }));
    this.stick = { id: null, dx: 0, dy: 0 };
    this.t = 0; this.toast = null; this.hint = 0; this.idle = 0; this.pops = []; this.done = false;
    Talk.say([
      { who: 'レン', t: 'ここが「しずかな もり」だよ。モンスターは いないから あんしんしてね。' },
      { who: 'レン', t: `そざいは ぜんぶで ${SPOTS.length}こ。ひろい もりの あちこちに ちらばってるよ。` },
      { who: 'レン', t: '木や いわの うら、しげみの なかにも かくれてるかも。よく さがしてね！' },
      { who: 'レン', t: 'こまったら、みぎうえの「レンに きく」を おしてね。' },
    ]);
  },
  left() { return this.spots.filter(s => !s.got).length; },
  down: Field.down, move: Field.move, up: Field.up, stickGeo: Field.stickGeo,
  blocked(x, y) {
    const r = 16;
    if (x < 50 || y < 50 || x > GW - 50 || y > GH - 50) return true;
    if (((x - POND.x) / (POND.rx + r)) ** 2 + ((y - POND.y) / (POND.ry + r)) ** 2 < 1) return true;
    for (const [rx, ry, rad] of ROCKS) if (Math.hypot(x - rx, (y - ry) * 1.3) < rad + r) return true;
    for (const [tx, ty] of GTREES) if (Math.hypot(x - tx, y - ty) < 26 + r) return true;
    return false;
  },
  nearest() {
    let best = null, bd = 1e9;
    for (const s of this.spots) if (!s.got) { const d = Math.hypot(s.x - this.hero.x, s.y - this.hero.y); if (d < bd) { bd = d; best = s; } }
    return best;
  },
  ask() {
    const s = this.nearest(); if (!s) return;
    this.hint = 5; this.idle = 0;
    const where = s.hide ? `${s.hide}の あたりが あやしいよ。` : 'ひらけた ところに ありそう！';
    this.toast = { t: `レン：やじるしの ほうを さがしてみて！ ${where}`, time: 4 };
  },
  update(dt) {
    this.t += dt; this.hint = Math.max(0, this.hint - dt);
    if (this.toast) { this.toast.time -= dt; if (this.toast.time <= 0) this.toast = null; }
    this.pops = this.pops.filter(p => (p.t += dt) < 1.4);
    const h = this.hero;
    let dx = this.stick.dx, dy = this.stick.dy;
    if (keys.ArrowLeft || keys.a) dx = -1; if (keys.ArrowRight || keys.d) dx = 1;
    if (keys.ArrowUp || keys.w) dy = -1; if (keys.ArrowDown || keys.s) dy = 1;
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    h.moving = !Talk.active() && !Fade.dir && !this.done && l > 0.15;
    if (!Talk.active() && !this.done) {
      this.idle += dt;
      if (this.idle > 45 && !this.hint) { this.ask(); this.toast.t = 'レン：なかなか みつからないね。' + this.toast.t.replace('レン：', ''); }
    }
    if (h.moving) {
      const sp = 260 * Math.min(1, l) * dt;
      if (!this.blocked(h.x + dx * sp, h.y)) h.x += dx * sp;
      if (!this.blocked(h.x, h.y + dy * sp)) h.y += dy * sp;
      h.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      h.ph += dt * 14;
      this.trail.push({ x: h.x, y: h.y }); if (this.trail.length > 18) this.trail.shift();
    }
    // レンは すこし うしろを ついてくる
    const goal = this.trail.length ? this.trail[0] : h;
    if (Math.hypot(goal.x - h.x, goal.y - h.y) > 40) { this.ren.x = lerp(this.ren.x, goal.x, Math.min(1, dt * 6)); this.ren.y = lerp(this.ren.y, goal.y, Math.min(1, dt * 6)); }
    for (const s of this.spots) {
      if (s.got || Math.hypot(s.x - h.x, s.y - h.y) > 60) continue;
      s.got = true; G.items[s.k]++; this.idle = 0; this.hint = 0;
      this.pops.push({ k: s.k, x: s.x, y: s.y, t: 0 });
      this.toast = { t: `${ITEM_NAME[s.k]}を みつけた！（のこり ${this.left()}こ）`, time: 2.2 };
      if (this.left() === 0) {
        this.done = true; this.toast = null;
        Talk.say([
          { t: `${ITEM_NAME[s.k]}を みつけた！` },
          { who: 'レン', t: 'やったね！ そざいが ぜんぶ あつまったよ！' },
          { who: 'レン', t: 'うらいちばに もどろう！' },
        ], () => Fade.to(() => { G.cleared.sozai = true; Market.back = 'sozai'; go(Market); }));
      }
    }
  },
  draw() {
    const h = this.hero, t = this.t;
    const ZS = clamp(Math.min(W, H) / 560, 0.62, 1.5);
    ctx.fillStyle = '#285c31'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(ZS, ZS); ctx.translate(-h.x, -h.y);
    const vx0 = h.x - W / 2 / ZS - 120, vy0 = h.y - H / 2 / ZS - 120, vx1 = h.x + W / 2 / ZS + 120, vy1 = h.y + H / 2 / ZS + 120;
    for (let gx = Math.floor(vx0 / 90) * 90; gx < vx1; gx += 90) for (let gy = Math.floor(vy0 / 90) * 90; gy < vy1; gy += 90) {
      if (gx > -60 && gx < GW + 60 && gy > -60 && gy < GH + 60) continue;
      const k = hash(gx, gy); circle(gx + k % 40, gy + (k >> 3) % 40, 55, k % 2 ? '#24502b' : '#2f6b38');
    }
    ctx.fillStyle = '#9ad672'; ctx.fillRect(0, 0, GW, GH);
    for (let gx = Math.max(0, Math.floor(vx0 / 70) * 70); gx < Math.min(GW, vx1); gx += 70) for (let gy = Math.max(0, Math.floor(vy0 / 70) * 70); gy < Math.min(GH, vy1); gy += 70) {
      const k = hash(gx + 7, gy + 3); if (k % 4) continue;
      const px = gx + k % 50, py = gy + (k >> 2) % 50;
      if (k % 3 === 0) { circle(px, py, 5, k % 2 ? '#fff6a5' : '#ffd1dc'); circle(px, py, 2, '#f4a259'); }
      else { ctx.strokeStyle = '#74b84f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 6, py); ctx.lineTo(px - 2, py - 10); ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 12); ctx.stroke(); }
    }
    ell(POND.x, POND.y, POND.rx + 14, POND.ry + 12, '#d8c79a');
    ell(POND.x, POND.y, POND.rx, POND.ry, '#5aa9e6');
    ell(POND.x - 60, POND.y - 40, 70, 18, 'rgba(255,255,255,.35)');
    // おくゆきの じゅんに ならべる。かくれた そざいは しげみ・き・いわ より さきに かく
    const list = [];
    for (const s of this.spots) if (!s.got) list.push({ y: s.y, f: () => drawItem(s.k, s.x, s.y - 10, 22, t) });
    for (const [rx, ry, rad] of ROCKS) list.push({ y: ry, f: () => drawRock(rx, ry, rad) });
    for (const [bx, by] of BUSHES) list.push({ y: by + 40, f: () => drawBush(bx, by, t) });
    for (const [tx, ty] of GTREES) list.push({ y: ty, f: () => drawTree(tx, ty, HIDE_TREES.some(q => q[0] === tx && q[1] === ty) ? 60 : 50) });
    list.push({ y: this.ren.y, f: () => drawRen(this.ren.x, this.ren.y, 40, t, this.ren.x > h.x) });
    list.push({ y: h.y, f: () => drawHero(h.x, h.y, 44, h.dir, h.ph, h.moving) });
    list.sort((a, b) => a.y - b.y).forEach(o => o.f());
    // かくれた そざいは ときどき きらっと ひかる（ヒント）
    for (const s of this.spots) if (!s.got && s.hide) {
      const p = (t * 0.4 + s.x * 0.001) % 1;
      if (p < 0.12) star(s.x + 20, s.y - 60 - p * 60, 10 * (1 - p / 0.12) + 3, 'rgba(255,255,200,.9)');
    }
    for (const p of this.pops) {
      ctx.save(); ctx.globalAlpha = 1 - Math.max(0, p.t - 0.9) / 0.5;
      drawMaterial(p.k, p.x, p.y - 40 - p.t * 60, 30);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + p.t * 3; star(p.x + Math.cos(a) * 40, p.y - 40 - p.t * 60 + Math.sin(a) * 40, 8, '#ffe066'); }
      ctx.restore();
    }
    if (this.hint) {
      const s = this.nearest();
      if (s) {
        const a = Math.atan2(s.y - h.y, s.x - h.x);
        ctx.save(); ctx.translate(h.x + Math.cos(a) * 85, h.y - 30 + Math.sin(a) * 85); ctx.rotate(a);
        ctx.globalAlpha = 0.6 + Math.sin(t * 8) * 0.35; tri(26, 0, -12, -18, -12, 18, '#ffdd33'); ctx.restore();
      }
    }
    ctx.restore();
    // がめんの うえ
    const got = this.spots.length - this.left();
    const goal = `あつめた そざい ${got} / ${this.spots.length}`;
    const gp = fitPx(goal, clamp(Math.min(W, H) * 0.045, 14, 22), W - 190);
    ctx.font = font(gp); const gw = ctx.measureText(goal).width + gp * 2;
    rr(12, 12, gw, gp * 2.1, 14); ctx.fillStyle = 'rgba(30,40,60,.75)'; ctx.fill();
    text(goal, 12 + gw / 2, 12 + gp * 1.05, gp, '#fff');
    if (!Talk.active() && !this.done) button(W - 142, 10, 130, 44, 'レンに きく', () => this.ask(), { col: '#7fe0d2', line: '#167a6e', px: 17 });
    if (this.toast) {
      const tp = fitPx(this.toast.t, gp * 0.85, W - 40);
      ctx.font = font(tp); const tw = ctx.measureText(this.toast.t).width + tp * 2;
      rr(W / 2 - tw / 2, 24 + gp * 2.4, tw, tp * 2.2, 14); ctx.fillStyle = 'rgba(31,158,143,.92)'; ctx.fill();
      text(this.toast.t, W / 2, 24 + gp * 2.4 + tp * 1.1, tp, '#fff');
    }
    const st = this.stickGeo();
    circle(st.cx, st.cy, st.R, 'rgba(255,255,255,.28)');
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(st.cx, st.cy, st.R, 0, TAU); ctx.stroke();
    circle(st.cx + this.stick.dx * st.R * 0.6, st.cy + this.stick.dy * st.R * 0.6, st.R * 0.45, this.stick.id !== null ? 'rgba(255,221,51,.95)' : 'rgba(255,255,255,.85)');
    if (Talk.active()) { const [bx, by, bw, bh] = talkBox(); Talk.draw(bx, by, bw, bh); }
  }
};

// ===== うごかす しくみ =====
let scene = null, last = performance.now();
const keys = {};
function go(s) { scene = s; if (s.enter) s.enter(); }

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  if (!portrait()) { // たてむきの あいだは とめておく
    Fade.update(dt); Talk.update(dt);
    if (scene && scene.update) scene.update(dt);
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  hits = [];
  if (portrait()) { drawRotateHint(); requestAnimationFrame(frame); return; }
  if (scene) scene.draw();
  Fade.draw();
  if (Save.flash > 0) { // セーブ した しるし
    Save.flash -= dt;
    ctx.save(); ctx.globalAlpha = Math.min(1, Save.flash * 2);
    rr(W / 2 - 75, 52, 150, 30, 15); ctx.fillStyle = 'rgba(47,158,68,.9)'; ctx.fill();
    text(`セーブ${Save.slot}に セーブした`, W / 2, 68, 14, '#fff');
    ctx.restore();
  }
  requestAnimationFrame(frame);
}

cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  tryLockLandscape();
  if (Fade.dir || nameOpen || portrait()) return;
  const x = e.clientX, y = e.clientY;
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { h.cb(); return; }
  }
  if (scene && scene.down && scene.down(x, y, e.pointerId)) { cv.setPointerCapture(e.pointerId); return; }
  Talk.tap();
});
cv.addEventListener('pointermove', e => { if (scene && scene.move) scene.move(e.clientX, e.clientY, e.pointerId); });
const pointerUp = e => { if (scene && scene.up) scene.up(e.pointerId); };
cv.addEventListener('pointerup', pointerUp);
cv.addEventListener('pointercancel', pointerUp);
window.addEventListener('keydown', e => {
  if (nameOpen || logOpen) return;
  keys[e.key] = true;
  if ((e.key === 'Enter' || e.key === ' ') && !Fade.dir) { e.preventDefault(); Talk.tap(); }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ===== とちゅうから はじめる =====
// あたらしく つくった ばめんを たしたら、ここに ならべて isNew を つけかえる
const CHAPTERS = [
  { id: 'movie', name: 'どうにゅう ムービー' },
  { id: 'field', name: 'おそわれた まちを まもれ' },
  { id: 'boss', name: 'ボス ドンゴラを つかまえろ' },
  { id: 'movie2', name: 'うらいちば ムービー' },
  { id: 'market', name: 'うらいちば' },
  { id: 'gather', name: 'とくべつクエスト そざいあつめ' },
  { id: 'forge', name: 'かじやで そうびを きょうか' },
  { id: 'hunt', name: 'クエスト トルピーを さがせ' },
  { id: 'town2', name: 'どうぐや と モンスター きょうしつ', isNew: true },
];
const NEWEST = CHAPTERS.find(c => c.isNew) || CHAPTERS[CHAPTERS.length - 1];
function startAt(id) {
  const idx = CHAPTERS.findIndex(c => c.id === id), past = k => idx > CHAPTERS.findIndex(c => c.id === k);
  if (past('boss')) addMonster('dongora');                                   // チュートリアルで つかまえた
  if (past('movie2')) { G.gear = true; Market.greeted = true; }               // うらいちば ムービーの あとなら そうびずみ
  if (past('gather')) { G.cleared.sozai = true; G.items = { iron: 3, vine: 3, gem: 2 }; }
  if (past('forge')) { G.lv = { weapon: 2, armor: 2 }; G.items = { iron: 0, vine: 0, gem: 0 }; G.nets.s = 3; }
  if (past('hunt')) { G.cleared.hunt = true; G.coins = HUNT_REWARD; G.nets.s = 1; addMonster('toruppy'); addMonster('yellowl'); }
  recalcBonus();
  if (id === 'movie') Movie.play(CARDS, () => go(Field));
  else if (id === 'field') go(Field);
  else if (id === 'boss') { Field.reset(); Field.foes.forEach(f => { if (!f.boss) f.alive = false; }); Field.fogA = 0; G.firstBattle = false; Battle.begin(Field.foes[2]); }
  else if (id === 'clear') go(Clear);
  else if (id === 'movie2') Movie.play(CARDS2, () => go(Market));
  else if (id === 'market') go(Market);
  else if (id === 'gather') { G.quest = 'sozai'; go(Gather); }
  else if (id === 'forge') go(Forge);
  else if (id === 'hunt') { G.quest = 'hunt'; go(Hunt); }
  else if (id === 'town2') { go(Market); Talk.say([{ who: 'レン', t: 'どうぐやで とりあみが かえるように なったよ。「モンスター きょうしつ」では、つれていく なかまを えらべるよ！' }]); }
  else return false;
  return true;
}

// なまえは つぎに あそぶ ときも おぼえておく（つかえない ときは きにしない）
try { const n = localStorage.getItem('monboken-name'); if (n) G.name = n; } catch (e) { }
function saveName() { try { localStorage.setItem('monboken-name', G.name); } catch (e) { } }

// ===== セーブ（3つ） =====
// cp（つづきの ばしょ）：movie＝さいしょの ムービー、field＝おそわれた まち、movie2＝うらいちば ムービー、market＝うらいちば
// クエストや かじやの とちゅうで やめたら、うらいちばから つづく
const Save = {
  slot: null, flash: 0, // slot：いま つかっている セーブ（1〜3）。ばめんを えらんで はじめた ときは null で セーブしない
  key: n => `monboken-save-${n}`,
  read(n) { try { const s = localStorage.getItem(this.key(n)); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  write(cp, quiet) {
    if (!this.slot) return;
    const data = { v: 1, at: Date.now(), cp, G: JSON.parse(JSON.stringify(G)), market: { greeted: Market.greeted, seen: Market.seen } };
    try { localStorage.setItem(this.key(this.slot), JSON.stringify(data)); if (!quiet) this.flash = 1.8; } catch (e) { }
  },
  erase(n) { try { localStorage.removeItem(this.key(n)); } catch (e) { } },
  load(n) {
    const d = this.read(n); if (!d) return false;
    Object.assign(G, JSON.parse(JSON.stringify(d.G)));
    Market.greeted = !!d.market.greeted; Market.seen = d.market.seen || {};
    this.slot = n; recalcBonus();
    if (d.cp === 'movie') Movie.play(CARDS, () => go(Field));
    else if (d.cp === 'field') go(Field);
    else if (d.cp === 'movie2') Movie.play(CARDS2, () => go(Market));
    else go(Market);
    return true;
  },
  // セーブの なかみを ひとことで
  label(d) {
    if (!d) return 'からっぽ';
    const g = d.G;
    if (d.cp === 'movie') return 'さいしょの ムービー';
    if (d.cp === 'field') return 'おそわれた まち';
    if (d.cp === 'movie2') return 'うらいちば ムービー';
    if (g.cleared.hunt) return 'トルピーの クエスト クリア';
    if (g.lv.weapon > 1) return 'そうびを きょうか した';
    if (g.cleared.sozai) return 'そざいあつめ クリア';
    return 'うらいちば';
  },
};
window.addEventListener('pagehide', () => { if (scene === Market) Save.write('market', true); });

// ===== こうしん りれき =====
let logOpen = false;
const LOG_KEY = 'montomo-log-seen';
function logSeen() { try { return localStorage.getItem(LOG_KEY) === GAME_VERSION; } catch (e) { return true; } }
function openLog() {
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  document.getElementById('log-list').innerHTML = CHANGELOG.map((c, i) =>
    `<div class="ent${i === 0 ? ' latest' : ''}"><span class="ver">ver ${esc(c.ver)}</span><span class="date">${esc(c.date)}</span>` +
    `<h3>${esc(c.title)}</h3><ul>${c.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('');
  document.getElementById('log-list').scrollTop = 0;
  document.getElementById('logbox').hidden = false; logOpen = true;
  try { localStorage.setItem(LOG_KEY, GAME_VERSION); } catch (e) { }
}
document.getElementById('log-close').addEventListener('click', () => { document.getElementById('logbox').hidden = true; logOpen = false; });

// ===== あたらしい バージョンの おしらせ =====
// 2つの ほうほうで しらべる：sw.js が かわった とき（サービスワーカー）と、version.json の ばんごうが ちがう とき。
// iPad で アプリに もどって きた ときと、5ふん ごとにも しらべる。
let swWaiting = null, reloading = false;
function showUpdateBanner() {
  const b = document.getElementById('update-banner');
  if (b && b.dataset.dismissed !== '1') b.hidden = false;
}
function onLatestVersion(v) { if (v && v !== GAME_VERSION) showUpdateBanner(); }
function checkVersion() {
  if (location.protocol === 'file:') return;
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null).then(j => { if (j) onLatestVersion(String(j.version)); }).catch(() => { });
}
function setupUpdates() {
  if (location.protocol !== 'file:' && navigator.serviceWorker) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      const watch = w => w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) { swWaiting = w; showUpdateBanner(); }
      });
      if (reg.waiting && navigator.serviceWorker.controller) { swWaiting = reg.waiting; showUpdateBanner(); }
      reg.addEventListener('updatefound', () => { if (reg.installing) watch(reg.installing); });
      const poke = () => reg.update().catch(() => { });
      setInterval(poke, 5 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) poke(); });
    }).catch(() => { });
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
  }
  checkVersion();
  setInterval(checkVersion, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });
  document.getElementById('btn-update').addEventListener('click', () => {
    if (scene === Market) Save.write('market', true); // こうしん する まえに セーブ
    document.getElementById('btn-update').textContent = 'こうしん ちゅう…';
    if (swWaiting) { swWaiting.postMessage({ type: 'SKIP_WAITING' }); setTimeout(() => location.reload(), 3000); }
    else location.reload();
  });
  document.getElementById('btn-update-later').addEventListener('click', () => {
    const b = document.getElementById('update-banner'); b.hidden = true; b.dataset.dismissed = '1';
  });
}

// ===== よこむき に する =====
// iPad・スマホの ブラウザは むきを こてい できない ことが あるので、たてむきの ときは「よこに してね」と だして とめる
function portrait() { return H > W; }
function drawRotateHint() {
  ctx.fillStyle = '#1d2b3a'; ctx.fillRect(0, 0, W, H);
  const s = Math.min(W, H) * 0.25, a = (Math.sin(T * 2) * 0.5 + 0.5) * Math.PI / 2;
  ctx.save(); ctx.translate(W / 2, H * 0.4); ctx.rotate(-a);
  rr(-s * 0.32, -s * 0.55, s * 0.64, s * 1.1, s * 0.1); ctx.fillStyle = '#e8eef5'; ctx.fill();
  rr(-s * 0.26, -s * 0.46, s * 0.52, s * 0.88, s * 0.05); ctx.fillStyle = '#6ec3ff'; ctx.fill();
  drawPomuru(0, s * 0.2, s * 0.14, T);
  ctx.restore();
  text('よこむきに してね', W / 2, H * 0.68, Math.min(W * 0.08, 30), '#fff');
  text('がめんの むきを ロック すると あそびやすいよ', W / 2, H * 0.68 + 40, fitPx('がめんの むきを ロック すると あそびやすいよ', 15, W - 30), '#c9d6e8');
}
// アンドロイドなどで できる ときは よこに こてい（できなくても きにしない）
function tryLockLandscape() {
  try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => { }); } catch (e) { }
}

// アドレスの さいごに #gather などを つけても その ばめんから はじまる
(function start() {
  setupUpdates();
  const h = location.hash.slice(1), m = h.match(/^load(\d)$/);
  if (m) { if (!Save.load(+m[1])) go(Title); }
  else if (!startAt(h)) go(Title);
  requestAnimationFrame(frame);
})();
