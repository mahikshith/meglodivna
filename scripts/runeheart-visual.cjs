/* Deliberately isolated visual fixtures. Campaign completion is validated by combat-route/replay. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const out='artifacts/runeheart/gameplay';fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
 const errors=[],report={kind:'Isolated render/action fixtures, not legal campaign completion or device performance',captures:[],errors};
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH?.scene?.referenceArt);
 await page.locator('#start').click();await page.evaluate(()=>window.__ASH.scene.game.loop.sleep());
 async function capture(name,setup){
  const state=await page.evaluate(async({name,setup})=>{
   const g=window.__ASH,s=g.scene;const {cameraTarget}=await import('/src/camera.js');
   const world=g.createWorld(setup.checkpoint||0,{worldId:setup.worldId||'soulforge',difficulty:'forge'});g.setWorld(world);const p=world.player;g.stepWorld(world,{},1/120);
   if(setup.room!==undefined){const room=world.level.rooms[setup.room];const marker=world.level.route.find(m=>m.x>=room.x+(room.kind==='crypt'?800:80)&&m.x<room.x+room.w);p.x=marker?.x||room.x+120;p.y=(marker?.y||room.floorY)-p.h;}
   if(setup.boss!==undefined){const b=world.bosses[setup.boss];p.x=b.triggerX+20;p.y=b.floorY-p.h;b.active=true;b.arrivalGrace=0;world.activeBoss=b;
    if(setup.wyrm){b.hp=b.maxHp*.3;for(let i=0;i<150;i++)g.stepWorld(world,{move:0},g.scene?1/120:1/120);}}
   if(setup.shield)p.shield=45;
   if(setup.slash){p.combo=setup.slash-1;p.comboWindow=1;g.stepWorld(world,{slashPressed:true},1/120);for(let i=0;i<11;i++)g.stepWorld(world,{},1/120);}
   if(setup.jump){g.stepWorld(world,{},1/120);g.stepWorld(world,{jumpPressed:true,jumpHeld:true},1/120);for(let i=0;i<22;i++)g.stepWorld(world,{jumpHeld:true,move:.3},1/120);}
   if(setup.jet){for(let i=0;i<120;i++)g.stepWorld(world,{jet:true},1/120);}
   if(setup.dash){p.facing=1;g.stepWorld(world,{dashPressed:true,move:1},1/120);for(let i=0;i<5;i++)g.stepWorld(world,{move:1},1/120);}
   if(setup.spell){world.progress.unlocked.spell.push(setup.spell);g.equipItem(world,'spell',setup.spell);p.mana=p.maxMana;g.stepWorld(world,{spellPressed:true},1/120);for(let i=0;i<100;i++)g.stepWorld(world,{},1/120);}
   if(setup.warning){const e=world.enemies.find(e=>!e.dead&&Math.abs(e.x-p.x)<800);if(e){p.x=e.x-220;p.y=e.y+e.h-p.h;for(let i=0;i<170;i++){g.stepWorld(world,{},1/120);if(e.windup>0)break;}}}
   s.previousPlayer={x:p.x,y:p.y};s.accumulator=0;s.visualTime=2.4;
   const camera=cameraTarget(p,world.level,960,s.viewportH,world.activeBoss);s.cameraX=camera.x;s.cameraY=camera.y;s.cameras.main.setZoom(camera.zoom);
   g.render();s.children.depthSort();const renderer=s.sys.game.renderer;renderer.preRender();s.cameras.render(renderer,s.children);renderer.postRender();
   const cam=s.cameras.main,screen={left:cam.worldView.x,top:cam.worldView.y,width:cam.worldView.width,height:cam.worldView.height};
   return {name,player:{x:p.x,y:p.y,h:p.h,state:p.state,slashMode:p.slashMode},screen,texture:s.playerSprite.texture.key,frame:s.playerSprite.frame.name,status:world.status,worldId:world.worldId};
  },{name,setup});
  await page.screenshot({path:`${out}/${name}.png`});report.captures.push(state);
 }
 await capture('01-sanctuary',{});await capture('02-jump',{jump:true});await capture('03-jet-high',{jet:true});
 for(let n=1;n<=3;n++)await capture(`0${n+3}-sword-${n}`,{slash:n});
 await capture('07-dash',{dash:true});await capture('08-shield',{shield:true});await capture('09-guardian',{boss:0});
 await capture('10-enemy-windup',{room:1,warning:true});await capture('11-crypt',{room:6});await capture('12-aqueduct',{room:4,worldId:'soulforge'});
 await capture('13-spirit-wolf',{spell:'wolf'});await capture('14-dragon',{spell:'dragon'});await capture('15-echo',{spell:'clone'});
 await capture('16-wyrm',{boss:2,wyrm:true});
 for(const worldId of ['tide','pyre','neon','veil'])await capture(`realm-${worldId}`,{worldId,room:1});
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({captures:report.captures.length,errors}));await browser.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
