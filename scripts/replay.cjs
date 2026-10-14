const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');

async function main(){
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const worldId=process.argv[2]||'soulforge';
  const trace=JSON.parse(fs.readFileSync(`artifacts/combat-route-${worldId}-forge-inputs.json`,'utf8'));
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH?.scene?.manifest);
  await page.locator('#start').click();
  await page.evaluate(({difficulty,worldId})=>{const g=window.__ASH;g.scene.game.loop.sleep();g.setWorld(g.createWorld(0,{difficulty,worldId}));},{difficulty:trace.difficulty,worldId});
  await page.evaluate(()=>window.__replayCaptures={});
  const captures=new Set();
  let retries=0;
  // Batch fixed steps in the browser, stopping at authored milestones for screenshots.
  for(let index=0;index<trace.records.length;){
    const batch=trace.records.slice(index,index+150);
    const result=await page.evaluate(({records,step})=>{
      const g=window.__ASH;let used=0,retries=0,capture=null;
      for(const record of records){
        if(record.retry!==undefined){if(g.world.status!=='dead')throw Error('Trace retry must follow death');g.retry();retries++;}
        else if(record.equip){if(!g.equipItem(g.world,record.equip.category,record.equip.id))throw Error('Trace equipped locked gear');}
        else if(record.storyAdvance!==undefined){if(g.world.story?.npcId!==record.npcId)throw Error(`Story trace mismatch: expected ${record.npcId}, actual ${g.world.story?.npcId}, time ${g.world.time}, x ${g.world.player.x}`);if(!g.advanceStory(g.world,record.storyAdvance||undefined))throw Error('Story advancement failed');if(!g.world.story){g.ui.renderStory(null);g.start();g.scene.game.loop.sleep();}}
        else for(let frame=0;frame<record.frames;frame++)g.stepWorld(g.world,record.input,step);
        used++;
        const w=g.world,p=w.player;
        const zone=[...g.LEVEL.zones].reverse().find(z=>p.x>=z.x)||g.LEVEL.zones[0];
        const roomKey=`room-${g.LEVEL.zones.indexOf(zone)}-${zone.label.replace(/[^a-z0-9]/gi,'-')}`;if(!window.__replayCaptures[roomKey]&&p.x>zone.x+240)capture=roomKey;
        if(w.story&&!window.__replayCaptures[`story-${w.story.npcId}`])capture=`story-${w.story.npcId}`;
        if(w.activeBoss?.phase==='attack'&&w.activeBoss.attack===2&&!window.__replayCaptures[`boss-${w.activeBoss.id}`])capture=`boss-${w.activeBoss.id}`;
        if(w.status==='won')capture='campaign-victory';
        if(capture){window.__replayCaptures[capture.replace('run-','')]=true;break;}
        w.events.length=0;
      }
      return{used,retries,capture};
    },{records:batch,step:trace.step});
    index+=result.used;retries+=result.retries;
    if(result.capture&&!captures.has(result.capture)){
      await page.evaluate(()=>{const g=window.__ASH,s=g.scene,p=g.world.player;s.previousPlayer={x:p.x,y:p.y};s.cameraX=Math.max(0,Math.min(g.LEVEL.width-960,p.x-300));s.cameraY=Math.max(0,Math.min(g.LEVEL.height-s.viewportH,p.y-s.viewportH*.52));g.world.hitstop=0;s.accumulator=0;s.update(0,0);s.children.depthSort();s.sys.game.renderer.preRender();s.cameras.render(s.sys.game.renderer,s.children);s.sys.game.renderer.postRender();});
      await page.screenshot({path:`artifacts/${worldId}-${result.capture}.png`});captures.add(result.capture);
      // Story UI is validated separately; replay invokes the recorded valid choices directly.
      await page.evaluate(()=>{const g=window.__ASH;if(g.mode==='story'){g.ui.renderStory(null);g.start();g.scene.game.loop.sleep();}});
    }
  }
  const final=await page.evaluate(()=>({status:window.__ASH.world.status,time:window.__ASH.world.time,hp:window.__ASH.world.player.hp,bosses:window.__ASH.world.bosses.map(b=>({id:b.id,dead:b.dead}))}));
  assert.equal(final.status,'won');assert.ok(final.bosses.every(b=>b.dead));assert.equal(await page.evaluate(()=>window.__ASH.mode),'won');assert.deepEqual(errors,[]);
  const report={worldId,...final,retries,captures:[...captures],runtimeErrors:errors,method:'Recorded legal campaign movement/combat/menu/story inputs reproduced in browser simulation. No position/health/boss overrides. Fixed-step replay is not wall-clock playback.'};
  const prod=await browser.newPage({viewport:{width:844,height:480},hasTouch:true,isMobile:true});prod.on('pageerror',e=>errors.push(e.message));
  await prod.goto('http://127.0.0.1:4173/');await prod.locator('canvas').waitFor();await prod.locator('#start').click();await prod.waitForTimeout(100);
  assert.equal(await prod.evaluate(()=>typeof window.__ASH),'undefined');assert.ok(await prod.locator('#touch').isVisible());
  const power=await prod.locator('[data-action="power"]').boundingBox();assert.ok(power);
  await prod.mouse.move(power.x+power.width/2,power.y+power.height/2);await prod.mouse.down();await prod.waitForTimeout(550);await prod.mouse.up();
  assert.ok(await prod.locator('#catalogue').isVisible());await prod.evaluate(()=>window.ashBack());assert.ok(!(await prod.locator('#catalogue').isVisible()));
  await prod.waitForFunction(()=>document.querySelector('#stage').dataset.mode==='playing'&&!document.querySelector('#touch').hidden);
  await prod.evaluate(()=>window.ashBack());await prod.locator('#start').waitFor({state:'visible'});await prod.waitForFunction(()=>document.querySelector('#stage').dataset.mode==='paused');assert.deepEqual(errors,[]);
  report.productionChecks=['development API absent','Power hold palette','Back closes palette before pausing'];
  fs.writeFileSync(`artifacts/replay-${worldId}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  await browser.close();
}
main().catch(error=>{console.error(error);process.exit(1);});
