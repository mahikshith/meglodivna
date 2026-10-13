/* Real input smoke play: no world/player injection, invulnerability, or route fixtures. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const output = path.resolve('artifacts/runeheart/live-play');
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:5173';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const sourceHashes=Object.fromEntries(['src/main.js','src/combat.js','src/physics.js','src/input.js','src/ui.js','src/style.css','src/runeheart-art.js','src/terrain.js'].map(file=>[file,hash(file)]));
  const report={kind:'actual integrated game, real keyboard and Chromium touch inputs',campaignWin:false,physicalDevice:false,sourceHashes,sizes:[],errors:[]};
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  try {
    for(const viewport of[{width:844,height:480},{width:740,height:360}]){
      const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1}),page=await context.newPage(),screenshots=[],states=[],navigations=[];
      const result={viewport,screenshots,states,navigations,pending:true};report.sizes.push(result);
      page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push({url:frame.url(),time:new Date().toISOString()})});
      page.on('pageerror',error=>report.errors.push(`${viewport.width}x${viewport.height}: ${error.message}`));
      page.on('console',message=>{if(message.type()==='error')report.errors.push(`${viewport.width}x${viewport.height}: ${message.text()}`)});
      await page.goto(baseURL);await page.waitForFunction(()=>window.__ASH?.scene?.referenceArt);
      const state=async label=>{const value=await page.evaluate(()=>{const g=window.__ASH,p=g.world.player,c=g.scene.cameras.main;return{mode:g.mode,x:p.x,y:p.y,vx:p.vx,vy:p.vy,w:p.w,h:p.h,grounded:p.grounded,jumps:p.jumps,state:p.state,fuel:p.fuel,hp:p.hp,mana:p.mana,spell:p.spell,slashMode:p.slashMode,slashId:p.slashId,parries:p.parries,dashTime:p.dashTime,time:g.world.time,projectiles:g.world.projectiles.filter(b=>b.active&&b.owner==='player').map(b=>({kind:b.kind,x:b.x,y:b.y})),camera:{x:g.scene.cameraX,y:g.scene.cameraY,zoom:c.zoom,height:g.scene.viewportH},sprite:{texture:g.scene.playerSprite.texture.key,frame:g.scene.playerSprite.frame.name,visible:g.scene.playerSprite.visible,alpha:g.scene.playerSprite.alpha},level:g.world.worldId}});states.push({label,...value});return value;};
      const capture=async label=>{const file=`${viewport.width}x${viewport.height}-${label}.png`;await page.screenshot({path:path.join(output,file)});screenshots.push(file);return state(label);};
      const settle=()=>page.waitForFunction(()=>window.__ASH.world.player.grounded&&window.__ASH.mode==='playing',null,{timeout:5000});
      const layout=async()=>{
        const value=await page.evaluate(()=>{const c=document.querySelector('#game canvas').getBoundingClientRect(),v=document.querySelector('.vitals').getBoundingClientRect();return{canvas:{x:c.x,y:c.y,w:c.width,h:c.height,bottom:c.bottom},vitals:{x:v.x,y:v.y,w:v.width,h:v.height},buttons:[...document.querySelectorAll('#touch button')].map(b=>{const r=b.getBoundingClientRect();return{id:b.id,x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right}})};});
        assert.ok(value.vitals.h<=50,'resource panel stays compact');for(const button of value.buttons){assert.ok(button.y>=value.canvas.bottom-1,`${button.id} outside actual game canvas`);assert.ok(button.bottom<=viewport.height&&button.x>=0&&button.right<=viewport.width,`${button.id} on screen`);}
        return value;
      };
      await page.selectOption('#difficulty','forge');await capture('menu');await page.locator('#start').click();await settle();await page.waitForTimeout(300);
      const first=await capture('spawn');assert.equal(first.mode,'playing');await layout();
      // Jump and double jump are separate real presses. A short first release cuts height.
      const baseY=first.y;await page.keyboard.down('Space');await page.waitForFunction(y=>window.__ASH.world.player.y<y-18,baseY);await page.keyboard.up('Space');await page.waitForTimeout(65);
      const jump=await capture('jump');assert.ok(jump.y<baseY);const beforeDouble=jump.vy;
      await page.keyboard.down('Space');await page.waitForFunction(()=>window.__ASH.world.player.jumps===0&&window.__ASH.world.player.vy<-250);const double=await capture('double-jump');assert.ok(double.vy<beforeDouble);assert.equal(double.jumps,0);await page.keyboard.up('Space');
      const fuel=double.fuel;await page.keyboard.down('KeyL');await page.waitForFunction(fuel=>window.__ASH.world.player.fuel<fuel-5,fuel);await page.waitForTimeout(220);const jet=await capture('jet-ascent');assert.equal(jet.state,'jet');assert.ok(jet.y<double.y);assert.ok(jet.camera.y<first.camera.y);await page.keyboard.up('KeyL');await settle();
      // Three distinct sword forms, without setting a pose or modifying cooldowns.
      const forms=[];for(let i=0;i<3;i++){const id=await page.evaluate(()=>window.__ASH.world.player.slashId);await page.keyboard.press('KeyJ');await page.waitForFunction(id=>window.__ASH.world.player.slashId>id,id);const s=await capture(`slash-${i+1}`);forms.push(s.slashMode);assert.ok(s.camera.zoom<=1.001,'attack does not zoom in');await page.waitForTimeout(280);}
      assert.deepEqual(forms,['horizontal','vertical','finisher']);
      // Keyboard gun and dash while standing in the safe refuge.
      await page.keyboard.down('KeyK');await page.waitForFunction(()=>window.__ASH.world.projectiles.some(p=>p.active&&p.owner==='player'));await capture('keyboard-fire');await page.keyboard.up('KeyK');
      const dashX=await page.evaluate(()=>window.__ASH.world.player.x);await page.keyboard.down('KeyD');await page.keyboard.press('ShiftLeft');await page.waitForFunction(x=>window.__ASH.world.player.x>x+45,dashX);await page.keyboard.up('KeyD');await capture('keyboard-dash');
      // Reach Mira using real movement and choose a real unlocked spell.
      let p=await state('before-mira');if(p.x<255){await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.__ASH.world.player.x>=255);await page.keyboard.up('KeyD');}
      await settle();await page.waitForFunction(()=>document.getElementById('touch').dataset.interact==='true');
      const cdp=await context.newCDPSession(page),touch=(type,point)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point?[point]:[]});
      const center=async(id,pointerId)=>{const b=await page.locator(id).boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2,id:pointerId}};
      let power=await center('#touch-power',8);await touch('touchStart',power);await touch('touchEnd',power);await page.waitForFunction(()=>window.__ASH.mode==='story');
      const storyTime=await page.evaluate(()=>window.__ASH.world.time);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.__ASH.world.time),storyTime,'story pauses simulation');
      await capture('mira-dialogue');while(await page.locator('#story-next').isVisible())await page.locator('#story-next').click();await capture('mira-choice');await page.getByRole('button',{name:'Learn Soul Siphon',exact:true}).click();await page.waitForFunction(()=>window.__ASH.mode==='playing');
      assert.ok(await page.evaluate(()=>window.__ASH.world.unlocks.spell.includes('siphon')),'real choice unlocked spell');
      const gear=await center('#touch-gear',9);await touch('touchStart',gear);await touch('touchEnd',gear);await page.waitForFunction(()=>window.__ASH.mode==='catalogue');await page.getByRole('tab',{name:'SORCERY',exact:true}).click();
      const card=page.locator('.catalogue-item').filter({has:page.getByRole('heading',{name:'Soul Siphon',exact:true})});
      if(await card.getByRole('button',{name:'EQUIP',exact:true}).count())await card.getByRole('button',{name:'EQUIP',exact:true}).click();
      else assert.equal(await card.getByRole('button',{name:'EQUIPPED',exact:true}).count(),1,'choice may equip its reward immediately');await capture('legitimate-spell-loadout');
      const pausedTime=await page.evaluate(()=>window.__ASH.world.time);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.__ASH.world.time),pausedTime);await page.locator('#catalogue-close').click();await page.waitForFunction(()=>window.__ASH.mode==='playing');
      assert.equal(await page.evaluate(()=>window.__ASH.world.player.spell),'siphon');
      // Move away from the NPC with a free-region stick; combine independent right-thumb inputs.
      const stick={x:160,y:140,id:1};await touch('touchStart',stick);stick.x+=65;await touch('touchMove',stick);
      await page.waitForFunction(()=>window.__ASH.world.player.x>=440);assert.equal(await page.evaluate(()=>window.__ASH.controls.read(false).move),1);
      const jumpPoint=await center('#touch-jump',2),oldY=await page.evaluate(()=>window.__ASH.world.player.y);await touch('touchStart',jumpPoint);await page.waitForFunction(y=>window.__ASH.world.player.y<y-20,oldY);await page.waitForTimeout(370);await capture('touch-stick-jet');assert.equal(await page.locator('#touch-jump').getAttribute('data-phase'),'hold');await touch('touchEnd',jumpPoint);
      const releaseX=await page.evaluate(()=>window.__ASH.world.player.x);await page.waitForFunction(x=>window.__ASH.world.player.x>x+20,releaseX);assert.equal(await page.evaluate(()=>window.__ASH.controls.read(false).jet),false);
      await touch('touchEnd',stick);await settle();
      const attackPoint=await center('#touch-attack',3),oldSlash=await page.evaluate(()=>window.__ASH.world.player.slashId);await touch('touchStart',attackPoint);await page.waitForFunction(id=>window.__ASH.world.player.slashId>id,oldSlash);await page.waitForFunction(()=>window.__ASH.controls.read(false).shoot);await capture('touch-hold-fire');const heldSlash=await page.evaluate(()=>window.__ASH.world.player.slashId);await touch('touchEnd',attackPoint);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.__ASH.world.player.slashId),heldSlash,'release does not slash twice');
      const dashPoint=await center('#touch-dash',4);stick.x=160;stick.id=5;await touch('touchStart',stick);stick.x+=65;await touch('touchMove',stick);await touch('touchStart',dashPoint);await page.waitForFunction(()=>window.__ASH.world.player.dashTime>0);await capture('touch-stick-dash');await touch('touchEnd',dashPoint);assert.equal(await page.evaluate(()=>window.__ASH.controls.read(false).move),1);await touch('touchEnd',stick);await settle();
      await page.waitForFunction(()=>document.getElementById('touch').dataset.interact==='false');power=await center('#touch-power',6);const mana=await page.evaluate(()=>window.__ASH.world.player.mana);await touch('touchStart',power);await touch('touchEnd',power);await page.waitForFunction(mana=>window.__ASH.world.player.mana<mana,mana);await capture('touch-sorcery');
      // Real movement+gun encounter; stop before the first thorn pit.
      await page.keyboard.down('KeyD');await page.keyboard.down('KeyK');await page.waitForFunction(()=>window.__ASH.world.player.x>=1200);await page.keyboard.up('KeyD');await page.keyboard.up('KeyK');await capture('first-guard-encounter');
      // Pause clears held controls; retry returns to the authored relay.
      const pausePoint=await center('#touch-pause',10);await touch('touchStart',pausePoint);await touch('touchEnd',pausePoint);await page.waitForFunction(()=>window.__ASH.mode==='paused');const pauseTime=await page.evaluate(()=>window.__ASH.world.time);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__ASH.world.time),pauseTime);assert.equal(await page.evaluate(()=>window.__ASH.controls.read(false).move),0);await capture('pause');
      await page.locator('#start').click();await page.waitForFunction(()=>window.__ASH.mode==='playing');await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.__ASH.world.player.x<250);await settle();await capture('retry-relay');
      // Resize through portrait and back with no synthetic position/state fixtures.
      await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__ASH.controls.read(false).move),0);await capture('rotation-portrait');await page.setViewportSize(viewport);await page.waitForTimeout(250);await layout();await capture('rotation-restored');
      // Walk into the real first gap and recover with the touch menu button.
      await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.__ASH.mode==='dead',null,{timeout:10000});await page.keyboard.up('KeyD');await capture('actual-fall-death');
      assert.equal(await page.locator('#touch').isHidden(),true);assert.equal(await page.evaluate(()=>window.__ASH.controls.read(false).move),0);
      const reconnect=await center('#start',11);await touch('touchStart',reconnect);await touch('touchEnd',reconnect);await page.waitForFunction(()=>window.__ASH.mode==='playing'&&window.__ASH.world.player.hp>0);await settle();const recovered=await capture('touch-death-reconnect');assert.ok(recovered.x<250);assert.equal(recovered.spell,'siphon','real learned spell survives death');
      result.checks=['actual keyboard jump/doublejump/jet','three sword forms','keyboard fire/dash','real Mira choice and legal spell equip','simultaneous floating-stick jump/jet/fire/dash','short power cast','paused loadout and dialogue','real first guard encounter','pause/retry','rotation and canvas control clearance','actual fall death and touch reconnect with preserved learned spell'];result.pending=false;
      await context.close();
    }
    assert.deepEqual(report.errors,[]);report.passed=true;report.sourceUnchanged=Object.entries(sourceHashes).every(([file,digest])=>hash(file)===digest);assert.equal(report.sourceUnchanged,true,'runtime changed during QA');
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,viewports:report.sizes.map(s=>s.viewport),screenshots:report.sizes.reduce((n,s)=>n+s.screenshots.length,0),errors:report.errors,output},null,2));
  } catch(error){report.passed=false;report.failure=error.message;report.sourceUnchanged=Object.entries(sourceHashes).every(([file,digest])=>hash(file)===digest);fs.writeFileSync(path.join(output,'failed-report.json'),JSON.stringify(report,null,2));throw error;} finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1});
