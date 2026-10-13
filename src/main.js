import Phaser from 'phaser';
import './style.css';
import { LEVEL as DEFAULT_LEVEL, WORLD_LIST } from './level.js';
import { createArtTextures, WORLD_ART } from './art.js';
import { preloadReferenceArt, createReferenceArt } from './reference-art.js';
import { createWorld, stepWorld, retryWorld, equipItem, advanceStory, hazardState, say, weaponOrigin, STEP } from './combat.js';
import * as catalog from './catalog.js';
import { loadProgress, saveProgress, restartWorldProgress, switchWorldProgress } from './progress.js';
import { createCampaignUI } from './ui.js';
import { Controls } from './input.js';
import { Sound } from './audio.js';

const $=id=>document.getElementById(id), sound=new Sound();
let scene,ui,mode='menu',returnMode='menu',retries=0,previousZone='';
let reducedFX=matchMedia('(prefers-reduced-motion: reduce)').matches;
sound.setReducedFX(reducedFX);
let world=createWorld(0,{difficulty:'forge',progress:loadProgress()});
let LEVEL=world.level||DEFAULT_LEVEL;
const C={light:0xe7f5ff,copper:0xf4b04f,cyan:0x45caff,red:0xf36377,violet:0xbd75ff};
const clock=seconds=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const viewportHeight=()=>{const box=$('game').getBoundingClientRect();return matchMedia('(pointer: coarse)').matches?Math.max(280,Math.min(540,Math.round(960*box.height/Math.max(1,box.width)))):540;};
const controls=new Controls($('touch'),pause,retry,()=>{if(mode==='menu'||mode==='paused'||mode==='dead'||mode==='won')start();});
const itemName=(category,id)=>catalog.CATALOG[category]?.find(item=>item.id===id)?.name||id;

