/* Isolated simulation/render fixtures, deliberately NOT campaign or device evidence. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const out=path.resolve('artifacts/character-revision/qa/visual');fs.mkdirSync(out,{recursive:true});
const sources=fs.readdirSync('src').filter(n=>/\.(js|css)$/.test(n)).map(n=>`src/${n}`).concat(['index.html',...['character-revision','ironfang','sanctuary-ui','lantern'].flatMap(d=>fs.readdirSync(`public/${d}`).map(f=>`public/${d}/${f}`))]);
const hashes=()=>Object.fromEntries(sources.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const report={kind:'Isolated state and rendering fixtures',physicalDevice:false,legalCampaign:false,sourceHashes:hashes(),fixtures:[],errors:[]};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:960,height:540},isMobile:true,hasTouch:true});const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 try{
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5173');await page.waitForFunction(()=>window.__ASH?.scene?.lanternFX);await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(out,'menu.png')});
  await page.locator('#menu-equipment').click();await page.screenshot({path:path.join(out,'equipment.png')});
  await page.locator('[data-category="engine"]').click();await page.screenshot({path:path.join(out,'soul-engine.png')});
  await page.locator('#catalogue-close').click();
  await page.locator('#start').click();await page.waitForTimeout(200);await page.evaluate(()=>window.__ASH.scene.game.loop.sleep());
  const kinds=['horizontal','vertical','plate-horizontal','plate-vertical','jet','dash','stalker','caster','guardian','guardian-brace','slam','wispknight','bellbeast','raven','wolf','dragon','clone','rifle-horizontal','rifle-up','rifle-diagonal','rifle-run','mira','orren','water','conduit','portals','souls'];
  for(const kind of kinds){
   const result=await page.evaluate(async kind=>{
    const g=window.__ASH,s=g.scene,{cameraTarget}=await import('/src/camera.js'),{castSpell}=await import('/src/combat.js');
    const w=g.createWorld(0,{worldId:'soulforge',difficulty:'forge'}),p=w.player;
    w.level={...w.level,pressureDisabled:true};w.enemies=[];w.npcs=[];w.props=[];w.pickups=[];w.bosses.forEach(b=>b.dead=true);
    Object.assign(p,{x:350,y:1260-p.h,invincible:100});g.setWorld(w);s.visualTime=0;s.accumulator=0;s.heroHurtUntil=0;s.lanternFX.clear();
    const frames=new Set(),enemyFrames=new Set(),phases=new Set(),events=new Set();let peakViews=0,steps=0;
    const placeCamera=()=>{const c=cameraTarget(p,w.level,960,s.viewportH,null);s.cameraX=c.x;s.cameraY=c.y;s.cameras.main.setZoom(c.zoom);};
    const tick=(input={})=>{g.stepWorld(w,input,1/120);steps++;s.visualTime+=1/120;s.previousPlayer={x:p.x,y:p.y};for(const e of w.events){events.add(e.type);s.feedback(e);}w.events.length=0;s.drawWorld(1/120);frames.add(s.playerSprite.frame.name);for(const e of w.enemies){phases.add(e.attackPhase||e.motion?.phase);const v=s.enemySprites.get(e.id);if(v)enemyFrames.add(v.frame.name);}peakViews=Math.max(peakViews,s.lanternFX.views.length);};
    placeCamera();tick();
    if(!kind.startsWith('rifle')&&(kind.includes('horizontal')||kind.includes('vertical'))){
      if(kind.startsWith('plate'))p.armor='lanternplate';p.combo=kind.includes('vertical')?0:2;p.comboWindow=1;
      tick({slashPressed:true});for(let i=0;i<12;i++)tick();
    }else if(kind==='jet'){tick({jumpPressed:true,jumpHeld:true});for(let i=0;i<48;i++)tick({jet:true,jumpHeld:true});}
    else if(kind==='dash'){tick({dashPressed:true});for(let i=0;i<6;i++)tick();}
    else if(['stalker','caster','guardian','guardian-brace','slam','wispknight','bellbeast'].includes(kind)){
      const type={stalker:'guard',caster:'mage',guardian:'sentinel','guardian-brace':'sentinel',slam:'sentinel',wispknight:'shade',bellbeast:'bellbeast'}[kind];
      const original=g.createWorld().enemies.find(e=>e.type===type);
      const e={...original,id:`fixture-${kind}`,x:kind==='slam'||kind==='bellbeast'?500:750,y:1260-original.h,minX:0,maxX:900,baseY:1260-original.h,cooldown:kind==='slam'||kind==='bellbeast'?.1:100,dead:false};
      if(kind==='wispknight')e.type='wispknight';w.enemies=[e];
      for(let i=0;i<(kind==='slam'||kind==='bellbeast'?350:70);i++){tick();if(events.has('slam')){for(let j=0;j<4;j++)tick();break;}}
    }else if(['raven','wolf','dragon','clone'].includes(kind)){w.progress.unlocked.spell.push(kind);p.mana=p.maxMana=250;castSpell(w,kind);for(let i=0;i<110;i++)tick();}
    else if(kind.startsWith('rifle')){for(let i=0;i<(kind==='rifle-run'?45:1);i++)tick({shoot:true,move:kind==='rifle-run'?1:0,aimUp:kind==='rifle-up',aimX:1,aimY:kind==='rifle-diagonal'?-.7:0});}
    else if(['mira','orren'].includes(kind)){const npc=g.createWorld().npcs.find(n=>n.id.endsWith(kind));w.npcs=[{...npc,x:500,y:1214}];w.story={npcId:npc.id};tick();}
    else if(kind==='water'){const water=w.level.hazards.find(l=>l.type==='water');p.x=water.x+200;p.y=water.y-200;placeCamera();tick();}
    else if(kind==='conduit'){const h=w.level.hazards.find(h=>h.type==='steam');p.x=h.x-160;p.y=h.y+h.h-p.h;w.time=h.period-h.phase+.1;placeCamera();tick();}
    else if(kind==='portals'){
      w.portals=[{id:'fixture-open',x:500,y:1214,w:34,h:46,to:{x:670,y:1214},destinationId:'fixture-closed',pairId:'fixture-pair'},
       {id:'fixture-closed',x:670,y:1214,w:34,h:46,to:{x:500,y:1214},destinationId:'fixture-open',pairId:'fixture-pair',dormant:true}];tick();
    }else if(kind==='souls'){w.souls=[{id:'fixture-soul',x:500,y:1214,w:18,h:24,value:80,taken:false}];p.armor='lanternplate';tick();}
    const guardianCircles=[];
    if(kind==='guardian-brace'){
      const e=w.enemies[0];Object.assign(e,{shield:35,active:true,windup:.3,phase:'charge',attackKind:'slam',attackPhase:'lift',telegraph:{kind:'slam',bounds:{x:e.x-70,y:1240,w:210,h:20}}});
      const originals={};for(const name of ['strokeCircle','fillCircle']){originals[name]=s.dynamic[name];s.dynamic[name]=function(x,y,...args){if(x>=e.x-24&&x<=e.x+e.w+24&&y>=e.y-24&&y<=e.y+e.h)guardianCircles.push({name,x,y});return originals[name].call(this,x,y,...args);};}
      s.drawWorld(0);for(const [name,fn] of Object.entries(originals))s.dynamic[name]=fn;
    }
    g.render();s.children.depthSort();const r=s.sys.game.renderer;r.preRender();s.cameras.render(r,s.children);r.postRender();
    return {kind,steps,playerFrame:s.playerSprite.frame.name,frames:[...frames],enemyFrames:[...enemyFrames],phases:[...phases],events:[...events],peakViews,
      guardianCircles,guardianShieldVisible:!!s.shieldSprites.get('fixture-guardian-brace')?.visible,
      bladeVisible:s.referenceEffects.get('blade-trail')?.visible||false,cracks:s.lanternFX.fractures.length,portals:[...s.portalSprites].filter(([id])=>id.includes('fixture-')).map(([id,v])=>({id,frame:v.frame.name})),
      allies:w.allies.map(a=>({type:a.type,frame:s.allySprites.get(a.id)?.frame.name})),visibleMaterials:[...s.referenceEffects].filter(([,v])=>v.visible).map(([id])=>id)};
   },kind);
   report.fixtures.push(result);await page.screenshot({path:path.join(out,`${kind}.png`)});
   if(!kind.startsWith('rifle')&&(kind.includes('horizontal')||kind.includes('vertical')))assert.ok(result.bladeVisible,`${kind} registered trail active`);
   if(['stalker','caster','guardian','wispknight'].includes(kind))assert.ok(result.enemyFrames.length>=2,`${kind} articulated motion`);
   if(kind==='guardian-brace'){assert.deepEqual(result.guardianCircles,[]);assert.equal(result.guardianShieldVisible,false);}
   if(kind==='slam'||kind==='bellbeast'){assert.ok(result.events.includes('slam'));assert.ok(result.cracks>0);}
   if(kind==='portals')assert.deepEqual(result.portals.map(p=>p.frame),['ln-portal-2','ln-portal-0']);
   if(['raven','wolf','dragon','clone'].includes(kind))assert.ok(result.allies.some(a=>a.type===kind&&a.frame?.startsWith('cr-')));
   if(kind.startsWith('rifle'))assert.ok(result.playerFrame.startsWith(kind==='rifle-run'?'cr-couriergunrun-':'cr-couriergun-'));
  }
  report.textureBudget=await page.evaluate(()=>{
    const sources=new Set(),textures=[];
    for(const [key,texture] of Object.entries(window.__ASH.scene.textures.list))for(const source of texture.source||[]){
      if(!source.image||sources.has(source.image))continue;sources.add(source.image);
      textures.push({key,width:source.width,height:source.height,rgbaBytes:source.width*source.height*4});
    }
    return {kind:'Calculated one-copy RGBA size; not measured process or device RAM',rgbaBytes:textures.reduce((n,t)=>n+t.rgbaBytes,0),textures};
  });
  assert.deepEqual(report.errors,[]);assert.deepEqual(hashes(),report.sourceHashes);report.sourceUnchanged=true;report.passed=true;
 }catch(e){report.passed=false;report.failure=e.stack;throw e;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify({passed:report.passed,fixtures:report.fixtures.length,errors:report.errors}));
})().catch(e=>{console.error(e);process.exitCode=1;});
