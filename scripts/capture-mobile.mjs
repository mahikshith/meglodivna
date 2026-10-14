import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const output = resolve('artifacts/runeheart');
const port = 9229;
const profile = resolve('dist/mobile-capture-profile');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
await mkdir(output, { recursive: true });
const browser = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${port}`, '--remote-allow-origins=*',
  `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });

try {
  let target;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      target = (await response.json()).find((entry) => entry.type === 'page');
      if (target) break;
    } catch { /* Browser is starting. */ }
    await sleep(200);
  }
  if (!target) throw new Error('Chrome debugging target did not start');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const browserErrors = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description || ''));
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  const command = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
    const id = ++nextId;
    pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true });
    return result.result.value;
  };
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Network.setCacheDisabled', { cacheDisabled: true });
  await command('Emulation.setDeviceMetricsOverride', { width: 740, height: 360, deviceScaleFactor: 1, mobile: true });
  await command('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await command('Page.navigate', { url: `http://127.0.0.1:5173/?qa=${Date.now()}` });
  await sleep(4000);
  const capture = async (name) => {
    const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, name), Buffer.from(screenshot.data, 'base64'));
  };
  await capture('mobile-menu.png');
  const menu = await evaluate(`(() => {
    const ids = ['stage','menu','start','world-select','difficulty'];
    return Object.fromEntries(ids.map(id => { const r = document.getElementById(id).getBoundingClientRect(); return [id,{x:r.x,y:r.y,w:r.width,h:r.height}]}));
  })()`);
  await evaluate("document.getElementById('start').click()");
  await sleep(3000);
  await capture('mobile-gameplay.png');
  const gameplay = await evaluate(`(() => {
    const ids = ['stage','game','touch','touch-dash','touch-attack','touch-jump','touch-power'];
    return { mode: document.getElementById('stage').dataset.mode, touch: matchMedia('(pointer: coarse)').matches,
      canvas: !!document.querySelector('#game canvas'), menuHidden: document.getElementById('menu').hidden,
      elements: Object.fromEntries(ids.map(id => { const r = document.getElementById(id).getBoundingClientRect(); return [id,{x:r.x,y:r.y,w:r.width,h:r.height}]}))};
  })()`);
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await sleep(180);
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await sleep(90);
  await capture('mobile-jump.png');
  await evaluate("document.getElementById('touch-pause').click()");
  await evaluate("document.getElementById('menu-settings').click()");
  await sleep(150);
  await capture('mobile-settings.png');
  const settings = await evaluate(`(() => { const r=document.getElementById('settings-close').getBoundingClientRect(); return {open:document.getElementById('settings-panel').open,music:document.getElementById('music-volume').value,sfx:document.getElementById('sfx-volume').value,close:{y:r.y,h:r.height}} })()`);
  assert.ok(menu.start.y >= menu.stage.y && menu.start.y + menu.start.h <= menu.stage.y + menu.stage.h, 'Launch button must fit the mobile viewport');
  assert.equal(gameplay.mode, 'playing');
  assert.equal(gameplay.touch, true);
  assert.equal(gameplay.canvas, true);
  assert.equal(gameplay.elements.game.h, gameplay.elements.stage.h, 'The game canvas must use the full playfield height');
  for (const id of ['touch-dash', 'touch-attack', 'touch-jump', 'touch-power']) {
    const rect=gameplay.elements[id];
    assert.ok(rect.w >= 80 && rect.y >= 0 && rect.y + rect.h <= 360, `${id} must remain usable`);
  }
  assert.ok(settings.open && settings.close.y + settings.close.h <= 360, 'Settings return button must fit the viewport');
  assert.deepEqual(browserErrors, [], 'Browser must have no runtime exceptions');
  console.log(JSON.stringify({ menu, gameplay, settings, browserErrors }, null, 2));
  socket.close();
} finally {
  browser.kill();
}