class Soulforge extends Phaser.Scene {
  constructor(){super('soulforge');}
  preload(){preloadReferenceArt(this);}
  create(){
    scene=this;this.viewportH=this.scale.height;this.referenceArt=createReferenceArt(this);this.manifest=createArtTextures(this);this.accumulator=0;this.visualTime=0;this.cameraX=0;this.cameraY=LEVEL.height-this.viewportH;this.shake=0;this.flash=0;this.impact=0;this.rings=[];
    this.particles=Array.from({length:320},()=>({life:0}));this.enemySprites=new Map();this.bossSprites=new Map();this.propSprites=new Map();this.pickupSprites=new Map();this.pickupLabels=new Map();this.npcSprites=new Map();this.weaponSprites=new Map();this.shieldSprites=new Map();this.allySprites=new Map();this.portalSprites=new Map();this.projectileSprites=[];this.trapSprites=new Map();this.iconCache=new Map();this.staticViews=[];this.lastAlarm=-1;
    this.cameras.main.setBounds(0,0,LEVEL.width,LEVEL.height);this.buildReferenceBackgrounds();
    this.far=this.add.tileSprite(0,0,960,this.viewportH,'reference-far-forest').setOrigin(0).setScrollFactor(0).setDepth(-10).setTileScale(2);
    this.mid=this.add.tileSprite(0,0,960,this.viewportH,'reference-mid-forest').setOrigin(0).setScrollFactor(0).setDepth(-8).setTileScale(2);
    this.buildEnvironment();
    this.playerSprite=this.add.sprite(112,606,'player-idle-0').setOrigin(.5,68/72).setDepth(10);this.referenceEffects=new Map();this.deathViews=new Map();
    this.light=this.add.graphics().setDepth(5);this.relayGraphics=this.add.graphics().setDepth(3);this.dynamic=this.add.graphics().setDepth(12);this.atmosphere=this.add.graphics().setDepth(30).setScrollFactor(0);
    this.weather=Array.from({length:80},(_,i)=>({x:i*137%960,y:i*83%540,speed:15+(i%6)*6,size:i%3===0?2:1}));
    this.previousPlayer={x:world.player.x,y:world.player.y};
    this.viewportObserver=new ResizeObserver(()=>{const height=viewportHeight();if(height===this.viewportH)return;this.viewportH=height;this.scale.setGameSize(960,height);this.cameras.main.setViewport(0,0,960,height);this.far.setSize(960,height);this.mid.setSize(960,height);this.cameraY=Math.min(this.cameraY,LEVEL.height-height);});this.viewportObserver.observe($('game'));this.events.once('shutdown',()=>this.viewportObserver.disconnect());
    this.input.keyboard?.removeAllKeys();this.game.canvas.tabIndex=0;this.game.canvas.setAttribute('aria-label','Ash Signal Aether Revamp. See field manual for keyboard, gamepad and touch controls.');
    ui=createCampaignUI(catalog,{
      iconUrl:key=>this.iconUrl(key),onEquip:(category,id)=>{equipItem(world,category,id);saveProgress(world.progress);},
      onOpen:()=>{returnMode=mode;mode='catalogue';controls.clear();$('touch').hidden=true;},
      onClose:()=>{mode=returnMode;if(mode==='playing'||mode==='story')beginPlay();},
      onStoryNext:()=>continueStory(),onStoryChoice:id=>continueStory(id),
    });
    ui.renderHUD(world);$('start').disabled=false;
    const selection=$('world-select');if(selection){selection.replaceChildren(...WORLD_LIST.map(realm=>{const option=document.createElement('option');option.value=realm.id;option.textContent=realm.name;return option;}));selection.value=world.worldId||'soulforge';}
    if(import.meta.env.DEV)window.__ASH={scene:this,controls,get world(){return world;},get mode(){return mode;},get LEVEL(){return LEVEL;},start,retry,pause,stepWorld,createWorld,retryWorld,equipItem,advanceStory,weaponOrigin,catalog,ui,WORLD_LIST,
      setWorld(value){world=value;LEVEL=value.level||DEFAULT_LEVEL;scene.previousPlayer={x:value.player.x,y:value.player.y};},render(){scene.update(0,0);}};
  }
  iconUrl(key){
    const portraits={'portrait-mira':'ref-face-villager','portrait-orren':'ref-face-mage','portrait-vesper':'ref-face-scientist','portrait-ysra':'ref-face-healer'},reference=portraits[key]||key;
    if(this.referenceArt.frames[reference]){
      if(!this.iconCache.has(reference)){const frame=this.textures.get(this.referenceArt.atlasKey).get(reference),canvas=document.createElement('canvas');canvas.width=frame.cutWidth;canvas.height=frame.cutHeight;canvas.getContext('2d').drawImage(frame.source.image,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,frame.cutWidth,frame.cutHeight);this.iconCache.set(reference,canvas.toDataURL());}
      return this.iconCache.get(reference);
    }
    if(!this.textures.exists(key))return '';
    if(!this.iconCache.has(key))this.iconCache.set(key,this.textures.get(key).getSourceImage().toDataURL());
    return this.iconCache.get(key);
  }
  referenceKey(animation,time=this.visualTime,rate=9){const frames=this.referenceArt.animations[animation];return Array.isArray(frames)&&frames.length?frames[Math.floor(time*rate)%frames.length]:null;}
  setReference(sprite,key,entity){
    const meta=this.referenceArt.frames[key];if(!meta)return false;
    const body=meta.body||{x:meta.anchor.x-entity.w/2,y:meta.anchor.y-entity.h,w:entity.w,h:entity.h},scale=entity.h/body.h,facing=entity.facing||1;
    const x=entity.x+entity.w/2-facing*(body.x+body.w/2-meta.anchor.x)*scale,y=entity.y+entity.h-(body.y+body.h-meta.anchor.y)*scale;
    // Phaser mirrors noncentral origins too; mirror the anchor to keep anatomy on the body.
    const originX=(facing<0?meta.width-meta.anchor.x:meta.anchor.x)/meta.width;
    sprite.setTexture(this.referenceArt.atlasKey,key).setOrigin(originX,meta.anchor.y/meta.height).setScale(scale).setPosition(Math.round(x),Math.round(y)).setFlipX(facing<0);return true;
  }
  referenceEffect(id,key,x,y,w,h,rotation=0,facing=1){
    if(!this.referenceArt.frames[key])return;let sprite=this.referenceEffects.get(id);if(!sprite){sprite=this.add.image(0,0,this.referenceArt.atlasKey,key).setDepth(13);this.referenceEffects.set(id,sprite);}
    sprite.setTexture(this.referenceArt.atlasKey,key).setVisible(true).setOrigin(.5).setPosition(x,y).setDisplaySize(w,h).setRotation(rotation).setFlipX(facing<0).setAlpha(.85);
  }
  referenceDeath(sprite,entity){
    const family={riftcrawler:'crawler',hexwing:'raider',crimsonmecha:'mecha',wyrm:'wyrm'}[entity.visualFamily],frames=this.referenceArt.animations[`${family}-death`];if(!sprite||!frames?.length)return;
    if(!this.deathViews.has(entity.id))this.deathViews.set(entity.id,this.visualTime);const elapsed=this.visualTime-this.deathViews.get(entity.id);if(elapsed>=.6)return;
    this.setReference(sprite,frames[Math.min(frames.length-1,Math.floor(elapsed*10))],entity);sprite.setVisible(true).setTint(0xffffff).setAlpha(1-elapsed/.6);
  }
  buildReferenceBackgrounds(){
    const settings={forest:['forest-wide','tree','#183a36','#071c22'],islands:['islands-wide','arch','#638fae','#172b50'],castle:['castle-wide','pillar','#2b244d','#100e29'],sky:['sky-wide','statue','#568fad','#173157'],crystal:['cavern-wide','crystal','#252352','#080e23']};
    for(const [name,[scenic,decor,top,bottom]]of Object.entries(settings))for(const layer of ['far','mid']){
      const key=`reference-${layer}-${name}`,texture=this.textures.createCanvas(key,480,360),ctx=texture.getContext();ctx.imageSmoothingEnabled=false;
      const draw=(frameName,x,y,scale)=>{const frame=this.textures.get(this.referenceArt.atlasKey).get(frameName);if(!this.referenceArt.frames[frameName])return;ctx.drawImage(frame.source.image,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,x,y,frame.cutWidth*scale,frame.cutHeight*scale);};
      if(layer==='far'){const gradient=ctx.createLinearGradient(0,0,0,360);gradient.addColorStop(0,top);gradient.addColorStop(1,bottom);ctx.fillStyle=gradient;ctx.fillRect(0,0,480,360);const meta=this.referenceArt.frames[`ref-bg-${scenic}`];if(meta){const scale=Math.min(1,480/meta.width),width=meta.width*scale;ctx.globalAlpha=.85;for(let x=0;x<480;x+=width)draw(`ref-bg-${scenic}`,x,132,scale);ctx.globalAlpha=1;const fade=ctx.createLinearGradient(0,132,0,142);fade.addColorStop(0,top);fade.addColorStop(1,'transparent');ctx.fillStyle=fade;ctx.fillRect(0,132,480,10);}}
      else{ctx.globalAlpha=.42;for(let i=0;i<7;i++){const meta=this.referenceArt.frames[`ref-prop-${decor}`];if(meta)draw(`ref-prop-${decor}`,i*78.5-12,262.5-meta.height*.8,.8);}ctx.globalAlpha=1;}
      texture.refresh();this.manifest.push({key,width:480,height:360,anchor:{x:0,y:0},notes:'Parallax composition from extracted reference artwork; generated once at boot.'});
    }
  }
  buildEnvironment(){
    LEVEL=world.level||DEFAULT_LEVEL;this.renderedWorldId=world.worldId||'soulforge';
    this.deathViews?.clear();
    for(const item of this.staticViews)item.view.destroy();this.staticViews.length=0;
    for(const map of [this.enemySprites,this.bossSprites,this.propSprites,this.pickupSprites,this.pickupLabels,this.npcSprites,this.weaponSprites,this.shieldSprites,this.allySprites,this.portalSprites,this.trapSprites]){for(const view of map.values())view.destroy();map.clear();}
    this.cameras.main.setBounds(0,0,LEVEL.width,LEVEL.height);
    const theme=WORLD_ART[this.renderedWorldId]||{},rim={soulforge:0xe5d4bd,tide:0xa4e8de,pyre:0xffbb74,neon:0x9ae6ff,veil:0xe4b6fa}[this.renderedWorldId]||0xe5d4bd;
    for(const s of LEVEL.solids){
      const localTheme=[...LEVEL.zones].reverse().find(z=>s.x>=z.x)?.theme||LEVEL.theme||{foreground:'grass'},surface=localTheme.foreground;
      const material=s.kind==='wall'?surface==='crystal'?'cave-wall':'ruins':surface==='grass'?'dirt':surface==='crystal'?'cave':surface;
      const referenceTile=`ref-tile-${material}`,view=this.referenceArt.frames[referenceTile]?this.add.tileSprite(s.x,s.y,s.w,s.h,this.referenceArt.atlasKey,referenceTile):this.add.tileSprite(s.x,s.y,s.w,s.h,'tile-steel');view.setOrigin(0).setDepth(0);
      this.staticViews.push({view,x:s.x,w:s.w,solidId:s.id});
      const edge=this.add.graphics().setDepth(1);edge.fillStyle(0x060912,.95);edge.fillRect(s.x,s.y+s.h-4,s.w,6);edge.fillStyle(rim,.95);edge.fillRect(s.x,s.y,s.w,4);edge.fillStyle(0xffffff,.2);edge.fillRect(s.x,s.y+4,s.w,2);for(let x=s.x+7;x<s.x+s.w-5;x+=40){edge.fillStyle(rim,.45);edge.fillRect(x,s.y+8,9,2);}this.staticViews.push({view:edge,x:s.x,w:s.w,solidId:s.id});
      const topFrame=s.kind==='platform'?'ref-prop-platform':surface==='grass'?'ref-tile-grass':null;if(topFrame&&this.referenceArt.frames[topFrame]){const top=this.add.tileSprite(s.x,s.y-3,s.w,Math.min(24,s.h+3),this.referenceArt.atlasKey,topFrame).setOrigin(0).setDepth(2);this.staticViews.push({view:top,x:s.x,w:s.w,solidId:s.id});}
      if(s.h<35){const supports=this.add.graphics().setDepth(-1);supports.lineStyle(3,0x5c6167,.7);supports.lineBetween(s.x+12,s.y+s.h,s.x+12,s.y+s.h+40);supports.lineBetween(s.x+s.w-16,s.y+s.h,s.x+s.w-16,s.y+s.h+40);this.staticViews.push({view:supports,x:s.x,w:s.w});}
    }
    for(let x=200;x<LEVEL.width;x+=920){
      const floor=LEVEL.solids.find(s=>s.kind==='ground'&&x>=s.x&&x<=s.x+s.w-80);if(!floor)continue;
      const localTheme=[...LEVEL.zones].reverse().find(z=>x>=z.x)?.theme||LEVEL.theme||{scene:'forest'},decor={forest:'tree',islands:'arch',castle:'pillar',sky:'statue',crystal:'crystal'}[localTheme.scene]||'tree';
      for(const [key,dx,height]of[[`ref-prop-${decor}`,0,0],['ref-prop-torch',190,0]]){
        if(!this.referenceArt.frames[key])continue;
        const view=this.add.image(x+dx,floor.y-height,this.referenceArt.atlasKey,key).setOrigin(.5,1).setDepth(-2).setAlpha(.65).setScale(1.35);this.staticViews.push({view,x:x+dx-80,w:160});
      }
    }
    LEVEL.zones.forEach((z,i)=>{
      const title=this.add.text(z.x+70,355,`0${i+1}  /  ${z.label}`,{fontFamily:'Bahnschrift,Arial',fontSize:'25px',color:'#d7d1c5'}).setAlpha(.22).setDepth(-1);this.staticViews.push({view:title,x:z.x,w:1000});
    });
    LEVEL.guides?.forEach(h=>{const view=this.add.text(h.x,h.y,h.text,{fontFamily:'Bahnschrift,Arial',fontSize:'10px',color:'#e2d7c4',backgroundColor:'#161422',padding:{x:8,y:5}}).setOrigin(.5).setAlpha(.7).setDepth(3);this.staticViews.push({view,x:h.x-200,w:400});});
    const e=LEVEL.exit,exit=this.add.image(e.x+e.w/2,e.y+e.h,'gate').setOrigin(.5,190/192).setDisplaySize(70,100).setDepth(3);this.staticViews.push({view:exit,x:e.x,w:100});
    const exitTitle=this.add.text(e.x+e.w/2,e.y-40,'REALM SEVERANCE',{fontFamily:'Bahnschrift,Arial',fontSize:'10px',color:'#e7d4ee'}).setOrigin(.5);this.staticViews.push({view:exitTitle,x:e.x-100,w:200});
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
    const big=['explode','destroy','death','nova','cannon'].includes(type),magic=['spell','thunder','cinder','eclipse','nova','cannon'].includes(type);
    this.burst(e.x??world.player.x+world.player.w/2,e.y??world.player.y+20,type,big?28:magic?30:type==='shot'?3:8,e.tint);
    if(big){this.shake=Math.min(1,this.shake+.4);this.impact=.28;}
    if(e.type==='hurt'){this.shake=Math.min(1,this.shake+.2);this.flash=.15;this.heroHurtUntil=this.visualTime+.18;}
    if(magic){this.rings.push({x:e.x??world.player.x+world.player.w/2,y:e.y??world.player.y+20,life:.7,tint:e.tint||C.violet,spell:e.spell||e.type});if(this.rings.length>8)this.rings.shift();this.impact=.45;this.shake=.6;}
    if(['pickup','summonarrival','portal','shieldbreak'].includes(e.type)){this.rings.push({x:e.x??world.player.x+world.player.w/2,y:e.y??world.player.y+20,life:.7,tint:e.type==='shieldbreak'?C.red:C.cyan,spell:e.type});if(this.rings.length>8)this.rings.shift();}
    if(['bossstart','bossdead'].includes(e.type)){this.cinematic={x:e.x,time:1.2};this.impact=.55;}
    if(['pickup','checkpoint','debris','bossdead','storyreward','gate','spell','cannon','equip','win'].includes(e.type))saveProgress(world.progress);
  }
  update(_,milliseconds){
    const dt=Math.min(milliseconds/1000,.05);this.visualTime+=dt;
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
    this.drawWorld(dt);updateHUD();
  }
  drawWorld(dt){
    if(this.renderedWorldId!==(world.worldId||'soulforge'))this.buildEnvironment();
    if(this.presentationWorld!==world){this.deathViews.clear();this.presentationWorld=world;}
    for(const sprite of this.referenceEffects.values())sprite.setVisible(false);
    const p=world.player,t=this.visualTime,alpha=mode==='playing'?Math.min(1,this.accumulator/STEP):1;
    const px=Phaser.Math.Linear(this.previousPlayer.x,p.x,alpha),py=Phaser.Math.Linear(this.previousPlayer.y,p.y,alpha);
    const zone=[...LEVEL.zones].reverse().find(z=>p.x>=z.x)||LEVEL.zones[0],biome=zone.biome||'snow';
    const scenic=zone.theme?.scene||LEVEL.theme?.scene||'forest',far=`reference-far-${scenic}`,mid=`reference-mid-${scenic}`;
    if(this.biome!==`${world.worldId}:${biome}`){this.biome=`${world.worldId}:${biome}`;if(this.textures.exists(far))this.far.setTexture(far);if(this.textures.exists(mid))this.mid.setTexture(mid);}
    let focus=px+p.w/2+p.facing*45;
    if(world.activeBoss&&!world.activeBoss.dead&&Math.abs(world.activeBoss.x-p.x)<650)focus=px*.6+world.activeBoss.x*.4+24;
    if(this.cinematic?.time>0&&Math.abs(this.cinematic.x-px)<650)focus=px*.7+this.cinematic.x*.3;
    if(mode==='story'){const npc=world.npcs.find(n=>n.id===world.story?.npcId);if(npc)focus=(px+npc.x)/2;}
    const targetX=Phaser.Math.Clamp(focus-300,0,LEVEL.width-960),targetY=Phaser.Math.Clamp(py-this.viewportH*.58,0,LEVEL.height-this.viewportH);
    this.cameraX=Phaser.Math.Linear(this.cameraX,targetX,1-Math.exp(-dt*6));this.cameraY=Phaser.Math.Linear(this.cameraY,targetY,1-Math.exp(-dt*5));
    const dramatic=world.activeBoss?.phase==='charge'&&Math.abs(world.activeBoss.x-p.x)<600;
    const shake=reducedFX?0:this.shake*this.shake*7,zoom=reducedFX?1:mode==='story'?1.07:this.cinematic?.time>0?1.08:dramatic?1.035:1+this.impact*.09;
    this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom,zoom,1-Math.exp(-dt*8)));
    this.cameras.main.setScroll(Math.round(this.cameraX+Math.sin(t*47)*shake),Math.round(this.cameraY+Math.sin(t*61)*shake));
    this.far.tilePositionX=Math.round(this.cameraX*.06);this.far.tilePositionY=Math.round(this.cameraY*.1);this.mid.tilePositionX=Math.round(this.cameraX*.215);this.mid.tilePositionY=Math.round(this.cameraY*.35+25);
    const missing=new Set((world.staticSolids||[]).filter(s=>s.missing).map(s=>s.id));
    for(const item of this.staticViews)item.view.setVisible(!missing.has(item.solidId)&&item.x+item.w>this.cameraX-200&&item.x<this.cameraX+1160);
    const heroActive=p.hp>0&&world.status==='playing',slashing=heroActive&&p.slashTime>0,slashFrame=Math.min(3,Math.max(0,Math.floor((.22-p.slashTime)/.055))),pose=p.slashMode==='vertical'?'overhead':p.slashMode==='finisher'?'finisher':'horizontal';
    const candidate=p.dashTime>0?`player-lunge-${Math.floor(t*20)%4}`:slashing?`player-slash-${pose}-${slashFrame}`:p.shootCooldown>0&&this.textures.exists('player-shoot-0')?'player-shoot-0':p.state==='run'?`player-run-${Math.floor(t*13)%8}`:p.grounded?`player-idle-${Math.floor(t*3)%4}`:p.vy<0?'player-jump-0':'player-fall-0';
    const frame=this.textures.exists(candidate)?candidate:slashing?`player-slash-${slashFrame}`:'player-idle-0';
    const heroAnimation=p.hp<=0?'aether-death':this.heroHurtUntil>t?'aether-hurt':p.dashTime>0?'aether-dash':p.jetActive?'aether-jet':slashing||p.shootCooldown>0?'aether-fire':p.state==='run'?'aether-run':p.grounded?'aether-idle':p.vy>=0?'aether-fall':p.jumps===0?'aether-doublejump':'aether-jump';
    const heroFrames=this.referenceArt.animations[heroAnimation],heroKey=p.hp<=0?heroFrames?.at(-1):this.referenceKey(heroAnimation,t,p.state==='run'?12:slashing?15:8);
    if(!this.setReference(this.playerSprite,heroKey||this.referenceKey('aether-idle'),{...p,x:px,y:py}))this.playerSprite.setTexture(frame).setOrigin(.5,slashing||p.dashTime>0?152/160:68/72).setScale(1).setPosition(Math.round(px+p.w/2),Math.round(py+p.h)).setFlipX(p.facing<0);
    const armor=catalog.ARMORS.find(a=>a.id===p.armor),opacity=!heroActive?1:p.stealth>0?.3:p.invincible>0&&Math.floor(t*16)%2===0?.45:1;
    this.playerSprite.setAlpha(opacity).setTint(p.impaired>0?0x89899e:p.armor==='courier'?0xffffff:armor?.tint||0xffffff);
    const near=e=>e.x+(e.w||100)>this.cameraX-160&&e.x<this.cameraX+1120;
    for(const sprite of this.enemySprites.values())sprite.setVisible(false);
    for(const e of world.enemies){
      if(!near(e))continue;if(e.dead){this.referenceDeath(this.enemySprites.get(e.id),e);continue;}let sprite=this.enemySprites.get(e.id);const cast=e.windup>0||e.beamTime>0||e.phase==='attack',skin=e.skin||e.type,newKey=`${skin}-${cast?'cast':'idle'}-${Math.floor(t*7)%4}`,key=this.textures.exists(newKey)?newKey:e.type==='turret'?'turret-0':`${e.type}-${Math.floor(t*(e.type==='drone'?9:6))%4}`;
      if(!sprite){sprite=this.add.sprite(0,0,key).setDepth(8);this.enemySprites.set(e.id,sprite);}
      const origin=skin==='witch'||skin==='wizard'?92/96:e.type==='drone'?.5:['mage','shade','sentinel'].includes(e.type)?76/80:54/56;
      sprite.setTexture(key).setVisible(true).setOrigin(.5,origin).setPosition(Math.round(e.x+e.w/2),Math.round(e.y+(e.type==='drone'?e.h/2:e.h))).setFlipX(e.facing<0).setTint(e.flash>0?0xffe2b6:e.slow>0||e.weakened>0?0x9ed9c8:0xffffff).setAlpha(e.type==='shade'&&e.hidden?.2:1);
      const family={riftcrawler:'crawler',hexwing:'raider',crimsonmecha:'mecha'}[e.visualFamily],action=e.flash>0?'hurt':cast?['raider','mecha'].includes(family)?'fire':'attack':Math.abs(e.vx||0)>10?e.type==='drone'?'fly':'walk':'idle';if(family)this.setReference(sprite,this.referenceKey(`${family}-${action}`)||this.referenceKey(`${family}-idle`),e);
    }
    for(const sprite of this.bossSprites.values())sprite.setVisible(false);
    for(const b of world.bosses){
      if(!near(b))continue;if(b.dead){this.referenceDeath(this.bossSprites.get(b.id),b);continue;}let sprite=this.bossSprites.get(b.id);const state=b.flash>0?'hurt':['charge','attack'].includes(b.phase)?'attack':Math.abs(b.vx||0)>20?'run':'idle',candidate=`boss-${b.skin||b.type}-${state}-${Math.floor(t*7)%4}`,pose=`boss-${b.type}-${state}-${Math.floor(t*7)%4}`,key=this.textures.exists(candidate)?candidate:this.textures.exists(pose)?pose:`boss-${b.type}-${Math.floor(t*4)%4}`;
      if(!sprite){sprite=this.add.sprite(0,0,key).setDepth(9);this.bossSprites.set(b.id,sprite);}
      sprite.setTexture(key).setOrigin(.5,b.type==='warden'?138/144:184/192).setPosition(Math.round(b.x+b.w/2),Math.round(b.y+b.h)).setFlipX(b.facing<0).setVisible(true).setTint(b.flash>0?0xffd1b2:b.enraged?0xffbca3:b.weakened>0?0xbbebec:0xffffff);
      if(b.visualFamily==='wyrm'||b.visualFamily==='crimsonmecha'){const family=b.visualFamily==='wyrm'?'wyrm':'mecha',action=b.flash>0?'hurt':b.phase==='attack'||b.phase==='charge'?'fire':family==='wyrm'?'fly':Math.abs(b.vx||0)>10?'walk':'idle';this.setReference(sprite,this.referenceKey(`${family}-${action}`)||this.referenceKey(`${family}-idle`),b);}
      if(b.phase==='transform')this.referenceEffect(`awakening:${b.id}`,'ref-fx-teleport-0',b.x+b.w/2,b.y+b.h/2,b.w+80,b.h+80);
    }
    for(const item of world.pickups){
      let sprite=this.pickupSprites.get(item.id),label=this.pickupLabels.get(item.id);if(item.taken||!near(item)){sprite?.setVisible(false);label?.setVisible(false);continue;}
      const animation=`pickup-${item.type}-${Math.floor(t*6)%4}`,key=this.textures.exists(animation)?animation:this.textures.exists(`pickup-${item.type}`)?`pickup-${item.type}`:'pickup-mana';
      if(!sprite){sprite=this.add.image(item.x,item.y,key).setDepth(7);this.pickupSprites.set(item.id,sprite);}
      sprite.setTexture(key).setVisible(true).setPosition(item.x,item.y+Math.sin(t*3+item.x)*4);
      const itemFrame={health:'health-potion',mana:'mana-potion',fuel:'jetpack',boost:'jetpack',rapid:'dash',shield:'shield',spell:'scroll',treasure:'crystal',cannon:'mana',nova:'crystal',weapon:'key',sword:'key',armor:'shield'}[item.type],referenceItem=`ref-item-${itemFrame}`;if(this.referenceArt.frames[referenceItem])sprite.setTexture(this.referenceArt.atlasKey,referenceItem).setDisplaySize(40,40);
      if(!label){const category={weapon:'gun',sword:'sword',armor:'armor',spell:'spell',treasure:'relic'}[item.type],name=category?itemName(category,item.itemId):{health:'Trauma Serum',fuel:'Thruster Cell',rapid:'Weapon Overdrive',shield:'Soul Shield',boost:'Jet Booster',mana:'Resonance Vial',cannon:'Oblivion Charge',nova:'Eclipse Charge'}[item.type]||item.type;label=this.add.text(item.x,item.y-34,name,{fontFamily:'Bahnschrift,Arial',fontSize:'10px',color:'#eee1cf',backgroundColor:'#151021',padding:{x:6,y:3}}).setOrigin(.5).setDepth(8);this.pickupLabels.set(item.id,label);}
      label.setVisible(Math.abs(item.x-p.x)<240);
    }
    for(const prop of world.props){
      let sprite=this.propSprites.get(prop.id);if(prop.dead||prop.destroyed||!near(prop)){sprite?.setVisible(false);continue;}
      if(!sprite){sprite=this.add.image(0,0,this.textures.exists(prop.type)?prop.type:'crate').setDepth(4);this.propSprites.set(prop.id,sprite);}
      sprite.setVisible(true).setDisplaySize(prop.w,prop.h).setPosition(prop.x+prop.w/2,prop.y+prop.h/2).setTint(prop.flash>0?0xffd4b3:0xffffff);
      if(prop.type==='cache'&&this.referenceArt.frames['ref-prop-chest'])sprite.setTexture(this.referenceArt.atlasKey,'ref-prop-chest').setDisplaySize(prop.w+18,prop.h+4);
    }
    for(const npc of world.npcs){
      let sprite=this.npcSprites.get(npc.id);if(!near(npc)){sprite?.setVisible(false);continue;}
      const raw=npc.skin||npc.id,caster=['wizard','witch'].includes(raw),skin=caster?raw:raw.startsWith('npc-')?raw:`npc-${raw}`,pose=`${skin}-${caster?'idle-':''}${Math.floor(t*3)%4}`,key=this.textures.exists(pose)?pose:this.textures.exists(skin)?skin:'npc-mira';
      if(!sprite){sprite=this.add.sprite(npc.x+14,npc.y+46,key).setOrigin(.5,76/80).setDepth(7);this.npcSprites.set(npc.id,sprite);}
      sprite.setTexture(key).setOrigin(.5,caster?92/96:76/80).setVisible(true).setFlipX(p.x<npc.x);
      const friendly=caster?raw==='witch'?'healer':'mage':raw.includes('orren')?'mage':raw.includes('vesper')?'scientist':'villager';this.setReference(sprite,`ref-npc-${friendly}`,{...npc,w:28,h:64,y:npc.y+46-64,facing:p.x<npc.x?-1:1});
    }
    const g=this.dynamic;g.clear();this.drawHazards(g,t,near);
    for(const map of [this.weaponSprites,this.shieldSprites,this.allySprites,this.portalSprites])for(const sprite of map.values())sprite.setVisible(false);
    this.drawEnvironmentMotion(g,t,near);
    for(const gate of world.gates){if(gate.open||!near(gate))continue;g.fillStyle(0x201c32,.9);g.fillRect(gate.x,gate.y,gate.w,gate.h);g.lineStyle(3,0xb776c7,.8);g.strokeRect(gate.x,gate.y,gate.w,gate.h);for(let y=gate.y+12;y<gate.y+gate.h;y+=24){g.fillStyle(0xe799cb,.35);g.fillRect(gate.x+6,y,gate.w-12,3);}}
    const relay=this.relayGraphics;relay.clear();
    LEVEL.checkpoints.forEach((cp,i)=>{if(!near(cp))return;const x=cp.x+12,y=cp.y+46;relay.fillStyle(0x302737);relay.fillRect(x-9,y-54,18,54);relay.fillStyle(i<=world.checkpoint?0xe4cfad:0x706b78);relay.fillRect(x-4,y-47,8,12);if(i<=world.checkpoint){relay.lineStyle(1,0xe4cfad,.25);relay.strokeCircle(x,y-41,14+Math.sin(t*2)*3);}});
    for(const enemy of [...world.enemies,...world.bosses]){
      if(enemy.dead||!near(enemy))continue;
      if(enemy.windup>0){g.fillStyle(C.red,.25);g.fillRect(enemy.x,enemy.y-10,enemy.w,3);g.fillStyle(C.red);g.fillRect(enemy.x,enemy.y-10,enemy.w*Math.min(1,enemy.windup/.48),3);}
      if(enemy.burn>0)this.flames(g,enemy.x,enemy.y+enemy.h-24,enemy.w,26,t);
      if(enemy.shield>0)this.drawShield(enemy.id,enemy.x+enemy.w/2,enemy.y+enemy.h/2,enemy.w+32,enemy.h+26,t,C.violet);
      if(enemy.beam)this.drawBeam(g,enemy.beam,t,false);
      else if((enemy.phase==='charge'||enemy.windup>0)&&enemy.telegraph)this.drawBeam(g,enemy.telegraph,t,true);
      const magic=['mage','hex','shade','sentinel'].includes(enemy.type)||['riftcrawler','wyrm','crimsonmecha','hexwing'].includes(enemy.visualFamily),slot=enemy.weaponSlot||(enemy.type==='hex'?'hand':enemy.attack===2&&enemy.active?'core':enemy.type==='turret'||enemy.power==='missile'||enemy.attack===1&&enemy.active?'rocket':'gun');
      if(!magic||slot==='rocket')this.drawWeapon(enemy,slot,slot==='rocket'?'launcher':'carbine',enemy.aimAngle??enemy.telegraph?.angle,t);
      else if(enemy.windup>0||enemy.phase==='charge'){const hand=weaponOrigin(enemy,slot);g.lineStyle(2,enemy.type==='sentinel'?C.cyan:C.violet,.8);g.strokeCircle(hand.x,hand.y,9+Math.sin(t*24)*3);g.fillStyle(C.light,.8);g.fillCircle(hand.x,hand.y,3);}
      if(enemy.active){const core=weaponOrigin(enemy,'core');g.lineStyle(2,enemy.weakened>0?C.cyan:enemy.enraged?C.red:C.violet,.55);g.strokeCircle(core.x,core.y,7+Math.sin(t*6)*2);}
      if(enemy.portalExit?.time>0){this.drawPortal(`blink-source:${enemy.id}`,enemy.portalSource.x+enemy.w/2,enemy.portalSource.y+enemy.h/2,t,.7,false);this.drawPortal(`blink-exit:${enemy.id}`,enemy.portalExit.x+enemy.w/2,enemy.portalExit.y+enemy.h/2,t,1,false);}
      if(enemy.mirrorExit?.time>0)this.drawPortal(`mirror:${enemy.id}`,enemy.mirrorExit.x+15,enemy.mirrorExit.y+44,t,1,true);
      if(enemy.powerPulse?.time>0){const pulse=enemy.powerPulse;g.fillStyle(C.cyan,pulse.phase==='warning'?.06:.16);g.fillRect(pulse.x,pulse.y,pulse.w,pulse.h);g.lineStyle(2,C.cyan,pulse.phase==='warning'?.35:.7);for(let i=0;i<9;i++){const x=pulse.x+(i*71+t*Math.abs(pulse.vx||90))%pulse.w,y=pulse.y+pulse.h/2+Math.sin(t*4+i)*12,dir=Math.sign(pulse.vx||1);g.lineBetween(x,y,x-dir*13,y-5);g.lineBetween(x,y,x-dir*13,y+5);}}
    }
    this.projectileSprites.forEach(sprite=>sprite.setVisible(false));
    for(let index=0;index<world.projectiles.length;index++){
      const shot=world.projectiles[index];if(!shot.active||!near(shot))continue;const tint=shot.tint||(shot.owner==='player'?C.copper:C.red),kind=shot.missile?'rocket':shot.kind==='dragonfire'?'fire':shot.kind==='ally'?'rail':['rail','scatter','fire','hex'].includes(shot.kind)?shot.kind:'carbine',key=`projectile-${kind}`,angle=Math.atan2(shot.vy,shot.vx);
      g.lineStyle(shot.missile?5:kind==='rail'?3:1,tint,.3);g.lineBetween(shot.x-shot.vx*.04,shot.y-shot.vy*.04,shot.x,shot.y);
      if(this.textures.exists(key)){let sprite=this.projectileSprites[index];if(!sprite){sprite=this.add.image(0,0,key).setDepth(13);this.projectileSprites[index]=sprite;}sprite.setTexture(key).setVisible(true).setPosition(shot.x,shot.y).setRotation(angle).setDisplaySize(shot.missile?34:kind==='rail'?38:kind==='scatter'?14:22,shot.missile?17:kind==='fire'||kind==='hex'?14:8).setTint(shot.heavy?0xff9582:0xffffff);}
      const referenceShot=shot.missile?null:shot.owner==='player'?kind==='rail'?'ref-fx-bolt':kind==='fire'?'ref-fx-fire':kind==='scatter'?'ref-fx-star':'ref-fx-shot':kind==='fire'?'ref-fx-fire':'ref-fx-enemy-bolt';if(referenceShot&&this.referenceArt.frames[referenceShot])this.projectileSprites[index]?.setTexture(this.referenceArt.atlasKey,referenceShot).setDisplaySize(kind==='rail'?40:kind==='fire'?32:kind==='scatter'?14:24,kind==='rail'?12:kind==='scatter'?14:20);
      else{g.lineStyle(shot.missile?7:3,tint);g.lineBetween(shot.x-Math.cos(angle)*12,shot.y-Math.sin(angle)*12,shot.x,shot.y);}
      if(shot.missile){const tailX=shot.x-Math.cos(angle)*16,tailY=shot.y-Math.sin(angle)*16;g.fillStyle(0xffa572,.8);g.fillEllipse(tailX,tailY,8+Math.sin(t*50)*3,7);if(Math.random()<.18)this.burst(tailX,tailY,'shot',1,0xdca684);}
    }
    if(world.missileWarning){g.lineStyle(1,C.red,.25+Math.sin(t*15)*.15);g.lineBetween(this.cameraX,world.missileWarning.y,this.cameraX+960,world.missileWarning.y);g.fillStyle(C.red,.7);g.fillTriangle(this.cameraX+924,world.missileWarning.y,this.cameraX+947,world.missileWarning.y-10,this.cameraX+947,world.missileWarning.y+10);}
    const sword=catalog.SWORDS.find(s=>s.id===p.sword),bladeTint=sword?.tint||C.light;
    if(slashing){
      const swing=Math.max(0,Math.min(1,(.2-p.slashTime)/.2)),horizontal=p.slashMode==='horizontal',finisher=p.slashMode==='finisher';
      const cut=p.slashBox||{x:p.x+3,y:p.y+p.h-68,w:110,h:72},cx=cut.x+(px-p.x)+cut.w/2,cy=cut.y+(py-p.y)+cut.h/2;
      for(const [width,tint,opacity]of[[13,bladeTint,.22],[6,bladeTint,.8],[2,C.light,1]]){
        g.lineStyle(width,tint,opacity);g.beginPath();for(let i=0;i<=16;i++){const progress=Math.max(0,swing-.5)+i/16*Math.min(.5,swing),angle=-1.7+progress*3.25,x=cx+p.facing*Math.cos(angle)*Math.max(8,cut.w/2-7),y=cy+Math.sin(angle)*Math.max(8,cut.h/2-7);i?g.lineTo(x,y):g.moveTo(x,y);}g.strokePath();
      }
      this.referenceEffect('hero-cut','ref-fx-attack-3',cx,cy,horizontal?cut.h:cut.w,horizontal?cut.w:cut.h,horizontal?Math.PI/2:finisher?-.4:0,p.facing);
    }
    const beam=p.beam||p.laserBeam;if(heroActive&&p.laserTime>0&&beam)this.drawBeam(g,beam,t,false);
    if(heroActive&&!slashing&&p.dashTime<=0)this.drawWeapon({...p,x:px,y:py},'gun',p.gun==='rocket'?'launcher':p.gun,p.aimAngle??(p.aimUp?-Math.PI/2:p.facing<0?Math.PI:0),t,'hero');
    if(heroActive&&p.jetActive){this.referenceEffect('hero-jet','ref-fx-jet-0',px+p.w/2-p.facing*9,py+p.h+8,36,54);if(Math.random()<.3)this.burst(px+p.w/2-p.facing*9,py+p.h,'shot',2,C.cyan);}
    if(heroActive&&p.dashTime>0){this.referenceEffect('hero-dash','ref-fx-dash-0',px+p.w/2-p.facing*38,py+p.h*.45,118,62,0,p.facing);for(let i=1;i<=3;i++){g.lineStyle(2,bladeTint,.3/i);g.lineBetween(px-p.facing*i*15,py+p.h*.45,px+p.facing*(74-i*8),py+18);}g.lineStyle(5,bladeTint,.8);g.lineBetween(px+p.w/2,py+p.h*.4,px+p.w/2+p.facing*96,py+16);}
    if(heroActive&&p.burn>0)this.flames(g,px-4,py+18,p.w+8,30,t);
    if(heroActive&&p.armor==='bulwark'){g.fillStyle(0x88949f);g.fillRect(px-6,py+10,9,11);g.fillRect(px+19,py+10,9,11);g.fillStyle(0xd4d9da);g.fillRect(px-5,py+10,7,2);g.fillRect(px+20,py+10,7,2);}
    if(heroActive&&p.armor==='wraith'){g.lineStyle(1,0xceabed,.65);g.strokeEllipse(px+p.w/2,py+p.h/2,37,55);}
    if(heroActive&&p.shield>0)this.drawShield('hero',px+p.w/2,py+p.h/2,60,78,t,C.cyan);
    if(heroActive&&(p.rapid>0||p.boost>0)){g.lineStyle(2,p.boost>0?C.violet:C.cyan,.3);for(let i=0;i<4;i++){const a=t*4+i*Math.PI/2;g.strokeCircle(px+p.w/2+Math.cos(a)*24,py+p.h*.4+Math.sin(a)*34,3);}}
    if(heroActive&&p.stealth>0){g.fillStyle(C.violet,.07);g.fillEllipse(px+p.w/2,py+p.h/2,60,80);}
    this.drawSummons(g,t,near);
    this.drawEffects(g,dt,t);this.drawAtmosphere(dt,t,biome);
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
    const key=`shield-${Math.floor(t*12)%4}`;if(!this.textures.exists(key))return;let sprite=this.shieldSprites.get(id);
    if(!sprite){sprite=this.add.image(x,y,key).setDepth(14);this.shieldSprites.set(id,sprite);}
    sprite.setTexture(key).setVisible(true).setPosition(x,y).setDisplaySize(w,h).setTint(tint).setAlpha(.52+Math.sin(t*8)*.15);if(this.referenceArt.frames['ref-fx-shield-0'])sprite.setTexture(this.referenceArt.atlasKey,'ref-fx-shield-0').setDisplaySize(w,h);
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
  drawEnvironmentMotion(g,t,near){
    for(const s of world.movingPlatforms||[]){if(!near(s))continue;this.referenceEffect(`moving:${s.id}`,'ref-prop-platform-moving',s.x+s.w/2,s.y+s.h/2,s.w,s.h);this.referenceEffects.get(`moving:${s.id}`)?.setDepth(2);g.fillStyle(0xb5e6de);g.fillRect(s.x,s.y,s.w,3);}
    for(const current of LEVEL.currents||[]){if(!near(current))continue;g.fillStyle(0x468eac,.13);g.fillRect(current.x,current.y,current.w,current.h);g.lineStyle(1,0xa9e4ed,.25);for(let i=0;i<6;i++){const x=current.x+(i*73+t*(current.vx||35))%current.w,y=current.y+current.h*(i+1)/7;g.lineBetween(x,y,x+Math.sign(current.vx||1)*25,y+Math.sin(t*3+i)*4);}}
    if(world.worldId==='tide'){const y=655;g.fillStyle(0x164858,.65);g.fillRect(this.cameraX,y,1000,65);g.lineStyle(2,0x9ee4d5,.55);g.beginPath();for(let i=0;i<=64;i++){const x=this.cameraX+i*16,wave=Math.sin(x*.016-t*2.4)*6+Math.sin(x*.033+t*1.2)*3;i?g.lineTo(x,y+wave):g.moveTo(x,y+wave);}g.strokePath();}
    for(const s of world.staticSolids||[]){if(!near(s)||!s.crack||s.missing)continue;g.lineStyle(2,C.red,.9);for(let i=0;i<4;i++)g.lineBetween(s.x+s.w*i/4,s.y,s.x+s.w*(i+.7)/4,s.y+s.h);}
    for(const portal of LEVEL.portals||[]){if(near(portal))this.drawPortal(`travel:${portal.id}`,portal.x+portal.w/2,portal.y+portal.h/2,t,1,false);}
  }
  drawPortal(id,x,y,t,opacity=1,ground=false){
    const key=`summon-${ground?'circle':'portal'}-${Math.floor(t*10)%4}`;if(!this.textures.exists(key))return;let sprite=this.portalSprites.get(id);
    if(!sprite){sprite=this.add.image(x,y,key).setDepth(ground?6:12);this.portalSprites.set(id,sprite);}
    sprite.setTexture(key).setVisible(true).setPosition(x,y).setDisplaySize(ground?116:86,ground?36:110).setAlpha(opacity).setRotation(ground?0:Math.sin(t)*.04);
  }
  drawSummons(g,t,near){
    for(const ally of [...(world.allies||[]),...(world.enemySummons||[])]){
      if(ally.dead||!near(ally))continue;const feet=ally.y+(ally.h||56),arriving=ally.phase==='arrive';
      if(arriving){this.drawPortal(`arrival:${ally.id}`,ally.x+(ally.w||48)/2,feet,t,1,ally.type!=='dragon');continue;}
      const preferred=`${ally.type==='clone'?'allied-clone':ally.type}-${Math.floor(t*8)%4}`,base=`${ally.type==='clone'?'allied-clone':ally.type}-0`,key=this.textures.exists(preferred)?preferred:this.textures.exists(base)?base:'shade-0';
      let sprite=this.allySprites.get(ally.id);if(!sprite){sprite=this.add.sprite(0,0,key).setDepth(8);this.allySprites.set(ally.id,sprite);}
      const dragon=ally.type==='dragon';sprite.setTexture(key).setVisible(true).setOrigin(.5,dragon?.5:ally.type==='wolf'?60/64:ally.type==='clone'?68/72:76/80).setPosition(ally.x+(ally.w||48)/2,dragon?ally.y+(ally.h||56)/2:feet).setFlipX(ally.facing<0).setAlpha(Math.min(1,ally.life||1)).setTint(ally.owner==='enemy'?0xffaaa9:0xbbf4f0);
      if(ally.type==='clone')this.setReference(sprite,this.referenceKey('aether-fire',t,10),{...ally,w:ally.w||24,h:ally.h||46});
      g.lineStyle(1,ally.owner==='enemy'?C.red:C.cyan,.5);g.strokeEllipse(ally.x+(ally.w||48)/2,feet+2,ally.w||48,10);
    }
    for(const portal of world.enemyPortals||[]){if(near(portal)&&portal.phase==='warning')this.drawPortal(`enemy:${portal.id}`,portal.x+15,portal.y+44,t,1,true);}
  }
  flames(g,x,y,w,h,t){for(let dx=0;dx<w;dx+=7){const rise=h*.6+Math.sin(t*15+dx)*h*.3;g.fillStyle(0xfe705c,.7);g.fillRect(x+dx,y+h-rise,6,rise);g.fillStyle(0xffd390);g.fillRect(x+dx+2,y+h-rise*.5,2,rise*.5);}}
  drawHazards(g,t,near){
    for(const sprite of this.trapSprites.values())sprite.setVisible(false);
    for(const h of [...LEVEL.hazards,...world.dynamicHazards]){if(!near(h))continue;const state=hazardState(h,world.time);
      if(h.type==='laser'){for(const y of [h.y-16,h.y+h.h-2]){g.fillStyle(0x172331);g.fillRect(h.x-14,y,40,20);g.lineStyle(2,0x60717c);g.strokeRect(h.x-14,y,40,20);g.fillStyle(state==='warning'?C.copper:state==='active'?C.red:0x55566f);g.fillRect(h.x-5,y+6,22,7);for(let x=h.x-12;x<h.x+24;x+=10){g.fillStyle(0xd5aa6a);g.fillRect(x,y+2,4,2);}}const beam={x0:h.x+h.w/2,y0:h.y,x1:h.x+h.w/2,y1:h.y+h.h,width:Math.max(3,h.w-2),tint:C.red};if(state==='active')this.drawBeam(g,beam,t);else if(state==='warning')this.drawBeam(g,beam,t,true);}
      else if(h.type==='fire'){g.fillStyle(0x543526);g.fillRect(h.x,h.y+h.h-5,h.w,5);if(state==='active')this.flames(g,h.x,h.y,h.w,h.h,t);}
      else if(h.type==='steam'){g.fillStyle(0x3f5961);g.fillRect(h.x,h.y+h.h-6,h.w,6);if(state==='active')for(let i=0;i<7;i++){g.fillStyle(0xd8edf0,.09+i*.015);g.fillEllipse(h.x+h.w/2+Math.sin(t*6+i)*10,h.y+h.h-(t*60+i*19)%h.h,24+i*5,18);}}
      else if(h.type==='emp'){g.fillStyle(0x735ba9,.22);g.fillRect(h.x,h.y,h.w,h.h);if(state==='active'){g.lineStyle(2,0xc29bdf,.75);g.beginPath();g.moveTo(h.x,h.y+6);for(let x=h.x+8;x<h.x+h.w;x+=8)g.lineTo(x,h.y+5+Math.sin(x+t*13)*4);g.strokePath();}}
      else if(h.type==='spikes'){const frame=state==='off'?0:state==='warning'?1:2+Math.floor(t*8)%2,key=`spike-trap-${frame}`;for(let x=h.x;x<h.x+h.w;x+=80){const id=`${h.id}:${x}`;let sprite=this.trapSprites.get(id);if(!sprite&&this.textures.exists(key)){sprite=this.add.image(x+40,h.y+h.h,key).setOrigin(.5,60/64).setDepth(3);this.trapSprites.set(id,sprite);}sprite?.setTexture(key).setVisible(true).setDisplaySize(Math.min(80,h.x+h.w-x),state==='off'?14:48);}}
    }
  }
  drawEffects(g,dt,t){
    for(const p of this.particles){if(p.life<=0)continue;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy+=270*dt;p.rotation+=p.spin*dt;const perspective=140/(140+Math.max(-70,p.z)),size=p.size*perspective;g.fillStyle(p.tint,Math.min(1,p.life*2));if(p.debris){const a=p.rotation,x=p.x,y=p.y;g.fillTriangle(x+Math.cos(a)*size,y+Math.sin(a)*size,x+Math.cos(a+2.1)*size,y+Math.sin(a+2.1)*size,x+Math.cos(a+4.2)*size,y+Math.sin(a+4.2)*size);g.fillStyle(0x100c19,.5);g.fillTriangle(x,y,x+Math.cos(a+2.1)*size,y+Math.sin(a+2.1)*size,x+Math.cos(a+4.2)*size,y+Math.sin(a+4.2)*size);}else g.fillRect(Math.round(p.x),Math.round(p.y),size,size);}
    for(const ring of this.rings){ring.life-=dt;const radius=(.7-ring.life)*200;g.lineStyle(3,ring.tint,Math.max(0,ring.life));g.strokeEllipse(ring.x,ring.y,radius*2,radius*.6);if(ring.spell==='thunder'){g.lineStyle(2,0xe9f7ff,ring.life);for(let i=0;i<5;i++){const a=i*Math.PI*2/5+t;g.lineBetween(ring.x+Math.cos(a)*radius*.5,ring.y+Math.sin(a)*radius*.3,ring.x+Math.cos(a+.3)*radius,ring.y+Math.sin(a+.3)*radius*.6);}}}this.rings=this.rings.filter(r=>r.life>0);
  }
  drawAtmosphere(dt,t,biome){
    const a=this.atmosphere;a.clear();const warm=['furnace','reactor'].includes(biome),storm=biome==='storm';
    for(const f of this.weather){f.y=(f.y+dt*f.speed*(warm?-1:storm?3:1)+540)%540;f.x=(f.x+dt*(8+f.speed*.3)+960)%960;const x=(f.x-this.cameraX*.18%960+960)%960;a.fillStyle(warm?0xffaa72:biome==='eclipse'?0xc4a3e8:0xd1ded5,f.size===2?.32:.16);if(storm)a.fillRect(x,f.y,1,9);else a.fillRect(Math.floor(x),Math.floor(f.y),f.size,f.size);}
    this.light.clear();
    a.fillStyle(0x090611,.16);a.fillRect(0,0,960,12);a.fillRect(0,this.viewportH-12,960,12);
    if(this.flash>0&&!reducedFX){a.fillStyle(C.red,this.flash*.3);a.fillRect(0,0,960,this.viewportH);}
    if(storm&&!reducedFX&&Math.sin(t*1.3)>0.998){a.fillStyle(0xcdd9ea,.08);a.fillRect(0,0,960,this.viewportH);}
  }
}

