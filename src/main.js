import Phaser from 'phaser';
import './style.css';
import { LEVEL } from './level.js';
import { createArtTextures } from './art.js';
import { createWorld, stepWorld, hazardState, say, STEP } from './combat.js';
import { Controls } from './input.js';
import { Sound } from './audio.js';

const $ = id => document.getElementById(id);
const sound = new Sound();
let scene, mode = 'menu', reducedFX = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let world = createWorld(), retries = 0, previousZone = '';
const controls = new Controls($('touch'), pause, retry, () => { if (mode !== 'playing') start(); });
const color = hex => Phaser.Display.Color.HexStringToColor(hex).color;
const C = { cyan: 0x78d8df, amber: 0xefb35f, red: 0xfa735e, snow: 0xc2dadc, dark: 0x101d28 };
const timeLabel = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

class Foundry extends Phaser.Scene {
  constructor() { super('foundry'); }
  create() {
    scene = this; this.manifest = createArtTextures(this); this.accumulator = 0; this.visualTime = 0;
    this.cameraX = 0; this.cameraY = 180; this.shake = 0; this.flash = 0; this.particles = Array.from({ length: 220 }, () => ({ life: 0 }));
    this.cameras.main.setBounds(0, 0, LEVEL.width, LEVEL.height);
    this.far = this.add.tileSprite(0, 0, 960, 540, 'background-far').setOrigin(0).setScrollFactor(0).setDepth(-10);
    this.mid = this.add.tileSprite(0, 0, 960, 540, 'background-mid').setOrigin(0).setScrollFactor(0).setDepth(-8);
    this.buildEnvironment();
    this.playerSprite = this.add.sprite(112, 606, 'player-idle-0').setOrigin(.5,68/72).setDepth(10);
    this.enemySprites = new Map();
    this.bossSprite = this.add.sprite(world.boss.x+44,600,'boss-0').setOrigin(.5,138/144).setDepth(9);
    this.dynamic = this.add.graphics().setDepth(12);
    this.atmosphere = this.add.graphics().setDepth(30).setScrollFactor(0);
    this.snow = Array.from({length:95},(_,i)=>({x:(i*137)%960,y:(i*83)%540,speed:15+(i%6)*6,size:i%3===0?2:1}));
    this.previousPlayer = {x:world.player.x,y:world.player.y};
    this.input.keyboard?.removeAllKeys();
    this.game.canvas.setAttribute('tabindex','0');
    this.game.canvas.setAttribute('aria-label','Ash Signal. Move with A D, jump with Space, slash J, fire K, dash Shift, jetpack L. Escape pauses.');
    $('start').disabled = false;
    if(import.meta.env.DEV) window.__ASH = { scene:this, get world(){return world;}, start, retry, pause, stepWorld, createWorld, LEVEL, get mode(){return mode;}, setWorld(value){world=value;this.scene.previousPlayer={x:value.player.x,y:value.player.y};} };
  }
  buildEnvironment() {
    const details=this.add.graphics().setDepth(-1);
    for(const s of LEVEL.solids) {
      if(s.kind==='crate') {
        this.add.image(s.x+s.w/2,s.y+s.h/2,'crate').setDisplaySize(s.w,s.h).setDepth(0);
      } else {
        this.add.tileSprite(s.x,s.y,s.w,s.h,s.kind==='wall'?'tile-wall':'tile-steel').setOrigin(0).setDepth(0);
        details.fillStyle(0x80939a,.65);details.fillRect(s.x,s.y,s.w,2);
        details.fillStyle(0x080f15,.65);details.fillRect(s.x,s.y+s.h-4,s.w,4);
        if(s.material==='snow')this.add.tileSprite(s.x,s.y-8,s.w,18,'tile-snow').setOrigin(0).setDepth(2);
        if(s.h<35) {
          details.fillStyle(0x233341);details.fillRect(s.x+12,s.y+s.h,8,45);details.fillRect(s.x+s.w-20,s.y+s.h,8,45);
          details.lineStyle(3,0x384851);details.lineBetween(s.x+12,s.y+s.h+45,s.x+60,s.y+s.h);
        }
        for(let x=s.x+24;x<s.x+s.w;x+=112) {
          details.fillStyle(0xe6ad61,.6);details.fillRect(x,s.y+8,16,3);
          details.fillStyle(0x182b36);details.fillRect(x+26,s.y+8,4,3);
        }
      }
    }
    for(let x=160;x<LEVEL.width;x+=570) {
      const ground=LEVEL.solids.find(s=>s.kind==='ground'&&x>=s.x&&x<=s.x+s.w-80);
      if(!ground)continue;
      this.add.image(x,ground.y,'antenna').setOrigin(.5,1).setDepth(-3).setAlpha(.7);
      this.add.image(x+160,ground.y,'pipe').setOrigin(.5,1).setDepth(-2).setAlpha(.7);
      this.add.image(x+270,ground.y-80,'lamp').setOrigin(.5,1).setDepth(-1);
      details.fillStyle(0xffb865,.055);details.fillEllipse(x+270,ground.y-70,160,210);
    }
    LEVEL.zones.forEach((z,i)=>{
      this.add.text(z.x+65,335,`0${i+1}`,{fontFamily:'Bahnschrift,Arial',fontSize:'70px',color:'#516776'}).setAlpha(.22).setDepth(-2);
      this.add.text(z.x+70,411,z.label,{fontFamily:'Bahnschrift,Arial',fontSize:'10px',color:'#8fa6ae',letterSpacing:3}).setAlpha(.55).setDepth(-2);
    });
    LEVEL.guides?.forEach(g=>{
      this.add.text(g.x,g.y,g.text,{fontFamily:'Bahnschrift,Arial',fontSize:'10px',color:'#bdcbcf',backgroundColor:'#0b1822',padding:{x:8,y:5}}).setOrigin(.5).setAlpha(.65).setDepth(3);
    });
    const exit=LEVEL.exit;
    details.fillStyle(0x102e38);details.fillRect(exit.x-8,exit.y-20,exit.w+16,exit.h+20);
    details.lineStyle(3,C.cyan,.65);details.strokeRect(exit.x,exit.y-10,exit.w,exit.h+10);
    this.add.text(exit.x+25,exit.y-35,'EXTRACT',{fontFamily:'Bahnschrift,Arial',fontSize:'9px',color:'#78d8df'}).setOrigin(.5);
  }
  burst(x,y,kind,count=10) {
    const tint=kind==='hurt'||kind==='death'?C.red:kind==='pickup'||kind==='explode'||kind==='shot'?C.amber:kind==='land'?0x849ea8:C.cyan;
    for(let i=0;i<count;i++) {
      const p=this.particles.find(p=>p.life<=0);if(!p)break;
      const angle=Math.random()*Math.PI*2,speed=kind==='explode'?60+Math.random()*230:30+Math.random()*120;
      Object.assign(p,{x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-30,life:.18+Math.random()*.5,maxLife:.7,tint,size:kind==='explode'?2+Math.floor(Math.random()*4):2});
    }
  }
  update(_,milliseconds) {
    const dt=Math.min(milliseconds/1000,.05);this.visualTime+=dt;
    if(mode==='playing') {
      if(world.hitstop>0)world.hitstop=Math.max(0,world.hitstop-dt);
      else {
        this.accumulator=Math.min(this.accumulator+dt,.1);
        while(this.accumulator>=STEP) {
          this.previousPlayer.x=world.player.x;this.previousPlayer.y=world.player.y;
          stepWorld(world,controls.read(),STEP);this.accumulator-=STEP;
          if(world.status!=='playing')break;
        }
      }
      if(world.status==='dead')showMenu('dead');
      if(world.status==='won')showMenu('won');
    } else { controls.read();this.accumulator=0; }
    for(const e of world.events) {
      sound.play(e.type);
      if(e.type==='explode'||e.type==='death'){this.burst(e.x,e.y,e.type,28);this.shake=Math.min(1,this.shake+.5);}
      else if(e.type==='hurt'){this.burst(e.x,e.y,e.type,15);this.shake=Math.min(1,this.shake+.25);this.flash=.18;}
      else if(['hit','parry','slash','pickup','checkpoint','land','dash','shot','spark','jump','walljump','emp'].includes(e.type))this.burst(e.x,e.y,e.type,e.type==='shot'?4:e.type==='slash'?12:8);
    }
    world.events.length=0;this.shake=Math.max(0,this.shake-dt*2.4);this.flash=Math.max(0,this.flash-dt);
    sound.update(mode==='playing',world.boss.active&&!world.boss.dead);
    this.drawWorld(dt);updateHUD();
  }
  drawWorld(dt) {
    const p=world.player,t=this.visualTime;
    const lerp=mode==='playing'?Math.min(1,this.accumulator/STEP):1;
    const px=Phaser.Math.Linear(this.previousPlayer.x,p.x,lerp),py=Phaser.Math.Linear(this.previousPlayer.y,p.y,lerp);
    const targetX=Phaser.Math.Clamp(px-290+(p.facing*48),0,LEVEL.width-960);
    const targetY=Phaser.Math.Clamp(py-310,0,180);
    this.cameraX=Phaser.Math.Linear(this.cameraX,targetX,1-Math.exp(-dt*6));
    this.cameraY=Phaser.Math.Linear(this.cameraY,targetY,1-Math.exp(-dt*5));
    const shake=reducedFX?0:this.shake*this.shake*5;
    this.cameras.main.setScroll(Math.round(this.cameraX+Math.sin(t*47)*shake),Math.round(this.cameraY+Math.sin(t*61)*shake));
    this.far.tilePositionX=Math.round(this.cameraX*.12);this.far.tilePositionY=Math.round(this.cameraY*.2);
    this.mid.tilePositionX=Math.round(this.cameraX*.45);this.mid.tilePositionY=Math.round(this.cameraY*.7+50);
    const frame=p.slashTime>0?`player-slash-${Math.min(3,Math.floor((.2-p.slashTime)/.05))}`:p.state==='run'?`player-run-${Math.floor(t*13)%8}`:p.grounded?`player-idle-${Math.floor(t*3)%4}`:p.vy<0?'player-jump-0':'player-fall-0';
    this.playerSprite.setTexture(frame).setPosition(Math.round(px+12),Math.round(py+46)).setFlipX(p.facing<0);
    this.playerSprite.setAlpha(p.invincible>0&&Math.floor(t*16)%2===0?.4:1).setTint(p.impaired>0?0x849bbb:0xffffff);
    for(const e of world.enemies) {
      let sprite=this.enemySprites.get(e.id);
      if(!sprite){sprite=this.add.sprite(0,0,e.type==='turret'?'turret-0':`${e.type}-0`).setDepth(8);this.enemySprites.set(e.id,sprite);}
      sprite.setVisible(!e.dead);
      if(e.dead)continue;
      const key=e.type==='turret'?'turret-0':`${e.type}-${Math.floor(t*(e.type==='drone'?9:6))%4}`;
      sprite.setTexture(key).setOrigin(.5,e.type==='drone'?.5:e.type==='guard'?54/56:54/56).setPosition(Math.round(e.x+e.w/2),Math.round(e.y+(e.type==='drone'?e.h/2:e.h))).setFlipX(e.facing<0).setTint(e.flash>0?0xffddaa:0xffffff);
    }
    const b=world.boss;
    this.bossSprite.setTexture(`boss-${Math.floor(t*(b.phase==='charge'?8:3))%4}`).setPosition(b.x+b.w/2,b.y+b.h).setFlipX(p.x<b.x).setTint(b.flash>0?0xffcab0:b.phase==='charge'?0xffa08c:0xffffff).setVisible(!b.dead);
    const g=this.dynamic;g.clear();
    for(const h of LEVEL.hazards) {
      if(h.x+h.w<this.cameraX-100||h.x>this.cameraX+1060)continue;
      const state=hazardState(h,world.time);
      if(h.type==='laser') {
        g.fillStyle(0x263d4c);g.fillRect(h.x-11,h.y-10,34,12);g.fillRect(h.x-11,h.y+h.h-3,34,12);
        g.fillStyle(state==='warning'?C.amber:state==='active'?C.cyan:0x577382);g.fillRect(h.x-4,h.y-6,20,5);
        if(state==='active'){g.fillStyle(C.cyan,.09);g.fillRect(h.x-10,h.y,32,h.h);g.fillStyle(C.cyan,.8);g.fillRect(h.x+2,h.y,8,h.h);g.fillStyle(0xeeffff);g.fillRect(h.x+5,h.y,2,h.h);}
        else if(state==='warning'){g.lineStyle(1,C.amber,.5+Math.sin(t*30)*.2);g.lineBetween(h.x+6,h.y,h.x+6,h.y+h.h);}
      } else if(h.type==='fire') {
        g.fillStyle(0x543526);g.fillRect(h.x,h.y+h.h-5,h.w,5);
        if(state==='active')for(let x=h.x;x<h.x+h.w;x+=8){const rise=14+Math.sin(t*11+x)*9;g.fillStyle(C.red,.7);g.fillRect(x,h.y+h.h-rise,7,rise);g.fillStyle(C.amber);g.fillRect(x+2,h.y+h.h-rise*.55,3,rise*.55);}
      } else if(h.type==='emp') {
        g.fillStyle(0x735ba9,.3);g.fillRect(h.x,h.y,h.w,h.h);
        if(state==='active'){g.lineStyle(2,0x9c91df,.75);g.beginPath();g.moveTo(h.x,h.y+6);for(let x=h.x+8;x<h.x+h.w;x+=8)g.lineTo(x,h.y+5+Math.sin(x+t*13)*4);g.strokePath();}
      } else {
        g.fillStyle(0x566876);for(let x=h.x;x<h.x+h.w;x+=15)g.fillTriangle(x,h.y+h.h,x+7,h.y,x+14,h.y+h.h);
      }
    }
    LEVEL.checkpoints.forEach((cp,i)=>{
      const x=cp.x+12,y=610;
      g.fillStyle(0x172b38);g.fillRect(x-9,y-54,18,54);g.fillStyle(i<=world.checkpoint?C.cyan:0x516976);g.fillRect(x-4,y-47,8,12);
      if(i<=world.checkpoint){g.lineStyle(1,C.cyan,.25);g.strokeCircle(x,y-41,14+Math.sin(t*2)*3);}
    });
    for(const item of world.pickups){
      if(item.taken)continue;const y=item.y+Math.sin(t*3+item.x)*4,tint=item.type==='health'?C.red:item.type==='fuel'?C.cyan:C.amber;
      g.fillStyle(tint,.09);g.fillCircle(item.x,y,20);g.lineStyle(1,tint,.65);g.strokeRect(item.x-10,y-12,20,24);g.fillStyle(0x15232d);g.fillRect(item.x-7,y-9,14,18);g.fillStyle(tint);
      if(item.type==='health'){g.fillRect(item.x-2,y-6,4,12);g.fillRect(item.x-6,y-2,12,4);}
      else if(item.type==='fuel'){g.fillRect(item.x-3,y-5,6,11);g.fillRect(item.x-1,y-8,2,3);}
      else if(item.type==='rapid'){g.fillTriangle(item.x-5,y-5,item.x+4,y-5,item.x-2,y+1);g.fillTriangle(item.x-2,y,item.x+5,y,item.x-3,y+7);}
      else {g.lineStyle(2,tint);g.strokeTriangle(item.x-6,y-5,item.x+6,y-5,item.x,y+7);}
    }
    for(const e of world.enemies){
      if(e.dead||e.windup<=0)continue;g.fillStyle(C.red,.25);g.fillRect(e.x,e.y-10,e.w,3);g.fillStyle(C.red);g.fillRect(e.x,e.y-10,e.w*Math.min(1,e.windup/.48),3);
    }
    for(const shot of world.projectiles){
      if(!shot.active)continue;const tint=shot.owner==='player'?C.amber:C.red;
      g.lineStyle(shot.missile?3:2,tint,.35);g.lineBetween(shot.x-shot.vx*.025,shot.y-shot.vy*.025,shot.x,shot.y);
      g.fillStyle(tint);g.fillRect(shot.x-4,shot.y-2,shot.missile?12:8,shot.missile?6:3);g.fillStyle(0xfff5d8);g.fillRect(shot.x,shot.y-1,3,2);
      if(shot.missile&&Math.random()<.4)this.burst(shot.x-7,shot.y,'explode',1);
    }
    if(b.active&&!b.dead&&b.attack===2){
      if(b.phase==='charge'){g.lineStyle(1,C.red,.4+Math.sin(t*20)*.3);g.lineBetween(this.cameraX,b.aimY,b.x+40,b.aimY);}
      if(b.beam&&b.phase==='attack'){g.fillStyle(C.red,.2);g.fillRect(b.beam.x,b.beam.y-7,b.beam.w,28);g.fillStyle(C.red);g.fillRect(b.beam.x,b.beam.y,b.beam.w,14);g.fillStyle(0xffe6bd);g.fillRect(b.beam.x,b.beam.y+5,b.beam.w,4);}
    }
    if(p.slashTime>0){
      const centerX=p.x+12+p.facing*22,centerY=p.y+22;
      g.lineStyle(5,C.cyan,.6);g.beginPath();g.arc(centerX,centerY,41,p.facing>0?-1.1:2,p.facing>0?1.1:4.25);g.strokePath();g.lineStyle(2,0xe6ffff,.9);g.beginPath();g.arc(centerX,centerY,44,p.facing>0?-1:2.1,p.facing>0?1:4.15);g.strokePath();
    }
    if(p.shootCooldown>0&&p.slashTime<=0){
      const x=px+12,y=py+18,dir=p.facing;
      g.lineStyle(5,0x324858);g.lineBetween(x,y-4,x+dir*13,y+2);
      if(p.aimUp){g.fillStyle(0x0b1620);g.fillRect(x-4,y-23,8,24);g.fillStyle(0x728996);g.fillRect(x-3,y-21,3,20);g.fillStyle(C.amber);g.fillRect(x-2,y-13,2,4);}
      else{const start=dir>0?x+9:x-33;g.fillStyle(0x0b1620);g.fillRect(start,y-4,25,8);g.fillStyle(0x617988);g.fillRect(start+2,y-4,21,3);g.fillStyle(0x2d4758);g.fillRect(start+8,y+4,6,5);g.fillStyle(C.amber);g.fillRect(start+10,y-1,4,2);}
    }
    if(p.jetActive){g.fillStyle(C.amber,.9);g.fillTriangle(px+2,py+25,px+11,py+25,px+2,py+55+Math.sin(t*60)*7);if(Math.random()<.5)this.burst(px+4,py+40,'shot',2);}
    if(p.dashTime>0){g.fillStyle(C.cyan,.2);g.fillRect(px-p.facing*30,py+9,42,28);}
    if(p.shield>0){g.lineStyle(1,C.amber,.4);g.strokeEllipse(px+12,py+24,44,60);}
    if(world.bossDefeated){g.fillStyle(C.cyan,.2);g.fillRect(LEVEL.exit.x,LEVEL.exit.y,LEVEL.exit.w,LEVEL.exit.h);}
    for(const particle of this.particles){
      if(particle.life<=0)continue;particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy+=250*dt;
      g.fillStyle(particle.tint,Math.min(1,particle.life*3));g.fillRect(Math.round(particle.x),Math.round(particle.y),particle.size,particle.size);
    }
    const a=this.atmosphere;a.clear();
    for(const flake of this.snow){flake.y=(flake.y+dt*flake.speed)%540;flake.x=(flake.x+dt*(8+flake.speed*.3)+960)%960;const x=(flake.x-this.cameraX*.18%960+960)%960;a.fillStyle(C.snow,flake.size===2?.4:.2);a.fillRect(Math.floor(x),Math.floor(flake.y),flake.size,flake.size);}
    a.fillStyle(0x020b14,.14);a.fillRect(0,0,960,16);a.fillRect(0,520,960,20);
    if(this.flash>0&&!reducedFX){a.fillStyle(C.red,this.flash*.35);a.fillRect(0,0,960,540);}
  }
}

