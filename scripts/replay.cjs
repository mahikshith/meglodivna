const { chromium }=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');

async function main(){
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  const page=await browser.newPage({viewport:{width:1440,height:960}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH?.scene?.manifest);
  await page.getByRole('button',{name:'ENTER THE FOUNDRY'}).click();
  await page.evaluate(()=>{const g=window.__ASH;g.scene.game.loop.sleep();g.setWorld(g.createWorld());});
  const trace=JSON.parse(fs.readFileSync('artifacts/combat-route-inputs.json','utf8'));
  const captures=new Set();
  let retryCount=0;
  for(const record of trace.records){
    const snapshot=await page.evaluate(({record,step})=>{
      const g=window.__ASH;
      if(record.retry!==undefined){
        if(g.world.status!=='dead'||g.world.checkpoint!==record.retry)throw Error('Invalid retry in input trace');
        if(Math.abs(g.world.time-record.time)>.001)throw Error('Retry clock mismatch');
        g.retry();
      }else{
        for(let f=0;f<record.frames;f++)g.stepWorld(g.world,record.input,step);
      }
      g.world.events.length=0;
      return {x:g.world.player.x,y:g.world.player.y,bossPhase:g.world.boss.phase,bossAttack:g.world.boss.attack,status:g.world.status};
    },{record,step:trace.step});
    if(record.retry!==undefined)retryCount++;
    let capture;
    if(snapshot.x>3900&&snapshot.x<4210&&snapshot.y<360&&!captures.has('foundry-climb'))capture='foundry-climb';
    if(snapshot.x>6550&&snapshot.x<6780&&!captures.has('laser-gauntlet'))capture='laser-gauntlet';
    if(snapshot.bossPhase==='attack'&&snapshot.bossAttack===2&&!captures.has('warden-beam'))capture='warden-beam';
    if(snapshot.status==='won')capture='victory';
    if(capture){
      await page.evaluate(()=>{
        const g=window.__ASH,s=g.scene,w=g.world,p=w.player;
        s.previousPlayer={x:p.x,y:p.y};s.cameraX=Math.max(0,Math.min(g.LEVEL.width-960,p.x-300));s.cameraY=Math.max(0,Math.min(180,p.y-310));
        w.hitstop=0;s.accumulator=0;s.update(0,0);s.sys.game.renderer.preRender();s.sys.game.renderer.render(s, s.children.list, s.cameras.main);s.sys.game.renderer.postRender();
      });
      await page.screenshot({path:`artifacts/${capture}.png`});captures.add(capture);
    }
  }
  const final=await page.evaluate(()=>({status:window.__ASH.world.status,time:window.__ASH.world.time,hp:window.__ASH.world.player.hp,bossHp:window.__ASH.world.boss.hp}));
  assert.equal(final.status,'won');assert.equal(final.bossHp,0);assert.deepEqual(errors,[]);
  assert.ok(captures.has('foundry-climb')&&captures.has('laser-gauntlet')&&captures.has('warden-beam')&&captures.has('victory'));
  const report={...final,retries:retryCount,captures:[...captures],runtimeErrors:errors,method:'Browser replay of recorded legal action inputs; enemies and hazards active; only valid checkpoint retries. Simulation is advanced in fixed steps, not wall-clock playback.'};
  fs.writeFileSync('artifacts/replay-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  const prod=await browser.newPage({viewport:{width:1440,height:960}});
  prod.on('pageerror',e=>errors.push(e.message));await prod.goto('http://127.0.0.1:4173/');await prod.locator('canvas').waitFor();
  await prod.getByRole('button',{name:'ENTER THE FOUNDRY'}).click();await prod.waitForTimeout(250);
  assert.equal(await prod.evaluate(()=>typeof window.__ASH),'undefined','production excludes debug API');
  assert.ok(await prod.locator('#hud').isVisible());
  await prod.keyboard.down('KeyD');await prod.waitForTimeout(500);await prod.keyboard.up('KeyD');
  await prod.keyboard.press('Escape');assert.ok(await prod.getByRole('button',{name:'RESUME OPERATION'}).isVisible());
  assert.deepEqual(errors,[]);await browser.close();
}
main().catch(error=>{console.error(error);process.exit(1);});
