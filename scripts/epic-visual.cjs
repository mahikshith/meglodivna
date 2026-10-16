/* Isolated rendering fixtures. This does not establish campaign completion or device performance. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const out=path.resolve('artifacts/epic-rebuild/qa/visual');fs.mkdirSync(out,{recursive:true});
const sourceFiles=fs.readdirSync('src').filter(f=>/\.(js|css)$/.test(f)).map(f=>`src/${f}`).concat(['index.html',...['ironfang','character-revision','journey','lantern','lantern-fx'].flatMap(dir=>fs.readdirSync(`public/${dir}`).filter(name=>/\.(png|json)$/.test(name)).map(name=>`public/${dir}/${name}`))]);
const hashes=()=>Object.fromEntries(sourceFiles.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const report={kind:'Isolated illustrated combat and environment fixtures',physicalDevice:false,legalCampaign:false,hashes:hashes(),fixtures:[],errors:[]};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:740,height:360},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5173');await page.waitForFunction(()=>window.__ASH?.scene?.lanternFX);
  await page.locator('#start').click();await page.locator('#intro-skip').click();
  await page.evaluate(()=>window.__ASH.scene.game.loop.sleep());
  const cases=['bull-walk-0','bull-walk-1','bull-walk-2','bull-walk-3','bull-charge-0','bull-charge-1','bull-charge-2','bull-charge-3',
   'bull-cannon-left','bull-cannon-right','dragon-flight-0','dragon-flight-1','dragon-flight-2','dragon-flight-3','dragon-cannon-left','dragon-cannon-right',
   'slam','boost-air','hero-air-down','hero-crouch','guardian','stalker','caster','bellbeast','knight','drone','realm-wind','realm-water','realm-fire',
   ...Array.from({length:6},(_,i)=>`transform-${i}`),
   ...['guardian','stalker','caster','bellbeast','knight','drone'].flatMap(f=>[`${f}-hurt`,`${f}-death`]),
   'bull-death','dragon-death','summon-wolf','summon-raven','summon-dragon','summon-clone'];
  for(const kind of cases){
   const result=await page.evaluate(async kind=>{
    const g=window.__ASH,s=g.scene,{ironfangFrame,ironfangSocket,ironfangRotation}=await import('/src/ironfang.js');
    const w=g.createWorld(0,{worldId:'soulforge',difficulty:'forge'}),p=w.player,b=w.bosses.find(b=>b.type==='regent');
    const originalEnemies=w.enemies;
    w.enemies=[];w.npcs=[];w.props=[];w.pickups=[];w.gates=[];w.portals=[];w.enemyPortals=[];w.hazards=[];w.bosses=[b];w.boss=b;
    Object.assign(p,{x:380,y:1260-p.h,grounded:true,invincible:1000,facing:1});
    Object.assign(b,{x:670,y:1128,baseY:1128,floorY:1260,arenaStart:0,arenaEnd:1500,triggerX:0,active:true,shield:0,phase:'idle',timer:100,phaseTime:0,facing:-1,animationTime:0});
    w.activeBoss=b;g.setWorld(w);s.visualTime=.1;s.accumulator=0;s.heroHurtUntil=0;s.lanternFX.clear();
    const tick=()=>{g.stepWorld(w,{},1/120);s.visualTime+=1/120;s.previousPlayer={x:p.x,y:p.y};for(const event of w.events)s.feedback(event);w.events.length=0;s.drawWorld(1/120);};
    if(kind.startsWith('bull-walk'))Object.assign(b,{vx:-80,motion:{cycle:Number(kind.at(-1))*.25+.01}});
    if(kind.startsWith('bull-charge'))Object.assign(b,{vx:-520,vy:-100,y:1095,grounded:false,attackKind:'charge',phase:'attack',phaseTime:.18,motion:{cycle:Number(kind.at(-1))*.25+.01}});
    if(kind.startsWith('dragon'))Object.assign(b,{form:'flying',visualFamily:'wyrm',h:86,y:1130,baseY:1130,flightPitch:.12});
    if(kind.startsWith('dragon-flight'))b.animationTime=(Number(kind.at(-1))+.1)/8;
    if(kind.includes('cannon')){
      const right=kind.endsWith('right');Object.assign(b,{x:right?420:670,facing:right?1:-1,phase:'attack',phaseTime:.25,timer:.6,attackKind:'cannon',shots:0,shotClock:0});
      p.x=right?780:280;
      b.aimX=p.x+p.w/2;b.aimY=p.y+p.h/2;
      for(let i=0;i<17;i++)tick();
    }
    if(kind==='slam'){
      Object.assign(b,{phase:'attack',attackKind:'slam',phaseTime:.23});s.drawWorld(0);
      s.feedback({type:'slam',x:660,y:1260,surfaceY:1260,bounds:{x:540,y:1232,w:260,h:28}});s.lanternFX.update(.08,w,false,p);
    }
    if(kind==='boost-air')Object.assign(p,{y:1120,grounded:false,jetActive:true,boostActive:true,dashTime:.12,vx:760,vy:0});
    if(kind==='hero-air-down')Object.assign(p,{y:1100,grounded:false,shooting:true,shootCooldown:.1,aimAngle:Math.PI/2,jetActive:true,vx:200,vy:-150});
    if(kind==='hero-crouch')Object.assign(p,{crouching:true,shooting:true,shootCooldown:.1,aimAngle:0,vx:0});
    const family={guardian:'sentinel',stalker:'guard',caster:'mage',bellbeast:'bellbeast',knight:'wispknight',drone:'drone'}[kind.split('-')[0]];
    if(family){
      const e=structuredClone(originalEnemies.find(e=>e.type===family)||originalEnemies.find(e=>e.type==='shade'));
      Object.assign(e,{id:'fixture-'+kind,type:family,x:630,y:1260-e.h,vx:-40,facing:-1,shield:100,windup:.3,attackPhase:'lift',attackProgress:.5,motion:{cycle:.3}});
      w.enemies=[e];w.bosses=[];w.activeBoss=null;
      if(kind.endsWith('hurt'))Object.assign(e,{flash:.15,attackPhase:null,windup:0,vx:0});
    }
    if(kind.startsWith('summon-')){
      const {castSpell}=await import('/src/combat.js');p.mana=100;p.spellCooldown=0;
      w.unlocks.spell.push(kind.slice(7));
      if(!castSpell(w,kind.slice(7)))throw new Error('Fixture summon did not cast');
      for(let i=0;i<110;i++)tick();
    }
    if(kind.startsWith('transform'))Object.assign(b,{form:'transforming',phase:'transform',transformTime:.9-(Number(kind.at(-1))+.2)*.15});
    let cameraX=100,floor=1260;
    if(kind.startsWith('realm')){
      const realm=kind.slice(6),crossing=w.level.crossings.find(c=>c.id.endsWith(realm));
      p.x=crossing.x+160;p.y=1160-p.h;cameraX=p.x-200;floor=1160;w.bosses=[];w.activeBoss=null;
    }
    s.previousPlayer={x:p.x,y:p.y};s.cameraX=cameraX;s.cameraY=floor-s.viewportH+20;s.cameras.main.setZoom(1);
    s.drawWorld(0);
    if(kind.endsWith('death')){(w.enemies[0]||b).dead=true;s.drawWorld(0);s.visualTime+=.22;s.drawWorld(0);}
    s.children.depthSort();const r=s.sys.game.renderer;r.preRender();s.cameras.render(r,s.children);r.postRender();
    const shot=w.projectiles.find(p=>p.active&&p.kind==='cannonround'),index=w.projectiles.indexOf(shot);
    let warningLines=0;const original=s.dynamic.lineBetween;s.dynamic.lineBetween=()=>warningLines++;
    for(const enemy of [...w.enemies,...w.bosses])s.drawAttackWarning(s.dynamic,{...enemy,telegraph:{kind:'slam'}},s.visualTime);
    s.dynamic.lineBetween=original;
    return {kind,heroFrame:s.playerSprite.frame.name,bossFrame:s.bossSprites.get(b.id)?.frame.name,expectedFrame:ironfangFrame(b),
      bossRotation:s.bossSprites.get(b.id)?.rotation,expectedRotation:ironfangRotation(b),
      enemyFrames:[...s.enemySprites.values()].filter(v=>v.visible).map(v=>({key:v.frame.name,atlas:v.texture.key})),
      allyFrames:[...s.allySprites.values()].filter(v=>v.visible).map(v=>({key:v.frame.name,atlas:v.texture.key})),
      halos:[...s.shieldSprites.entries()].filter(([id,v])=>id!=='hero'&&v.visible).map(([id])=>id),warningLines,
      round:shot?{frame:s.projectileSprites[index]?.frame.name,texture:s.projectileSprites[index]?.texture.key,x:shot.x,y:shot.y}:null,
      muzzle:ironfangSocket(b,b.form==='flying'?'rocket':'gun'),effects:s.lanternFX.views.filter(v=>v.visible).map(v=>({frame:v.frame.name,x:v.x,y:v.y,rotation:v.rotation,originX:v.originX,originY:v.originY})),
      parallax:s.parallax.layers[0].views[0].texture.key};
   },kind);
   report.fixtures.push(result);await page.screenshot({path:path.join(out,kind+'.png')});
   assert.deepEqual(result.halos,[],kind);assert.equal(result.warningLines,0,kind);
   if(!kind.endsWith('death')&&(kind.startsWith('bull')||kind.startsWith('dragon')||kind.startsWith('transform')))assert.equal(result.bossFrame,result.expectedFrame,kind);
   if(kind.includes('cannon')){assert.ok(result.round,kind);assert.equal(result.round.frame,'if-round');assert.equal(result.round.texture,'ironfang');assert.ok(result.effects.some(e=>e.frame.startsWith('if-muzzle-')),kind);}
   if(kind==='boost-air')assert.ok(result.effects.some(e=>e.frame.startsWith('if-boost-')));
   if(kind==='hero-air-down')assert.equal(result.heroFrame,'cr-couriergunair-2');
   if(kind==='hero-crouch')assert.equal(result.heroFrame,'cr-courierguncrouch-1');
   if(kind.startsWith('realm'))assert.ok(result.parallax.startsWith('rh-bg-crossing-'));
   for(const frame of result.enemyFrames)assert.equal(frame.atlas,'character-revision',kind);
   if(kind.startsWith('summon-')){assert.ok(result.allyFrames.length,kind);for(const frame of result.allyFrames)assert.equal(frame.atlas,'character-revision',kind);}
  }
  report.textureBudget=await page.evaluate(()=>{
    const sources=new Set(),textures=[];
    for(const [key,texture] of Object.entries(window.__ASH.scene.textures.list))for(const source of texture.source||[]){
      if(!source.image||sources.has(source.image))continue;sources.add(source.image);
      textures.push({key,width:source.width,height:source.height,rgbaBytes:source.width*source.height*4});
    }
    return {kind:'Calculated one-copy RGBA size; not measured process or device RAM',rgbaBytes:textures.reduce((n,t)=>n+t.rgbaBytes,0),textures};
  });
  assert.deepEqual(report.errors,[]);assert.deepEqual(hashes(),report.hashes,'Sources stable throughout fixture run');report.passed=true;
 }catch(error){report.passed=false;report.failure=error.stack;throw error;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify({passed:report.passed,fixtures:report.fixtures.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