function updateHUD() {
  const p=world.player, zone=[...LEVEL.zones].reverse().find(z=>p.x>=z.x)||LEVEL.zones[0];
  $('health-bar').style.width=`${p.hp}%`;$('fuel-bar').style.width=`${p.fuel}%`;
  $('health-value').textContent=Math.ceil(p.hp);$('fuel-value').textContent=Math.ceil(p.fuel);
  $('buff').textContent=p.impaired>0?`EMP · ${p.impaired.toFixed(1)}s`:p.rapid>0?`OVERDRIVE · ${p.rapid.toFixed(0)}s`:p.shield>0?`SHIELD · ${Math.ceil(p.shield)}`:p.dashCooldown>0?`DASH RECHARGE`:'DASH READY';
  $('zone-label').textContent=zone.label;$('timer').textContent=timeLabel(world.time);
  $('objective').textContent=world.bossDefeated?'REACH THE EXTRACTION GATE':world.boss.active?'DESTROY THE WARDEN':'BREACH THE FOUNDRY';
  $('boss-hud').hidden=mode!=='playing'||!world.boss.active||world.boss.dead;
  $('boss-bar').style.width=`${world.boss.hp/world.boss.maxHp*100}%`;
  $('dialogue').hidden=mode!=='playing'||world.dialogueTime<=0;$('dialogue').textContent=world.dialogue;
  $('progress').firstElementChild.style.width=`${Math.min(100,p.x/LEVEL.exit.x*100)}%`;
  if(mode==='playing'&&zone.label!==previousZone){previousZone=zone.label;say(world,`SECTOR // ${zone.label}. ${zone.subtitle}`,3.3);}
}

