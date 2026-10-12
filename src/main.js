import Phaser from 'phaser';
import './style.css';
import { LEVEL } from './level.js';
import { createArtTextures } from './art.js';
import { createWorld, stepWorld, retryWorld, equipItem, advanceStory, hazardState, say, STEP } from './combat.js';
import * as catalog from './catalog.js';
import { loadProgress, saveProgress, newCampaignProgress } from './progress.js';
import { createCampaignUI } from './ui.js';
import { Controls } from './input.js';
import { Sound } from './audio.js';

const $=id=>document.getElementById(id), sound=new Sound();
let scene,ui,mode='menu',returnMode='menu',retries=0,previousZone='';
let reducedFX=matchMedia('(prefers-reduced-motion: reduce)').matches;
sound.setReducedFX(reducedFX);
let world=createWorld(0,{difficulty:'forge',progress:loadProgress()});
const C={light:0xf2e5cb,copper:0xd6aa78,cyan:0x86dbce,red:0xf36377,violet:0xc19aff};
const clock=seconds=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const controls=new Controls($('touch'),pause,retry,()=>{if(mode==='menu'||mode==='paused'||mode==='dead'||mode==='won')start();});
const itemName=(category,id)=>catalog.CATALOG[category]?.find(item=>item.id===id)?.name||id;

