// Presentation-only particles. Gameplay collision and damage stay in combat.js.
export class LanternEffects {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(11);
    this.particles = Array.from({ length: 240 }, () => ({ life: 0 }));
    this.ghosts = [];
    this.views = []; this.viewIndex = 0; this.fractures = [];
    this.clock = 0;
    this.nextJet = this.nextStep = this.nextGhost = this.nextFlame = 0;
    this.seed = 173;
  }
  random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  clear() {
    for (const p of this.particles) p.life = 0;
    for (const ghost of this.ghosts) { ghost.life = 0; ghost.view.setVisible(false); }
    this.graphics.clear();
    for (const view of this.views) view.setVisible(false);
    this.fractures.length = 0;
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
    if (e.type === 'land') this.dust(x, y, Math.ceil(12 * n), Math.max(.5, Math.min(1.6, (e.impactSpeed || 400) / 500)));
    else if (e.type === 'jump' || e.type === 'walljump') {
      if (e.kind === 'air') this.sparks(x, y, Math.ceil(12 * n), 0xb6e6d3);
      else this.dust(x, y, Math.ceil(8 * n), .7);
    } else if (e.type === 'slam') {
      for (let i = 0; i < 3; i++) this.dust(e.bounds ? e.bounds.x + e.bounds.w * (i + .5) / 3 : x + (i-1) * 70, y, Math.ceil(10 * n), 1.5, 0xb9ac87);
      this.sparks(x, y - 4, Math.ceil(16 * n));
      if(e.bounds) this.fractures.push({ ...e.bounds, y:e.surfaceY ?? y, age:0, life:.65 });
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
  image(frame,x,y,width,height,rotation=0,alpha=1,originY=.5) {
    let view=this.views[this.viewIndex++];
    if(!view){view=this.scene.add.image(0,0,'lantern-fx',frame).setDepth(11);this.views.push(view);}
    view.setTexture('lantern-fx',frame).setPosition(x,y).setOrigin(.5,originY).setDisplaySize(width,height).setRotation(rotation).setAlpha(alpha).setVisible(true);
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
      if (p.jetActive && t >= this.nextJet) {
        this.nextJet = t + (reduced ? .08 : .035);
        const x = hero.x + p.w / 2 - p.facing * 12, y = hero.y + p.h * .67;
        this.particle('smoke', x + (this.random() - .5) * 8, y + 30, -p.vx * .08 + (this.random() - .5) * 26, 42 + this.random() * 40, .65, 5 + this.random() * 4, 0x879594);
        this.particle('ember', x, y + 10, (this.random() - .5) * 35, 110 + this.random() * 90, .3, 2, 0xffc274);
      }
      if (p.grounded && Math.abs(p.vx) > 70 && t >= this.nextStep) {
        this.nextStep = t + .16; this.dust(hero.x + p.w / 2, hero.y + p.h, reduced ? 1 : 3, .35);
      }
      if (p.dashTime > 0 && t >= this.nextGhost && !reduced) {
        this.nextGhost = t + .035;
        let ghost = this.ghosts.find(item => item.life <= 0);
        if (!ghost && this.ghosts.length < 6) { ghost = { view: this.scene.add.image(0, 0, 'lantern-art').setDepth(7), life: 0 }; this.ghosts.push(ghost); }
        if (ghost) {
          const s = this.scene.playerSprite;
          ghost.life = .18;
          ghost.view.setTexture(s.texture.key, s.frame.name).setPosition(s.x, s.y).setOrigin(s.originX, s.originY).setScale(s.scaleX, s.scaleY).setFlipX(s.flipX).setTint(0xa2dacb).setVisible(true);
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
      } else {
        g.fillStyle(q.tint, a * (q.kind === 'dust' ? .55 : .85));
        const size = Math.max(1, Math.ceil(q.size * (q.kind === 'dust' ? 1 + age : a)));
        g.fillRect(Math.round(q.x), Math.round(q.y), size, size);
      }
    }
    for (const ghost of this.ghosts) {
      ghost.life = Math.max(0, ghost.life - dt); ghost.view.setAlpha(ghost.life / .18 * .32).setVisible(ghost.life > 0);
    }
    for(const crack of this.fractures){
      crack.age+=dt;const a=Math.max(0,1-crack.age/crack.life),reach=Math.min(1,crack.age/.12);
      g.lineStyle(2,0xf3c58d,a);g.beginPath();
      for(let i=0;i<=24;i++){const x=crack.x+crack.w*i/24,y=crack.y+2+(i%3)*3;i?g.lineTo(x,y):g.moveTo(x,y);}
      g.strokePath();g.lineStyle(1,0x0e1e20,a);
      for(let i=1;i<12*reach;i++){const x=crack.x+crack.w*i/12;g.lineBetween(x,crack.y+4,x+6,crack.y+15);g.lineBetween(x+6,crack.y+15,x+3,crack.y+22);}
    }
    this.fractures=this.fractures.filter(c=>c.age<c.life);
    for(const shot of world.projectiles){
      if(!shot.active||!['fire','dragonfire'].includes(shot.kind))continue;
      const angle=Math.atan2(shot.vy,shot.vx),size=shot.kind==='dragonfire'?1.3:1;
      this.image(`flame-${Math.floor(t*16)%4}`,shot.x,shot.y,35*size,55*size,angle+Math.PI/2,.95,12/128);
    }
    for(const boss of world.bosses){if(boss.phase!=='transform'||boss.dead)continue;
      for(let i=0;i<3;i++)this.plume(boss.x+boss.w*(i+1)/4,boss.y+boss.h,boss.facing,t+i*.2,1.5,true).setRotation(Math.PI);
    }
    if (p.hp > 0 && p.jetActive) this.plume(hero.x + p.w / 2 - p.facing * 12, hero.y + p.h * .67, 1, t, p.boost > 0 ? 1.4 : 1, true);
  }
}
