import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = process.cwd();
const PROFILE = path.join(ROOT, '.house-test');
const PORT = 9370;
const INDEX = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const PLAYROOM = 'file:///' + path.join(ROOT, 'playroom.html').replace(/\\/g, '/');
const ARCADE = 'file:///' + path.join(ROOT, 'arcade.html').replace(/\\/g, '/');
fs.rmSync(PROFILE, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--allow-file-access-from-files', '--remote-allow-origins=*',
  '--user-data-dir=' + PROFILE, '--remote-debugging-port=' + PORT,
  '--window-size=1440,900', 'about:blank'
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page;
for (let i = 0; i < 80; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    page = list.find((t) => t.type === 'page');
    if (page) break;
  } catch {}
  await sleep(150);
}
if (!page) throw new Error('no page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.text || 'exception');
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text);
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const i = ++id; pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(ROOT, name), Buffer.from(r.data, 'base64'));
  console.log('saved', name);
}
async function clickEl(selector) {
  const box = JSON.parse(await evaluate(`(() => { const r = document.querySelector('${selector}').getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`));
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
}
async function go(url, wait = 1300) {
  await send('Page.navigate', { url });
  await sleep(wait);
}

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

await go(INDEX + '?back=1', 800);
console.log('RESIDENT_DEFAULT', await evaluate(`JSON.stringify({
  bed: document.getElementById('resident').getAttribute('data-bed'),
  bedDisplay: getComputedStyle(document.querySelector('.resident-bed')).display,
  rugDisplay: getComputedStyle(document.querySelector('.resident-rug')).display,
  count: document.getElementById('profileCount').textContent
})`));
await shot('house-index-bed.png');

await clickEl('#profileBtn');
await sleep(350);
console.log('PROFILE_TABS', await evaluate(`JSON.stringify({
  tabs: [...document.querySelectorAll('.profile-tab')].map(t => t.dataset.pane),
  achievements: document.querySelectorAll('.achievement-item').length,
  gameAchievements: [...document.querySelectorAll('.achievement-item')].filter(el => el.querySelector('.achievement-tag')).length,
  summary: document.getElementById('profileSummary').textContent
})`));
await shot('house-profile-achievements.png');
await evaluate(`document.querySelector('.profile-tab[data-pane="house"]').click()`);
await sleep(300);
console.log('HOUSE_DEFAULT', await evaluate(`JSON.stringify({
  scene: !!document.getElementById('houseScene'),
  catSvg: !!document.querySelector('#houseCat svg'),
  beds: [...document.querySelectorAll('.house-bed-option')].map(b => ({ id: b.dataset.bed, disabled: b.disabled, selected: b.classList.contains('is-selected') })),
  details: [...document.querySelectorAll('.house-detail-option')].map(b => ({ id: b.dataset.detail, disabled: b.disabled, on: b.classList.contains('is-on') })),
  sceneBed: document.getElementById('houseScene').getAttribute('data-bed'),
  sceneRug: document.getElementById('houseScene').getAttribute('data-house-rug')
})`));
await shot('house-profile-house.png');

// Seed a fully unlocked profile to inspect the furnished house.
await evaluate(`localStorage.setItem('tihon.profile.v1', JSON.stringify({
  unlocked: { explorer: 1, feeder: 1, petter: 1, player: 1, record: 1, curious: 1, fish_10: 1, yarn_10: 1, checkers_win: 1, flappy_10: 1, memory_win: 1, mice_15: 1, arcade_all: 1 },
  visited: { aquarium: true, cats: true },
  hat: 'tophat',
  arcadeSeen: { checkers: true, flappy: true, memory: true, mice: true },
  house: { bed: 'patch', items: { rug: true, 'toy-yarn': true, scratch: true, 'toy-mouse': true, lamp: true, plant: true } }
})); location.reload();`);
await sleep(750);
console.log('RESIDENT_FURNISHED', await evaluate(`JSON.stringify({
  bed: document.getElementById('resident').getAttribute('data-bed'),
  rug: document.getElementById('resident').getAttribute('data-house-rug'),
  scratch: document.getElementById('resident').getAttribute('data-house-scratch'),
  toys: [document.getElementById('resident').getAttribute('data-house-toy-yarn'), document.getElementById('resident').getAttribute('data-house-toy-mouse')],
  count: document.getElementById('profileCount').textContent
})`));
await shot('house-index-furnished.png');
await clickEl('#profileBtn');
await sleep(300);
await evaluate(`document.querySelector('.profile-tab[data-pane="house"]').click()`);
await sleep(250);
console.log('HOUSE_FURNISHED', await evaluate(`JSON.stringify({
  summary: document.getElementById('profileSummary').textContent,
  sceneBed: document.getElementById('houseScene').getAttribute('data-bed'),
  sceneItems: {
    rug: document.getElementById('houseScene').getAttribute('data-house-rug'),
    scratch: document.getElementById('houseScene').getAttribute('data-house-scratch'),
    yarn: document.getElementById('houseScene').getAttribute('data-house-toy-yarn'),
    mouse: document.getElementById('houseScene').getAttribute('data-house-toy-mouse'),
    lamp: document.getElementById('houseScene').getAttribute('data-house-lamp'),
    plant: document.getElementById('houseScene').getAttribute('data-house-plant')
  },
  beds: [...document.querySelectorAll('.house-bed-option')].map(b => ({ id: b.dataset.bed, selected: b.classList.contains('is-selected') })),
  detailsOn: [...document.querySelectorAll('.house-detail-option.is-on')].length,
  catHat: document.getElementById('houseCat').getAttribute('data-hat'),
  catHatDisplay: getComputedStyle(document.querySelector('#houseCat .tihon-hat--tophat')).display
})`));
await shot('house-profile-furnished.png');

