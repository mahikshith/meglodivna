import Phaser from 'phaser';
import './style.css';
import './sanctuary-theme.css';
import { LEVEL as DEFAULT_LEVEL, WORLD_LIST } from './level.js';
import { createArtTextures, WORLD_ART } from './art.js';
import { preloadReferenceArt, createReferenceArt } from './reference-art.js';
import { createWorld, stepWorld, retryWorld, equipItem, advanceStory, hazardState, say, weaponOrigin, getSoulEngine, upgradeSoulEngine, STEP } from './combat.js';
import * as catalog from './catalog.js';
import { loadProgress, saveProgress, restartWorldProgress, switchWorldProgress } from './progress.js';
import { createCampaignUI } from './ui.js';
import { Controls } from './input.js';
import { Sound } from './audio.js';
import { cameraTarget, followCamera } from './camera.js';
import { buildSolidTerrain } from './terrain.js';
import { preloadRuneheartArt, createRuneheartArt, createRuneheartParallax } from './runeheart-art.js';
import { preloadLanternArt, createLanternArt } from './lantern-art.js';
import { bladeMotion } from './blade-motion.js';
import { LanternEffects } from './lantern-fx.js';
import { companionFrame, firingFrame, casterFrame } from './character-motion.js';
import { isIronfang, ironfangFrame } from './ironfang.js';

const $=id=>document.getElementById(id), sound=new Sound();
let scene,ui,mode='menu',returnMode='menu',retries=0,previousZone='';
let reducedFX=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const saved=localStorage.getItem('runeheart-reduced-fx');if(saved!==null)reducedFX=saved==='true';sound.setMuted(localStorage.getItem('runeheart-muted')==='true');}catch{}
sound.setReducedFX(reducedFX);
const initialProgress=switchWorldProgress(loadProgress(),'soulforge');
let world=createWorld(initialProgress.checkpoint||0,{worldId:'soulforge',difficulty:'forge',progress:initialProgress});
let LEVEL=world.level||DEFAULT_LEVEL;
const C={light:0xe7f5ff,copper:0xf4b04f,cyan:0x45caff,red:0xf36377,violet:0xbd75ff};
const clock=seconds=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const viewportHeight=()=>{const box=$('game').getBoundingClientRect();return matchMedia('(pointer: coarse)').matches?Math.max(240,Math.min(540,Math.round(960*box.height/Math.max(1,box.width)))):540;};
const controls=new Controls($('touch'),pause,retry,()=>{if(mode==='menu'||mode==='paused'||mode==='dead'||mode==='won')start();});
const itemName=(category,id)=>catalog.CATALOG[category]?.find(item=>item.id===id)?.name||id;

