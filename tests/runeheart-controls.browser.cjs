/* Isolated DOM/input fixtures; screenshots do not prove a legal campaign route. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const output = path.resolve('artifacts/runeheart/controls');
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:5173';
const source = fs.readFileSync('index.html', 'utf8').replace('<script type="module" src="/src/main.js"></script>', `
<link rel="stylesheet" href="/src/style.css" />
<script type="module">
import {Controls} from '/src/input.js';
import {createCampaignUI} from '/src/ui.js';
import * as catalog from '/src/catalog.js';
const stage=document.getElementById('stage'), touch=document.getElementById('touch');
stage.dataset.touch='true'; stage.dataset.mode='playing';
document.getElementById('menu').hidden=true; document.getElementById('hud').hidden=false; touch.hidden=false;
document.getElementById('zone-label').textContent='THE SUNKEN CAUSEWAY';
document.getElementById('objective').textContent='Reach the drowned sanctuary';
const canvas=document.createElement('canvas'); canvas.width=960; canvas.height=540; canvas.style.width='100%'; canvas.style.height='100%';
const ctx=canvas.getContext('2d'), g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,'#142b3c');g.addColorStop(1,'#314a49');ctx.fillStyle=g;ctx.fillRect(0,0,960,540);
for(let x=0;x<960;x+=64){ctx.fillStyle='#122733';ctx.fillRect(x,120+(x%192),34,300);ctx.fillStyle='#304754';ctx.fillRect(x+7,120+(x%192),4,160);}
ctx.fillStyle='#526b64';ctx.fillRect(0,430,960,12);ctx.fillStyle='#223d3e';ctx.fillRect(0,442,960,98);ctx.fillStyle='#9aaea0';ctx.fillRect(360,340,145,8);ctx.fillStyle='#34504e';ctx.fillRect(360,348,145,25);
ctx.fillStyle='#d9c79e';ctx.fillRect(286,370,16,48);ctx.fillStyle='#f4de8b';ctx.fillRect(284,354,20,19);ctx.fillStyle='#78b9c4';ctx.fillRect(275,371,9,30);
ctx.fillStyle='#f7edcf';ctx.font='18px Arial';ctx.fillText('CONTROL FIXTURE / NO CAMPAIGN SIMULATION',310,105);
document.getElementById('game').append(canvas);
const world={player:{x:300,y:370,mana:100,maxMana:100,spell:'cinder',spellCooldown:0,dashCooldown:0,sword:'rustfang',gun:'carbine',armor:'courier',charges:{nova:1,cannon:1}},progress:{unlocked:Object.fromEntries(['sword','gun','spell','armor'].map(kind=>[kind,catalog[{sword:'SWORDS',gun:'GUNS',spell:'SPELLS',armor:'ARMORS'}[kind]].map(i=>i.id)])),collections:[]},npcs:[],props:[],level:{height:720,portals:[]},timeLeft:312,status:'playing'};
const atlas=await fetch('/reference/atlas.json').then(response=>response.json()), atlasImage=new Image();atlasImage.src='/reference/atlas.png';await atlasImage.decode();
const portraitFrame=atlas.frames['ref-face-mage']?.frame, portraitCanvas=document.createElement('canvas');
let portraitURL;
if(portraitFrame){portraitCanvas.width=portraitFrame.w;portraitCanvas.height=portraitFrame.h;portraitCanvas.getContext('2d').drawImage(atlasImage,portraitFrame.x,portraitFrame.y,portraitFrame.w,portraitFrame.h,0,0,portraitFrame.w,portraitFrame.h);portraitURL=portraitCanvas.toDataURL();}
let pauseCount=0,paletteCount=0;
const controls=new Controls(touch,()=>{pauseCount++;controls.clear();},()=>{},()=>{});
const ui=createCampaignUI(catalog,{onOpen(){paletteCount++;controls.clear();},onClose(){controls.clear();},onEquip(kind,id){world.player[kind]=id;ui.renderHUD(world);},iconUrl(key){return key.startsWith('portrait-')?portraitURL:undefined;}});
ui.renderHUD(world);
window.__TOUCH={controls,ui,world,get pauseCount(){return pauseCount},get paletteCount(){return paletteCount}};
function frame(){controls.read(false);requestAnimationFrame(frame)}requestAnimationFrame(frame);
</script>`);

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
  const report = { kind: 'isolated control/UI fixtures using real Chromium touch events', physicalDeviceTest: false, sizes: [], errors: [] };
  try {
    for (const viewport of [{ width: 844, height: 480 }, { width: 740, height: 360 }, { width: 640, height: 360 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(`${viewport.width}×${viewport.height}: ${error.message}`));
      await page.route('**/control-fixture', route => route.fulfill({ contentType: 'text/html', body: source }));
      await page.goto(`${baseURL}/control-fixture`); await page.waitForFunction(() => window.__TOUCH);
      const cdp = await context.newCDPSession(page);
      assert.equal(await page.locator('#rune-status').getAttribute('aria-label'),'Rune stones: 0 of 3 recovered');
      await page.evaluate(()=>{window.__TOUCH.world.collections=['ember-heart'];window.__TOUCH.ui.renderHUD(window.__TOUCH.world)});
      assert.equal(await page.locator('[data-rune="ember-heart"]').getAttribute('data-recovered'),'true');assert.equal(await page.locator('[data-rune="tide-glass"]').getAttribute('data-recovered'),'false');
      assert.equal(await page.locator('#rune-status').getAttribute('aria-label'),'Rune stones: 1 of 3 recovered');
      for(const id of ['ember-heart','tide-glass','storm-seal'])assert.equal(await page.locator(`[data-rune="${id}"]`).isVisible(),true,`${id} is visibly rendered`);
      assert.ok((await page.locator('.vitals').boundingBox()).height<=50,'compact resource block avoids spawn hero');
      const touch = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [point] : [] });
      const read = () => page.evaluate(() => window.__TOUCH.controls.read());
      const bounds = await page.evaluate(() => {
        const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, right: r.right }; };
        return { game: box(document.getElementById('game')), buttons: [...document.querySelectorAll('#touch button')].map(element => ({ id: element.id, ...box(element), text: element.textContent.trim() })), font: getComputedStyle(document.getElementById('story-text')).fontSize };
      });
      for (const button of bounds.buttons) {
        assert.ok(button.w >= 48 && button.h >= 48, `${button.id} target ≥48px`);
        assert.ok(button.y >= bounds.game.y && button.bottom <= bounds.game.bottom, `${button.id} overlays full-height canvas`);
        assert.ok(button.x >= 0 && button.right <= viewport.width && button.bottom <= viewport.height, `${button.id} within screen`);
        assert.equal(button.text, '', `${button.id} icon-only face`);
      }
      for (let i = 0; i < bounds.buttons.length; i++) for (let j = i + 1; j < bounds.buttons.length; j++) {
        const a = bounds.buttons[i], b = bounds.buttons[j];
        const dx = Math.max(a.x - b.right, b.x - a.right, 0), dy = Math.max(a.y - b.bottom, b.y - a.bottom, 0);
        assert.ok(dx >= 8 || dy >= 8, `${a.id}/${b.id} have ≥8px separating gap`);
      }
      for (const id of ['touch-attack', 'touch-jump']) assert.equal(bounds.buttons.find(button => button.id === id).w, 100);
      assert.equal(bounds.buttons.find(button => button.id === 'touch-dash').w, 92);
      const hintOverlap = await page.evaluate(() => {
        const h=document.querySelector('.touch-hints').getBoundingClientRect();
        return [...document.querySelectorAll('#touch button')].some(button=>{const b=button.getBoundingClientRect();return h.left<b.right&&h.right>b.left&&h.top<b.bottom&&h.bottom>b.top;});
      }); assert.equal(hintOverlap,false,'instructions do not overlap targets');
      const center = (id, pointerId) => { const b = bounds.buttons.find(button => button.id === id); return { x: b.x + b.w / 2, y: b.y + b.h / 2, id: pointerId }; };
      assert.ok(await page.locator('#joystick').isHidden(), 'stick starts hidden');
      const move = { x: 80, y: Math.min(bounds.game.h - 50, 220), id: 1 };
      await touch('touchStart', move); assert.equal((await read()).move, 0, 'fresh origin is neutral');
      const origin = await page.evaluate(() => ({ ...window.__TOUCH.controls.stickOrigin }));
      move.x += 65; await touch('touchMove', move); assert.equal((await read()).move, 1);
      assert.deepEqual(await page.evaluate(() => window.__TOUCH.controls.stickOrigin), origin, 'drag cannot move origin');
      const jump = center('touch-jump', 2); await touch('touchStart', jump);
      let input = await read(); assert.equal(input.jumpPressed, true); assert.equal(input.move, 1); assert.equal(input.jumpHeld, true);
      await page.waitForTimeout(375); input = await read(); assert.equal(input.jet, true);
      assert.equal(await page.locator('#touch-jump').getAttribute('data-phase'), 'hold');
      assert.equal(await page.locator('#touch-jump .action-held').isVisible(), true, 'jet icon visibly replaces jump');
      await page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-jet.png`) });
      await touch('touchEnd', jump); input = await read(); assert.equal(input.jet, false); assert.equal(input.move, 1, 'releasing jump preserves movement');
      const attack = center('touch-attack', 3); await touch('touchStart', attack);
      input = await read(); assert.equal(input.slashPressed, true, 'slash on pointerdown'); assert.equal(input.shoot, false); assert.equal(input.move, 1);
      await page.waitForTimeout(145); input = await read(); assert.equal(input.shoot, true); assert.equal(input.slashPressed, false);
      assert.equal(await page.locator('#touch-attack .action-held').isVisible(), true, 'gun icon visibly replaces sword');
      await page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-fire.png`) });
      await touch('touchEnd', attack); input = await read(); assert.equal(input.shoot, false); assert.equal(input.slashPressed, false); assert.equal(input.move, 1);
      const dash = center('touch-dash', 4); await touch('touchStart', dash); assert.equal((await read()).dashPressed, true); await touch('touchEnd', dash);
      const power = center('touch-power', 5); await touch('touchStart', power); assert.equal((await read()).spellPressed, false); await touch('touchEnd', power); assert.equal((await read()).spellPressed, true);
      await page.evaluate(() => { const f = window.__TOUCH; f.world.npcs=[{x:300,y:370}];f.ui.renderHUD(f.world); });
      assert.equal(await page.locator('#touch-power-name').textContent(), 'INTERACT');
      await touch('touchStart', power); await touch('touchEnd', power); input = await read(); assert.equal(input.interactPressed, true); assert.equal(input.spellPressed, false);
      assert.equal((await read()).move, 1); await touch('touchEnd', move); assert.equal((await read()).move, 0);
      if (viewport.width === 844) {
        await page.waitForTimeout(7900); assert.equal(await page.locator('#joystick').isVisible(), true, 'stick remains visible before 8sec');
        await page.waitForTimeout(200); assert.equal(await page.locator('#joystick').isHidden(), true, 'stick hides after 8sec');
      }
      const fresh = { x: 130, y: 120, id: 6 }; await touch('touchStart', fresh); assert.equal((await read()).move, 0);
      assert.deepEqual(await page.evaluate(() => window.__TOUCH.controls.stickOrigin), { x: 130, y: 120 });
      await touch('touchCancel'); assert.equal((await read()).move, 0); assert.equal(await page.evaluate(() => window.__TOUCH.controls.stickPointer), null);
      await page.evaluate(() => window.__TOUCH.controls.clear());
      await touch('touchStart', attack); assert.equal(await page.evaluate(() => window.__TOUCH.controls.stickPointer), null, 'action cannot claim floating stick');
      await read(); await touch('touchCancel'); assert.equal((await read()).shoot, false);
      await touch('touchStart', power); await page.waitForTimeout(480); await read();
      assert.equal(await page.locator('#catalogue').evaluate(dialog => dialog.open), true, 'long power opens paused palette');
      await touch('touchEnd', power); input = await read(); assert.equal(input.spellPressed, false); assert.equal(input.interactPressed, false);
      await page.locator('#catalogue-close').click();
      assert.equal(await page.evaluate(() => window.__TOUCH.paletteCount), 1);
      const gear = center('touch-gear', 7); await touch('touchStart', gear); await touch('touchEnd', gear);
      assert.equal(await page.locator('#catalogue').evaluate(dialog => dialog.open), true, 'explicit gear shortcut opens palette');
      assert.equal(await page.evaluate(() => window.__TOUCH.controls.pointers.size), 0);
      await page.locator('#control-opacity').focus();await page.keyboard.press('ArrowLeft');
      assert.equal(await page.locator('#control-opacity').inputValue(),'75');assert.equal(await page.locator('#control-opacity-value').textContent(),'75%');
      assert.equal(await page.evaluate(()=>localStorage.getItem('runeheart-touch-opacity')),'75');assert.equal(await page.locator('#touch-jump').evaluate(button=>getComputedStyle(button).opacity),'0.75');
      await page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-gear.png`) });
      await page.locator('#catalogue-close').click();
      await page.evaluate(() => window.__TOUCH.ui.renderStory({npcId:'fixture-warden',portrait:'mira',index:0,lines:[{speaker:'MIRA',text:'The tide is rising. I can open the sanctuary, but the engine needs your last charge.'}],choices:[{id:'help',label:'Give her a charge and open the sanctuary'},{id:'refuse',label:'Keep the charge. Find another route.'}]}));
      assert.ok(parseFloat(bounds.font) >= 16, 'dialogue body ≥16px');
      assert.equal(await page.locator('#story-choices button').count(), 2);
      for (const box of await page.locator('#story-choices button').evaluateAll(buttons=>buttons.map(button=>({height:button.getBoundingClientRect().height,font:getComputedStyle(button).fontSize})))) { assert.ok(box.height>=52);assert.ok(parseFloat(box.font)>=14); }
      await page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-dialogue.png`) });
      await page.evaluate(() => window.__TOUCH.ui.renderStory(null));
      assert.equal((await read()).move, 0); assert.equal((await read()).shoot, false);
      await page.evaluate(() => { const f=window.__TOUCH;f.world.npcs=[];f.world.player.mana=0;f.ui.renderHUD(f.world); });
      assert.equal(await page.locator('#touch-power').getAttribute('data-ready'), 'false');
      await page.evaluate(() => { const f=window.__TOUCH;f.world.player.mana=100;f.ui.renderHUD(f.world); });
      await page.keyboard.down('KeyD'); await page.keyboard.down('Space'); let keyboard=await read(); assert.equal(keyboard.move,1);assert.equal(keyboard.jumpPressed,true);await page.keyboard.up('KeyD');await page.keyboard.up('Space');
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));assert.equal((await read()).move,0);
      await page.evaluate(() => { window.fixturePad={connected:true,axes:[-.8,0],buttons:Array.from({length:16},()=>({pressed:false}))};window.fixturePad.buttons[2].pressed=true;Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.fixturePad]}); });
      let gamepad=await read();assert.equal(gamepad.move,-.8);assert.equal(gamepad.slashPressed,true);assert.equal((await read()).slashPressed,false);
      await page.evaluate(() => { window.fixturePad.connected=false;window.__TOUCH.controls.clear(); });
      await page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-overview.png`) });
      await page.evaluate(()=>{document.getElementById('menu').hidden=false;document.getElementById('touch').hidden=true;document.getElementById('hud').hidden=true;document.getElementById('stage').dataset.mode='menu';});
      if(viewport.width>viewport.height){
        for(const box of await page.locator('#start,#difficulty,#world-select').evaluateAll(items=>items.map(item=>{const r=item.getBoundingClientRect();return{id:item.id,top:r.top,bottom:r.bottom};})))assert.ok(box.top>=0&&box.bottom<=viewport.height,`${box.id} visible without menu scrolling`);
      }
      await page.screenshot({path:path.join(output,`${viewport.width}x${viewport.height}-menu.png`)});
      report.sizes.push({ viewport, bounds, checks: ['100/100/92px main targets', 'separated contextual power', 'full-height world behind controls', 'simultaneous move/jump/fire', 'immediate slash', 'gun/jet icon state feedback', 'independent release', 'floating neutral origin and cancel', 'power tap vs palette hold', 'gear shortcut', 'modal cleanup', '16px dialogue/52px choices'] });
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed=true; fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report,null,2));
    console.log(JSON.stringify({passed:true,sizes:report.sizes.map(size=>size.viewport),runtimeErrors:report.errors.length,output},null,2));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode=1; });
