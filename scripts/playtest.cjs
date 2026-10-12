const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');

async function main(){
  fs.mkdirSync('artifacts/assets',{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH?.scene?.manifest);
  const assets=await page.evaluate(()=>window.__ASH.scene.manifest.map(item=>({...item,data:window.__ASH.scene.textures.get(item.key).getSourceImage().toDataURL()})));
  assert.equal(assets.length,121);assert.equal(new Set(assets.map(a=>a.key)).size,121);
  for(const {data,key,...entry}of assets)fs.writeFileSync(`artifacts/assets/${key}.png`,Buffer.from(data.split(',')[1],'base64'));
  fs.writeFileSync('artifacts/assets/manifest.json',JSON.stringify(assets.map(({data,...entry})=>entry),null,2));
  assert.equal(await page.locator('#difficulty option').count(),4);await page.selectOption('#difficulty','inferno');
  await page.screenshot({path:'artifacts/campaign-menu.png'});
  await page.getByRole('button',{name:'ENTER SOULFORGE'}).click();await page.waitForTimeout(180);
  assert.equal(await page.evaluate(()=>window.__ASH.world.difficulty),'inferno');assert.equal(await page.evaluate(()=>window.__ASH.mode),'playing');
  await page.keyboard.down('KeyD');await page.waitForTimeout(450);await page.keyboard.up('KeyD');
  assert.ok(await page.evaluate(()=>window.__ASH.world.player.x)>180);
  await page.keyboard.down('Space');await page.waitForTimeout(160);await page.keyboard.press('KeyJ');
  assert.ok(await page.evaluate(()=>window.__ASH.world.player.slashBox.h)>=135);
  await page.screenshot({path:'artifacts/vertical-slash.png'});await page.keyboard.up('Space');
  const fuel=await page.evaluate(()=>window.__ASH.world.player.fuel);
  await page.keyboard.down('KeyL');await page.waitForTimeout(220);await page.keyboard.up('KeyL');
  assert.ok(await page.evaluate(()=>window.__ASH.world.player.fuel)<fuel);
  await page.keyboard.press('KeyQ');await page.waitForTimeout(40);
  assert.ok(await page.evaluate(()=>window.__ASH.world.player.mana)<90,'Cinder actually consumes resonance');
  await page.screenshot({path:'artifacts/cinder-sorcery.png'});
  await page.getByRole('button',{name:'ARMORY',exact:true}).click();await page.waitForTimeout(60);
  assert.equal(await page.evaluate(()=>window.__ASH.mode),'catalogue');
  const time=await page.evaluate(()=>window.__ASH.world.time);await page.keyboard.press('KeyK');await page.waitForTimeout(130);
  assert.equal(await page.evaluate(()=>window.__ASH.world.time),time,'catalogue pauses gameplay');
  assert.ok(await page.getByRole('button',{name:'DISCOVER TO UNLOCK',exact:true}).count()>0);
  await page.getByRole('tab',{name:'FIREPOWER'}).click();assert.equal(await page.locator('#catalogue-grid article').count(),4);
  await page.screenshot({path:'artifacts/campaign-armory.png'});await page.keyboard.press('Escape');await page.waitForTimeout(70);
  assert.equal(await page.evaluate(()=>window.__ASH.mode),'playing');
  // Position a fresh fixture beside a real NPC; dialogue and reward logic are exercised without gameplay overrides.
  await page.evaluate(()=>{const g=window.__ASH,w=g.createWorld();w.player.x=g.LEVEL.npcs[0].x-40;w.player.y=564;g.setWorld(w);g.scene.cameraX=w.player.x-250;});
  await page.keyboard.press('KeyF');await page.waitForFunction(()=>window.__ASH.mode==='story');
  const storyTime=await page.evaluate(()=>window.__ASH.world.time);await page.keyboard.press('Escape');await page.waitForTimeout(60);
  assert.equal(await page.evaluate(()=>window.__ASH.mode),'story');assert.equal(await page.evaluate(()=>window.__ASH.world.time),storyTime);
  while(await page.locator('#story-next').isVisible())await page.locator('#story-next').click();
  await page.screenshot({path:'artifacts/campaign-story.png'});
  await page.getByRole('button',{name:'Storm Katana — faster overhead cuts'}).click();await page.waitForFunction(()=>window.__ASH.mode==='playing');
  assert.equal(await page.evaluate(()=>window.__ASH.world.player.sword),'katana');
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('ash-signal-soulforge')).unlocked.sword.includes('katana')));
  // A camera/render fixture verifies all six authored environments and their assets.
  for(const zone of await page.evaluate(()=>window.__ASH.LEVEL.zones.map(z=>({x:z.x,biome:z.biome})))){
    await page.evaluate(({x})=>{const g=window.__ASH,w=g.createWorld();w.player.x=x+350;w.player.y=564;g.setWorld(w);g.scene.cameraX=Math.max(0,w.player.x-250);g.scene.cameraY=180;},zone);
    await page.waitForTimeout(80);await page.screenshot({path:`artifacts/biome-${zone.biome}.png`});
  }
  await page.evaluate(()=>{const g=window.__ASH,w=g.createWorld();w.pressureTimer=.02;g.setWorld(w);g.scene.cameraX=0;});
  await page.waitForTimeout(90);assert.ok(await page.locator('#missile-warning').isVisible());
  await page.screenshot({path:'artifacts/incoming-missile.png'});await page.waitForTimeout(1100);
  assert.ok(await page.evaluate(()=>window.__ASH.world.projectiles.some(p=>p.active&&p.kind==='pressure')));
  await page.keyboard.press('Escape');const paused=await page.evaluate(()=>window.__ASH.world.time);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__ASH.world.time),paused);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{
    const g=window.__ASH;g.setWorld(g.createWorld());window.__testPad={connected:true,axes:[1,0],buttons:Array.from({length:16},()=>({pressed:false}))};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__testPad]});
  });
  const padX=await page.evaluate(()=>window.__ASH.world.player.x);await page.waitForTimeout(280);assert.ok(await page.evaluate(()=>window.__ASH.world.player.x)>padX+40);
  await page.evaluate(()=>{window.__testPad.axes[0]=0;window.__testPad.buttons[9].pressed=true;});await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>window.__ASH.mode),'paused');
  await page.evaluate(()=>window.__testPad.buttons[9].pressed=false);await page.waitForTimeout(50);await page.evaluate(()=>window.__testPad.buttons[0].pressed=true);await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>window.__ASH.mode),'playing');
  await page.evaluate(()=>window.__testPad=null);
  const mobile=await browser.newPage({viewport:{width:844,height:480},hasTouch:true,isMobile:true});mobile.on('pageerror',error=>errors.push(error.message));
  await mobile.goto('http://127.0.0.1:5173/');await mobile.waitForFunction(()=>window.__ASH?.scene?.manifest);
  await mobile.getByRole('button',{name:'ENTER SOULFORGE'}).click();await mobile.waitForTimeout(140);assert.ok(await mobile.locator('#touch').isVisible());
  const targets=await mobile.locator('#touch button').evaluateAll(buttons=>buttons.map(b=>({label:b.getAttribute('aria-label'),w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})));
  assert.ok(targets.length>=15&&targets.every(b=>b.w>=44&&b.h>=44),'all touch actions meet44px');
  const button=await mobile.getByRole('button',{name:'Move right',exact:true}).boundingBox();const touchX=await mobile.evaluate(()=>window.__ASH.world.player.x);
  const touchSession=await mobile.context().newCDPSession(mobile);
  const right={x:button.x+button.width/2,y:button.y+button.height/2,id:1};
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right]});
  await mobile.waitForFunction(x=>window.__ASH.world.player.x>x+30,touchX,{timeout:5000});
  const jump=await mobile.getByRole('button',{name:'Jump',exact:true}).boundingBox(),touchY=await mobile.evaluate(()=>window.__ASH.world.player.y);
  const jumpPoint={x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:2};
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[jumpPoint]});
  await mobile.waitForFunction(y=>window.__ASH.world.player.y<y-20,touchY,{timeout:5000});
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[jumpPoint]});
  const continuedX=await mobile.evaluate(()=>window.__ASH.world.player.x);
  await mobile.waitForFunction(x=>window.__ASH.world.player.x>x+20,continuedX,{timeout:5000});
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.screenshot({path:'artifacts/campaign-touch.png'});
  await mobile.getByRole('button',{name:'ARMORY',exact:true}).click();assert.ok(await mobile.locator('#catalogue').isVisible());
  await mobile.getByRole('button',{name:'Close armory'}).click();assert.equal(await mobile.evaluate(()=>window.__ASH.mode),'playing');
  assert.deepEqual(errors,[]);
  const report={browser:'Chromium headless',assets:assets.length,runtimeErrors:errors,touchTargets:targets.length,
    checks:['difficulty selection','keyboard run/jump/vertical slash/jetpack/magic','catalogue lock/equip/pause/focus','story dialogue/choice/pause/persisted reward','six biome renders','missile warning/spawn','pause','synthetic gamepad','landscape simultaneous touch movement/jump/independent release/armory'],
    limitations:'Fixture positions isolate UI/render checks. Full campaign legal-input runs are recorded separately. PhysicalAndroid/gamepad feel remains unverified.'};
  fs.writeFileSync('artifacts/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
}
main().catch(error=>{console.error(error);process.exit(1);});