class Soulforge extends Phaser.Scene {
  constructor(){super('soulforge');}
  preload(){preloadReferenceArt(this);preloadRuneheartArt(this);preloadLanternArt(this);}
  create(){
    scene=this;this.viewportH=this.scale.height;this.referenceArt=createLanternArt(this,createRuneheartArt(this,createReferenceArt(this)));this.manifest=createArtTextures(this);this.accumulator=0;this.visualTime=0;this.cameraX=0;this.cameraY=LEVEL.height-this.viewportH;this.shake=0;this.flash=0;this.impact=0;this.rings=[];
    this.particles=Array.from({length:320},()=>({life:0}));this.enemySprites=new Map();this.bossSprites=new Map();this.propSprites=new Map();this.pickupSprites=new Map();this.pickupLabels=new Map();this.npcSprites=new Map();this.weaponSprites=new Map();this.shieldSprites=new Map();this.allySprites=new Map();this.portalSprites=new Map();this.projectileSprites=[];this.trapSprites=new Map();this.iconCache=new Map();this.staticViews=[];this.lastAlarm=-1;
    this.cameras.main.setBounds(0,0,LEVEL.width,LEVEL.height);
    this.parallax=createRuneheartParallax(this,'soulforge',this.viewportH);this.parallaxTheme='soulforge';
    this.buildEnvironment();
    this.playerSprite=this.add.sprite(112,606,'player-idle-0').setOrigin(.5,68/72).setDepth(10);this.referenceEffects=new Map();this.deathViews=new Map();
    this.lanternFX=new LanternEffects(this);
    this.light=this.add.graphics().setDepth(5);this.relayGraphics=this.add.graphics().setDepth(3);this.dynamic=this.add.graphics().setDepth(12);this.atmosphere=this.add.graphics().setDepth(30).setScrollFactor(0);
    this.weather=Array.from({length:80},(_,i)=>({x:i*137%960,y:i*83%540,speed:15+(i%6)*6,size:i%3===0?2:1}));
    this.previousPlayer={x:world.player.x,y:world.player.y};
    this.viewportObserver=new ResizeObserver(()=>{const height=viewportHeight();if(height===this.viewportH)return;this.viewportH=height;this.scale.setGameSize(960,height);this.cameras.main.setViewport(0,0,960,height);this.cameraY=Math.min(this.cameraY,LEVEL.height-height);});this.viewportObserver.observe($('game'));this.events.once('shutdown',()=>this.viewportObserver.disconnect());
    this.input.keyboard?.removeAllKeys();this.game.canvas.tabIndex=0;this.game.canvas.setAttribute('aria-label','Runeheart. See field manual for keyboard, gamepad and touch controls.');
    ui=createCampaignUI(catalog,{
      iconUrl:key=>this.iconUrl(key),onEquip:(category,id)=>{equipItem(world,category,id);saveProgress(world.progress);},
      onOpen:()=>{returnMode=mode;mode='catalogue';controls.clear();$('touch').hidden=true;},
      onClose:()=>{mode=returnMode;if(mode==='playing'||mode==='story')beginPlay();},
      soulEngine:value=>getSoulEngine(value),onUpgrade:(kind,id)=>{const result=upgradeSoulEngine(world,id||kind);if(result.ok)saveProgress(world.progress);return result;},
      onStoryPause:()=>pause(),onStoryNext:()=>continueStory(),onStoryChoice:id=>continueStory(id),
    });
    ui.renderHUD(world);$('start').disabled=false;
    const selection=$('world-select');if(selection){selection.replaceChildren(...WORLD_LIST.filter(realm=>realm.id==='soulforge').map(realm=>{const option=document.createElement('option');option.value=realm.id;option.textContent='Hollow Sanctuary';return option;}));selection.value='soulforge';}
    if(import.meta.env.DEV)window.__ASH={scene:this,controls,get world(){return world;},get mode(){return mode;},get LEVEL(){return LEVEL;},start,retry,pause,stepWorld,createWorld,retryWorld,equipItem,advanceStory,weaponOrigin,getSoulEngine,upgradeSoulEngine,catalog,ui,WORLD_LIST,
      setWorld(value){world=value;LEVEL=value.level||DEFAULT_LEVEL;scene.previousPlayer={x:value.player.x,y:value.player.y};},render(){scene.update(0,0);}};
  }
  iconUrl(key){
    if(key.startsWith('icon-')){
      const id=key.slice(5),category=['gun','sword','spell'].find(c=>catalog.CATALOG[c]?.some(i=>i.id===id));
      if(category)return `${import.meta.env.BASE_URL}sanctuary-ui/${{gun:'rifle',sword:'sword',spell:'rune'}[category]}.png`;
    }
    const portraits={'icon-lanternplate':'lm-icon-lanternplate','icon-armor':'lm-icon-lanternplate','icon-artifact':'lm-icon-bellheart','icon-raven':'lm-icon-raven','portrait-mira':'ln-face-mira','portrait-orren':'ln-face-orren','portrait-vesper':'ref-face-scientist','portrait-ysra':'ref-face-healer'},reference=portraits[key]||key;
    if(this.referenceArt.frames[reference]){
      if(!this.iconCache.has(reference)){const frame=this.textures.get(this.referenceArt.frames[reference].atlasKey||this.referenceArt.atlasKey).get(reference),canvas=document.createElement('canvas');canvas.width=frame.cutWidth;canvas.height=frame.cutHeight;canvas.getContext('2d').drawImage(frame.source.image,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,frame.cutWidth,frame.cutHeight);this.iconCache.set(reference,canvas.toDataURL());}
      return this.iconCache.get(reference);
    }
    if(!this.textures.exists(key))return '';
    if(!this.iconCache.has(key))this.iconCache.set(key,this.textures.get(key).getSourceImage().toDataURL());
    return this.iconCache.get(key);
  }
  referenceKey(animation,time=this.visualTime,rate=9){const frames=this.referenceArt.animations[animation];return Array.isArray(frames)&&frames.length?frames[Math.floor(time*rate)%frames.length]:null;}
  motionKey(identity,actor,fallback='idle'){
    if(identity==='caster')return casterFrame(actor);
    if(identity==='dragon')return `cr-dragon-${actor.attackPhase==='contact'?5:actor.attackPhase==='lift'?4:Math.floor((actor.animationTime||this.visualTime)*7)%4}`;
    const motion=actor.motion||{},phase=actor.attackPhase||motion.phase;
    const rush=actor.attackKind==='charge'&&['contact','downswing'].includes(phase)&&Math.abs(actor.vx||0)>8;
    if(identity==='wispknight'&&phase==='contact'&&(actor.attackProgress||0)<.5)return this.referenceArt.animations['wispknight-attack']?.[1];
    const action=actor.flash>0&&!['lift','downswing','contact'].includes(phase)?'hurt':rush?'walk':['lift','downswing','contact','recovery'].includes(phase)?phase:Math.abs(actor.vx||0)>8?'walk':fallback;
    const names=[`${identity}-${action}`,`${identity}-${action==='lift'?'windup':['downswing','contact'].includes(action)?'attack':fallback}`,`${identity}-idle`];
    const frames=names.map(n=>this.referenceArt.animations[n]).find(f=>f?.length);
    if(!frames)return null;
    const progress=action==='walk'?(motion.cycle||0):['lift','downswing','contact','recovery'].includes(action)?actor.attackProgress||0:(this.visualTime*7%frames.length)/frames.length;
    return frames[Math.min(frames.length-1,Math.floor(Math.max(0,progress)*frames.length))];
  }
  drawBladeTrail(key,blade,player){
    const meta=this.referenceArt.frames[key];if(!meta)return;
    const horizontal=blade.mode==='horizontal'||blade.mode==='finisher',index=blade.poseIndex;
    // Sockets measured on the normalized courier sheet. Plate artwork supplies its own.
    const fallback=(horizontal?[[52,48,30,27],[82,53,112,53],[85,56,104,75],[70,78,96,92]]:[[62,31,38,18],[68,40,45,16],[82,80,110,95],[72,75,111,85]])[index];
    const sockets=meta.sockets||{},hand=sockets.hand||{x:fallback[0],y:fallback[1]},tip=sockets.bladeTip||{x:fallback[2],y:fallback[3]};
    const body=meta.body,scale=player.h/body.h,facing=player.slashFacing||player.facing;
    const point=v=>({x:player.x+player.w/2+facing*(v.x-body.x-body.w/2)*scale,y:player.y+player.h+(v.y-body.y-body.h)*scale});
    const a=point(hand),b=point(tip),length=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.y-a.y,b.x-a.x);
    let view=this.referenceEffects.get('blade-trail');if(!view){view=this.add.image(0,0,'ironfang','if-cut-0').setDepth(11);this.referenceEffects.set('blade-trail',view);}
    const frame=blade.active?Math.min(2,blade.poseIndex):3,size=Math.max(66,Math.min(92,length*2));
    view.setTexture('ironfang',`if-cut-${frame}`).setPosition(a.x,a.y).setOrigin(.16,.5).setDisplaySize(size,size).setRotation(angle).setFlipX(false).setAlpha(blade.active?1:.32).setVisible(true);
  }
  setReference(sprite,key,entity){
    const meta=this.referenceArt.frames[key];if(!meta)return false;
    const body=meta.body||{x:meta.anchor.x-entity.w/2,y:meta.anchor.y-entity.h,w:entity.w,h:entity.h},scale=entity.h/body.h,facing=entity.facing||1;
    const x=entity.x+entity.w/2-facing*(body.x+body.w/2-meta.anchor.x)*scale,y=entity.y+entity.h-(body.y+body.h-meta.anchor.y)*scale;
    // Phaser mirrors noncentral origins too; mirror the anchor to keep anatomy on the body.
    const originX=(facing<0?meta.width-meta.anchor.x:meta.anchor.x)/meta.width;
    sprite.setTexture(meta.atlasKey||this.referenceArt.atlasKey,key).setOrigin(originX,meta.anchor.y/meta.height).setScale(scale).setPosition(x,y).setFlipX(facing<0);return true;
  }
  referenceEffect(id,key,x,y,w,h,rotation=0,facing=1){
    if(!this.referenceArt.frames[key])return;let sprite=this.referenceEffects.get(id);if(!sprite){sprite=this.add.image(0,0,this.referenceArt.frames[key].atlasKey||this.referenceArt.atlasKey,key).setDepth(13);this.referenceEffects.set(id,sprite);}
    sprite.setTexture(this.referenceArt.frames[key].atlasKey||this.referenceArt.atlasKey,key).setVisible(true).setOrigin(.5).setPosition(x,y).setDisplaySize(w,h).setRotation(rotation).setFlipX(facing<0).setAlpha(.85);
  }
  referenceDeath(sprite,entity){
    const lanternFamily=['bellbeast','wispknight'].includes(entity.type)?entity.type:entity.form==='flying'||entity.type==='drone'?'dragon':['mage','hex'].includes(entity.type)?'caster':entity.type==='sentinel'||world.bosses.includes(entity)?'guardian':'stalker';
    const family=isIronfang(entity)?entity.form==='flying'?'irondragon':'ironbull':world.worldId==='soulforge'?lanternFamily:{riftcrawler:'crawler',hexwing:'raider',crimsonmecha:'mecha',wyrm:'wyrm'}[entity.visualFamily];
    // The dragon sheet has no authored death strip; hold a matching pose while fading.
    const frames=this.referenceArt.animations[`${family}-death`]||(['dragon','bellbeast','wispknight'].includes(family)?this.referenceArt.animations[`${family}-idle`]?.slice(-1):null);if(!sprite||!frames?.length)return;
    if(!this.deathViews.has(entity.id))this.deathViews.set(entity.id,this.visualTime);const elapsed=this.visualTime-this.deathViews.get(entity.id);if(elapsed>=.6)return;
    this.setReference(sprite,frames[Math.min(frames.length-1,Math.floor(elapsed*10))],entity);sprite.setVisible(true).setTint(0xffffff).setAlpha(1-elapsed/.6);
  }
  buildEnvironment(){
    LEVEL=world.level||DEFAULT_LEVEL;this.renderedWorldId=world.worldId||'soulforge';
    this.deathViews?.clear();
    for(const item of this.staticViews)item.view.destroy();this.staticViews.length=0;
    for(const map of [this.enemySprites,this.bossSprites,this.propSprites,this.pickupSprites,this.pickupLabels,this.npcSprites,this.weaponSprites,this.shieldSprites,this.allySprites,this.portalSprites,this.trapSprites]){for(const view of map.values())view.destroy();map.clear();}
    this.cameras.main.setBounds(0,0,LEVEL.width,LEVEL.height);
    const theme=WORLD_ART[this.renderedWorldId]||{},rim={soulforge:0xe5d4bd,tide:0xa4e8de,pyre:0xffbb74,neon:0x9ae6ff,veil:0xe4b6fa}[this.renderedWorldId]||0xe5d4bd;
    for(const s of LEVEL.solids){
      const chamber=LEVEL.rooms?.find(r=>s.x>=r.x&&s.x<r.x+r.w),surface=chamber?.kind==='conduit'?'metal':chamber?.kind==='crypt'?'ruins':LEVEL.theme?.foreground||'ruins';
      const view=buildSolidTerrain(this,s,surface);this.staticViews.push({view,x:s.x,w:s.w,solidId:s.id});
    }
    for(const landmark of LEVEL.landmarks||[]){
      if(this.renderedWorldId==='soulforge'&&landmark.type!=='water'){
        const name=['console','lantern'].includes(landmark.type)?'lantern':landmark.type==='pipes'?'root':'arch';
        const size={lantern:[63,142.1],root:[324.8,291.45],arch:[255.2,301.6]}[name];
        const view=this.add.image(landmark.x,landmark.y,`ln-${name}`).setOrigin(.5,1).setDepth(-2).setDisplaySize(...size).setAlpha(name==='lantern'?1:.58);
        this.staticViews.push({view,x:landmark.x-180,w:360});continue;
      }
      if(landmark.type==='console'){
        const view=this.add.image(landmark.x,landmark.y,'tech-console').setOrigin(.5,1).setDepth(-1).setAlpha(.82).setScale(1.45);
        this.staticViews.push({view,x:landmark.x-90,w:180});continue;
      }
      const decor={vault:'crystal',tower:'pillar',altar:'statue',arch:'arch',lantern:'torch',pipes:'pillar'}[landmark.type];
      const key=`ref-prop-${decor}`;if(!decor||!this.referenceArt.frames[key])continue;
      const view=this.add.image(landmark.x,landmark.y,this.referenceArt.frames[key]?.atlasKey||this.referenceArt.atlasKey,key).setOrigin(.5,1).setDepth(-2).setAlpha(.52).setScale(landmark.type==='tower'?3.5:1.8);
      this.staticViews.push({view,x:landmark.x-180,w:360});
    }
    LEVEL.guides?.forEach(h=>{const view=this.add.text(h.x,h.y,h.text,{fontFamily:'Alegreya Sans,Arial',fontSize:'10px',color:'#e2d7c4',backgroundColor:'#161422',padding:{x:8,y:5}}).setOrigin(.5).setAlpha(.7).setDepth(3);this.staticViews.push({view,x:h.x-200,w:400});});
    const e=LEVEL.exit,exit=this.add.image(e.x+e.w/2,e.y+e.h,'lantern-art','ln-portal-0').setDepth(3);this.setReference(exit,'ln-portal-0',{x:e.x-15,y:e.y-40,w:80,h:110,facing:1});this.exitPortal=exit;this.staticViews.push({view:exit,x:e.x,w:100});
    const exitTitle=this.add.text(e.x+e.w/2,e.y-40,'HEART GATE',{fontFamily:'Alegreya Sans,Arial',fontSize:'10px',color:'#e7d4ee'}).setOrigin(.5);this.staticViews.push({view:exitTitle,x:e.x-100,w:200});
  }
  burst(x,y,type,count=12,tint){
    const ink=tint??(['hurt','death'].includes(type)?C.red:['explode','shot','destroy','burn'].includes(type)?0xffb678:['spell','nova'].includes(type)?C.violet:C.light);
    for(let i=0;i<count;i++){
      const p=this.particles.find(p=>p.life<=0);if(!p)break;const angle=Math.random()*Math.PI*2,speed=type==='explode'||type==='destroy'?80+Math.random()*260:35+Math.random()*150;
      Object.assign(p,{x,y,z:Math.random()*60,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-50,vz:-30-Math.random()*90,rotation:Math.random()*6,spin:Math.random()*8-4,life:.25+Math.random()*.7,tint:ink,size:type==='destroy'?4+Math.random()*8:2+Math.random()*3,debris:type==='destroy'||type==='explode'});
    }
  }
  feedback(e){
    const type=e.type==='debris'?'destroy':e.type==='missilewarning'?'missile-warning':e.type;
    sound.play({...e,type});
    this.lanternFX.emit(e,reducedFX);
    if(e.type==='land')this.landedAt=this.visualTime;
    if(e.type==='slam'){this.burst(e.x,e.y,'destroy',reducedFX?5:14,0xa7a58b);this.shake=Math.min(.6,this.shake+.3);}
    const big=['explode','destroy','death','nova','cannon'].includes(type),magic=['spell','thunder','cinder','eclipse','nova','cannon'].includes(type);
    if(big||magic||['pickup','checkpoint','shieldbreak'].includes(type))this.burst(e.x??world.player.x+world.player.w/2,e.y??world.player.y+20,type,reducedFX?4:big?18:magic?14:6,e.tint);
    if(big){this.shake=Math.min(1,this.shake+.4);this.impact=.28;}
    if(e.type==='hurt'){this.shake=Math.min(1,this.shake+.2);this.flash=.24;this.heroHurtUntil=this.visualTime+.28;}
    if(magic){this.rings.push({x:e.x??world.player.x+world.player.w/2,y:e.y??world.player.y+20,life:.7,tint:e.tint||C.violet,spell:e.spell||e.type});if(this.rings.length>8)this.rings.shift();this.impact=.45;this.shake=.6;}
    if(['bossstart','bossdead'].includes(e.type)){this.cinematic={x:e.x,time:1.2};this.impact=.55;}
    if(['souldrop','soulcollect','soulupgrade','pickup','checkpoint','debris','bossdead','storyreward','gate','spell','cannon','equip','win'].includes(e.type))saveProgress(world.progress);
  }
  update(_,milliseconds){
    const dt=Math.min(milliseconds/1000,.05),visualDt=mode==='playing'?dt:0;this.visualTime+=visualDt;
    this.dialogueVisualTime=(this.dialogueVisualTime||0)+(mode==='story'?dt:0);
    if(mode==='playing'){
      if(world.hitstop>0)world.hitstop=Math.max(0,world.hitstop-dt);
      else{
        this.accumulator=Math.min(.1,this.accumulator+dt);
        while(this.accumulator>=STEP){this.previousPlayer.x=world.player.x;this.previousPlayer.y=world.player.y;stepWorld(world,controls.read(),STEP);this.accumulator-=STEP;if(world.status!=='playing'||world.story)break;}
      }
      if(world.story){mode='story';controls.clear();$('touch').hidden=true;ui.renderStory(world.story);}
      if(world.status==='dead')showMenu('dead');if(world.status==='won')showMenu('won');
    }else{controls.read();this.accumulator=0;}
    for(const event of world.events)this.feedback(event);world.events.length=0;
    this.shake=Math.max(0,this.shake-dt*2);this.flash=Math.max(0,this.flash-dt);this.impact=Math.max(0,this.impact-dt);
    if(this.cinematic)this.cinematic.time=Math.max(0,this.cinematic.time-dt);
    sound.update(mode==='playing',!!world.activeBoss&&!world.activeBoss.dead);
    if(mode==='playing'&&world.timeLeft<60){const second=Math.ceil(world.timeLeft);if(second!==this.lastAlarm){this.lastAlarm=second;if(!reducedFX||second%3===0)sound.play('alarm');}}
    this.drawWorld(visualDt);updateHUD();
  }
  drawWorld(dt){
    if(this.presentationWorld!==world){this.buildEnvironment();this.deathViews.clear();this.lanternFX.clear();for(const view of this.referenceEffects.values())view.destroy();this.referenceEffects.clear();this.presentationWorld=world;}
    for(const sprite of this.referenceEffects.values())sprite.setVisible(false);
    const p=world.player,t=this.visualTime,alpha=mode==='playing'?Math.min(1,this.accumulator/STEP):1;
    const px=Phaser.Math.Linear(this.previousPlayer.x,p.x,alpha),py=Phaser.Math.Linear(this.previousPlayer.y,p.y,alpha);
    const zone=[...LEVEL.zones].reverse().find(z=>p.x>=z.x)||LEVEL.zones[0],biome=zone.biome||'snow';
    const room=LEVEL.rooms?.find(r=>p.x>=r.x&&p.x<r.x+r.w),theme=world.worldId==='soulforge'?'soulforge':room?.kind==='crypt'?'crypt':room?.kind==='vault'?'moon':room?.kind==='spire'?'moon':world.worldId;
    if(this.parallaxTheme!==theme){this.parallax?.destroy();this.parallax=createRuneheartParallax(this,theme,this.viewportH);this.parallaxTheme=theme;}
    const threat=world.activeBoss&&!world.activeBoss.dead?world.activeBoss:null;
    const desired=cameraTarget({...p,x:px,y:py},LEVEL,960,this.viewportH,threat&&Math.abs(threat.x-p.x)<580?threat:null);
    const camera=followCamera({x:this.cameraX,y:this.cameraY,zoom:this.cameras.main.zoom},desired,dt);
    this.cameraX=camera.x;this.cameraY=camera.y;
    const shake=reducedFX?0:this.shake*this.shake*3;
    this.cameras.main.setZoom(camera.zoom);
    this.cameras.main.setScroll(Math.round(this.cameraX+Math.sin(t*47)*shake),Math.round(this.cameraY+Math.sin(t*61)*shake));
    // Screen-fixed backdrop overscan covers the full view even when combat zooms out.
    // Overscan the authored parallax paintings for the widest combat camera view.
    this.parallax?.resize(1344,this.viewportH+240);this.parallax?.update(this.cameraX,this.cameraY,(room?.floorY??p.y+p.h)-this.cameraY+120);
    if(this.parallax){this.parallax.backing.setPosition(-192,-120);for(const layer of this.parallax.layers)for(const view of layer.views)view.setPosition(view.x-192,view.y-120);}
    const missing=new Set((world.staticSolids||[]).filter(s=>s.missing).map(s=>s.id));
    if(this.exitPortal)this.setReference(this.exitPortal,`ln-portal-${world.bossDefeated?2:0}`,{x:LEVEL.exit.x-15,y:LEVEL.exit.y-40,w:80,h:110,facing:1});
    for(const item of this.staticViews)item.view.setVisible(!missing.has(item.solidId)&&item.x+item.w>this.cameraX-200&&item.x<this.cameraX+1160);
    const blade=bladeMotion(p,catalog.SWORDS.find(s=>s.id===p.sword)||catalog.SWORDS[0]);
    const heroActive=p.hp>0&&world.status==='playing',slashing=heroActive&&p.slashTime>0,slashFrame=blade.poseIndex,pose=p.slashMode==='vertical'?'overhead':p.slashMode==='finisher'?'finisher':'horizontal';
    const candidate=p.dashTime>0?`player-lunge-${Math.floor(t*20)%4}`:slashing?`player-slash-${pose}-${slashFrame}`:p.shootCooldown>0&&this.textures.exists('player-shoot-0')?'player-shoot-0':p.state==='run'?`player-run-${Math.floor(t*13)%8}`:p.grounded?`player-idle-${Math.floor(t*3)%4}`:p.vy<0?'player-jump-0':'player-fall-0';
    const frame=this.textures.exists(candidate)?candidate:slashing?`player-slash-${slashFrame}`:'player-idle-0';
    let heroAnimation=p.hp<=0?'aether-death':this.heroHurtUntil>t?'aether-hurt':p.dashTime>0?'aether-dash':slashing?(p.slashMode==='vertical'?'hero-slash-air':p.slashMode==='finisher'?'hero-slash-low':'aether-slash'):p.jetActive?'aether-jet':p.shootCooldown>0?'aether-fire':p.state==='run'?'aether-run':p.grounded?'aether-idle':p.vy>=0?'aether-fall':p.jumps===0?'aether-doublejump':'aether-jump';
    if(['lanternplate','bulwark'].includes(p.armor))heroAnimation=heroAnimation.replace('aether-','lanternplate-').replace('hero-slash-air','lanternplate-overhead').replace('hero-slash-low','lanternplate-slash').replace('lanternplate-doublejump','lanternplate-jump');
    const heroFrames=this.referenceArt.animations[heroAnimation],heroKey=p.hp<=0?heroFrames?.at(-1):heroAnimation.endsWith('-fire')?firingFrame(p):slashing&&heroFrames?.length?heroFrames[Math.min(heroFrames.length-1,blade.poseIndex)]:!p.grounded&&!p.jetActive&&heroFrames?.length?heroFrames[Math.min(heroFrames.length-1,Math.floor(Math.max(0,Math.min(1,(p.vy+670)/1570))*heroFrames.length))]:this.referenceKey(heroAnimation,p.state==='run'?(p.motionDistance||0)/88:t,p.state==='run'?4:8);
    if(!this.setReference(this.playerSprite,heroKey||this.referenceKey('aether-idle'),{...p,x:px,y:py,facing:slashing?(p.slashFacing||p.facing):p.facing}))this.playerSprite.setTexture(frame).setOrigin(.5,slashing||p.dashTime>0?152/160:68/72).setScale(1).setPosition(Math.round(px+p.w/2),Math.round(py+p.h)).setFlipX(p.facing<0);
    const armor=catalog.ARMORS.find(a=>a.id===p.armor),opacity=!heroActive?1:p.stealth>0?.3:p.invincible>0&&Math.floor(t*16)%2===0?.72:1;
    this.playerSprite.setAlpha(opacity).setTint(p.impaired>0?0x89899e:['courier','lanternplate'].includes(p.armor)?0xffffff:armor?.tint||0xffffff);
    if(this.heroHurtUntil>t)this.playerSprite.setAlpha(1).setTint(0xff796b);
    if(p.grounded&&this.landedAt!==undefined&&t-this.landedAt<.12&&!slashing){const compression=Math.sin((t-this.landedAt)/.12*Math.PI)*.07;this.playerSprite.setScale(this.playerSprite.scaleX*(1+compression),this.playerSprite.scaleY*(1-compression));}
    const near=e=>e.x+(e.w||100)>this.cameraX-160&&e.x<this.cameraX+1120;
    for(const sprite of this.enemySprites.values())sprite.setVisible(false);
    for(const e of world.enemies){
      if(!near(e))continue;if(e.dead){this.referenceDeath(this.enemySprites.get(e.id),e);continue;}let sprite=this.enemySprites.get(e.id);const cast=e.windup>0||e.beamTime>0||e.attackTime>0||e.dashTime>0||e.action==='attack'||e.phase==='attack',skin=e.skin||e.type,newKey=`${skin}-${cast?'cast':'idle'}-${Math.floor(t*7)%4}`,key=this.textures.exists(newKey)?newKey:e.type==='turret'?'turret-0':`${e.type}-${Math.floor(t*(e.type==='drone'?9:6))%4}`;
      if(!sprite){sprite=this.add.sprite(0,0,this.textures.exists(key)?key:'guard-0').setDepth(8);this.enemySprites.set(e.id,sprite);}
      const origin=skin==='witch'||skin==='wizard'?92/96:e.type==='drone'?.5:['mage','shade','sentinel'].includes(e.type)?76/80:54/56;
      sprite.setTexture(this.textures.exists(key)?key:'guard-0').setVisible(true).setOrigin(.5,origin).setPosition(Math.round(e.x+e.w/2),Math.round(e.y+(e.type==='drone'?e.h/2:e.h))).setFlipX(e.facing<0).setTint(e.flash>0?0xffe2b6:e.slow>0||e.weakened>0?0x9ed9c8:0xffffff).setAlpha(e.type==='shade'&&e.hidden?.2:1);
      const family={riftcrawler:'crawler',hexwing:'raider',crimsonmecha:'mecha'}[e.visualFamily],action=e.flash>0?'hurt':cast?['raider','mecha'].includes(family)?'fire':'attack':Math.abs(e.vx||0)>10?e.type==='drone'?'fly':'walk':'idle';if(family)this.setReference(sprite,this.referenceKey(`${family}-${action}`)||this.referenceKey(`${family}-idle`),e);
      if(world.worldId==='soulforge'){
        const identity={guard:'stalker',shade:'stalker',wispknight:'wispknight',bellbeast:'bellbeast',mage:'caster',sentinel:'guardian',drone:'dragon'}[e.type];
        const pose=e.type==='drone'?'fly':e.windup>0?'windup':e.dashTime>0||e.attackTime>0?'attack':e.recovery>0?'recovery':'idle';
        if(identity)this.setReference(sprite,this.motionKey(identity,e,pose),e);
      }
    }
    for(const sprite of this.bossSprites.values())sprite.setVisible(false);
    for(const b of world.bosses){
      if(!near(b))continue;if(b.dead){this.referenceDeath(this.bossSprites.get(b.id),b);continue;}let sprite=this.bossSprites.get(b.id);const state=b.flash>0?'hurt':['charge','attack'].includes(b.phase)?'attack':Math.abs(b.vx||0)>20?'run':'idle',candidate=`boss-${b.skin||b.type}-${state}-${Math.floor(t*7)%4}`,pose=`boss-${b.type}-${state}-${Math.floor(t*7)%4}`,key=this.textures.exists(candidate)?candidate:this.textures.exists(pose)?pose:`boss-${b.type}-${Math.floor(t*4)%4}`;
      if(!sprite){sprite=this.add.sprite(0,0,key).setDepth(9);this.bossSprites.set(b.id,sprite);}
      sprite.setTexture(key).setOrigin(.5,b.type==='warden'?138/144:184/192).setPosition(Math.round(b.x+b.w/2),Math.round(b.y+b.h)).setFlipX(b.facing<0).setVisible(true).setTint(b.flash>0?0xffd1b2:b.enraged?0xffbca3:b.weakened>0?0xbbebec:0xffffff);
      if(b.visualFamily==='wyrm'||b.visualFamily==='crimsonmecha'){const family=b.visualFamily==='wyrm'?'wyrm':'mecha',action=b.flash>0?'hurt':b.phase==='attack'||b.phase==='charge'?'fire':family==='wyrm'?'fly':Math.abs(b.vx||0)>10?'walk':'idle';this.setReference(sprite,this.referenceKey(`${family}-${action}`)||this.referenceKey(`${family}-idle`),b);}
      if(b.type==='warden')this.setReference(sprite,this.referenceKey(b.phase==='attack'||b.phase==='charge'?'beast-breath':'beast-idle',t,8),b);
      if(b.type==='hex')this.setReference(sprite,this.referenceKey(b.phase==='attack'||b.phase==='charge'?'ghost-shriek':'ghost-idle',t,8),b);
      if(world.worldId==='soulforge'){
        const identity=b.form==='flying'?'dragon':b.type==='hex'?'caster':b.type==='bellbeast'?'bellbeast':'guardian';
        const pose=identity==='dragon'?(b.phase==='attack'?'fire':'fly'):b.phase==='charge'?'windup':b.phase==='attack'?'attack':b.recovering?'recovery':'idle';
        if(isIronfang(b)){
          const key=ironfangFrame(b),height=b.phase==='transform'&&key.startsWith('if-dragon')?86:b.h;
          this.setReference(sprite,key,{...b,h:height,y:b.y+b.h-height});
        }else this.setReference(sprite,this.motionKey(identity,b,pose),b);
        if(b.phase==='transform'&&!isIronfang(b)){sprite.setAlpha(.6+Math.sin(t*20)*.2);}
        else sprite.setAlpha(1);
      }
      if(b.flash>.18)sprite.setTintFill(0xffd39a);
      else if(b.flash>0)sprite.setTint(0xff7058);
    }
    const focusedPickup=world.pickups.filter(item=>!item.taken&&Math.abs(item.y-p.y-p.h/2)<110).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    for(const item of world.pickups){
      let sprite=this.pickupSprites.get(item.id),label=this.pickupLabels.get(item.id);if(item.taken||!near(item)){sprite?.setVisible(false);label?.setVisible(false);continue;}
      const animation=`pickup-${item.type}-${Math.floor(t*6)%4}`,key=this.textures.exists(animation)?animation:this.textures.exists(`pickup-${item.type}`)?`pickup-${item.type}`:'pickup-mana';
      if(!sprite){sprite=this.add.image(item.x,item.y,key).setDepth(7);this.pickupSprites.set(item.id,sprite);}
      sprite.setTexture(key).setVisible(true).setPosition(item.x,item.y+Math.sin(t*3+item.x)*4);
      const itemFrame={health:'health-potion',mana:'mana-potion',fuel:'jetpack',boost:'jetpack',rapid:'dash',shield:'shield',spell:'scroll',treasure:'crystal',cannon:'mana',nova:'crystal',weapon:'key',sword:'key',armor:'shield'}[item.type],referenceItem=`ref-item-${itemFrame}`;if(this.referenceArt.frames[referenceItem])sprite.setTexture(this.referenceArt.frames[referenceItem].atlasKey||this.referenceArt.atlasKey,referenceItem).setDisplaySize(40,40);
      const lanternItem=`ln-item-${{health:'health',mana:'mana',fuel:'fuel',boost:'boost',rapid:'rapid',shield:'shield',spell:'rune',treasure:'rune',cannon:'fuel',nova:'rune',armor:'shield',weapon:'rapid',sword:'rapid'}[item.type]||'rune'}`,meta=this.referenceArt.frames[lanternItem];
      if(meta){const scale=Math.min(34/meta.width,34/meta.height);sprite.setTexture('lantern-art',lanternItem).setDisplaySize(meta.width*scale,meta.height*scale);}
      if(!label){const category={weapon:'gun',sword:'sword',armor:'armor',spell:'spell',treasure:'relic'}[item.type],name=category?itemName(category,item.itemId):{health:'Trauma Serum',fuel:'Thruster Cell',rapid:'Weapon Overdrive',shield:'Soul Shield',boost:'Jet Booster',mana:'Resonance Vial',cannon:'Oblivion Charge',nova:'Eclipse Charge'}[item.type]||item.type;label=this.add.text(item.x,item.y-34,name,{fontFamily:'Alegreya Sans,Arial',fontSize:'10px',color:'#eee1cf',backgroundColor:'#151021',padding:{x:6,y:3}}).setOrigin(.5).setDepth(8);this.pickupLabels.set(item.id,label);}
      label.setVisible(item===focusedPickup&&Math.abs(item.x-p.x)<140);
    }
    for(const prop of world.props){
      let sprite=this.propSprites.get(prop.id);if(prop.dead||prop.destroyed||!near(prop)){sprite?.setVisible(false);continue;}
      if(!sprite){sprite=this.add.image(0,0,this.textures.exists(prop.type)?prop.type:'crate').setDepth(4);this.propSprites.set(prop.id,sprite);}
      sprite.setVisible(true).setDisplaySize(prop.w,prop.h).setPosition(prop.x+prop.w/2,prop.y+prop.h/2).setTint(prop.flash>0?0xffd4b3:0xffffff);
      if(prop.type==='lever')sprite.setTexture('ln-fx-lever').setDisplaySize(44,55).setPosition(prop.x+prop.w/2,prop.y+prop.h-27.5).setFlipX(!!prop.activated);
      if(prop.type==='cache'&&this.referenceArt.frames['ref-prop-chest'])sprite.setTexture(this.referenceArt.frames['ref-prop-chest'].atlasKey||this.referenceArt.atlasKey,'ref-prop-chest').setDisplaySize(prop.w+18,prop.h+4);
      if(prop.type==='cache'&&this.referenceArt.frames['ln-item-chest'])sprite.setTexture('lantern-art','ln-item-chest').setDisplaySize(58,42);
    }
    for(const npc of world.npcs){
      let sprite=this.npcSprites.get(npc.id);if(!near(npc)){sprite?.setVisible(false);continue;}
      const raw=npc.skin||npc.id,caster=['wizard','witch'].includes(raw),skin=caster?raw:raw.startsWith('npc-')?raw:`npc-${raw}`,pose=`${skin}-${caster?'idle-':''}${Math.floor(t*3)%4}`,key=this.textures.exists(pose)?pose:this.textures.exists(skin)?skin:'npc-mira';
      if(!sprite){sprite=this.add.sprite(npc.x+14,npc.y+46,key).setOrigin(.5,76/80).setDepth(7);this.npcSprites.set(npc.id,sprite);}
      sprite.setTexture(key).setOrigin(.5,caster?92/96:76/80).setVisible(true).setFlipX(p.x<npc.x);
      const friendly=caster?raw==='witch'?'healer':'mage':raw.includes('orren')?'mage':raw.includes('vesper')?'scientist':'villager';
      const talking=world.story?.npcId===npc.id,animation=talking?`npc-${raw.includes('orren')?'orren':'mira'}-talk`:`npc-${friendly}-idle`;
      this.setReference(sprite,this.referenceKey(animation,talking?this.dialogueVisualTime||0:t,talking?3:2)||`ref-npc-${friendly}`,{...npc,w:28,h:64,y:npc.y+46-64,facing:p.x<npc.x?-1:1});
    }
    const g=this.dynamic;g.clear();this.drawHazards(g,t,near);
    for(const map of [this.weaponSprites,this.shieldSprites,this.allySprites,this.portalSprites])for(const sprite of map.values())sprite.setVisible(false);
    for(const sprite of this.portalSprites.values())sprite.portalActive=false;
    this.drawEnvironmentMotion(g,t,near);
    for(const gate of world.gates){if(gate.open||!near(gate))continue;g.fillStyle(0x31534e,.32);g.fillRect(gate.x,gate.y,gate.w,gate.h);g.lineStyle(1,0xc3b884,.65);g.lineBetween(gate.x,gate.y,gate.x,gate.y+gate.h);g.lineBetween(gate.x+gate.w,gate.y,gate.x+gate.w,gate.y+gate.h);for(let y=Math.max(gate.y,Math.floor(this.cameraY/150)*150);y<Math.min(gate.y+gate.h,this.cameraY+this.viewportH+150);y+=150)this.materialView(`gate:${gate.id}:${y}`,'ln-fx-ward',gate.x+gate.w/2,y,gate.w+8,150,4).setAlpha(.5);}
    const relay=this.relayGraphics;relay.clear();
    LEVEL.checkpoints.forEach((cp,i)=>{if(!near(cp))return;this.materialView(`relay:${i}`,'ln-lantern',cp.x+12,cp.y+46-88,42,88,3).setTint(i<=world.checkpoint?0xffffff:0x647a72);});
    for(const enemy of [...world.enemies,...world.bosses]){
      if(enemy.dead||!near(enemy))continue;
      if(enemy.windup>0){g.fillStyle(C.red,.25);g.fillRect(enemy.x,enemy.y-10,enemy.w,3);g.fillStyle(C.red);g.fillRect(enemy.x,enemy.y-10,enemy.w*Math.min(1,enemy.windup/.48),3);}
      const guardian=world.worldId==='soulforge'&&['sentinel','warden'].includes(enemy.type);
      if(enemy.shield>0&&!guardian)this.drawShield(enemy.id,enemy.x+enemy.w/2,enemy.y+enemy.h/2,enemy.w+32,enemy.h+26,t,C.violet);
      if(enemy.beam)this.drawBeam(g,enemy.beam,t,false);
      else if((enemy.phase==='charge'||enemy.windup>0)&&enemy.telegraph)this.drawAttackWarning(g,enemy,t);

      const magic=['mage','hex','shade','sentinel'].includes(enemy.type)||['riftcrawler','wyrm','crimsonmecha','hexwing'].includes(enemy.visualFamily),slot=enemy.weaponSlot||(enemy.type==='hex'?'hand':enemy.attack===2&&enemy.active?'core':enemy.type==='turret'||enemy.power==='missile'||enemy.attack===1&&enemy.active?'rocket':'gun');
      if(world.worldId!=='soulforge'&&(!magic||slot==='rocket'))this.drawWeapon(enemy,slot,slot==='rocket'?'launcher':'carbine',enemy.aimAngle??enemy.telegraph?.angle,t);
      else if(!guardian&&!isIronfang(enemy)&&(enemy.windup>0||enemy.phase==='charge')){const hand=weaponOrigin(enemy,slot);g.lineStyle(2,enemy.type==='sentinel'?C.cyan:C.violet,.8);g.strokeCircle(hand.x,hand.y,9+Math.sin(t*24)*3);g.fillStyle(C.light,.8);g.fillCircle(hand.x,hand.y,3);}
      if(enemy.active&&!guardian&&!isIronfang(enemy)){const core=weaponOrigin(enemy,'core');g.lineStyle(2,enemy.weakened>0?C.cyan:enemy.enraged?C.red:C.violet,.55);g.strokeCircle(core.x,core.y,7+Math.sin(t*6)*2);}
      if(enemy.portalExit?.time>0){this.drawPortal(`blink-source:${enemy.id}`,enemy.portalSource.x+enemy.w/2,enemy.portalSource.y+enemy.h/2,t,.7,false);this.drawPortal(`blink-exit:${enemy.id}`,enemy.portalExit.x+enemy.w/2,enemy.portalExit.y+enemy.h/2,t,1,false);}
      if(enemy.mirrorExit?.time>0)this.drawPortal(`mirror:${enemy.id}`,enemy.mirrorExit.x+15,enemy.mirrorExit.y+44,t,1,true);
      if(enemy.powerPulse?.time>0){const pulse=enemy.powerPulse;g.fillStyle(C.cyan,pulse.phase==='warning'?.06:.16);g.fillRect(pulse.x,pulse.y,pulse.w,pulse.h);g.lineStyle(2,C.cyan,pulse.phase==='warning'?.35:.7);for(let i=0;i<9;i++){const x=pulse.x+(i*71+t*Math.abs(pulse.vx||90))%pulse.w,y=pulse.y+pulse.h/2+Math.sin(t*4+i)*12,dir=Math.sign(pulse.vx||1);g.lineBetween(x,y,x-dir*13,y-5);g.lineBetween(x,y,x-dir*13,y+5);}}
    }
    this.projectileSprites.forEach(sprite=>sprite.setVisible(false));
    for(let index=0;index<world.projectiles.length;index++){
      const shot=world.projectiles[index];if(!shot.active||!near(shot))continue;const tint=shot.tint||(shot.owner==='player'?C.copper:C.red),kind=shot.missile?'rocket':shot.kind==='dragonfire'?'fire':shot.kind==='ally'?'rail':['rail','scatter','fire','hex'].includes(shot.kind)?shot.kind:'carbine',key=`projectile-${kind}`,angle=Math.atan2(shot.vy,shot.vx);
      if(!['fire','dragonfire'].includes(shot.kind)){g.lineStyle(shot.missile?5:kind==='rail'?3:1,tint,.3);g.lineBetween(shot.x-shot.vx*.04,shot.y-shot.vy*.04,shot.x,shot.y);}
      if(this.textures.exists(key)){let sprite=this.projectileSprites[index];if(!sprite){sprite=this.add.image(0,0,key).setDepth(13);this.projectileSprites[index]=sprite;}sprite.setTexture(key).setVisible(true).setPosition(shot.x,shot.y).setRotation(angle).setDisplaySize(shot.missile?34:kind==='rail'?38:kind==='scatter'?14:22,shot.missile?17:kind==='fire'||kind==='hex'?14:8).setTint(shot.heavy?0xff9582:0xffffff);}
      const referenceShot=shot.missile?null:shot.owner==='player'?kind==='rail'?'ref-fx-bolt':kind==='fire'?'ref-fx-fire':kind==='scatter'?'ref-fx-star':'ref-fx-shot':kind==='fire'?'ref-fx-fire':'ref-fx-enemy-bolt';if(referenceShot&&this.referenceArt.frames[referenceShot])this.projectileSprites[index]?.setTexture(this.referenceArt.frames[referenceShot].atlasKey||this.referenceArt.atlasKey,referenceShot).setDisplaySize(kind==='rail'?40:kind==='fire'?32:kind==='scatter'?14:24,kind==='rail'?12:kind==='scatter'?14:20);
      else{g.lineStyle(shot.missile?7:3,tint);g.lineBetween(shot.x-Math.cos(angle)*12,shot.y-Math.sin(angle)*12,shot.x,shot.y);}
      if(!shot.missile&&this.projectileSprites[index]){
        const view=this.projectileSprites[index];
        if(['fire','dragonfire'].includes(shot.kind))view.setVisible(false);
        else view.setTexture(shot.owner==='player'?'ln-fx-bolt':'ln-fx-orb').setOrigin(.88,.5).setDisplaySize(shot.owner==='player'?30:34,shot.owner==='player'?9:20).setTint(0xffffff);
      }
      if(shot.missile){const tailX=shot.x-Math.cos(angle)*16,tailY=shot.y-Math.sin(angle)*16;g.fillStyle(0xffa572,.8);g.fillEllipse(tailX,tailY,8+Math.sin(t*50)*3,7);if(dt>0&&Math.random()<.18)this.burst(tailX,tailY,'shot',1,0xdca684);}
    }
    if(world.missileWarning){g.lineStyle(1,C.red,.25+Math.sin(t*15)*.15);g.lineBetween(this.cameraX,world.missileWarning.y,this.cameraX+960,world.missileWarning.y);g.fillStyle(C.red,.7);g.fillTriangle(this.cameraX+924,world.missileWarning.y,this.cameraX+947,world.missileWarning.y-10,this.cameraX+947,world.missileWarning.y+10);}
    if(slashing&&(blade.active||blade.poseIndex===3))this.drawBladeTrail(heroKey,blade,{...p,x:px,y:py});
    const beam=p.beam||p.laserBeam;if(heroActive&&p.laserTime>0&&beam)this.drawBeam(g,beam,t,false);
    if(heroActive&&!p.characterRevision&&!slashing&&p.dashTime<=0&&p.shootCooldown>0)this.drawWeapon({...p,x:px,y:py},'gun',p.gun==='rocket'?'launcher':p.gun,p.aimAngle??(p.aimUp?-Math.PI/2:p.facing<0?Math.PI:0),t,'hero');
    if(heroActive&&p.shield>0)this.drawShield('hero',px+p.w/2,py+p.h/2,60,78,t,C.cyan);
    if(heroActive&&(p.rapid>0||p.boost>0)){g.lineStyle(2,p.boost>0?C.violet:C.cyan,.3);for(let i=0;i<4;i++){const a=t*4+i*Math.PI/2;g.strokeCircle(px+p.w/2+Math.cos(a)*24,py+p.h*.4+Math.sin(a)*34,3);}}
    if(heroActive&&p.stealth>0){g.fillStyle(C.violet,.07);g.fillEllipse(px+p.w/2,py+p.h/2,60,80);}
    this.drawSummons(g,t,near);
    this.closePortals(t);
    this.drawEffects(g,dt,t);this.drawAtmosphere(dt,t,biome);this.lanternFX.update(dt,world,reducedFX,{...p,x:px,y:py});
  }
  drawWeapon(entity,slot,kind,angle,t,id=entity.id){
    const key=`weapon-${kind}`;if(!this.textures.exists(key)||slot==='core')return;
    const origin=weaponOrigin(entity,slot);let sprite=this.weaponSprites.get(id);
    if(!sprite){sprite=this.add.image(0,0,key).setDepth(11).setOrigin(74/80,20/40);this.weaponSprites.set(id,sprite);}
    const rotation=Number.isFinite(angle)?angle:entity.facing<0?Math.PI:0;
    sprite.setTexture(key).setVisible(true).setPosition(origin.x,origin.y).setRotation(rotation).setScale(entity.sword?13/58:entity.active?.85:.6).setFlipY(Math.cos(rotation)<0);
    if(entity.shootCooldown>0&&entity.shootCooldown<.09){this.dynamic.fillStyle(C.light,.8);this.dynamic.fillCircle(origin.x,origin.y,3+Math.sin(t*70)*2);}
  }
  drawShield(id,x,y,w,h,t,tint){
    let sprite=this.shieldSprites.get(id);
    if(!sprite){sprite=this.add.image(x,y,'ln-fx-ward').setDepth(14);this.shieldSprites.set(id,sprite);}
    sprite.setTexture('ln-fx-ward').setVisible(true).setPosition(x,y).setDisplaySize(w,h).setTint(0xffffff).setAlpha(.30+Math.sin(t*4)*.04);
  }
  drawBeam(g,beam,t,warning=false){
    const x0=beam.x0??beam.x,y0=beam.y0??(beam.y+beam.h/2),x1=beam.x1??(beam.x+beam.w),y1=beam.y1??y0;
    if(![x0,y0,x1,y1].every(Number.isFinite))return;
    const tint=beam.tint||C.red,width=beam.width||beam.h||12,dx=x1-x0,dy=y1-y0,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
    if(warning){g.lineStyle(2,tint,.4+Math.sin(t*16)*.15);for(let i=0;i<length;i+=32){const a=i/length,b=Math.min(1,(i+14)/length);g.lineBetween(x0+dx*a,y0+dy*a,x0+dx*b,y0+dy*b);}g.lineStyle(2,tint,.8);g.strokeCircle(x0,y0,10+Math.sin(t*12)*3);return;}
    g.lineStyle(width+22,tint,.09);g.lineBetween(x0,y0,x1,y1);g.lineStyle(width,tint,.8);g.lineBetween(x0,y0,x1,y1);g.lineStyle(Math.max(2,width*.25),C.light,.95);g.lineBetween(x0,y0,x1,y1);
    if(!reducedFX){g.lineStyle(2,0xf5e4ff,.7);g.beginPath();for(let i=0;i<=Math.ceil(length/28);i++){const distance=Math.min(length,i*28),a=distance/length,jitter=Math.sin(i*3.1+t*30)*Math.min(8,width*.65);const x=x0+dx*a+nx*jitter,y=y0+dy*a+ny*jitter;i?g.lineTo(x,y):g.moveTo(x,y);}g.strokePath();}
    g.fillStyle(C.light,.85);g.fillCircle(x0,y0,width*.7);g.lineStyle(3,tint,.7);g.strokeCircle(x0,y0,width+4+Math.sin(t*25)*3);
  }
  drawAttackWarning(g,enemy,t){
    const hint=enemy.telegraph,kind=hint.kind;
    if(isIronfang(enemy))return; // Authored anticipation and emitter embers in LanternEffects.
    if(!kind||kind==='shot'){this.drawBeam(g,hint,t,true);return;}
    const feet=enemy.y+enemy.h,cx=enemy.x+enemy.w/2,dir=enemy.attackFacing||enemy.facing||1;
    const ink=0xffc27a,alpha=.55+Math.sin(t*10)*.15;
    if(kind==='slam'||kind==='cleave'){
      const box=hint.bounds;if(!box)return;
      g.fillStyle(ink,.10);g.fillRect(box.x,box.y,box.w,box.h);
      g.lineStyle(2,ink,alpha);g.lineBetween(box.x,box.y+box.h-2,box.x+box.w,box.y+box.h-2);
      for(let x=box.x+8;x<box.x+box.w;x+=24){g.lineBetween(x,box.y+box.h-6,x+5,box.y+box.h-12);g.lineBetween(x+5,box.y+box.h-12,x+10,box.y+box.h-6);}
    }else if(['bite','lunge','charge'].includes(kind)){
      const reach=kind==='charge'?235:125,start=cx+(kind==='charge'?dir*enemy.w/2:0);
      g.lineStyle(2,ink,alpha);g.lineBetween(start,feet-3,start+dir*reach,feet-3);
      for(let i=1;i<=3;i++){const x=start+dir*(reach-i*22);g.lineBetween(x,feet-12,x+dir*8,feet-5);g.lineBetween(x,feet+2,x+dir*8,feet-5);}
    }else if(kind==='breath'){
      const x=hint.x0,y=hint.y0;g.fillStyle(ink,alpha);g.fillCircle(x,y,4);
    }else{
      const x=hint.x0,y=hint.y0;g.lineStyle(2,kind==='summon'?0x94ddcd:ink,alpha);g.strokeCircle(x,y,13+Math.sin(t*5)*2);
      for(let i=0;i<4;i++){const a=t*2+i*Math.PI/2;g.fillStyle(ink,.8);g.fillRect(x+Math.cos(a)*19-2,y+Math.sin(a)*19-2,4,4);}
    }
  }
  materialView(id,key,x,y,w,h,depth=2){
    let view=this.referenceEffects.get(id);
    if(!view){view=this.add.image(0,0,key);this.referenceEffects.set(id,view);}
    return view.setTexture(key).setPosition(x,y).setOrigin(.5,0).setDisplaySize(w,h).setDepth(depth).setVisible(true);
  }
  drawEnvironmentMotion(g,t,near){
    for(const s of world.movingPlatforms||[]){if(!near(s))continue;this.materialView(`moving:${s.id}`,'ln-fx-platform',s.x+s.w/2,s.y,s.w,Math.min(92,s.w*.42));g.lineStyle(1,0xd7c49a,.7);g.lineBetween(s.x,s.y,s.x+s.w,s.y);}
    for(const current of LEVEL.currents||[]){if(!near(current))continue;g.lineStyle(1,0xa9cbbb,.2);for(let i=0;i<6;i++){const x=current.x+(i*73+t*(current.vx||35))%current.w,y=current.y+current.h*(i+1)/7;g.lineBetween(x,y,x+Math.sign(current.vx||1)*25,y+Math.sin(t*3+i)*4);}}
    for(const [i,landmark] of (LEVEL.landmarks||[]).filter(l=>l.type==='water').entries()){
      const water=LEVEL.hazards.find(h=>h.type==='water'&&h.x<landmark.x+landmark.w&&h.x+h.w>landmark.x)||landmark;
      if(!near(water))continue;const id=`water:${i}`,height=Math.max(20,LEVEL.height-water.y);let view=this.referenceEffects.get(id);
      if(!view){view=this.add.tileSprite(water.x,water.y+6,water.w,height,'ln-fx-water').setOrigin(0).setDepth(3);this.referenceEffects.set(id,view);}
      view.setVisible(true).setAlpha(.72);view.tilePositionX=t*7;view.tilePositionY=Math.sin(t*.8)*2;
      g.lineStyle(1,0xa3c7b5,.48);g.beginPath();for(let j=0;j<=64;j++){const x=water.x+j*water.w/64,wave=Math.sin(x*.016-t*2.4)*4+Math.sin(x*.033+t*1.2)*2;j?g.lineTo(x,water.y+wave+6):g.moveTo(x,water.y+wave+6);}g.strokePath();
    }
    for(const s of world.staticSolids||[]){if(!near(s)||!s.crack||s.missing)continue;g.lineStyle(2,0xd6b988,.8);for(let i=0;i<4;i++)g.lineBetween(s.x+s.w*i/4,s.y,s.x+s.w*(i+.7)/4,s.y+s.h);}
    for(const portal of world.portals||LEVEL.portals||[]){if(near(portal))this.drawPortal(`travel:${portal.id}`,portal.x+portal.w/2,portal.y+portal.h/2,t,1,false,portal.dormant);}
    for(const soul of world.souls||[]){if(soul.taken||!near(soul))continue;
      const key=this.referenceArt.frames['lm-icon-bellheart']?'lm-icon-bellheart':'ln-item-rune';
      this.referenceEffect(`soul:${soul.id}`,key,soul.x,soul.y+Math.sin(t*3)*3,24,30);
      for(let j=0;j<4;j++){const a=t*1.4+j*1.57;g.fillStyle(0xf4d6a0,.55);g.fillCircle(soul.x+Math.cos(a)*14,soul.y+Math.sin(a)*20,1);}
    }
  }
  drawPortal(id,x,y,t,opacity=1,ground=false,dormant=false){
    let sprite=this.portalSprites.get(id);
    if(!sprite){sprite=this.add.image(x,y,'lantern-art','ln-portal-0').setDepth(ground?6:8);sprite.born=t;this.portalSprites.set(id,sprite);}
    if(sprite.closingAt!=null){sprite.born=t;sprite.closingAt=null;}
    sprite.portalActive=true;sprite.portalOpacity=opacity;
    const age=t-sprite.born,forming=!id.startsWith('travel:')&&age<.6;
    const key=`ln-portal-${dormant?0:forming?Math.min(2,Math.floor(age/.2)):2}`;
    this.setReference(sprite,key,{x:x-35,y:ground?y-84:y-50,w:70,h:84,facing:1});
    sprite.setVisible(true).setAlpha(opacity);
    if(dormant)return;
    const g=this.dynamic,cy=ground?y-42:y-8;
    g.lineStyle(1,0x92e7d0,.45*opacity);
    for(let i=0;i<(reducedFX?4:9);i++){
      const a=t*(i%2?1.3:-1.1)+i*2.4,r=20+(Math.sin(t*2+i)+1)*9;
      const sx=x+Math.cos(a)*r,sy=cy+Math.sin(a)*r*1.25;
      g.fillStyle(i%3?0x92e7d0:0xffd188,.65*opacity);g.fillRect(Math.round(sx),Math.round(sy),2,3);
      g.lineBetween(sx,sy,x+Math.cos(a+.12)*(r-4),cy+Math.sin(a+.12)*(r-4)*1.25);
    }
  }
  closePortals(t){
    for(const [id,sprite] of this.portalSprites){
      if(sprite.portalActive||id.startsWith('travel:'))continue;
      sprite.closingAt??=t;const age=t-sprite.closingAt;
      if(age>=.35){sprite.destroy();this.portalSprites.delete(id);continue;}
      sprite.setTexture('lantern-art','ln-portal-3').setVisible(true).setAlpha((sprite.portalOpacity??1)*(1-age/.35));
    }
  }
  drawSummons(g,t,near){
    for(const ally of [...(world.allies||[]),...(world.enemySummons||[])]){
      if(ally.dead||!near(ally))continue;const feet=ally.y+(ally.h||56),arriving=ally.phase==='arrive';
      if(arriving){this.drawPortal(`arrival:${ally.id}`,ally.x+(ally.w||48)/2,feet,t,1,ally.type!=='dragon');continue;}
      const preferred=`${ally.type==='clone'?'allied-clone':ally.type}-${Math.floor(t*8)%4}`,base=`${ally.type==='clone'?'allied-clone':ally.type}-0`,key=this.textures.exists(preferred)?preferred:this.textures.exists(base)?base:'shade-0';
      let sprite=this.allySprites.get(ally.id);if(!sprite){sprite=this.add.sprite(0,0,key).setDepth(8);this.allySprites.set(ally.id,sprite);}
      const dragon=ally.type==='dragon';sprite.setTexture(key).setVisible(true).setOrigin(.5,dragon?.5:ally.type==='wolf'?60/64:ally.type==='clone'?68/72:76/80).setPosition(ally.x+(ally.w||48)/2,dragon?ally.y+(ally.h||56)/2:feet).setFlipX(ally.facing<0).setAlpha(Math.min(1,ally.life||1)).setTint(0xffffff);
      if(world.enemySummons.includes(ally)){
        const family=ally.type==='wispknight'?'wispknight':ally.type==='mage'?'caster':ally.type==='drone'?'dragon':'stalker';
        this.setReference(sprite,this.motionKey(family,ally,ally.attackTime>0?'attack':'walk'),ally);
      }
      if(['raven','wolf','dragon','clone'].includes(ally.type))this.setReference(sprite,companionFrame(ally),ally);
    }
    for(const portal of world.enemyPortals||[]){if(near(portal)&&portal.phase==='warning')this.drawPortal(`enemy:${portal.id}`,portal.x+15,portal.y+44,t,1,true);}
  }
  flames(g,x,y,w,h,t){
    for(let dx=10;dx<w;dx+=24){const id=`fire:${x}:${dx}`;let view=this.referenceEffects.get(id);if(!view){view=this.add.image(0,0,'lantern-fx','flame-0');this.referenceEffects.set(id,view);}
      view.setTexture('lantern-fx',`flame-${Math.floor(t*13+dx)%4}`).setPosition(x+dx,y+h).setOrigin(.5,.1).setDisplaySize(42,h*1.2).setRotation(Math.PI).setDepth(12).setAlpha(.9).setVisible(true);}
  }
  drawHazards(g,t,near){
    for(const sprite of this.trapSprites.values())sprite.setVisible(false);
    for(const h of [...LEVEL.hazards,...world.dynamicHazards]){if(!near(h))continue;const state=hazardState(h,world.time);
      if(h.type==='laser'){for(const y of [h.y-16,h.y+h.h-2]){g.fillStyle(0x172331);g.fillRect(h.x-14,y,40,20);g.lineStyle(2,0x60717c);g.strokeRect(h.x-14,y,40,20);g.fillStyle(state==='warning'?C.copper:state==='active'?C.red:0x55566f);g.fillRect(h.x-5,y+6,22,7);for(let x=h.x-12;x<h.x+24;x+=10){g.fillStyle(0xd5aa6a);g.fillRect(x,y+2,4,2);}}const beam={x0:h.x+h.w/2,y0:h.y,x1:h.x+h.w/2,y1:h.y+h.h,width:Math.max(3,h.w-2),tint:C.red};if(state==='active')this.drawBeam(g,beam,t);else if(state==='warning')this.drawBeam(g,beam,t,true);}
      else if(h.type==='fire'){g.fillStyle(0x543526);g.fillRect(h.x,h.y+h.h-5,h.w,5);if(state==='active')this.flames(g,h.x,h.y,h.w,h.h,t);}
      else if(h.type==='steam'){
        const center=h.x+h.w/2,base=h.y+h.h;
        this.materialView(`emitter:${h.id}`,'ln-fx-emitter',center,base-22,64,47,4);
        this.materialView(`cap:${h.id}`,'ln-fx-emitter-cap',center,h.y-26,42,26,4);
        if(state==='warning'||state==='active'){
          const active=state==='active';g.fillStyle(0x8bdaca,active?.18:.05);g.fillRect(h.x,h.y,h.w,h.h);
          g.lineStyle(active?2:1,active?0xe7fff0:0xc9b77d,active?.9:.45);g.beginPath();g.moveTo(center,h.y);
          for(let y=h.y+8;y<base;y+=8)g.lineTo(center+(active?Math.sin(y*.42+t*35)*Math.min(h.w*.36,8):0),y);
          g.lineTo(center,base);g.strokePath();
          if(active){g.lineStyle(1,0x8bdaca,.6);for(let j=0;j<4;j++){const y=h.y+(t*170+j*h.h/4)%h.h;g.lineBetween(center,y,h.x+(j%2?h.w:0),y+12);}}
        }
      }
      else if(h.type==='emp'){g.fillStyle(0x735ba9,.22);g.fillRect(h.x,h.y,h.w,h.h);if(state==='active'){g.lineStyle(2,0xc29bdf,.75);g.beginPath();g.moveTo(h.x,h.y+6);for(let x=h.x+8;x<h.x+h.w;x+=8)g.lineTo(x,h.y+5+Math.sin(x+t*13)*4);g.strokePath();}}
      else if(h.type==='spikes'){const frame=state==='off'?0:state==='warning'?1:2+Math.floor(t*8)%2,key=`spike-trap-${frame}`;for(let x=h.x;x<h.x+h.w;x+=80){const id=`${h.id}:${x}`;let sprite=this.trapSprites.get(id);if(!sprite&&this.textures.exists(key)){sprite=this.add.image(x+40,h.y+h.h,key).setOrigin(.5,60/64).setDepth(3);this.trapSprites.set(id,sprite);}sprite?.setTexture(key).setVisible(true).setDisplaySize(Math.min(80,h.x+h.w-x),state==='off'?14:48);}}
    }
  }
  drawEffects(g,dt,t){
    for(const p of this.particles){if(p.life<=0)continue;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy+=270*dt;p.rotation+=p.spin*dt;const perspective=140/(140+Math.max(-70,p.z)),size=p.size*perspective;g.fillStyle(p.tint,Math.min(1,p.life*2));if(p.debris){const a=p.rotation,x=p.x,y=p.y;g.fillTriangle(x+Math.cos(a)*size,y+Math.sin(a)*size,x+Math.cos(a+2.1)*size,y+Math.sin(a+2.1)*size,x+Math.cos(a+4.2)*size,y+Math.sin(a+4.2)*size);g.fillStyle(0x100c19,.5);g.fillTriangle(x,y,x+Math.cos(a+2.1)*size,y+Math.sin(a+2.1)*size,x+Math.cos(a+4.2)*size,y+Math.sin(a+4.2)*size);}else g.fillRect(Math.round(p.x),Math.round(p.y),size,size);}
    for(const ring of this.rings){ring.life-=dt;const age=.7-ring.life;g.lineStyle(2,ring.tint,Math.max(0,ring.life));for(let i=0;i<6;i++){const x=ring.x+(i-2.5)*18,y=ring.y-age*90+Math.sin(i)*10;g.lineBetween(x,y,x+(i%2?5:-5),y-12);}}this.rings=this.rings.filter(r=>r.life>0);
  }
  drawAtmosphere(dt,t,biome){
    const a=this.atmosphere;a.clear();const warm=['furnace','reactor'].includes(biome),storm=biome==='storm';
    for(const f of this.weather){f.y=(f.y+dt*f.speed*(warm?-1:storm?3:1)+540)%540;f.x=(f.x+dt*(8+f.speed*.3)+960)%960;const x=(f.x-this.cameraX*.18%960+960)%960;a.fillStyle(warm?0xffaa72:biome==='eclipse'?0xc4a3e8:0xd1ded5,f.size===2?.32:.16);if(storm)a.fillRect(x,f.y,1,9);else a.fillRect(Math.floor(x),Math.floor(f.y),f.size,f.size);}
    this.light.clear();
    a.fillStyle(0x090611,.16);a.fillRect(0,0,960,12);a.fillRect(0,this.viewportH-12,960,12);
    const threat=world.activeBoss;
    if(threat&&!threat.dead){
      const z=this.cameras.main.zoom,left=this.cameraX+480-480/z,top=this.cameraY+this.viewportH/2-this.viewportH/(2*z);
      const sx=(threat.x+threat.w/2-left)*z,sy=(threat.y+threat.h/2-top)*z;
      if(sx<22||sx>938||sy<22||sy>this.viewportH-22){
        const ex=Math.max(24,Math.min(936,sx)),ey=Math.max(28,Math.min(this.viewportH-26,sy)),x=(ex-480)/z+480,y=(ey-this.viewportH/2)/z+this.viewportH/2;
        const angle=Math.atan2(sy-ey,sx-ex),r=10/z;a.fillStyle(0xf0787e,.8);a.fillTriangle(x+Math.cos(angle)*r,y+Math.sin(angle)*r,x+Math.cos(angle+2.4)*r,y+Math.sin(angle+2.4)*r,x+Math.cos(angle-2.4)*r,y+Math.sin(angle-2.4)*r);
        a.lineStyle(1,0xf4c1ac,.7);a.strokeCircle(x,y,15/z);
      }
    }
    if(this.flash>0&&!reducedFX){a.fillStyle(C.red,this.flash*.3);a.fillRect(0,0,960,this.viewportH);}
    if(storm&&!reducedFX&&Math.sin(t*1.3)>0.998){a.fillStyle(0xcdd9ea,.08);a.fillRect(0,0,960,this.viewportH);}
  }
}