class Soulforge extends Phaser.Scene {
  constructor(){super('soulforge');}
  create(){
    scene=this;this.manifest=createArtTextures(this);this.accumulator=0;this.visualTime=0;this.cameraX=0;this.cameraY=180;this.shake=0;this.flash=0;this.impact=0;this.rings=[];
    this.particles=Array.from({length:320},()=>({life:0}));this.enemySprites=new Map();this.bossSprites=new Map();this.propSprites=new Map();this.pickupSprites=new Map();this.pickupLabels=new Map();this.npcSprites=new Map();this.iconCache=new Map();this.staticViews=[];this.lastAlarm=-1;
    this.cameras.main.setBounds(0,0,LEVEL.width,LEVEL.height);
    this.far=this.add.tileSprite(0,0,960,540,'background-far-snow').setOrigin(0).setScrollFactor(0).setDepth(-10);
    this.mid=this.add.tileSprite(0,0,960,540,'background-mid-snow').setOrigin(0).setScrollFactor(0).setDepth(-8);
    this.buildEnvironment();
    this.playerSprite=this.add.sprite(112,606,'player-idle-0').setOrigin(.5,68/72).setDepth(10);
    this.light=this.add.graphics().setDepth(5);this.dynamic=this.add.graphics().setDepth(12);this.atmosphere=this.add.graphics().setDepth(30).setScrollFactor(0);
    this.weather=Array.from({length:80},(_,i)=>({x:i*137%960,y:i*83%540,speed:15+(i%6)*6,size:i%3===0?2:1}));
    this.previousPlayer={x:world.player.x,y:world.player.y};
    this.input.keyboard?.removeAllKeys();this.game.canvas.tabIndex=0;this.game.canvas.setAttribute('aria-label','Ash Signal Soulforge. See field manual for keyboard, gamepad and touch controls.');
    ui=createCampaignUI(catalog,{
      iconUrl:key=>this.iconUrl(key),onEquip:(category,id)=>{equipItem(world,category,id);saveProgress(world.progress);},
      onOpen:()=>{returnMode=mode;mode='catalogue';controls.clear();$('touch').hidden=true;},
      onClose:()=>{mode=returnMode;if(mode==='playing'||mode==='story')beginPlay();},
      onStoryNext:()=>continueStory(),onStoryChoice:id=>continueStory(id),
    });
    ui.renderHUD(world);$('start').disabled=false;
    if(import.meta.env.DEV)window.__ASH={scene:this,get world(){return world;},get mode(){return mode;},start,retry,pause,stepWorld,createWorld,retryWorld,equipItem,advanceStory,LEVEL,catalog,ui,
      setWorld(value){world=value;scene.previousPlayer={x:value.player.x,y:value.player.y};},render(){scene.update(0,0);}};
  }
  iconUrl(key){
    if(!this.textures.exists(key))return '';
    if(!this.iconCache.has(key))this.iconCache.set(key,this.textures.get(key).getSourceImage().toDataURL());
    return this.iconCache.get(key);
  }
  buildEnvironment(){
    for(const s of LEVEL.solids){
      const view=this.add.tileSprite(s.x,s.y,s.w,s.h,s.kind==='wall'?'tile-wall':'tile-steel').setOrigin(0).setDepth(0);
      this.staticViews.push({view,x:s.x,w:s.w});
      const top=this.add.rectangle(s.x,s.y,s.w,2,0xc2c8c0,.65).setOrigin(0).setDepth(1);this.staticViews.push({view:top,x:s.x,w:s.w});
      if(s.material==='snow'){const snow=this.add.tileSprite(s.x,s.y-8,s.w,18,'tile-snow').setOrigin(0).setDepth(2);this.staticViews.push({view:snow,x:s.x,w:s.w});}
      if(s.h<35){const supports=this.add.graphics().setDepth(-1);supports.lineStyle(3,0x5c6167,.7);supports.lineBetween(s.x+12,s.y+s.h,s.x+12,s.y+s.h+40);supports.lineBetween(s.x+s.w-16,s.y+s.h,s.x+s.w-16,s.y+s.h+40);this.staticViews.push({view:supports,x:s.x,w:s.w});}
    }
    for(let x=200;x<LEVEL.width;x+=920){
      const floor=LEVEL.solids.find(s=>s.kind==='ground'&&x>=s.x&&x<=s.x+s.w-80);if(!floor)continue;
      for(const [key,dx,height]of[['antenna',0,0],['pipe',190,0],['lamp',330,90]]){
        const view=this.add.image(x+dx,floor.y-height,key).setOrigin(.5,1).setDepth(-2).setAlpha(.45);this.staticViews.push({view,x:x+dx-80,w:160});
      }
    }
    LEVEL.zones.forEach((z,i)=>{
      const title=this.add.text(z.x+70,355,`0${i+1}  /  ${z.label}`,{fontFamily:'Bahnschrift,Arial',fontSize:'25px',color:'#d7d1c5'}).setAlpha(.22).setDepth(-1);this.staticViews.push({view:title,x:z.x,w:1000});
    });
    LEVEL.guides?.forEach(h=>{const view=this.add.text(h.x,h.y,h.text,{fontFamily:'Bahnschrift,Arial',fontSize:'10px',color:'#e2d7c4',backgroundColor:'#161422',padding:{x:8,y:5}}).setOrigin(.5).setAlpha(.7).setDepth(3);this.staticViews.push({view,x:h.x-200,w:400});});
    const e=LEVEL.exit;this.add.image(e.x+e.w/2,e.y+e.h,'gate').setOrigin(.5,190/192).setDisplaySize(70,100).setDepth(3);
    this.add.text(e.x+e.w/2,e.y-40,'UNBIND THE SOUL',{fontFamily:'Bahnschrift,Arial',fontSize:'10px',color:'#e7d4ee'}).setOrigin(.5);
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
    this.burst(e.x??world.player.x+12,e.y??world.player.y+20,type,big?28:magic?30:type==='shot'?3:8,e.tint);
    if(big){this.shake=Math.min(1,this.shake+.4);this.impact=.28;}
    if(e.type==='hurt'){this.shake=Math.min(1,this.shake+.2);this.flash=.15;}
    if(magic){this.rings.push({x:e.x??world.player.x+12,y:e.y??world.player.y+20,life:.7,tint:e.tint||C.violet,spell:e.spell||e.type});if(this.rings.length>8)this.rings.shift();this.impact=.45;this.shake=.6;}
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
    sound.update(mode==='playing',!!world.activeBoss&&!world.activeBoss.dead);
    if(mode==='playing'&&world.timeLeft<60){const second=Math.ceil(world.timeLeft);if(second!==this.lastAlarm){this.lastAlarm=second;if(!reducedFX||second%3===0)sound.play('alarm');}}
    this.drawWorld(dt);updateHUD();
  }
  drawWorld(dt){
    const p=world.player,t=this.visualTime,alpha=mode==='playing'?Math.min(1,this.accumulator/STEP):1;
    const px=Phaser.Math.Linear(this.previousPlayer.x,p.x,alpha),py=Phaser.Math.Linear(this.previousPlayer.y,p.y,alpha);
    const zone=[...LEVEL.zones].reverse().find(z=>p.x>=z.x)||LEVEL.zones[0],biome=zone.biome||'snow';
    if(this.biome!==biome){this.biome=biome;this.far.setTexture(`background-far-${biome}`);this.mid.setTexture(`background-mid-${biome}`);}
    let focus=px+12+p.facing*45;
    if(world.activeBoss&&!world.activeBoss.dead&&Math.abs(world.activeBoss.x-p.x)<650)focus=px*.6+world.activeBoss.x*.4+24;
    if(mode==='story'){const npc=world.npcs.find(n=>n.id===world.story?.npcId);if(npc)focus=(px+npc.x)/2;}
    const targetX=Phaser.Math.Clamp(focus-300,0,LEVEL.width-960),targetY=Phaser.Math.Clamp(py-310,0,180);
    this.cameraX=Phaser.Math.Linear(this.cameraX,targetX,1-Math.exp(-dt*6));this.cameraY=Phaser.Math.Linear(this.cameraY,targetY,1-Math.exp(-dt*5));
    const shake=reducedFX?0:this.shake*this.shake*7,zoom=reducedFX?1:mode==='story'?1.035:1+this.impact*.12;
    this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom,zoom,1-Math.exp(-dt*8)));
    this.cameras.main.setScroll(Math.round(this.cameraX+Math.sin(t*47)*shake),Math.round(this.cameraY+Math.sin(t*61)*shake));
    this.far.tilePositionX=Math.round(this.cameraX*.12);this.far.tilePositionY=Math.round(this.cameraY*.2);this.mid.tilePositionX=Math.round(this.cameraX*.43);this.mid.tilePositionY=Math.round(this.cameraY*.7+50);
    for(const item of this.staticViews)item.view.setVisible(item.x+item.w>this.cameraX-200&&item.x<this.cameraX+1160);
    const slashing=p.slashTime>0,frame=slashing?`player-slash-${Math.min(3,Math.max(0,Math.floor((.22-p.slashTime)/.055)))}`:p.state==='run'?`player-run-${Math.floor(t*13)%8}`:p.grounded?`player-idle-${Math.floor(t*3)%4}`:p.vy<0?'player-jump-0':'player-fall-0';
    this.playerSprite.setTexture(frame).setOrigin(.5,slashing?152/160:68/72).setPosition(Math.round(px+12),Math.round(py+46)).setFlipX(p.facing<0);
    const armor=catalog.ARMORS.find(a=>a.id===p.armor),opacity=p.stealth>0?.3:p.invincible>0&&Math.floor(t*16)%2===0?.45:1;
    this.playerSprite.setAlpha(opacity).setTint(p.impaired>0?0x89899e:p.armor==='courier'?0xffffff:armor?.tint||0xffffff);
    const near=e=>e.x+(e.w||100)>this.cameraX-160&&e.x<this.cameraX+1120;
    for(const sprite of this.enemySprites.values())sprite.setVisible(false);
    for(const e of world.enemies){
      if(e.dead||!near(e))continue;let sprite=this.enemySprites.get(e.id);const key=e.type==='turret'?'turret-0':`${e.type}-${Math.floor(t*(e.type==='drone'?9:6))%4}`;
      if(!sprite){sprite=this.add.sprite(0,0,key).setDepth(8);this.enemySprites.set(e.id,sprite);}
      sprite.setTexture(key).setVisible(true).setOrigin(.5,e.type==='drone'?.5:['mage','shade','sentinel'].includes(e.type)?76/80:54/56).setPosition(Math.round(e.x+e.w/2),Math.round(e.y+(e.type==='drone'?e.h/2:e.h))).setFlipX(e.facing<0).setTint(e.flash>0?0xffe2b6:e.slow>0?0x9ed9c8:0xffffff).setAlpha(e.type==='shade'&&e.hidden?.2:1);
    }
    for(const sprite of this.bossSprites.values())sprite.setVisible(false);
    for(const b of world.bosses){
      if(b.dead||!near(b))continue;let sprite=this.bossSprites.get(b.id);const key=`boss-${b.type}-${Math.floor(t*(b.phase==='charge'?8:3))%4}`;
      if(!sprite){sprite=this.add.sprite(0,0,key).setDepth(9);this.bossSprites.set(b.id,sprite);}
      sprite.setTexture(key).setOrigin(.5,b.type==='warden'?138/144:184/192).setPosition(b.x+b.w/2,b.y+b.h).setFlipX(p.x<b.x).setVisible(true).setTint(b.flash>0?0xffd1b2:b.phase==='charge'?0xff929f:0xffffff);
    }
    for(const item of world.pickups){
      let sprite=this.pickupSprites.get(item.id),label=this.pickupLabels.get(item.id);if(item.taken||!near(item)){sprite?.setVisible(false);label?.setVisible(false);continue;}
      const key=this.textures.exists(`pickup-${item.type}`)?`pickup-${item.type}`:'pickup-mana';
      if(!sprite){sprite=this.add.image(item.x,item.y,key).setDepth(7);this.pickupSprites.set(item.id,sprite);}
      sprite.setVisible(true).setPosition(item.x,item.y+Math.sin(t*3+item.x)*4);
      if(!label){const category={weapon:'gun',sword:'sword',armor:'armor',spell:'spell',treasure:'relic'}[item.type],name=category?itemName(category,item.itemId):{health:'Trauma Serum',fuel:'Thruster Cell',rapid:'Weapon Overdrive',shield:'Soul Shield',boost:'Jet Booster',mana:'Resonance Vial',cannon:'Oblivion Charge',nova:'Eclipse Charge'}[item.type]||item.type;label=this.add.text(item.x,item.y-34,name,{fontFamily:'Bahnschrift,Arial',fontSize:'10px',color:'#eee1cf',backgroundColor:'#151021',padding:{x:6,y:3}}).setOrigin(.5).setDepth(8);this.pickupLabels.set(item.id,label);}
      label.setVisible(Math.abs(item.x-p.x)<240);
    }
    for(const prop of world.props){
      let sprite=this.propSprites.get(prop.id);if(prop.dead||prop.destroyed||!near(prop)){sprite?.setVisible(false);continue;}
      if(!sprite){sprite=this.add.image(0,0,this.textures.exists(prop.type)?prop.type:'crate').setDepth(4);this.propSprites.set(prop.id,sprite);}
      sprite.setVisible(true).setDisplaySize(prop.w,prop.h).setPosition(prop.x+prop.w/2,prop.y+prop.h/2).setTint(prop.flash>0?0xffd4b3:0xffffff);
    }
    for(const npc of world.npcs){
      let sprite=this.npcSprites.get(npc.id);if(!near(npc)){sprite?.setVisible(false);continue;}
      if(!sprite){sprite=this.add.sprite(npc.x+14,npc.y+46,`npc-${npc.id}`).setOrigin(.5,76/80).setDepth(7);this.npcSprites.set(npc.id,sprite);}
      sprite.setVisible(true).setFlipX(p.x<npc.x);
    }
    const g=this.dynamic;g.clear();this.drawHazards(g,t,near);
    for(const gate of world.gates){if(gate.open||!near(gate))continue;g.fillStyle(0x201c32,.9);g.fillRect(gate.x,gate.y,gate.w,gate.h);g.lineStyle(3,0xb776c7,.8);g.strokeRect(gate.x,gate.y,gate.w,gate.h);for(let y=gate.y+12;y<gate.y+gate.h;y+=24){g.fillStyle(0xe799cb,.35);g.fillRect(gate.x+6,y,gate.w-12,3);}}
    LEVEL.checkpoints.forEach((cp,i)=>{if(!near(cp))return;const x=cp.x+12,y=cp.y+46;g.fillStyle(0x302737);g.fillRect(x-9,y-54,18,54);g.fillStyle(i<=world.checkpoint?0xe4cfad:0x706b78);g.fillRect(x-4,y-47,8,12);if(i<=world.checkpoint){g.lineStyle(1,0xe4cfad,.25);g.strokeCircle(x,y-41,14+Math.sin(t*2)*3);}});
    for(const enemy of [...world.enemies,...world.bosses]){
      if(enemy.dead||!near(enemy))continue;
      if(enemy.windup>0){g.fillStyle(C.red,.25);g.fillRect(enemy.x,enemy.y-10,enemy.w,3);g.fillStyle(C.red);g.fillRect(enemy.x,enemy.y-10,enemy.w*Math.min(1,enemy.windup/.48),3);}
      if(enemy.type==='sentinel'&&enemy.windup>0&&Number.isFinite(enemy.aimX)){g.fillStyle(0x82e8ff,.05);g.fillRect(enemy.aimX-12,80,24,530);g.lineStyle(1,0x82e8ff,.55);g.strokeRect(enemy.aimX-12,80,24,530);}
      if(enemy.burn>0)this.flames(g,enemy.x,enemy.y+enemy.h-24,enemy.w,26,t);
      if(enemy.shield>0){g.lineStyle(1,C.violet,.5);g.strokeEllipse(enemy.x+enemy.w/2,enemy.y+enemy.h/2,enemy.w+18,enemy.h+18);}
      if(enemy.beam){const b=enemy.beam,tint=b.tint||C.red;g.fillStyle(tint,.17);g.fillRect(b.x-6,b.y-8,b.w+12,b.h+16);g.fillStyle(tint);g.fillRect(b.x,b.y,b.w,b.h);g.fillStyle(C.light);if(b.h>b.w)g.fillRect(b.x+b.w/2-2,b.y,4,b.h);else g.fillRect(b.x,b.y+b.h/2-2,b.w,4);}
      else if(enemy.active&&enemy.phase==='charge'&&enemy.telegraph){const box=enemy.telegraph;g.fillStyle(box.tint||C.red,.05);g.fillRect(box.x,box.y,box.w,box.h);g.lineStyle(1,box.tint||C.red,.5+Math.sin(t*20)*.2);g.strokeRect(box.x,box.y,box.w,box.h);}
    }
    for(const shot of world.projectiles){
      if(!shot.active||!near(shot))continue;const tint=shot.tint||(shot.owner==='player'?C.copper:C.red);
      g.lineStyle(shot.missile?3:2,tint,.35);g.lineBetween(shot.x-shot.vx*.025,shot.y-shot.vy*.025,shot.x,shot.y);g.fillStyle(tint);g.fillRect(shot.x-4,shot.y-2,shot.missile?14:8,shot.missile?8:3);g.fillStyle(C.light);g.fillRect(shot.x,shot.y-1,3,2);
      if(shot.missile&&Math.random()<.3)this.burst(shot.x+8,shot.y,'shot',1,C.red);
    }
    if(world.missileWarning){g.lineStyle(1,C.red,.25+Math.sin(t*15)*.15);g.lineBetween(this.cameraX,world.missileWarning.y,this.cameraX+960,world.missileWarning.y);g.fillStyle(C.red,.7);g.fillTriangle(this.cameraX+924,world.missileWarning.y,this.cameraX+947,world.missileWarning.y-10,this.cameraX+947,world.missileWarning.y+10);}
    const sword=catalog.SWORDS.find(s=>s.id===p.sword),bladeTint=sword?.tint||C.light;
    if(slashing){
      for(const [width,tint,opacity]of[[13,bladeTint,.22],[6,bladeTint,.8],[2,C.light,1]]){
        g.lineStyle(width,tint,opacity);g.beginPath();for(let i=0;i<=11;i++){const angle=-1.7+i*.28,x=px+12+p.facing*Math.cos(angle)*66,y=py-24+Math.sin(angle)*77;i?g.lineTo(x,y):g.moveTo(x,y);}g.strokePath();
      }
    }
    const beam=p.beam||p.laserBeam;if(p.laserTime>0&&beam){g.fillStyle(C.violet,.15);g.fillRect(beam.x,beam.y-18,beam.w,beam.h+36);g.fillStyle(beam.tint||C.violet,.9);g.fillRect(beam.x,beam.y,beam.w,beam.h);g.fillStyle(C.light);g.fillRect(beam.x,beam.y+beam.h/2-3,beam.w,6);}
    if(p.shootCooldown>0&&!slashing){const x=px+12,y=py+18,dir=p.facing,gun=catalog.GUNS.find(a=>a.id===p.gun),length=p.gun==='cannon'?38:p.gun==='rail'?34:25;g.lineStyle(5,0x756a72);g.lineBetween(x,y-4,x+dir*13,y+2);g.fillStyle(0x181421);if(p.aimUp){g.fillRect(x-4,y-length,8,length);g.fillStyle(gun?.tint||C.copper);g.fillRect(x-2,y-length+3,2,length-6);}else{const left=dir>0?x+8:x-8-length;g.fillRect(left,y-5,length,10);g.fillStyle(0xb8adb1);g.fillRect(left+2,y-5,length-4,3);g.fillStyle(gun?.tint||C.copper);g.fillRect(left+length/2,y-1,5,2);}}
    if(p.jetActive){g.fillStyle(p.boost>0?C.violet:0xffaf75,.9);g.fillTriangle(px+2,py+25,px+11,py+25,px+2,py+64+Math.sin(t*60)*8);if(Math.random()<.3)this.burst(px+4,py+40,'shot',2);}
    if(p.dashTime>0){g.fillStyle(bladeTint,.2);g.fillRect(px-p.facing*30,py+9,42,28);}
    if(p.burn>0)this.flames(g,px-4,py+18,p.w+8,30,t);
    if(p.armor==='bulwark'){g.fillStyle(0x88949f);g.fillRect(px-6,py+10,9,11);g.fillRect(px+19,py+10,9,11);g.fillStyle(0xd4d9da);g.fillRect(px-5,py+10,7,2);g.fillRect(px+20,py+10,7,2);}
    if(p.armor==='wraith'){g.lineStyle(1,0xceabed,.65);g.strokeEllipse(px+12,py+24,37,55);}
    if(p.shield>0){g.lineStyle(1,C.light,.5);g.strokeEllipse(px+12,py+24,44,60);}
    if(p.stealth>0){g.fillStyle(C.violet,.07);g.fillEllipse(px+12,py+24,60,80);}
    this.drawEffects(g,dt,t);this.drawAtmosphere(dt,t,biome);
  }
  flames(g,x,y,w,h,t){for(let dx=0;dx<w;dx+=7){const rise=h*.6+Math.sin(t*15+dx)*h*.3;g.fillStyle(0xfe705c,.7);g.fillRect(x+dx,y+h-rise,6,rise);g.fillStyle(0xffd390);g.fillRect(x+dx+2,y+h-rise*.5,2,rise*.5);}}
  drawHazards(g,t,near){
    for(const h of [...LEVEL.hazards,...world.dynamicHazards]){if(!near(h))continue;const state=hazardState(h,world.time);
      if(h.type==='laser'){g.fillStyle(0x3c3042);g.fillRect(h.x-11,h.y-10,34,12);g.fillRect(h.x-11,h.y+h.h-3,34,12);g.fillStyle(state==='warning'?C.copper:state==='active'?C.red:0x6b586b);g.fillRect(h.x-4,h.y-6,20,5);if(state==='active'){g.fillStyle(C.red,.1);g.fillRect(h.x-10,h.y,32,h.h);g.fillStyle(C.red,.85);g.fillRect(h.x+2,h.y,8,h.h);g.fillStyle(C.light);g.fillRect(h.x+5,h.y,2,h.h);}else if(state==='warning'){g.lineStyle(1,C.copper,.5+Math.sin(t*30)*.2);g.lineBetween(h.x+6,h.y,h.x+6,h.y+h.h);}}
      else if(h.type==='fire'){g.fillStyle(0x543526);g.fillRect(h.x,h.y+h.h-5,h.w,5);if(state==='active')this.flames(g,h.x,h.y,h.w,h.h,t);}
      else if(h.type==='emp'){g.fillStyle(0x735ba9,.22);g.fillRect(h.x,h.y,h.w,h.h);if(state==='active'){g.lineStyle(2,0xc29bdf,.75);g.beginPath();g.moveTo(h.x,h.y+6);for(let x=h.x+8;x<h.x+h.w;x+=8)g.lineTo(x,h.y+5+Math.sin(x+t*13)*4);g.strokePath();}}
      else{g.fillStyle(0x816b75);for(let x=h.x;x<h.x+h.w;x+=15)g.fillTriangle(x,h.y+h.h,x+7,h.y,x+14,h.y+h.h);}
    }
  }
  drawEffects(g,dt,t){
    for(const p of this.particles){if(p.life<=0)continue;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy+=270*dt;p.rotation+=p.spin*dt;const perspective=140/(140+Math.max(-70,p.z)),size=p.size*perspective;g.fillStyle(p.tint,Math.min(1,p.life*2));if(p.debris){const a=p.rotation,x=p.x,y=p.y;g.fillTriangle(x+Math.cos(a)*size,y+Math.sin(a)*size,x+Math.cos(a+2.1)*size,y+Math.sin(a+2.1)*size,x+Math.cos(a+4.2)*size,y+Math.sin(a+4.2)*size);g.fillStyle(0x100c19,.5);g.fillTriangle(x,y,x+Math.cos(a+2.1)*size,y+Math.sin(a+2.1)*size,x+Math.cos(a+4.2)*size,y+Math.sin(a+4.2)*size);}else g.fillRect(Math.round(p.x),Math.round(p.y),size,size);}
    for(const ring of this.rings){ring.life-=dt;const radius=(.7-ring.life)*380;g.lineStyle(4,ring.tint,Math.max(0,ring.life));g.strokeEllipse(ring.x,ring.y,radius*2,radius*.6);if(ring.spell==='thunder'){g.lineStyle(3,0xe9f7ff,ring.life);g.beginPath();g.moveTo(ring.x,ring.y-450);for(let i=0;i<8;i++)g.lineTo(ring.x+Math.sin(i*7+t*3)*23,ring.y-450+i*64);g.strokePath();}}this.rings=this.rings.filter(r=>r.life>0);
  }
  drawAtmosphere(dt,t,biome){
    const a=this.atmosphere;a.clear();const warm=['furnace','reactor'].includes(biome),storm=biome==='storm';
    for(const f of this.weather){f.y=(f.y+dt*f.speed*(warm?-1:storm?3:1)+540)%540;f.x=(f.x+dt*(8+f.speed*.3)+960)%960;const x=(f.x-this.cameraX*.18%960+960)%960;a.fillStyle(warm?0xffaa72:biome==='eclipse'?0xc4a3e8:0xd1ded5,f.size===2?.32:.16);if(storm)a.fillRect(x,f.y,1,9);else a.fillRect(Math.floor(x),Math.floor(f.y),f.size,f.size);}
    const light=this.light;light.clear();light.fillStyle(warm?0xffaa72:biome==='eclipse'?0xb98ae1:0xd6dfd7,.035);for(let x=Math.floor(this.cameraX/420)*420;x<this.cameraX+1000;x+=420)light.fillTriangle(x,0,x-140,620,x+230,620);
    a.fillStyle(0x090611,.16);a.fillRect(0,0,960,12);a.fillRect(0,528,960,12);
    if(this.flash>0&&!reducedFX){a.fillStyle(C.red,this.flash*.3);a.fillRect(0,0,960,540);}
    if(storm&&!reducedFX&&Math.sin(t*1.3)>0.998){a.fillStyle(0xcdd9ea,.08);a.fillRect(0,0,960,540);}
  }
}