function showMenu(nextMode) {
  mode=nextMode;controls.clear();$('stage').dataset.mode=mode;
  $('menu').hidden=false;$('hud').hidden=true;$('progress').hidden=true;$('touch').hidden=true;$('pause').disabled=true;
  $('menu-stamp')?.setAttribute('hidden','');
  const info={paused:['SIGNAL HELD','PAUSED','Take a breath. The foundry can wait.','RESUME OPERATION'],dead:['COURIER SIGNAL LOST','FLATLINE','The relay remembers your route. Return to the last checkpoint and try again.','RECONNECT AT RELAY'],won:['DEFENSE CORE SILENCED','SIGNAL<br>RECOVERED',`The foundry is quiet. You made it out.<br>${timeLabel(world.time)} · ${world.kills} hostiles neutralized · ${retries} retries`,'RUN IT AGAIN']};
  const text=info[mode];if(!text)return;
  $('menu-eyebrow').textContent=text[0];$('menu-title').innerHTML=text[1];$('menu-copy').innerHTML=text[2];$('start').innerHTML=`${text[3]} <span>↗</span>`;
  $('menu-detail').textContent=mode==='dead'?`RELAY: ${LEVEL.checkpoints[world.checkpoint]?.label||'ICEBREAK'} · R TO RETRY`:mode==='won'?'ONE COURIER. ONE LESS MACHINE.':'ESC TO RESUME · R TO RESTART AT RELAY';
}

