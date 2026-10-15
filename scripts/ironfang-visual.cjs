/* Isolated render fixtures, not campaign completion or physical-device evidence. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const out=path.resolve('artifacts/ironfang/qa');fs.mkdirSync(out,{recursive:true});
const files=fs.readdirSync('src').filter(f=>f.endsWith('.js')).map(f=>`src/${f}`).concat(['public/ironfang/atlas.png','public/ironfang/manifest.json']);
const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const report={kind:'Isolated rendering and combat fixtures',physicalDevice:false,legalCampaign:false,sourceHashes:hashes(),fixtures:[],errors:[]};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:740,height:360},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>{report.errors.push(e.message);console.error(e.message);});page.on('response',r=>{if(r.status()>=400){report.errors.push(`${r.status()} ${r.url()}`);console.error(r.status(),r.url());}});
  await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__ASH?.scene?.lanternFX);
  await page.locator('#start').click();await page.evaluate(()=>window.__ASH.scene.game.loop.sleep());
  const cases=['bull-walk','axe-lift','axe-contact','cannon','morph-0','morph-1','morph-2','morph-3','morph-4','morph-5',
    'dragon-up','dragon-down','breath-right','breath-left','boss-hit','hero-hit','slash-right','slash-left','plate-slash','overhead','plate-overhead',
    'jet-up','jet-right','jet-left','dash'];
  for(const kind of cases){
   const result=await page.evaluate(async kind=>{
    const g=window.__ASH,s=g.scene,{ironfangFrame,ironfangSocket,boosterPose}=await import('/src/ironfang.js');
    const {damagePlayer,spawnProjectile}=await import('/src/combat.js');
    const w=g.createWorld(0,{worldId:'soulforge',difficulty:'forge'}),p=w.player,b=w.bosses.find(b=>b.type==='regent');
    w.level={...w.level,pressureDisabled:true};w.enemies=[];w.npcs=[];w.props=[];w.pickups=[];w.gates=[];w.portals=[];w.bosses=[b];w.boss=b;
    Object.assign(p,{x:370,y:1260-p.h,invincible:100,facing:1});
    Object.assign(b,{x:670,y:1128,baseY:1128,floorY:1260,arenaStart:0,arenaEnd:1500,triggerX:0,active:true,shield:0,phase:'idle',timer:100,phaseTime:0,facing:-1,animationTime:.1});
    w.activeBoss=b;g.setWorld(w);s.visualTime=.1;s.accumulator=0;s.heroHurtUntil=0;s.lanternFX.clear();
    const tick=(input={})=>{g.stepWorld(w,input,1/120);s.visualTime+=1/120;s.previousPlayer={x:p.x,y:p.y};for(const e of w.events)s.feedback(e);w.events.length=0;s.drawWorld(1/120);};
    tick();
    if(kind==='bull-walk')Object.assign(b,{vx:-80,motion:{cycle:.3}});
    if(kind.startsWith('axe'))Object.assign(b,{attackKind:'slam',phase:kind==='axe-lift'?'charge':'attack',phaseTime:kind==='axe-lift'?.5:.22,timer:.4});
    if(kind==='cannon')Object.assign(b,{attackKind:'cannon',phase:'attack',phaseTime:.25,timer:.6,aimAngle:Math.PI});
    if(kind.startsWith('morph'))Object.assign(b,{form:'transforming',phase:'transform',transformTime:.9-(Number(kind.at(-1))+.2)*.15});
    if(kind.startsWith('dragon')||kind.startsWith('breath')){
      Object.assign(b,{form:'flying',visualFamily:'wyrm',h:86,y:1140,baseY:1140,animationTime:kind==='dragon-down'?.3:.01});
      if(kind.startsWith('breath')){
        const right=kind==='breath-right';Object.assign(b,{x:right?470:720,facing:right?1:-1,phase:'attack',phaseTime:.25,timer:.6,attackKind:'breath',aimAngle:right?.15:Math.PI-.15});
        const q=ironfangSocket(b,'mouth');for(let i=1;i<=3;i++){const a=b.aimAngle,shot=spawnProjectile(w,q.x+Math.cos(a)*i*48,q.y+Math.sin(a)*i*48,Math.cos(a)*560,Math.sin(a)*560,'enemy');Object.assign(shot,{kind:'fire',sourceId:b.id});}
      }
    }
    if(kind==='boss-hit'){const shot=spawnProjectile(w,b.x-10,b.y+65,2000,0,'player');shot.damage=20;tick();tick();}
    if(kind==='hero-hit'){p.invincible=0;p.shield=0;damagePlayer(w,15,p.x-20);for(const e of w.events)s.feedback(e);w.events.length=0;}
    if(kind.includes('slash')||kind.includes('overhead')){
      if(kind.startsWith('plate'))p.armor='lanternplate';if(kind==='slash-left')p.facing=-1;
      p.combo=kind.includes('overhead')?0:2;p.comboWindow=1;tick({slashPressed:true});for(let i=0;i<12;i++)tick();
    }
    if(kind.startsWith('jet'))Object.assign(p,{jetActive:true,grounded:false,y:1100,vx:kind==='jet-right'?160:kind==='jet-left'?-160:0,vy:-330});
    if(kind==='dash'){tick({dashPressed:true});for(let i=0;i<6;i++)tick();}
    s.previousPlayer={x:p.x,y:p.y};s.cameraX=100;s.cameraY=1260-s.viewportH+30;s.cameras.main.setZoom(1);
    s.drawWorld(0);s.children.depthSort();const r=s.sys.game.renderer;r.preRender();s.cameras.render(r,s.children);r.postRender();
    const sprite=s.bossSprites.get(b.id),trail=s.referenceEffects.get('blade-trail');
    let warningLines=0;const line=s.dynamic.lineBetween;s.dynamic.lineBetween=()=>warningLines++;
    s.drawAttackWarning(s.dynamic,{...b,telegraph:{kind:'breath'}},s.visualTime);s.dynamic.lineBetween=line;
    return {kind,bossFrame:sprite.frame.name,expectedFrame:ironfangFrame(b),heroFrame:s.playerSprite.frame.name,
      socket:ironfangSocket(b,b.form==='flying'?'mouth':'gun'),bossHp:b.hp,heroHp:p.hp,bossTint:sprite.tintTopLeft,
      heroTint:s.playerSprite.tintTopLeft,trail:trail?.visible?{width:trail.displayWidth,height:trail.displayHeight,alpha:trail.alpha}:null,
      booster:boosterPose(p),warningLines,activeEffects:s.lanternFX.views.filter(v=>v.visible).map(v=>({frame:v.frame.name,x:v.x,y:v.y,rotation:v.rotation})),
      impacts:s.lanternFX.impacts.length,dashDust:s.lanternFX.dashDust.length};
   },kind);
   report.fixtures.push(result);await page.screenshot({path:path.join(out,`${kind}.png`)});
   if(['bull-walk','axe-contact','breath-left','slash-right','jet-right'].includes(kind)){
     await page.locator('#touch').evaluate(e=>e.style.visibility='hidden');
     await page.screenshot({path:path.join(out,`${kind}-art.png`)});
     await page.locator('#touch').evaluate(e=>e.style.visibility='');
   }
   assert.equal(result.bossFrame,result.expectedFrame,kind);assert.equal(result.warningLines,0);
   if(kind.includes('slash')||kind.includes('overhead'))assert.ok(result.trail?.width>=66&&result.trail.alpha===1,kind);
   if(kind==='hero-hit')assert.equal(result.heroTint,0xff796b);
   if(kind==='boss-hit')assert.ok(result.impacts>0&&result.bossTint!==0xffffff);
   if(kind.startsWith('jet')){const flame=result.activeEffects.find(e=>e.frame.startsWith('flame-'));assert.ok(flame);assert.ok(Math.abs(flame.rotation-result.booster.rotation)<1e-6);}
   if(kind==='dash')assert.ok(result.dashDust>0);
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(hashes(),report.sourceHashes);report.passed=true;
 }catch(e){report.passed=false;report.failure=e.stack;throw e;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify({passed:report.passed,fixtures:report.fixtures.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