function updateHUD(){
  const p=world.player,zone=[...LEVEL.zones].reverse().find(z=>p.x>=z.x)||LEVEL.zones[0],boss=world.activeBoss;
  $('health-bar').style.width=`${p.hp/p.maxHp*100}%`;$('fuel-bar').style.width=`${p.fuel}%`;$('health-value').textContent=Math.ceil(p.hp);$('fuel-value').textContent=Math.ceil(p.fuel);
  $('buff').textContent=p.stealth>0?`SHADOW VEIL / ${p.stealth.toFixed(1)}s`:p.boost>0?`THRUSTER SURGE / ${p.boost.toFixed(1)}s`:p.impaired>0?'EMP / THRUST OFFLINE':p.rapid>0?`OVERDRIVE / ${Math.ceil(p.rapid)}s`:p.shield>0?`SOUL SHIELD / ${Math.ceil(p.shield)}`:p.dashCooldown>0?'DASH RECHARGING':`${catalog.DIFFICULTIES.find(d=>d.id===world.difficulty)?.name||'Forge'} / DASH READY`;
  $('zone-label').textContent=zone.label;$('timer').textContent=clock(world.time);$('objective').textContent=world.bossDefeated?'UNBIND THE SOUL':boss&&!boss.dead?`DEFEAT ${boss.name.toUpperCase()}`:zone.subtitle;
  $('boss-hud').hidden=!['playing','story'].includes(mode)||!boss||boss.dead;
  if(boss){$('boss-bar').style.width=`${boss.hp/boss.maxHp*100}%`;$('boss-name').textContent=boss.name;$('boss-subtitle').textContent=boss.type==='regent'?'SOUL ENGINE / NULL REGENT':boss.type==='hex'?'STOLEN NIGHT / HEX MATRIARCH':'MILITARY CORE / MK. IV';}
  let text=world.dialogueTime>0?world.dialogue:'';
  if(!text&&mode==='playing'){const npc=world.npcs.find(n=>Math.abs(n.x-p.x)<140&&Math.abs(n.y-p.y)<110);const lever=world.props.find(n=>n.type==='lever'&&Math.abs(n.x-p.x)<120);if(npc)text=`F / INTERACT · ${npc.name}`;else if(lever)text='F / INTERACT · RELEASE SOUL GATE';}
  $('dialogue').hidden=mode!=='playing'||!text;$('dialogue').textContent=text;$('progress').firstElementChild.style.width=`${Math.min(100,p.x/LEVEL.exit.x*100)}%`;
  ui?.renderHUD(world);if(mode==='story')ui.renderStory(world.story);
  if(mode==='playing'&&zone.label!==previousZone){previousZone=zone.label;say(world,`${zone.label} // ${zone.subtitle}`,3);}
}
function continueStory(choice){
  advanceStory(world,choice);saveProgress(world.progress);ui.renderStory(world.story);controls.clear();
  if(!world.story)beginPlay();
}
function showMenu(next){
  mode=next;controls.clear();saveProgress(world.progress);$('stage').dataset.mode=mode;$('menu').hidden=false;$('hud').hidden=true;$('progress').hidden=true;$('touch').hidden=true;$('pause').disabled=true;$('menu-stamp').hidden=true;
  ui?.renderStory(null);const map={paused:['SOUL SIGNAL HELD','PAUSED','The reactor waits only while you do. Ready your loadout.','RESUME CAMPAIGN'],dead:['COURIER SOUL LOST',world.timeLeft<=0?'REACTOR<br>COLLAPSE':'FLATLINE','Return at the last relay. Your recovered relics and discoveries remain.','RECONNECT AT RELAY'],won:['THE SOUL ENGINE IS SILENT','SOUL<br>UNBOUND',`${clock(world.time)} · ${world.kills} threats silenced · ${retries} retries<br>The last soul is free. The Regent has no kingdom.`, 'START A NEW CAMPAIGN']};
  const info=map[mode];if(info){$('menu-eyebrow').textContent=info[0];$('menu-title').innerHTML=info[1];$('menu-copy').innerHTML=info[2];$('start').innerHTML=`${info[3]} <span>↗</span>`;$('menu-detail').textContent=mode==='dead'?`RELAY / ${LEVEL.checkpoints[world.checkpoint]?.label}`:'ARMORY / COLLECTED GEAR & SORCERY';}
}
function beginPlay(){
  mode=world.story?'story':'playing';$('stage').dataset.mode=mode;const touch=matchMedia('(pointer: coarse)').matches;$('stage').dataset.touch=String(touch);$('menu').hidden=true;$('hud').hidden=false;$('progress').hidden=false;$('pause').disabled=false;$('touch').hidden=mode!=='playing'||!touch;controls.clear();scene.accumulator=0;scene.previousPlayer={x:world.player.x,y:world.player.y};sound.start().catch(()=>{});ui?.renderStory(world.story);if(mode==='playing')scene.game.canvas.focus({preventScroll:true});
}
function start(){
  if(!scene)return;if(mode==='dead'){retry();return;}
  if(mode==='menu'||mode==='won'){
    let progress=loadProgress();if(mode==='won'||progress.defeatedBosses.includes('regent'))progress=newCampaignProgress(progress);
    world=createWorld(progress.checkpoint||0,{difficulty:$('difficulty').value,progress});retries=0;previousZone='';scene.cameraX=Math.max(0,world.player.x-250);scene.cameraY=180;
  }
  beginPlay();
}
function pause(force=false){if(mode==='playing'||mode==='story')showMenu('paused');else if(mode==='paused'&&!force)beginPlay();}
function retry(){if(!scene||mode==='menu'||mode==='catalogue')return;world=retryWorld(world);retries++;previousZone='';scene.cameraX=Math.max(0,world.player.x-250);scene.cameraY=180;scene.particles.forEach(p=>p.life=0);scene.rings.length=0;beginPlay();}
window.ashBack=()=>{if($('catalogue').open){ui.close();return true;}if(['playing','story','paused'].includes(mode)){pause();return true;}return false;};
$('start').addEventListener('click',start);$('pause').addEventListener('click',()=>pause());
$('sound').addEventListener('click',()=>{sound.setMuted(!sound.muted);$('sound').textContent=sound.muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-pressed',String(sound.muted));sound.start().catch(()=>{});});
$('motion').setAttribute('aria-pressed',String(reducedFX));$('motion').textContent=reducedFX?'FX REDUCED':'FX FULL';$('motion').addEventListener('click',()=>{reducedFX=!reducedFX;sound.setReducedFX(reducedFX);$('motion').textContent=reducedFX?'FX REDUCED':'FX FULL';$('motion').setAttribute('aria-pressed',String(reducedFX));});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{$('footer-status').textContent='FULLSCREEN IS MANAGED BY THIS DEVICE';}});
new Phaser.Game({type:Phaser.AUTO,width:960,height:540,parent:'game',backgroundColor:'#171322',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Soulforge],audio:{noAudio:true},render:{powerPreference:'low-power'},fps:{target:60,smoothStep:true}});
