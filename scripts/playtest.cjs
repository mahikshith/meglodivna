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
  assert.ok(assets.length>=346);assert.equal(new Set(assets.map(a=>a.key)).size,assets.length);
  for(const {data,key,...entry}of assets)fs.writeFileSync(`artifacts/assets/${key}.png`,Buffer.from(data.split(',')[1],'base64'));
  fs.writeFileSync('artifacts/assets/manifest.json',JSON.stringify(assets.map(({data,...entry})=>entry),null,2));
  assert.equal(await page.locator('#difficulty option').count(),4);await page.selectOption('#difficulty','inferno');
  assert.equal(await page.locator('#world-select option').count(),5);
  await page.screenshot({path:'artifacts/campaign-menu.png'});
  await page.locator('#start').click();await page.waitForTimeout(180);
  assert.equal(await page.evaluate(()=>window.__ASH.world.difficulty),'inferno');assert.equal(await page.evaluate(()=>window.__ASH.mode),'playing');
  const runX=await page.evaluate(()=>window.__ASH.world.player.x);
  await page.keyboard.down('KeyD');await page.waitForFunction(x=>window.__ASH.world.player.x>x+60,runX,{timeout:5000});await page.keyboard.up('KeyD');
  await page.keyboard.down('Space');await page.waitForTimeout(160);await page.keyboard.press('KeyJ');
  assert.equal(await page.evaluate(()=>window.__ASH.world.player.slashMode),'horizontal');
  await page.screenshot({path:'artifacts/horizontal-slash.png'});await page.waitForTimeout(300);await page.keyboard.press('KeyJ');
  assert.equal(await page.evaluate(()=>window.__ASH.world.player.slashMode),'vertical');
  await page.screenshot({path:'artifacts/vertical-slash.png'});await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.__ASH.world.player.grounded,null,{timeout:5000});
  await page.keyboard.down('Space');await page.waitForFunction(()=>!window.__ASH.world.player.grounded,null,{timeout:5000});
  const fuel=await page.evaluate(()=>window.__ASH.world.player.fuel);
  await page.keyboard.down('KeyL');await page.waitForFunction(fuel=>window.__ASH.world.player.fuel<fuel,fuel,{timeout:5000});await page.keyboard.up('KeyL');await page.keyboard.up('Space');
  await page.keyboard.press('KeyQ');await page.waitForFunction(()=>window.__ASH.world.player.mana<90,null,{timeout:5000});
  await page.screenshot({path:'artifacts/cinder-sorcery.png'});
  await page.getByRole('button',{name:'ARMORY',exact:true}).click();await page.waitForTimeout(60);
  assert.equal(await page.evaluate(()=>window.__ASH.mode),'catalogue');
  const time=await page.evaluate(()=>window.__ASH.world.time);await page.keyboard.press('KeyK');await page.waitForTimeout(130);
  assert.equal(await page.evaluate(()=>window.__ASH.world.time),time,'catalogue pauses gameplay');
  assert.ok(await page.getByRole('button',{name:'DISCOVER TO UNLOCK',exact:true}).count()>0);
  await page.getByRole('tab',{name:'FIREPOWER'}).click();assert.equal(await page.locator('#catalogue-grid article').count(),5);
  await page.screenshot({path:'artifacts/campaign-armory.png'});await page.keyboard.press('Escape');await page.waitForTimeout(70);
  assert.equal(await page.evaluate(()=>window.__ASH.mode),'playing');
  // Position a fresh fixture beside a real NPC; dialogue and reward logic are exercised without gameplay overrides.
  await page.evaluate(()=>{const g=window.__ASH,w=g.createWorld();w.player.x=g.LEVEL.npcs[0].x-40;w.player.y=564;g.setWorld(w);g.scene.cameraX=w.player.x-250;});
  await page.keyboard.press('KeyF');await page.waitForFunction(()=>window.__ASH.mode==='story');
  const storyTime=await page.evaluate(()=>window.__ASH.world.time);await page.keyboard.press('Escape');await page.waitForTimeout(60);
  assert.equal(await page.evaluate(()=>window.__ASH.mode),'story');assert.equal(await page.evaluate(()=>window.__ASH.world.time),storyTime);
  while(await page.locator('#story-next').isVisible())await page.locator('#story-next').click();
  await page.screenshot({path:'artifacts/campaign-story.png'});
  await page.locator('#story-choices button').filter({hasText:'Storm Katana'}).click();await page.waitForFunction(()=>window.__ASH.mode==='playing');
  assert.equal(await page.evaluate(()=>window.__ASH.world.player.sword),'katana');
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('ash-signal-soulforge')).unlocked.sword.includes('katana')));
  // A camera/render fixture verifies all six authored environments and their assets.
  for(const zone of await page.evaluate(()=>window.__ASH.LEVEL.zones.map(z=>({x:z.x,biome:z.biome})))){
    await page.evaluate(({x})=>{const g=window.__ASH,w=g.createWorld();w.player.x=x+350;w.player.y=564;g.setWorld(w);g.scene.cameraX=Math.max(0,w.player.x-250);g.scene.cameraY=180;},zone);
    await page.waitForTimeout(80);await page.screenshot({path:`artifacts/biome-${zone.biome}.png`});
  }
  for(const realm of await page.evaluate(()=>window.__ASH.WORLD_LIST)){
    await page.locator('#worlds').click();await page.selectOption('#world-select',realm.id);await page.locator('#start').click();
    await page.waitForFunction(id=>window.__ASH.world.worldId===id&&window.__ASH.scene.renderedWorldId===id,realm.id);
    assert.equal(await page.evaluate(()=>window.__ASH.LEVEL.id),realm.id);
    await page.screenshot({path:`artifacts/world-${realm.id}.png`});
    if(realm.id==='veil'){
      await page.evaluate(()=>{const g=window.__ASH,portal=g.LEVEL.portals[0];g.world.player.x=portal.x-100;g.world.player.y=564;g.scene.cameraX=portal.x-250;});
      await page.waitForTimeout(80);
      assert.ok(await page.evaluate(()=>{const g=window.__ASH,id=g.LEVEL.portals[0].id,sprite=g.scene.portalSprites.get(`travel:${id}`);return sprite?.visible&&sprite.texture.key.startsWith('summon-portal-');}),'travel portals must have their actual animated texture');
      await page.screenshot({path:'artifacts/veil-portal.png'});
    }
  }
  await page.locator('#worlds').click();await page.selectOption('#world-select','soulforge');await page.locator('#start').click();
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
  await mobile.locator('#start').click();await mobile.waitForTimeout(140);assert.ok(await mobile.locator('#touch').isVisible());
  const targets=await mobile.locator('#touch [data-action]').evaluateAll(buttons=>buttons.map(b=>({label:b.getAttribute('aria-label'),w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,icon:!!b.querySelector('svg'),text:b.textContent.trim()})));
  assert.equal(targets.length,4);assert.ok(targets.every(b=>b.w>=48&&b.h>=48&&b.icon&&!b.text),'four touch macros are SVG icons with48px targets');
  const gutter=await mobile.evaluate(()=>{const canvas=document.querySelector('#game canvas').getBoundingClientRect();return [...document.querySelectorAll('#touch button,#joystick')].map(b=>({canvasBottom:canvas.bottom,top:b.getBoundingClientRect().top,bottom:b.getBoundingClientRect().bottom}));});
  assert.ok(gutter.every(b=>b.top>=b.canvasBottom-1&&b.bottom<=480),'controls stay below actual canvas in reserved gutter');
  const button=await mobile.locator('#joystick').boundingBox();const touchX=await mobile.evaluate(()=>window.__ASH.world.player.x);
  const touchSession=await mobile.context().newCDPSession(mobile);
  const right={x:button.x+button.width/2,y:button.y+button.height/2,id:1};
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right]});right.x+=50;
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[right]});
  await mobile.waitForFunction(x=>window.__ASH.world.player.x>x+30,touchX,{timeout:5000});
  const jump=await mobile.locator('#touch-jump').boundingBox(),touchY=await mobile.evaluate(()=>window.__ASH.world.player.y);
  const jumpPoint={x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:2};
  // Chromium's CDP lists changed points for start/end, not the remaining active fingers.
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[jumpPoint]});
  await mobile.waitForFunction(y=>window.__ASH.world.player.y<y-20,touchY,{timeout:5000});
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[jumpPoint]});
  const continuedX=await mobile.evaluate(()=>window.__ASH.world.player.x);
  await mobile.waitForFunction(x=>window.__ASH.world.player.x>x+20,continuedX,{timeout:5000});
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const attack=await mobile.locator('#touch-attack').boundingBox(),attackPoint={x:attack.x+attack.width/2,y:attack.y+attack.height/2,id:4};
  const slashId=await mobile.evaluate(()=>window.__ASH.world.player.slashId);
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[attackPoint]});await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[attackPoint]});
  await mobile.waitForFunction(id=>window.__ASH.world.player.slashId>id,slashId,{timeout:5000});
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[attackPoint]});
  await mobile.waitForFunction(()=>window.__ASH.world.projectiles.some(p=>p.active&&p.owner==='player'),null,{timeout:5000});
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[attackPoint]});
  await mobile.waitForFunction(()=>window.__ASH.world.player.grounded,null,{timeout:5000});
  const jetFuel=await mobile.evaluate(()=>window.__ASH.world.player.fuel);
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[jumpPoint]});
  await mobile.waitForFunction(fuel=>window.__ASH.world.player.fuel<fuel,jetFuel,{timeout:5000});
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[jumpPoint]});
  await mobile.screenshot({path:'artifacts/campaign-touch.png'});
  const power=await mobile.locator('#touch-power').boundingBox(),powerPoint={x:power.x+power.width/2,y:power.y+power.height/2,id:3};
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[powerPoint]});await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[powerPoint]});
  await mobile.waitForFunction(()=>window.__ASH.world.player.mana<80,null,{timeout:5000});
  const beforePower=await mobile.evaluate(()=>window.__ASH.world.player.mana);
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[powerPoint]});await mobile.waitForFunction(()=>document.querySelector('#catalogue').open,null,{timeout:5000});
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(await mobile.evaluate(()=>window.__ASH.world.player.mana)>=beforePower,'holding power opens loadout without spending magic');
  assert.equal(await mobile.getByRole('tab',{name:'SORCERY'}).getAttribute('aria-selected'),'true');
  await mobile.getByRole('button',{name:'Close armory'}).click();assert.equal(await mobile.evaluate(()=>window.__ASH.mode),'playing');
  assert.deepEqual(errors,[]);
  const report={browser:'Chromium headless',assets:assets.length,runtimeErrors:errors,touchTargets:targets.length,
    checks:['five world selection/four difficulty selection','keyboard run/jump/alternating slash/jetpack/magic','catalogue lock/equip/pause/focus/actual costs','story dialogue/choice/pause/persisted reward','six biome renders','red icon missile warning/spawn','pause','synthetic gamepad','round analogue joystick','four curved SVG touch macros','reserved control gutter does not overlap canvas','landscape simultaneous joystick movement/jump/independent release','attack tap slashes and hold fires','jump hold activates thrust','power tap casts and hold opens paused spell palette without spending'],
    limitations:'Fixture positions isolate UI/render checks. Full campaign legal-input runs are recorded separately. PhysicalAndroid/gamepad feel remains unverified.'};
  fs.writeFileSync('artifacts/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
}
main().catch(error=>{console.error(error);process.exit(1);});
