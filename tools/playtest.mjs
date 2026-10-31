// CDP で Chrome を動かして、タイトル→ムービー→フィールド→ざこ2→ボス捕獲→クリア まで通す
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [, , gameDir, outDir, wArg, hArg] = process.argv;
const VW = +(wArg || 900), VH = +(hArg || 600);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 400);
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', `--user-data-dir=${outDir}/prof${port}`, `--window-size=${VW},${VH}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const wait = {}; const errors = [];
for (let i = 0; i < 50; i++) {
  try { const r = await fetch(`http://127.0.0.1:${port}/json`); const j = await r.json(); const p = j.find(x => x.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch { }
  await sleep(200);
}
await new Promise(r => ws.onopen = r);
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; } if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(JSON.stringify(d.params.args)); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr + ' => ' + JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
const tap = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); await sleep(60); };
let n = 0; const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${String(++n).padStart(2, '0')}-${name}.png`, Buffer.from(r.result.data, 'base64')); };
// ボタンを ラベルで さがして おす
const press = async label => { const h = await ev(`(()=>{const b=hits.find(h=>h.label===${JSON.stringify(label)});return b&&[b.x+b.w/2,b.y+b.h/2]})()`); if (!h) throw new Error('button not found: ' + label + ' / ' + await ev('JSON.stringify(hits.map(h=>h.label))')); await tap(h[0], h[1]); await sleep(150); };
const talkAll = async (max = 60) => { for (let i = 0; i < max && await ev('Talk.active()'); i++) { await tap(VW / 2, VH * 0.5); await sleep(40); await tap(VW / 2, VH * 0.5); await sleep(40); } };
const shop = async (id, label) => { await ev(`Market.tx=Market.sx=Market.centerOn('${id}')`); await sleep(120); await press(label); };
const waitFor = async (expr, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return; await sleep(100); } throw new Error('timeout: ' + expr); };

await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: pathToFileURL(gameDir + '/index.html').href });
await sleep(1500);
// ボタンの ラベルを テスト用に のこす
await shot('title');
await ev(`(()=>{const orig=button; button=function(x,y,w,h,label,cb,o){orig(x,y,w,h,label,cb,o); hits[hits.length-1].label=label;}})()`);
await sleep(100);
await press('はじめから'); await sleep(200); await shot('slots-new'); await press('セーブ1：からっぽ'); await sleep(300);
await ev(`document.getElementById('nameinput').value='ゆうと'`);
await ev(`document.getElementById('nameok').click()`);
await sleep(900);
for (let c = 0; c < 6; c++) {
  await waitFor('scene===Movie && Movie.tr<0 && Talk.active()');
  await sleep(1300); await shot(`movie${c + 1}`);
  await talkAll();
  if (c < 5) await sleep(950);
}
await waitFor('scene===Field && Field.ready', 4000); await sleep(600); await shot('field-intro');
await talkAll(); await sleep(200);
// スティックで すこし うごかす
const st = await ev('(()=>{const g=Field.stickGeo();return [g.cx,g.cy,g.R]})()');
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: st[0], y: st[1], button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: st[0], y: st[1] - st[2], button: 'left' });
await sleep(700); await shot('field-walk');
const y0 = await ev('Field.hero.y');
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: st[0], y: st[1] - st[2], button: 'left', clickCount: 1 });
const y1 = await ev('Field.hero.y');
if (!(y1 < 1250 - 50)) throw new Error('stick did not move hero: ' + y0 + ' ' + y1);
// ボスに ちかづこうとすると けむり
await ev('Field.hero.x=900;Field.hero.y=520;Field.inv=0'); await sleep(50);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
await sleep(800); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
const bd = await ev('Math.hypot(Field.hero.x-900,Field.hero.y-330)');
if (bd < 160) throw new Error('fog did not block: ' + bd); await shot('field-fog');

const battle = async (fi, name, useNet) => {
  await ev(`(()=>{const f=Field.foes[${fi}];Field.hero.x=f.x;Field.hero.y=f.y+60;Field.inv=0})()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await waitFor('scene===Battle', 5000);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await sleep(700); await shot(name + '-start');
  await talkAll();
  for (let turn = 0; turn < 30; turn++) {
    await waitFor("Battle.phase==='cmd' || scene!==Battle || Battle.phase==='capture'", 8000);
    if (await ev('scene!==Battle || Battle.phase===\'capture\'')) break;
    if (turn === 0) await shot(name + '-cmd');
    if (useNet && await ev('Battle.netHint')) { await shot(name + '-nethint'); await press('とりあみ'); await press(`とりあみ［小］ ×1`); await talkAll(5); break; }
    await press('わざ'); if (turn === 0) await shot(name + '-moves');
    await press(turn % 3 === 2 ? 'はっぱシュート' : 'ころころアタック');
    await talkAll();
  }
};
await battle(0, 'zako1');
await waitFor('scene===Field', 5000); await sleep(500); await talkAll();
// ざこ戦では あみを つかえない ことも 確かめる
await ev(`(()=>{const f=Field.foes[1];Field.hero.x=f.x;Field.hero.y=f.y+60;Field.inv=0})()`);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
await waitFor('scene===Battle', 5000);
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
await sleep(600); await talkAll(); await waitFor("Battle.phase==='cmd'");
await press('とりあみ'); await press('とりあみ［小］ ×1'); await sleep(300); await shot('zako2-net-refused');
if (await ev('G.nets.s') !== 1) throw new Error('net used on zako');
await talkAll(); await press('にげる'); await sleep(300); await talkAll();
for (let turn = 0; turn < 30 && await ev('scene===Battle'); turn++) {
  await waitFor("Battle.phase==='cmd' || scene!==Battle", 8000);
  if (await ev('scene!==Battle')) break;
  await press('わざ'); await press('ころころアタック'); await talkAll();
}
await waitFor('scene===Field', 5000); await sleep(700); await shot('field-fog-cleared'); await talkAll();
await sleep(1100); await shot('field-boss-open');
await battle(2, 'boss', true);
await waitFor("Battle.phase==='capture'", 5000); await sleep(1300); await shot('capture-shake');
await waitFor("Talk.active()", 6000); await shot('captured'); await talkAll(); await waitFor('scene===Clear', 5000); await sleep(700); await shot('clear-talk');
await talkAll(); await sleep(500); await shot('clear-end');
const allyHp = await ev('Battle.a.hp');
// うらいちば ムービー（7場面）
await press('つぎへ'); await sleep(900);
for (let c = 0; c < 7; c++) {
  await waitFor('scene===Movie && Movie.tr<0 && Talk.active()');
  await sleep(1300); await shot(`movie2-${c + 1}`);
  await talkAll();
  if (c < 6) await sleep(950);
}
await waitFor('scene===Market', 4000); await sleep(600); await shot('market-intro');
const gear = await ev('JSON.stringify({gear:G.gear,bonus:G.bonus})');
if (!gear.includes('"gear":true') || !gear.includes('"hp":5')) throw new Error('gear not applied: ' + gear);
await talkAll(); await sleep(600); await shot('market');
await shop('smith', 'かじや'); await shot('market-smith'); await talkAll(); await sleep(600);
await shop('quest', 'クエスト うけつけ'); await sleep(200); await shot('quest-board');
await press('とくべつクエスト「そざいあつめ」'); await sleep(200); await shot('quest-confirm');
await press('いいえ'); await press('とくべつクエスト「そざいあつめ」'); await press('はい'); await sleep(300); await shot('quest-accepted');
if (await ev('G.quest') !== 'sozai') throw new Error('quest not accepted');
// そざいあつめ
await talkAll(); await waitFor('scene===Gather', 4000); await sleep(600); await shot('gather-intro');
await talkAll(); await sleep(500);
const st2 = await ev('(()=>{const g=Gather.stickGeo();return [g.cx,g.cy,g.R]})()');
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: st2[0], y: st2[1], button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: st2[0] + st2[2], y: st2[1] - st2[2], button: 'left' });
await sleep(900); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: st2[0] + st2[2], y: st2[1] - st2[2], button: 'left', clickCount: 1 });
await shot('gather-walk');
await press('レンに きく'); await sleep(400); await shot('gather-hint');
// モンスターは でない
if (await ev('typeof Gather.foes') !== 'undefined') throw new Error('gather has foes');
// スタートから あるいて とどくか（はばの ある さがし かた）を、そざい ごとに しらべる
const reach = JSON.parse(await ev(`(()=>{const S=20,cw=Math.ceil(GW/S),ch=Math.ceil(GH/S),seen=new Uint8Array(cw*ch),q=[];
 const sx=Math.round(GSTART.x/S),sy=Math.round(GSTART.y/S);seen[sy*cw+sx]=1;q.push([sx,sy]);
 while(q.length){const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cw||ny>=ch||seen[ny*cw+nx])continue;if(Gather.blocked(nx*S,ny*S))continue;seen[ny*cw+nx]=1;q.push([nx,ny]);}}
 return JSON.stringify(SPOTS.map(s=>{let best=null;for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){if(!seen[y*cw+x])continue;const d=Math.hypot(x*S-s.x,y*S-s.y);if(d<55&&(!best||d<best.d))best={x:x*S,y:y*S,d};}return best;}));})()`));
