import { boosterPose, isIronfang, ironfangSocket } from './ironfang.js';
import { characterSocket, firingFrame } from './character-motion.js';
// Presentation-only particles. Gameplay collision and damage stay in combat.js.
export class LanternEffects {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(11);
    this.particles = Array.from({ length: 240 }, () => ({ life: 0 }));
    this.ghosts = [];
    this.views = []; this.viewIndex = 0; this.fractures = []; this.impacts = []; this.dashDust = [];
    this.muzzles=[];
    this.clock = 0;
    this.nextJet = this.nextStep = this.nextGhost = this.nextFlame = this.nextEnemyStep = 0;
    this.seed = 173;
  }
  random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  clear() {
    for (const p of this.particles) p.life = 0;
    for (const ghost of this.ghosts) { ghost.life = 0; ghost.view.setVisible(false); }
    this.graphics.clear();
    for (const view of this.views) view.setVisible(false);
    this.fractures.length = 0;
    this.impacts.length = 0; this.dashDust.length = 0;
    this.muzzles.length=0;
  }
  particle(kind, x, y, vx, vy, life, size, tint) {
    const p = this.particles.find(item => item.life <= 0);
    if (!p) return;
    Object.assign(p, { kind, x, y, vx, vy, life, maxLife: life, size, tint });
  }
  dust(x, y, count, force = 1, tint = 0xb5b49c) {
    for (let i = 0; i < count; i++) this.particle('dust', x + (this.random() - .5) * 14, y - 2,
      (this.random() - .5) * 170 * force, -10 - this.random() * 60 * force, .25 + this.random() * .3, 2 + this.random() * 3, tint);
  }
  sparks(x, y, count, tint = 0xffc77f, facing = 0) {
    for (let i = 0; i < count; i++) this.particle('spark', x, y, facing * 100 + (this.random() - .5) * 220,
      -40 - this.random() * 160, .15 + this.random() * .35, 1 + this.random() * 2, tint);
  }
  emit(e, reduced = false) {
    const { x, y } = e;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const n = reduced ? .4 : 1;
    if((e.type==='shot'||e.type==='enemyshot'&&e.kind==='cannonround')&&this.muzzles.length<24)this.muzzles.push({x,y,angle:e.angle??(e.facing<0?Math.PI:0),age:0,bossId:e.bossId,slot:e.weaponSlot,hero:e.type==='shot'});
    if(['impact','hurt'].includes(e.type)) {
      if(this.impacts.length<32)this.impacts.push({x,y,age:0,hurt:e.type==='hurt'});
      this.sparks(x,y,Math.ceil(8*n),e.type==='hurt'?0xff775e:0xffbe78);return;
    }
    if (e.type === 'land') this.dust(x, y, Math.ceil(12 * n), Math.max(.5, Math.min(1.6, (e.impactSpeed || 400) / 500)));
    else if (e.type === 'jump' || e.type === 'walljump') {
      if (e.kind === 'air') this.sparks(x, y, Math.ceil(12 * n), 0xb6e6d3);
      else this.dust(x, y, Math.ceil(8 * n), .7);
    } else if (e.type === 'slam') {
      for (let i = 0; i < 3; i++) this.dust(e.bounds ? e.bounds.x + e.bounds.w * (i + .5) / 3 : x + (i-1) * 70, y, Math.ceil(10 * n), 1.5, 0xb9ac87);
      this.sparks(x, y - 4, Math.ceil(16 * n));
      if(e.bounds) this.fractures.push({ ...e.bounds, y:e.surfaceY ?? y, age:0, life:.65 });
      for(let i=0;i<Math.ceil(14*n);i++)this.particle('stone',x+(this.random()-.5)*45,y-4,(this.random()-.5)*310,-90-this.random()*170,.45+this.random()*.3,3+this.random()*5,0xaba78c);
    } else if (e.type === 'boost') {
      this.sparks(x,y,Math.ceil(14*n),0xffbf76,-(e.facing||1));
    } else if (e.type === 'soulcollect' || e.type === 'pickup') {
      this.sparks(x,y,Math.ceil(9*n),0xe9d9a7);
    } else if (e.type === 'transform') {
      for (let i = 0; i < Math.ceil(30 * n); i++) {
        const a = this.random() * Math.PI * 2;
        this.particle('ember', x + Math.cos(a) * 70, y + Math.sin(a) * 60, -Math.cos(a) * 50, -Math.sin(a) * 50 - 45, .7 + this.random() * .5, 2 + this.random() * 3, 0xffac59);
      }
    } else if (['portal', 'portalarrival', 'summonarrival', 'summonexpire', 'summon'].includes(e.type)) {
      for (let i = 0; i < Math.ceil(20 * n); i++) {
        const a = i / (20 * n) * Math.PI * 2;
        this.particle('spirit', x + Math.cos(a) * 30, y + Math.sin(a) * 25, Math.cos(a) * 25, -35 + Math.sin(a) * 25, .45 + this.random() * .4, 2 + this.random() * 2, e.summon === 'dragon' ? 0xffbc73 : 0x9ae8d7);
      }
    } else if (['hit', 'parry', 'spark', 'death', 'shieldbreak', 'shot', 'enemyshot'].includes(e.type)) {
      this.sparks(x, y, Math.ceil((e.type === 'death' ? 16 : e.type.includes('shot') ? 4 : 8) * n), e.tint || 0xffd3a0, e.facing || 0);
    }
  }
  image(frame,x,y,width,height,rotation=0,alpha=1,originY) {
    let view=this.views[this.viewIndex++];
    const atlas=frame.startsWith('if-')?'ironfang':'lantern-fx';
    if(!view){view=this.scene.add.image(0,0,atlas,frame).setDepth(11);this.views.push(view);}
    const meta=this.scene.referenceArt.frames[frame];
    view.setTexture(atlas,frame).setPosition(x,y).setOrigin(meta?meta.anchor.x/meta.width:.5,originY??(meta?meta.anchor.y/meta.height:.5)).setDisplaySize(width,height).setRotation(rotation).setFlipX(false).setTint(0xffffff).setAlpha(alpha).setVisible(true);
    return view;
  }
  plume(x,y,facing,t,size=1,vertical=false) {
    return this.image(`flame-${Math.floor(t*15)%4}`,x,y,48*size,58*size,vertical?0:facing>0?-Math.PI/2:Math.PI/2,1,12/128);
  }
  update(dt, world, reduced = false, hero = world.player) {
    const g = this.graphics, p = world.player;
    g.clear(); for(const view of this.views)view.setVisible(false); this.viewIndex=0; this.clock += dt;
    const t = this.clock;
    if (dt > 0 && p.hp > 0 && world.status === 'playing') {
      if ((p.jetActive || p.boostActive) && t >= this.nextJet) {
        this.nextJet = t + (reduced ? .08 : .035);
        const {x,y,dx,dy}=boosterPose(hero),scatter=(this.random()-.5)*24;
        this.particle('smoke',x+dx*30,y+dy*30,dx*65+scatter,dy*65,.65,5+this.random()*4,0x879594);
        this.particle('ember',x+dx*10,y+dy*10,dx*150+scatter,dy*150,.3,2,0xffc274);
      }
      if (p.grounded && Math.abs(p.vx) > 70 && t >= this.nextStep) {
        this.nextStep = t + .16; this.dust(hero.x + p.w / 2, hero.y + p.h, reduced ? 1 : 3, .35);
      }
      if (p.dashTime > 0 && p.grounded && t >= this.nextGhost) {
        this.nextGhost = t + .035;
        if(this.dashDust.length<16)this.dashDust.push({x:hero.x+p.w/2-p.facing*12,y:hero.y+p.h,age:0,facing:p.facing});
      }
      if(t>=this.nextEnemyStep){
        this.nextEnemyStep=t+(reduced?.12:.065);
        for(const enemy of [...world.enemies,...world.bosses]){
          if(enemy.dead||!enemy.grounded||Math.abs(enemy.vx||0)<170||Math.abs(enemy.x-p.x)>1200)continue;
          if(this.dashDust.length<32)this.dashDust.push({x:enemy.x+enemy.w/2,y:enemy.y+enemy.h,age:0,facing:enemy.facing,scale:isIronfang(enemy)?1.8:1});
        }
      }
      if (t >= this.nextFlame) {
        this.nextFlame = t + (reduced ? .12 : .05);
        for (const shot of world.projectiles.filter(s => s.active && ['fire', 'dragonfire'].includes(s.kind)).slice(0, 12)) {
          this.particle('ember', shot.x, shot.y, -shot.vx * .15, -25 - this.random() * 40, .28, 2 + this.random() * 2, 0xffae54);
          if (!reduced) this.particle('smoke', shot.x, shot.y, -shot.vx * .08, -20, .45, 4, 0x786d65);
        }
      }
    }
    for (const q of this.particles) {
      if (q.life <= 0) continue;
      q.life = Math.max(0, q.life - dt); q.x += q.vx * dt; q.y += q.vy * dt;
      q.vy += (q.kind === 'smoke' || q.kind === 'spirit' ? -35 : q.kind === 'ember' ? -70 : 220) * dt;
      const a = q.life / q.maxLife, age = 1 - a;
      if (q.kind === 'smoke') {
        const r=q.size*(1+age*2);
        this.image(`smoke-${Math.min(3,Math.floor(age*4))}`,q.x,q.y,r*5,r*5,0,a*.36);
      } else if (q.kind === 'spark') {
        g.lineStyle(Math.ceil(q.size), q.tint, a); g.lineBetween(q.x, q.y, q.x - q.vx * .025, q.y - q.vy * .025);
      } else if(q.kind==='stone') {
        const r=q.size,x=q.x,y=q.y,angle=age*6;
        g.fillStyle(q.tint,a);g.fillTriangle(x+Math.cos(angle)*r,y+Math.sin(angle)*r,x+Math.cos(angle+2.2)*r,y+Math.sin(angle+2.2)*r,x+Math.cos(angle+4.2)*r,y+Math.sin(angle+4.2)*r);
      } else {
        g.fillStyle(q.tint, a * (q.kind === 'dust' ? .55 : .85));
        const size = Math.max(1, Math.ceil(q.size * (q.kind === 'dust' ? 1 + age : a)));
        g.fillCircle(q.x, q.y, size*.65);
      }
    }
    for (const ghost of this.ghosts) {
      ghost.life = Math.max(0, ghost.life - dt); ghost.view.setAlpha(ghost.life / .18 * .32).setVisible(ghost.life > 0);
    }
    for(const crack of this.fractures){
      crack.age+=dt;const a=Math.max(0,1-crack.age/crack.life),reach=Math.min(1,crack.age/.12);
      const center=crack.x+crack.w/2,frame=Math.min(3,Math.floor(crack.age/.13));
      for(const facing of [-1,1])this.image(`if-dust-${frame}`,center+facing*crack.w*.35*reach,crack.y,Math.max(80,crack.w*.7),70+reach*24,0,a,.88).setFlipX(facing>0);
      if(crack.age<.24)this.image(`if-impact-${Math.min(3,Math.floor(crack.age/.06))}`,center,crack.y-8,96,80,0,a,.8);
    }
    this.fractures=this.fractures.filter(c=>c.age<c.life);
    for(const shot of world.projectiles){
      if(!shot.active||!['fire','dragonfire'].includes(shot.kind))continue;
      const angle=Math.atan2(shot.vy,shot.vx),size=shot.kind==='dragonfire'?1.3:1;
      this.image(`if-breath-${Math.floor(t*16)%3}`,shot.x,shot.y,52*size,30*size,angle,.95).setOrigin(.8,.5);
    }
    for(const boss of world.bosses){if(boss.phase!=='transform'||boss.dead)continue;
      for(let i=0;i<3;i++)this.plume(boss.x+boss.w*(i+1)/4,boss.y+boss.h,boss.facing,t+i*.2,1.5,true).setRotation(Math.PI);
    }
    for(const impact of this.impacts){
      impact.age+=dt;const frame=Math.min(3,Math.floor(impact.age/.06));
      this.image(`if-impact-${frame}`,impact.x,impact.y,impact.hurt?48:36,impact.hurt?48:36,0,Math.max(0,1-impact.age/.28));
    }
    this.impacts=this.impacts.filter(i=>i.age<.28);
    for(const dust of this.dashDust){dust.age+=dt;
      this.image(`if-dust-${Math.min(3,Math.floor(dust.age/.08))}`,dust.x-dust.facing*dust.age*40,dust.y,62*(dust.scale||1),38*(dust.scale||1),0,Math.max(0,1-dust.age/.32),.88).setFlipX(dust.facing>0);
    }
    this.dashDust=this.dashDust.filter(d=>d.age<.32);
    for(const boss of world.bosses){
      if(!isIronfang(boss)||boss.dead)continue;
      if(boss.attackKind==='charge'&&boss.phase==='attack')this.image('if-arc',boss.x+boss.w/2+boss.facing*38,boss.y+boss.h*.45,115,115,0,.65).setFlipX(boss.facing<0);
      if(boss.phase==='charge'&&['breath','cinder','cannon'].includes(boss.attackKind)){
        const q=ironfangSocket(boss,boss.attackKind==='cannon'?(boss.form==='flying'?'rocket':'gun'):'mouth'),size=8+Math.min(1,boss.phaseTime/.7)*16;
        if(boss.attackKind!=='cannon')this.image('if-breath-0',q.x,q.y,size,size,boss.aimAngle||0,.45).setOrigin(.1,.5);
      }
      if(boss.phase==='attack'&&['breath','cannon'].includes(boss.attackKind)){
        const breath=boss.attackKind==='breath',q=ironfangSocket(boss,breath?'mouth':boss.form==='flying'?'rocket':'gun');
        if(breath)this.image(`if-breath-${Math.floor(t*15)%3}`,q.x,q.y,86,40,boss.aimAngle||0,1).setOrigin(.07,.5);
      }
    }
    for(const muzzle of this.muzzles){
      muzzle.age+=dt;
      const boss=world.bosses.find(b=>b.id===muzzle.bossId),q=boss?ironfangSocket(boss,muzzle.slot||'gun'):muzzle.hero?(characterSocket(hero,'gun',firingFrame(hero))||muzzle):muzzle;
      const size=muzzle.hero?64:104;
      this.image(`if-muzzle-${Math.min(3,Math.floor(muzzle.age/.025))}`,q.x,q.y,size,size,muzzle.angle,Math.max(0,1-muzzle.age/.1));
    }
    this.muzzles=this.muzzles.filter(m=>m.age<.1);
    if (p.hp > 0 && (p.jetActive||p.boostActive)){
      const q=boosterPose(hero),size=p.boostActive?135:p.boost>0?110:90;
      this.image(`if-boost-${Math.floor(t*18)%4}`,q.x,q.y,size,size,q.rotation);
    }
  }
}