// Game achievements: fish round with 10 points.
await evaluate(`localStorage.removeItem('tihon.profile.v1'); location.reload();`);
await sleep(700);
await go(PLAYROOM, 900);
await evaluate(`(() => { window.__tihon.beginGame(); window.__tihon.state.score = 10; window.__tihon.finishGame(); })()`);
await sleep(300);
console.log('FISH_UNLOCK', await evaluate(`JSON.stringify({
  profile: JSON.parse(localStorage.getItem('tihon.profile.v1')),
  toast: document.querySelector('.tihon-toast')?.textContent || ''
})`));
await shot('house-fish-unlock.png');

// Arcade all four games + memory win.
await go(ARCADE, 900);
await evaluate(`document.querySelector('.arcade-tab[data-game="flappy"]').click(); document.querySelector('.arcade-tab[data-game="memory"]').click(); document.querySelector('.arcade-tab[data-game="mice"]').click(); document.querySelector('.arcade-tab[data-game="checkers"]').click();`);
await sleep(300);
console.log('ARCADE_ALL', await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('tihon.profile.v1')))`));
await evaluate(`document.querySelector('.arcade-tab[data-game="memory"]').click()`);
await sleep(300);
await evaluate(`(() => {
  const cards = [...document.querySelectorAll('.memory-card')];
  const by = {};
  cards.forEach((c, i) => { (by[c.dataset.type] = by[c.dataset.type] || []).push(i); });
  for (const t in by) { cards[by[t][0]].click(); cards[by[t][1]].click(); }
})()`);
await sleep(300);
console.log('MEMORY_UNLOCK', await evaluate(`JSON.stringify({
  profile: JSON.parse(localStorage.getItem('tihon.profile.v1')),
  overlay: !document.getElementById('memoryOverlay').classList.contains('is-hidden')
})`));

// Mobile house view.
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await go(INDEX + '?back=1', 500);
await clickEl('#profileBtn');
await sleep(300);
await evaluate(`document.querySelector('.profile-tab[data-pane="house"]').click()`);
await sleep(250);
console.log('HOUSE_MOBILE', await evaluate(`(() => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right) }; };
  return JSON.stringify({
    card: rect(document.querySelector('.profile-card')),
    scene: rect(document.getElementById('houseScene')),
    beds: rect(document.querySelector('.house-beds')),
    details: rect(document.querySelector('.house-details')),
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight
  });
})()`));
await shot('house-mobile.png');

// Flappy with changed spacing / two eyes.
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await go(ARCADE, 1000);
await evaluate(`document.querySelector('.arcade-tab[data-game="flappy"]').click()`);
await sleep(250);
await clickEl('#flappyStart');
await sleep(3500);
console.log('FLAPPY_STATE', await evaluate(`JSON.stringify({
  overlay: !document.getElementById('flappyOverlay').classList.contains('is-hidden'),
  title: document.getElementById('flappyTitle').textContent,
  score: document.getElementById('flappyScore').textContent
})`));
await shot('house-flappy.png');

console.log('ERRORS', JSON.stringify(errors));
ws.close();
chrome.kill();
await sleep(250);
process.exit(0);
