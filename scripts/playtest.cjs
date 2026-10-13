const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');

async function main(){
  fs.mkdirSync('artifacts/assets',{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH?.scene?.manifest&&window.__ASH.scene.referenceArt);
  const reference=await page.evaluate(()=>{
    const g=window.__ASH,m=g.scene.referenceArt,texture=g.scene.textures.get(m.atlasKey),canvas=document.createElement('canvas'),source=texture.getSourceImage();canvas.width=source.width;canvas.height=source.height;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data,alpha=(x,y)=>pixels[(y*canvas.width+x)*4+3];
    return{expected:m.budget.frameCount,count:Object.keys(m.frames).length,atlas:[source.width,source.height],animations:Object.keys(m.animations).length,frames:Object.entries(m.frames).map(([key,meta])=>{
      const f=texture.get(key),corners=[[0,0],[f.cutWidth-1,0],[0,f.cutHeight-1],[f.cutWidth-1,f.cutHeight-1]].map(([x,y])=>alpha(f.cutX+x,f.cutY+y));
      return{key,width:f.cutWidth,height:f.cutHeight,expectedWidth:meta.width,expectedHeight:meta.height,anchor:meta.anchor,body:meta.body,hand:meta.hand,family:meta.family,corners};
    })};
  });
  assert.equal(reference.count,reference.expected);assert.ok(reference.count>=174,'complete supplied-reference atlas');
  for(const frame of reference.frames){assert.equal(frame.width,frame.expectedWidth);assert.equal(frame.height,frame.expectedHeight);assert.ok(frame.anchor.x>=0&&frame.anchor.x<=frame.width&&frame.anchor.y>=0&&frame.anchor.y<=frame.height,`${frame.key}: anchor`);if(frame.hand)assert.ok(frame.hand.length===2&&frame.hand.every(Number.isFinite)&&frame.hand[0]>=0&&frame.hand[0]<=frame.width&&frame.hand[1]>=0&&frame.hand[1]<=frame.height,`${frame.key}: hand`);if(frame.body)assert.ok(frame.body.w>0&&frame.body.h>0,`${frame.key}: body`);if(['aether','crawler','raider','mecha','wyrm'].includes(frame.family))assert.ok(frame.corners.every(alpha=>alpha===0),`${frame.key}: clear sprite corners`);}
  const handAlignment=await page.evaluate(()=>{const g=window.__ASH,p=g.world.player,m=g.scene.referenceArt,key=m.animations['aether-fire'][0],f=m.frames[key],scale=p.h/f.body.h,expected={x:p.x+p.w/2+p.facing*(f.hand[0]-f.body.x-f.body.w/2)*scale,y:p.y+(f.hand[1]-f.body.y)*scale},physical=g.weaponOrigin(p,'hand');return Math.hypot(expected.x-physical.x,expected.y-physical.y);});assert.ok(handAlignment<1,'Aether hand marker agrees with physical weapon origin');
  assert.ok(['pixelated','crisp-edges'].includes(await page.locator('#game canvas').evaluate(canvas=>getComputedStyle(canvas).imageRendering)));
  const assets=await page.evaluate(()=>window.__ASH.scene.manifest.map(item=>({...item,data:window.__ASH.scene.textures.get(item.key).getSourceImage().toDataURL()})));
  assert.ok(assets.length>=300);assert.equal(new Set(assets.map(a=>a.key)).size,assets.length);
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
  await page.evaluate(()=>{const g=window.__ASH,w=g.createWorld();w.player.x=g.LEVEL.npcs[0].x-40;w.player.y=610-w.player.h;g.setWorld(w);g.scene.cameraX=w.player.x-250;});
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
    await page.evaluate(({x})=>{const g=window.__ASH,w=g.createWorld();w.player.x=x+350;w.player.y=610-w.player.h;g.setWorld(w);g.scene.cameraX=Math.max(0,w.player.x-250);g.scene.cameraY=180;},zone);
    await page.waitForTimeout(80);await page.screenshot({path:`artifacts/biome-${zone.biome}.png`});
  }
  for(const realm of await page.evaluate(()=>window.__ASH.WORLD_LIST)){
    await page.locator('#worlds').click();await page.selectOption('#world-select',realm.id);await page.locator('#start').click();
    await page.waitForFunction(id=>window.__ASH.world.worldId===id&&window.__ASH.scene.renderedWorldId===id,realm.id);
    assert.equal(await page.evaluate(()=>window.__ASH.LEVEL.id),realm.id);
    await page.screenshot({path:`artifacts/world-${realm.id}.png`});
    if(realm.id==='veil'){
      await page.evaluate(()=>{const g=window.__ASH,portal=g.LEVEL.portals[0];g.world.player.x=portal.x-100;g.world.player.y=610-g.world.player.h;g.scene.cameraX=portal.x-250;});
      await page.waitForTimeout(80);
      assert.ok(await page.evaluate(()=>{const g=window.__ASH,id=g.LEVEL.portals[0].id,sprite=g.scene.portalSprites.get(`travel:${id}`);return sprite?.visible&&sprite.texture.key.startsWith('summon-portal-');}),'travel portals must have their actual animated texture');
      await page.screenshot({path:'artifacts/veil-portal.png'});
      await page.evaluate(()=>{const g=window.__ASH,b=g.world.bosses[0];g.world.player.x=b.x-180;g.world.player.y=610-g.world.player.h;Object.assign(b,{active:true,phase:'charge',timer:2});g.scene.cameraX=b.x-400;});
      await page.waitForTimeout(80);
      assert.ok(await page.evaluate(()=>{const g=window.__ASH,b=g.world.bosses[0],sprite=g.scene.bossSprites.get(b.id),family=b.visualFamily==='wyrm'?'wyrm':b.visualFamily==='crimsonmecha'?'mecha':null;return family?sprite?.texture.key===g.scene.referenceArt.atlasKey&&sprite.frame.name.startsWith(`ref-${family}-fire-`):sprite?.texture.key.startsWith(`boss-${b.type}-attack-`);}),'a world-specific boss retains its physical family attack pose');
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
  assert.equal(targets.length,4);assert.ok(targets.every(b=>b.w>=72&&b.h>=72&&b.icon&&!b.text),'four touch macros are SVG icons with72px minimum thumb targets');
  assert.ok(await mobile.locator('#touch-jump').evaluate(button=>button.getBoundingClientRect().width>=84),'jump has84px thumb reach');
  const gutter=await mobile.evaluate(()=>{const canvas=document.querySelector('#game canvas').getBoundingClientRect();return [...document.querySelectorAll('#touch button')].map(b=>({id:b.id,canvasBottom:canvas.bottom,...b.getBoundingClientRect().toJSON()}));});
  assert.ok(gutter.every(b=>b.top>=b.canvasBottom-1&&b.bottom<=480),'action and pause faces stay below actual canvas in reserved gutter');
  for(let i=0;i<gutter.length;i++)for(let j=i+1;j<gutter.length;j++){const a=gutter[i],b=gutter[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${a.id}/${b.id} must not overlap`);}
  assert.equal(await mobile.locator('#joystick').isVisible(),false,'floating stick begins hidden');
  const touchSession=await mobile.context().newCDPSession(mobile);
  const attack=await mobile.locator('#touch-attack').boundingBox(),attackPoint={x:attack.x+attack.width/2,y:attack.y+attack.height/2,id:4};
  const slashId=await mobile.evaluate(()=>window.__ASH.world.player.slashId);
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[attackPoint]});
  assert.ok(await mobile.evaluate(id=>window.__ASH.controls.read(false).slashPressed||window.__ASH.world.player.slashId>id,slashId),'slash begins on pointerdown before releasing attack');
  assert.equal(await mobile.locator('#joystick').isVisible(),false,'action touch cannot claim floating stick');
  await mobile.waitForFunction(id=>window.__ASH.world.player.slashId>id,slashId,{timeout:5000});
  await mobile.waitForFunction(()=>window.__ASH.world.projectiles.some(p=>p.active&&p.owner==='player'),null,{timeout:5000});
  const heldSlashId=await mobile.evaluate(()=>window.__ASH.world.player.slashId);
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[attackPoint]});await mobile.waitForTimeout(80);
  assert.equal(await mobile.evaluate(()=>window.__ASH.world.player.slashId),heldSlashId,'release does not trigger a duplicate slash');
  const touchX=await mobile.evaluate(()=>window.__ASH.world.player.x),right={x:210,y:210,id:1},firstOrigin={x:210,y:210};
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right]});
  assert.ok(await mobile.locator('#joystick').isVisible());assert.deepEqual(await mobile.evaluate(()=>window.__ASH.controls.stickOrigin),firstOrigin);
  assert.equal(await mobile.evaluate(()=>window.__ASH.controls.read(false).move),0,'fresh floating origin is neutral');
  right.x+=50;
  await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[right]});
  assert.deepEqual(await mobile.evaluate(()=>window.__ASH.controls.stickOrigin),firstOrigin,'origin stays fixed while thumb moves');
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
  assert.equal(await mobile.evaluate(()=>window.__ASH.controls.read(false).move),0,'release stops stick movement');
  // Sleep simulation to isolate the real8-second UI timer from combat and pause resets.
  await mobile.evaluate(()=>window.__ASH.scene.game.loop.sleep());const fadeStart=Date.now();await mobile.waitForTimeout(7600);
  assert.ok(await mobile.locator('#joystick').isVisible(),'stick stays visible before8 seconds');
  await mobile.waitForFunction(()=>document.querySelector('#joystick').hidden,null,{timeout:1500});const fadeMilliseconds=Date.now()-fadeStart;assert.ok(fadeMilliseconds>=7600&&fadeMilliseconds<9500);
  await mobile.evaluate(()=>window.__ASH.scene.game.loop.wake());
  const fresh={x:100,y:410,id:5};await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[fresh]});
  assert.ok(await mobile.locator('#joystick').isVisible(),'fresh touch shows stick immediately');assert.deepEqual(await mobile.evaluate(()=>window.__ASH.controls.stickOrigin),{x:100,y:410});assert.equal(await mobile.evaluate(()=>window.__ASH.controls.read(false).move),0);
  await mobile.screenshot({path:'artifacts/revamp-floating-stick.png'});await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[fresh]});
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
  const report={browser:'Chromium headless',assets:assets.length,referenceAtlas:{frames:reference.count,animations:reference.animations,dimensions:reference.atlas},runtimeErrors:errors,touchTargets:targets.length,joystickFadeMilliseconds:fadeMilliseconds,
    checks:['supplied-reference atlas dimensions/anchors/body/hand metadata and clear character corners','nearest-pixel canvas rendering','five world selection/four difficulty selection','keyboard run/jump/alternating slash/jetpack/magic','catalogue lock/equip/pause/focus/actual costs','story dialogue/choice/pause/persisted reward','six biome renders','animated Veil travel portal','world boss attack-pose fallback','red icon missile warning/spawn','pause','synthetic gamepad','floating joystick from playfield and gutter','neutral/fixed floating origin','four curved72–84px SVG touch macros without overlap','action and pause gutter excludes canvas','landscape simultaneous joystick movement/jump/independent release','real8-second joystick fade and fresh origin','action touch excludes joystick','attack on press and held fire without release duplicate','jump hold activates thrust','power tap casts and hold opens paused spell palette without spending'],
    limitations:'Fixture positions isolate UI/render checks. Simulation sleeps only during the browser joystick timer check. Full campaign legal-input runs are recorded separately. Extracted glow/hair preserve soft alpha; crisp display uses nearest-pixel rendering. Physical Android/gamepad comfort remains unverified.'};
  fs.writeFileSync('artifacts/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
}
main().catch(error=>{console.error(error);process.exit(1);});