function updateHUD(){
  const p=world.player,zone=[...LEVEL.zones].reverse().find(z=>p.x>=z.x)||LEVEL.zones[0],boss=world.activeBoss;
  $('health-bar').style.width=`${p.hp/p.maxHp*100}%`;$('fuel-bar').style.width=`${p.fuel}%`;$('health-value').textContent=Math.ceil(p.hp);$('fuel-value').textContent=Math.ceil(p.fuel);
  $('buff').textContent=p.stealth>0?`SHADOW VEIL / ${p.stealth.toFixed(1)}s`:p.boost>0?`THRUSTER SURGE / ${p.boost.toFixed(1)}s`:p.impaired>0?'EMP / THRUST OFFLINE':p.rapid>0?`OVERDRIVE / ${Math.ceil(p.rapid)}s`:p.shield>0?`SOUL SHIELD / ${Math.ceil(p.shield)}`:p.dashCooldown>0?'DASH RECHARGING':`${catalog.DIFFICULTIES.find(d=>d.id===world.difficulty)?.name||'Forge'} / DASH READY`;
  $('zone-label').textContent=zone.label;$('timer').textContent=clock(world.time);$('objective').textContent=world.bossDefeated?'UNBIND THE SOUL':boss&&!boss.dead?`DEFEAT ${boss.name.toUpperCase()}`:zone.subtitle;
  $('boss-hud').hidden=!['playing','story'].includes(mode)||!boss||boss.dead;
  if(boss){$('boss-bar').style.width=`${boss.hp/boss.maxHp*100}%`;$('boss-name').textContent=boss.name;$('boss-subtitle').textContent=boss.phase==='transform'?'WYRM AWAKENING':boss.visualFamily==='wyrm'?'AETHER-ROCKET WYRM':boss.weakened>0?'CORE EXPOSED':boss.shield>0?'SOUL SHIELD':boss.enraged?'ENRAGED':boss.type==='hex'?'PORTAL MATRIARCH':'HEAVY ARMAMENT';}
  let text=world.dialogueTime>0?world.dialogue:'';
  if(boss?.tauntTime>0)text=`${boss.name} // ${boss.taunt}`;
  if(!text&&mode==='playing'){const npc=world.npcs.find(n=>Math.abs(n.x-p.x)<140&&Math.abs(n.y-p.y)<110),lever=world.props.find(n=>['lever','valve','conduit'].includes(n.type)&&Math.abs(n.x-p.x)<120),prompt=matchMedia('(pointer: coarse)').matches?'◉':'F / INTERACT';if(npc)text=`${prompt} · ${npc.name}`;else if(lever)text=`${prompt} · ${lever.type==='valve'?'VENT THE FURNACE':lever.type==='conduit'?'SEVER THE SHIELD':'RELEASE SOUL GATE'}`;}
  $('dialogue').hidden=mode!=='playing'||!text;$('dialogue').textContent=text;$('progress').firstElementChild.style.width=`${Math.min(100,p.x/LEVEL.exit.x*100)}%`;
  ui?.renderHUD(world);if(world.missileWarning&&scene){const area=$('game').clientHeight/$('stage').clientHeight;$('missile-warning').style.top=`${Math.max(8,Math.min(area*90,(world.missileWarning.y-scene.cameraY)/scene.viewportH*area*100))}%`;}if(mode==='story')ui.renderStory(world.story);
  if(mode==='playing'&&zone.label!==previousZone){previousZone=zone.label;say(world,`${zone.label} // ${zone.subtitle}`,3);}
}
function continueStory(choice){
  advanceStory(world,choice);saveProgress(world.progress);ui.renderStory(world.story);controls.clear();
  if(!world.story)beginPlay();
}
function showMenu(next){
  mode=next;controls.clear();saveProgress(world.progress);$('stage').dataset.mode=mode;$('menu').hidden=false;$('hud').hidden=true;$('progress').hidden=true;$('touch').hidden=true;$('pause').disabled=true;$('menu-stamp').hidden=true;
  ui?.renderStory(null);const map={paused:['SOUL SIGNAL HELD','PAUSED','The reactor waits only while you do. Ready your loadout.','RESUME CAMPAIGN'],dead:['COURIER SOUL LOST',world.timeLeft<=0?'REACTOR<br>COLLAPSE':'FLATLINE','Return at the last relay. Your recovered relics and discoveries remain.','RECONNECT AT RELAY'],won:['THE SOUL ENGINE IS SILENT','SOUL<br>UNBOUND',`${clock(world.time)} · ${world.kills} threats silenced · ${retries} retries<br>The last soul is free. The Regent has no kingdom.`, 'START A NEW CAMPAIGN']};
  const info=mode==='menu'?['FIVE FRACTURED REALMS','ASH<span>//</span><br>SIGNAL','Choose a realm. Break its oath. Recover the people behind the machinery.','ENTER REALM']:map[mode];if(info){$('menu-eyebrow').textContent=info[0];$('menu-title').innerHTML=info[1];$('menu-copy').innerHTML=info[2];$('start').innerHTML=`${info[3]} <span>↗</span>`;$('menu-detail').textContent=mode==='dead'?`RELAY / ${LEVEL.checkpoints[world.checkpoint]?.label}`:mode==='menu'?'FIVE WORLDS / STEEL, SEA, FIRE AND SORCERY':'ARMORY / COLLECTED GEAR & SORCERY';}
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
window.ashBack=()=>{if($('catalogue').open){ui.close();return true;}if(['playing','story','paused'].includes(mode)){pause();return true;}return false;};
$('start').addEventListener('click',start);$('pause').addEventListener('click',()=>pause());
document.addEventListener('click',event=>{if(event.target.closest('#worlds')){showMenu('menu');if($('world-select'))$('world-select').value=world.worldId||'soulforge';}});
$('sound').addEventListener('click',()=>{sound.setMuted(!sound.muted);$('sound').textContent=sound.muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-pressed',String(sound.muted));sound.start().catch(()=>{});});
$('motion').setAttribute('aria-pressed',String(reducedFX));$('motion').textContent=reducedFX?'FX REDUCED':'FX FULL';$('motion').addEventListener('click',()=>{reducedFX=!reducedFX;sound.setReducedFX(reducedFX);$('motion').textContent=reducedFX?'FX REDUCED':'FX FULL';$('motion').setAttribute('aria-pressed',String(reducedFX));});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{$('footer-status').textContent='FULLSCREEN IS MANAGED BY THIS DEVICE';}});
new Phaser.Game({type:Phaser.AUTO,width:960,height:viewportHeight(),parent:'game',backgroundColor:'#171322',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Soulforge],audio:{noAudio:true},render:{powerPreference:'low-power'},fps:{target:60,smoothStep:true}});
