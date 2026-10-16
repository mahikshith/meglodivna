// Review artifact only: real opening inputs, then explicitly positioned late-story fixtures.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const out = __dirname, report = { viewport: '740x360', physicalDevice: false, campaignCompletion: false,
  method: 'Opening uses real keyboard and story buttons. Chapter scenes position the player/mark prior victories as isolated fixtures; portal contact, landing, dialogs and UI then run normally.', checks: [], errors: [] };
const snapshot = async page => {
 await page.waitForFunction(() => window.__ASH?.world && window.__ASH?.scene?.lanternFX);
 return page.evaluate(() => ({ mode: window.__ASH.mode, stageMode: document.querySelector('#stage').dataset.mode, npc: window.__ASH.world.story?.npcId,
  speaker: document.querySelector('#story-speaker').textContent, text: document.querySelector('#story-text').textContent,
  objective: document.querySelector('#objective').textContent, chapter: document.querySelector('#zone-label').textContent,
  pointers: window.__ASH.controls.pointers.size, touch: !document.querySelector('#touch').hidden,
  x: window.__ASH.world.player.x, claimed: window.__ASH.world.progress.claimed,
  visiblePortals: [...window.__ASH.scene.portalSprites.entries()].filter(([,v])=>v.visible).map(([id])=>id) }));
};
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 740, height: 360 }, isMobile: true, hasTouch: true });
  // Pin this loaded build during parallel development; HMR reloads erase fixture
  // state and are unrelated to the production game's input/story behavior.
  await page.routeWebSocket('**', socket => {
   const server = socket.connectToServer();
   server.onMessage(message => {
    try { if (['update','full-reload'].includes(JSON.parse(message).type)) return; } catch {}
    socket.send(message);
   });
   socket.onMessage(message => server.send(message));
  });
  page.on('pageerror', e => report.errors.push(e.message)); page.setDefaultTimeout(15000);
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ASH?.scene?.lanternFX && !document.querySelector('#start').disabled);
  await page.locator('#start').click(); await page.locator('#intro-skip').click();
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => Math.abs(window.__ASH.world.player.x - window.__ASH.world.npcs[0].x) < 65);
  await page.keyboard.up('KeyD'); await page.keyboard.press('KeyF');
  await page.waitForFunction(() => window.__ASH.mode === 'story');
  await page.screenshot({ path: path.join(out, 'actual-mira-dialogue.png') });
  const opening = await snapshot(page); assert.ok(opening.npc.includes('mira')); assert.equal(opening.touch, false);
  report.checks.push({ name: 'Real start, walk and interact open Mira dialogue without held movement', evidence: opening });
  const finishStory = async () => {
   while (await page.locator('#story-panel').evaluate(el => el.open)) {
    const choices = page.locator('#story-choices button');
    if (await choices.count()) await choices.first().click(); else await page.locator('#story-next').click();
   }
   await page.waitForFunction(() => window.__ASH.mode === 'playing');
  };
  await finishStory();
  for (let index = 0; index < 3; index++) {
   const realm = ['wind', 'water', 'fire'][index];
   await page.evaluate(index => {
    const g = window.__ASH, w = g.createWorld(), p = w.player;
    w.collections.push('ember-heart', 'tide-glass', 'storm-seal');
    for (const b of w.bosses.slice(0,-1)) { b.dead = true; w.progress.defeatedBosses.push(b.id); }
    for (const c of w.level.crossings.slice(0,index)) {
     w.progress.defeatedBosses.push(c.guardianId); w.progress.openedGates.push(c.completionGate);
     w.gates.find(g=>g.id===c.completionGate).open=true;
    }
    const c = w.level.crossings[index], portal = w.portals.find(p=>p.id===c.entryId);
    Object.assign(p,{x:portal.x-65,y:portal.y+46-p.h,vx:0,vy:0,grounded:true});
    g.setWorld(w);g.scene.cameraX=p.x-220;g.scene.cameraY=w.level.height-g.scene.viewportH;g.start();
   }, index);
   await page.waitForTimeout(100); await page.screenshot({ path: path.join(out, `${realm}-hub.png`) });
   const hub = await snapshot(page); assert.match(hub.objective, new RegExp(`CHAPTER ${index+1} / 3.*ENTER THE LIT GATE`));
   await page.keyboard.down('KeyD'); await page.waitForFunction(() => window.__ASH.mode === 'story'); await page.keyboard.up('KeyD');
   const entry = await snapshot(page); assert.equal(entry.npc, `chapter:${realm}:opening`); assert.match(entry.chapter, new RegExp(`CHAPTER ${index+1} / 3`));
   await page.screenshot({ path: path.join(out, `${realm}-entry-dialogue.png`) });
   const miraPortrait = await page.locator('#story-portrait').getAttribute('src');
   await page.locator('#story-next').click();
   assert.equal(await page.locator('#story-speaker').innerText(), 'AETHER');
   assert.notEqual(await page.locator('#story-portrait').getAttribute('src'), miraPortrait, 'Aether line must show Aether portrait');
   await page.screenshot({ path: path.join(out, `${realm}-aether-dialogue.png`) });
   await page.keyboard.press('Escape'); await page.waitForFunction(() => window.__ASH.mode === 'paused');
   await page.locator('#start').click(); assert.equal((await snapshot(page)).npc, entry.npc);
   await finishStory(); assert.equal((await snapshot(page)).touch, true);
   await page.evaluate(index => {
    const g=window.__ASH,w=g.world,p=w.player,c=w.level.crossings[index];
    const gate=w.gates.find(g=>g.id===`${c.id}-shutter-0`),at=gate.autoOpenAt;
    Object.assign(p,{x:at.x+45,y:at.y-p.h-22,vy:35,vx:0,grounded:false,invincible:1});
    g.scene.previousPlayer={x:p.x,y:p.y};g.scene.cameraX=p.x-220;
   }, index);
   await page.waitForFunction(index=>{const w=window.__ASH.world;return w.gates.find(g=>g.id===`${w.level.crossings[index].id}-shutter-0`).open;}, index);
   const landing = await snapshot(page); await page.screenshot({ path: path.join(out, `${realm}-landing-objective.png`) });
   await page.evaluate(index=>{
    const g=window.__ASH,w=g.world,p=w.player,c=w.level.crossings[index],enemy=w.enemies.find(e=>e.id===c.guardianId),portal=w.portals.find(p=>p.id===c.returnId);
    enemy.dead=true;enemy.hp=0;w.progress.defeatedBosses.push(enemy.id);
    Object.assign(p,{x:portal.x-75,y:portal.y+46-p.h,vx:0,vy:0,grounded:true});w.portalCooldown=0;w.portalExitLock=false;
    g.scene.previousPlayer={x:p.x,y:p.y};g.scene.cameraX=p.x-220;
   },index);
   await page.waitForFunction(()=>document.querySelector('#objective').textContent==='ENTER THE RETURN GATE');
   await page.screenshot({path:path.join(out,`${realm}-return-objective.png`)});
   await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.__ASH.mode==='story');await page.keyboard.up('KeyD');
   const returning=await snapshot(page);assert.equal(returning.npc,`chapter:${realm}:ending`);
   await finishStory();const returned=await snapshot(page);
   assert.match(returned.objective,index<2?new RegExp(`CHAPTER ${index+2} / 3.*ENTER THE LIT GATE`):/ENTER THE HEART/);
   await page.screenshot({path:path.join(out,`${realm}-returned-hub.png`)});
   report.checks.push({name:`${realm}: hub gate, real portal contact/dialog buttons, pause/resume, high-landing shutter and return objective`,evidence:{hub,entry,landing,returning,returned}});
  }
  assert.deepEqual(report.errors,[]);report.ok=true;
 } catch(error) { report.ok=false;report.failure=error.stack;throw error; }
 finally { fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close(); }
 console.log(`Passed ${report.checks.length} story review scenarios`);
})().catch(error=>{console.error(error);process.exitCode=1;});