if (reach.some(r => !r)) throw new Error('unreachable spot: ' + JSON.stringify(reach));
// かくれた そざいの まえまで きて しゃしん
await ev('Gather.hero.x=1100;Gather.hero.y=560'); await sleep(400); await shot('gather-hidden-tree');
await ev('Gather.hero.x=2450;Gather.hero.y=2120'); await sleep(400); await shot('gather-hidden-rock');
const dist = await ev('(()=>{let m=1e9;for(let i=0;i<SPOTS.length;i++)for(let j=i+1;j<SPOTS.length;j++)m=Math.min(m,Math.hypot(SPOTS[i].x-SPOTS[j].x,SPOTS[i].y-SPOTS[j].y));return Math.round(m)})()');
for (let i = 0; i < reach.length; i++) {
  await ev(`Gather.hero.x=${reach[i].x};Gather.hero.y=${reach[i].y}`); await sleep(250);
  if (i === 1) await shot('gather-found');
}
await waitFor('Talk.active()', 3000); await shot('gather-done'); await talkAll();
await waitFor('scene===Market', 4000); await sleep(500); await talkAll(); await sleep(300); await shot('quest-clear');
const items = await ev('JSON.stringify(G.items)');
// かじやで きょうか（レンの いう とおりに ぶき → ぼうぐ）
await press('かじやで そうびを きょうか する'); await waitFor('scene===Forge', 4000); await sleep(500); await shot('forge-intro');
await talkAll(); await sleep(300); await shot('forge-weapon-step');
await press('きょうか'); await sleep(500); await shot('forge-hammer'); await talkAll(); await sleep(300);
if (await ev('G.lv.weapon') !== 2) throw new Error('weapon not upgraded');
await press('きょうか'); await talkAll(); await sleep(300); await shot('forge-done');
const lv = await ev('JSON.stringify({lv:G.lv,bonus:G.bonus,items:G.items})');
if (!lv.includes('"armor":2') || !lv.includes('"atk":2') || !lv.includes('"hp":10')) throw new Error('upgrade wrong: ' + lv);
await press('うらいちばへ もどる'); await waitFor('scene===Market', 4000); await sleep(500); await shot('market-nextquest'); await talkAll(); await sleep(600);
await shop('quest', 'クエスト うけつけ'); await sleep(200); await shot('quest-board2');
await press('クエスト「トルピーを さがせ」'); await press('はい'); await sleep(300); await talkAll();
await waitFor('scene===Hunt', 4000); await sleep(600); await shot('hunt-intro'); await talkAll(); await sleep(300);
if (await ev('G.nets.s') !== 3) throw new Error('nets not given');
const huntBattle = async (fi, name, fn) => {
  await ev(`(()=>{const f=Hunt.foes[${fi}];Hunt.hero.x=f.x;Hunt.hero.y=f.y+15;Hunt.inv=0})()`);
  await waitFor('scene===Battle', 5000); await sleep(700); await shot(name + '-start'); await talkAll();
  await fn();
};
// イエロール：にげる → もう いちど → たおす
await huntBattle(0, 'yellowl', async () => { await waitFor("Battle.phase==='cmd'"); await press('にげる'); await talkAll(); await waitFor('scene===Hunt', 4000); });
await sleep(1700);
await huntBattle(0, 'yellowl2', async () => {
  for (let i = 0; i < 30 && await ev('scene===Battle'); i++) { await waitFor("Battle.phase==='cmd' || scene!==Battle", 8000); if (await ev('scene!==Battle')) break; await press('わざ'); await press('はっぱシュート'); await talkAll(); }
});
await waitFor('scene===Hunt', 5000); await sleep(400);
if (await ev('Hunt.foes[0].alive')) throw new Error('yellowl not defeated');
// トルピー：よわらせて あみ（1かいめは しっぱい、2かいめで せいこう）
await huntBattle(5, 'toruppy', async () => {
  for (let i = 0; i < 20 && !(await ev('Battle.netHint')); i++) { await waitFor("Battle.phase==='cmd'", 8000); await press('わざ'); await press('ころころアタック'); await talkAll(); }
  await waitFor("Battle.phase==='cmd'", 8000); await shot('toruppy-weak');
  await ev('window._r=Math.random;Math.random=()=>0.99'); await press('とりあみ'); await press('とりあみ［小］ ×3'); await talkAll(1);
  await waitFor("Battle.phase==='talk' && Talk.active()", 6000); await shot('toruppy-escape'); await talkAll();
  await waitFor("Battle.phase==='cmd'", 8000);
  await ev('Math.random=()=>0'); await press('とりあみ'); await press('とりあみ［小］ ×2'); await talkAll(1);
  await sleep(1500); await shot('toruppy-capture'); await waitFor('Talk.active()', 5000); for (let i = 0; i < 10 && await ev('scene===Battle && Talk.active()'); i++) await talkAll(1);
  await ev('Math.random=window._r');
});
await waitFor('scene===Hunt && Talk.active()', 5000); await shot('hunt-clear'); await talkAll();
await waitFor('scene===Market', 5000); await sleep(400); await talkAll(); await sleep(300); await shot('quest-clear2');
const party = await ev('JSON.stringify(G.box.map(m=>m.kind))');
if (!party.includes('toruppy')) throw new Error('toruppy not in box');
if (await ev('G.coins') !== 500) throw new Error('reward missing');
await press('うらいちばに もどる'); await sleep(600);
// どうぐや：とりあみを かう
await shop('shop', 'どうぐや'); await sleep(200); await shot('shop');
await press('100コイン'); await press('300コイン'); await sleep(200); await shot('shop-bought');
const shopState = await ev('JSON.stringify({coins:G.coins,nets:G.nets})');
if (!shopState.includes('"coins":100') || !shopState.includes('"m":1')) throw new Error('shop wrong: ' + shopState);
await press('800コイン'); await sleep(200); await shot('shop-poor');
if (await ev('G.nets.l') !== 0) throw new Error('bought without coins');
await press('とじる'); await sleep(600);
// モンスター きょうしつ：つれていく なかまを かえる
await shop('school', 'モンスター きょうしつ'); await sleep(300); await shot('school');
const team0 = await ev('G.team.length');
await press('team:1'); await sleep(150);
if (await ev('G.team.length') !== team0 - 1) throw new Error('remove failed');
await press('box:dongora:1'); await sleep(150);
await press('team:0'); await sleep(150); await shot('school-changed');
const teamKinds = await ev('JSON.stringify(teamMons().map(m=>m.kind))');
if (teamKinds.startsWith('["pomuru')) throw new Error('leader not changed: ' + teamKinds);
await press('とじる'); await sleep(400);
// たたかいで こうたい
await ev("Battle.begin({kind:'yellowl',x:0,y:0,alive:true},Hunt)"); await sleep(600); await talkAll();
await waitFor("Battle.phase==='cmd'"); const k0 = await ev('Battle.a.kind');
await press('こうたい'); await sleep(200); await shot('swap-menu');
const other = await ev('Battle.allies.find(x=>x!==Battle.a).name');
await press(other); await talkAll(); await waitFor("Battle.phase==='cmd'", 8000); await shot('swapped');
if (await ev('Battle.a.kind') === k0) throw new Error('swap failed');
// タイトルから とちゅうの ばめんへ とべるか（よみこみ なおすと なまえも のこっているか）
const reload = async () => {
  await send('Page.navigate', { url: pathToFileURL(gameDir + '/index.html').href }); await sleep(1200);
  await ev(`(()=>{const orig=button; button=function(x,y,w,h,label,cb,o){orig(x,y,w,h,label,cb,o); hits[hits.length-1].label=label;}})()`); await sleep(100);
};
await reload(); await shot('title-menu-buttons');
const savedName = await ev('G.name');
await press('ばめんを えらぶ'); await shot('title-chapters');
const chapters = await ev('CHAPTERS.length');
for (let i = 0; i < chapters; i++) {
  const c = await ev(`JSON.stringify(CHAPTERS[${i}])`), ch = JSON.parse(c);
  if (i > 0) { await reload(); await press('ばめんを えらぶ'); }
  await press(`${i + 1}. ${ch.name}`); await sleep(800);
  const sc = await ev('scene===Movie?"Movie":scene===Field?"Field":scene===Battle?"Battle":scene===Market?"Market":scene===Gather?"Gather":scene===Forge?"Forge":scene===Hunt?"Hunt":"?"');
  const want = { movie: 'Movie', field: 'Field', boss: 'Battle', movie2: 'Movie', market: 'Market', gather: 'Gather', forge: 'Forge', hunt: 'Hunt', town2: 'Market' }[ch.id];
  if (sc !== want) throw new Error(`chapter ${ch.id} went to ${sc}`);
  if (['market', 'gather'].includes(ch.id) && !(await ev('G.gear'))) throw new Error('gear missing in ' + ch.id);
}
await reload(); await press('あたらしい ところから'); await sleep(800);
// セーブ：よみこみ なおして「つづきから」
await reload(); await press('つづきから'); await sleep(200); await shot('slots-load');
const lab = await ev("(hits.find(h=>h.label&&h.label.startsWith('セーブ1'))||{}).label");
await press(lab); await sleep(1500); await talkAll(); await shot('loaded');
const loaded = await ev('JSON.stringify({market: scene===Market, coins:G.coins, box:G.box.length, team:G.team.length, nets:G.nets, slot:Save.slot, name:G.name})');
if (!loaded.includes('"market":true') || !loaded.includes('"box":3') || !loaded.includes('"slot":1') || !loaded.includes('"coins":100')) throw new Error('load wrong: ' + loaded);
await reload(); await press('はじめから'); await press(lab); await sleep(200); await shot('slots-overwrite');
if (!(await ev("hits.some(h=>h.label==='いいえ')"))) throw new Error('no overwrite confirm');
await press('いいえ'); await press('とじる');
await reload(); await press('あたらしい ところから'); await sleep(800);
const newest = await ev('NEWEST.id');
if (!(await ev(`scene===({gather:Gather,forge:Forge,hunt:Hunt,town2:Market}[NEWEST.id])`))) throw new Error('newest did not open ' + newest);
await shot('newest');
console.log(JSON.stringify({ ok: true, name: await ev('G.name'), savedName, allyHp, gear, items, lv, party, shopState, teamKinds, minSpotDist: dist, chapters, newest, loaded, errors }));
ws.close(); proc.kill();
process.exit(0);