function updateHUD(){
  const p=world.player,zone=[...LEVEL.zones].reverse().find(z=>p.x>=z.x)||LEVEL.zones[0],boss=(world.activeBoss&&!world.activeBoss.dead?world.activeBoss:null)||world.enemies.find(e=>e.major&&!e.dead&&Math.abs(e.x-p.x)<750&&Math.abs(e.y+e.h-p.y-p.h)<240);
  $('health-bar').style.width=`${p.hp/p.maxHp*100}%`;$('fuel-bar').style.width=`${p.fuel}%`;$('health-value').textContent=Math.ceil(p.hp);$('fuel-value').textContent=Math.ceil(p.fuel);
  $('buff').textContent=p.stealth>0?`SHADOW VEIL / ${p.stealth.toFixed(1)}s`:p.boost>0?`THRUSTER SURGE / ${p.boost.toFixed(1)}s`:p.impaired>0?'EMP / THRUST OFFLINE':p.rapid>0?`OVERDRIVE / ${Math.ceil(p.rapid)}s`:p.shield>0?`SOUL SHIELD / ${Math.ceil(p.shield)}`:p.dashCooldown>0?'DASH RECHARGING':`${catalog.DIFFICULTIES.find(d=>d.id===world.difficulty)?.name||'Forge'} / DASH READY`;
  $('zone-label').textContent=zone.label;$('timer').textContent=clock(world.time);const missingRune=['ember-heart','tide-glass','storm-seal'].find(id=>!world.collections.includes(id));$('objective').textContent=boss&&!boss.dead?`READ THE WINDUP · STRIKE THE RECOVERY`:missingRune?`FIND ${itemName('relic',missingRune).toUpperCase()}`:world.bossDefeated?'ENTER THE HEART PORTAL':'THREE STONES · REACH THE HEART';
  if(world.worldId==='soulforge'&&(!boss||boss.dead)){
    const room=LEVEL.rooms.find(r=>p.x>=r.x&&p.x<r.x+r.w);
    $('objective').textContent=room?.kind==='refuge'&&!world.progress.claimed.includes('npc:soulforge-mira')?'SPEAK TO MIRA AT THE LANTERN':world.bossDefeated?'ENTER THE HEART PORTAL':room?.kind==='refuge'?'FOLLOW THE ROOTS TO THE NEXT LANTERN':zone.subtitle;
  }
  $('boss-hud').hidden=!['playing','story'].includes(mode)||!boss||boss.dead;
  if(boss){$('boss-bar').style.width=`${boss.hp/boss.maxHp*100}%`;$('boss-name').textContent=boss.name;$('boss-subtitle').textContent=boss.phase==='transform'?'THE EMBER WYRM AWAKENS':(boss.recovering||boss.attackPhase==='recovery')?'OPEN · STRIKE NOW':(boss.guarding||['lift','downswing'].includes(boss.attackPhase))?({slam:'SLAM · JUMP CLEAR',cleave:'BLADE · KEEP YOUR DISTANCE',charge:'CHARGE · EVADE',breath:'FLAME · LEAVE ITS PATH',cinder:'CINDERS · KEEP MOVING',summon:'SPIRITS GATHER'}[boss.attackKind]||'GUARDING · EVADE'):boss.visualFamily==='wyrm'?'EMBER WYRM':boss.weakened>0?'CORE EXPOSED':boss.shield>0?'SOUL WARD':boss.enraged?'ENRAGED':boss.type==='bellbeast'?'THE SLEEPING BELL':boss.type==='hex'?'CINDER MATRIARCH':'SANCTUARY GUARDIAN';}
  let text=world.dialogueTime>0?world.dialogue:'';
  if(boss?.tauntTime>0)text=`${boss.name} // ${boss.taunt}`;
  if(!text&&mode==='playing'){const npc=world.npcs.find(n=>Math.abs(n.x-p.x)<140&&Math.abs(n.y-p.y)<110),lever=world.props.find(n=>['lever','valve','conduit'].includes(n.type)&&Math.abs(n.x-p.x)<120),prompt=matchMedia('(pointer: coarse)').matches?'◉':'F / INTERACT';if(npc)text=`${prompt} · ${npc.name}`;else if(lever)text=`${prompt} · ${lever.type==='valve'?'VENT THE FURNACE':lever.type==='conduit'?'SEVER THE SHIELD':'RELEASE SOUL GATE'}`;}
  $('dialogue').hidden=mode!=='playing'||!text;$('dialogue').textContent=text;$('progress').firstElementChild.style.width=`${Math.min(100,p.x/LEVEL.exit.x*100)}%`;
  ui?.renderHUD(world);if(world.missileWarning&&scene){const area=$('game').clientHeight/$('stage').clientHeight;$('missile-warning').style.top=`${Math.max(8,Math.min(area*90,(world.missileWarning.y-scene.cameras.main.worldView.y)/scene.cameras.main.worldView.height*area*100))}%`;}if(mode==='story')ui.renderStory(world.story);
  if(mode==='playing'&&zone.label!==previousZone){previousZone=zone.label;say(world,`${zone.label} // ${zone.subtitle}`,3);}
}
function continueStory(choice){
  advanceStory(world,choice);saveProgress(world.progress);ui.renderStory(world.story);controls.clear();
  if(!world.story)beginPlay();
}
function showMenu(next){
  mode=next;controls.clear();saveProgress(world.progress);$('stage').dataset.mode=mode;$('menu').hidden=false;$('hud').hidden=true;$('progress').hidden=true;$('touch').hidden=true;$('pause').disabled=true;$('menu-stamp').hidden=true;
  ui?.renderStory(null);const map={paused:['A MOMENT BY THE LANTERN','Rest a<br><span>moment.</span>','Your journey waits here. Tend your equipment, then carry the light onward.','Resume journey'],dead:['THE LIGHT STILL REMAINS',world.timeLeft<=0?'The bell<br><span>fell silent.</span>':'Rise<br><span>again.</span>','Return to your last lantern. Your discoveries and recovered relics remain.','Return to the lantern'],won:['THE SANCTUARY BREATHES AGAIN','A dawn<br><span>unbound.</span>',`${clock(world.time)} · ${world.kills} foes overcome · ${retries} retries<br>${world.progress.claimed.includes('npc:soulforge-orren')?'Mira’s brother can return home.':'The captive souls are free.'} The engine has fallen silent.`, 'Journey again']};
  const info=mode==='menu'?['RUNEHEART · CHAPTER I','The Last<br><span>Lantern</span>','Mira’s brother is trapped inside the sanctuary.<br>Recover three lost runes. Break the engine’s hold.','Enter the sanctuary']:map[mode];if(info){$('menu-eyebrow').textContent=info[0];$('menu-title').innerHTML=info[1];$('menu-copy').innerHTML=info[2];$('start').innerHTML=`${info[3]} <span aria-hidden="true">→</span>`;$('menu-detail').textContent=mode==='dead'?`LAST LANTERN · ${LEVEL.checkpoints[world.checkpoint]?.label}`:mode==='menu'?'A light worth keeping.':'THE HOLLOW SANCTUARY';}
  $('start').focus({preventScroll:true});
}
function beginPlay(){
  mode=world.story?'story':'playing';$('stage').dataset.mode=mode;const touch=matchMedia('(pointer: coarse)').matches;$('stage').dataset.touch=String(touch);$('menu').hidden=true;$('hud').hidden=false;$('progress').hidden=false;$('pause').disabled=false;$('touch').hidden=mode!=='playing'||!touch;controls.clear();scene.accumulator=0;scene.previousPlayer={x:world.player.x,y:world.player.y};sound.start().catch(()=>{});ui?.renderStory(world.story);if(mode==='playing')scene.game.canvas.focus({preventScroll:true});
}
function start(){
  if(!scene)return;if(mode==='dead'){retry();return;}
  if(mode==='menu'||mode==='won'){
    const selected=$('world-select')?.value||world.worldId||'soulforge';let progress=switchWorldProgress(loadProgress(),selected);
    if(progress.completedWorlds.includes(selected))progress=restartWorldProgress(progress,selected);
    world=createWorld(progress.checkpoint||0,{worldId:selected,difficulty:$('difficulty').value,progress});LEVEL=world.level||DEFAULT_LEVEL;retries=0;previousZone='';scene.cameraX=Math.max(0,world.player.x-250);scene.cameraY=LEVEL.height-scene.viewportH;
  }
  beginPlay();
}
function pause(force=false){if(mode==='playing'||mode==='story')showMenu('paused');else if(mode==='paused'&&!force)beginPlay();}
function retry(){if(!scene||mode==='menu'||mode==='catalogue')return;world=retryWorld(world);LEVEL=world.level||DEFAULT_LEVEL;retries++;previousZone='';scene.cameraX=Math.max(0,world.player.x-250);scene.cameraY=LEVEL.height-scene.viewportH;scene.particles.forEach(p=>p.life=0);scene.rings.length=0;beginPlay();}
window.ashBack=()=>{if($('settings-panel').open){$('settings-panel').close();return true;}if($('controls').open){$('controls').open=false;$('controls').querySelector('summary').focus();return true;}if($('catalogue').open){ui.close();return true;}if(['playing','story','paused'].includes(mode)){pause();return true;}return false;};
$('start').addEventListener('click',start);$('pause').addEventListener('click',()=>pause());
document.addEventListener('click',event=>{if(event.target.closest('#worlds'))showMenu(['playing','story','paused'].includes(mode)?'paused':'menu');});
 const paintSound=()=>{$('sound').textContent=sound.muted?'Sound muted':'Sound on';$('sound').setAttribute('aria-pressed',String(sound.muted));};paintSound();
 $('sound').addEventListener('click',()=>{sound.setMuted(!sound.muted);paintSound();try{localStorage.setItem('runeheart-muted',String(sound.muted));}catch{}sound.start().catch(()=>{});});
 const settingsPanel=$('settings-panel');let settingsFocus;
 for(const [id,apply] of [['music-volume',value=>sound.setMusicVolume(value)],['sfx-volume',value=>sound.setSfxVolume(value)]]){
   const slider=$(id),key=`runeheart-${id}`;
   try{const saved=localStorage.getItem(key);if(saved!==null)slider.value=saved;}catch{}
   const update=()=>{const value=Math.max(0,Math.min(100,Number(slider.value)||0));slider.value=String(value);$(id+'-value').textContent=`${value}%`;apply(value/100);try{localStorage.setItem(key,String(value));}catch{}};
   slider.addEventListener('input',update);update();
 }
 const openSettings=()=>{if(mode==='playing'||mode==='story')pause();controls.clear();settingsFocus=document.activeElement;$('settings-close').textContent=mode==='paused'?'Back to pause':'Back to the lantern';settingsPanel.showModal();$('settings-close').focus();};
 $('touch').addEventListener('open-settings',openSettings);$('settings').addEventListener('click',openSettings);$('menu-settings').addEventListener('click',openSettings);
 $('settings-close').addEventListener('click',()=>settingsPanel.close());
 settingsPanel.addEventListener('close',()=>{controls.clear();settingsFocus?.focus?.({preventScroll:true});});
const paintMotion=()=>{$('motion').setAttribute('aria-pressed',String(reducedFX));$('motion').textContent=reducedFX?'Effects reduced':'Effects full';};paintMotion();$('motion').addEventListener('click',()=>{reducedFX=!reducedFX;sound.setReducedFX(reducedFX);paintMotion();try{localStorage.setItem('runeheart-reduced-fx',String(reducedFX));}catch{}});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{$('footer-status').textContent='FULLSCREEN IS MANAGED BY THIS DEVICE';}});
new Phaser.Game({type:Phaser.AUTO,width:960,height:viewportHeight(),parent:'game',backgroundColor:'#171322',pixelArt:false,roundPixels:false,antialias:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Soulforge],audio:{noAudio:true},render:{powerPreference:'low-power'},fps:{target:60,smoothStep:true}});