function beginPlay() {
  mode='playing';$('stage').dataset.mode=mode;$('menu').hidden=true;$('hud').hidden=false;$('progress').hidden=false;$('pause').disabled=false;
  $('touch').hidden=!window.matchMedia('(pointer: coarse)').matches;controls.clear();
  scene.accumulator=0;scene.previousPlayer={x:world.player.x,y:world.player.y};
  sound.start().catch(()=>{});scene.game.canvas.focus({preventScroll:true});
}
function start() {
  if(!scene)return;
  if(mode==='dead'){retry();return;}
  if(mode==='won'){world=createWorld();retries=0;previousZone='';scene.cameraX=0;scene.cameraY=180;}
  beginPlay();
}
function pause(force=false) {if(mode==='playing')showMenu('paused');else if(mode==='paused'&&!force)beginPlay();}
function retry() {
  if(!scene||mode==='menu')return;
  const cp=world.checkpoint,elapsed=world.time,kills=world.kills;world=createWorld(cp);world.time=elapsed;world.kills=kills;retries++;previousZone='';
  scene.cameraX=Math.max(0,world.player.x-250);scene.cameraY=180;scene.particles.forEach(p=>p.life=0);beginPlay();
}
$('start').addEventListener('click',start);$('pause').addEventListener('click',()=>pause());
$('sound').addEventListener('click',()=>{sound.setMuted(!sound.muted);$('sound').textContent=sound.muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-pressed',String(sound.muted));sound.start().catch(()=>{});});
$('motion').setAttribute('aria-pressed',String(reducedFX));$('motion').textContent=reducedFX?'FX REDUCED':'FX FULL';
$('motion').addEventListener('click',()=>{reducedFX=!reducedFX;$('motion').textContent=reducedFX?'FX REDUCED':'FX FULL';$('motion').setAttribute('aria-pressed',String(reducedFX));});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{$('footer-status').textContent='FULLSCREEN UNAVAILABLE IN THIS BROWSER';}});
new Phaser.Game({type:Phaser.AUTO,width:960,height:540,parent:'game',backgroundColor:'#132332',pixelArt:true,roundPixels:true,antialias:false,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Foundry],audio:{noAudio:true},render:{powerPreference:'low-power'},fps:{target:60,smoothStep:true}});
