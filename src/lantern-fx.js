// Presentation-only particles. Gameplay collision and damage stay in combat.js.
export class LanternEffects {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(11);
    this.particles = Array.from({ length: 240 }, () => ({ life: 0 }));
    this.ghosts = [];
    this.clock = 0;
    this.nextJet = this.nextStep = this.nextGhost = this.nextFlame = 0;
    this.seed = 173;
  }
  random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  clear() {
    for (const p of this.particles) p.life = 0;
    for (const ghost of this.ghosts) { ghost.life = 0; ghost.view.setVisible(false); }
    this.graphics.clear();
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
      for (let i = -1; i <= 1; i++) this.dust(x + i * (e.radius || 120) * .6, y, Math.ceil(10 * n), 1.5, 0xb9ac87);
      this.sparks(x, y - 4, Math.ceil(16 * n));
      this.particle('shock', x, y, 0, 0, .35, e.radius || 150, 0xffc77f);
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
  plume(x, y, facing, t, size = 1, vertical = false) {
    const g = this.graphics;
    const length = (27 + Math.sin(t * 49) * 5) * size;
    for (let i = 4; i >= 0; i--) {
      const along = i * length / 5, width = (12 - i * 2) * size;
      g.fillStyle(i > 2 ? 0xe46a36 : i ? 0xffb65b : 0xfff1bf, i > 2 ? .6 : .95);
      if (vertical) g.fillRect(Math.round(x - width / 2 + Math.sin(t * 29 + i) * 2), Math.round(y + along), Math.ceil(width), Math.ceil(length / 4));
      else g.fillRect(Math.round(x + facing * along - length / 8), Math.round(y - width / 2), Math.ceil(length / 4), Math.ceil(width));
    }
  }
  update(dt, world, reduced = false, hero = world.player) {
    const g = this.graphics, p = world.player;
    g.clear(); this.clock += dt;
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
      if (q.kind === 'shock') {
        const r = q.size * Math.min(1, age * 2);
        g.lineStyle(3, q.tint, a * .7); g.strokeEllipse(q.x, q.y - 2, r * 2, 8 + age * 12);
      } else if (q.kind === 'smoke') {
        const r = Math.round(q.size * (1 + age * 2));
        g.fillStyle(q.tint, a * .2); g.fillRect(Math.round(q.x - r), Math.round(q.y - r / 2), r * 2, r);
        g.fillStyle(q.tint, a * .12); g.fillRect(Math.round(q.x - r * .6), Math.round(q.y - r), Math.ceil(r * 1.3), r * 2);
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
    for(const shot of world.projectiles){
      if(!shot.active||!['fire','dragonfire'].includes(shot.kind))continue;
      const angle=Math.atan2(shot.vy,shot.vx),size=shot.kind==='dragonfire'?1.3:1;
      for(let i=4;i>=0;i--){const radius=Math.max(2,(7-i)*size);g.fillStyle(i>2?0xe3753d:i?0xffb75d:0xfff2b9,i>2?.35:.9);g.fillRect(Math.round(shot.x-Math.cos(angle)*i*5-radius/2),Math.round(shot.y-Math.sin(angle)*i*5-radius/2),radius,radius);}
    }
    for(const boss of world.bosses){if(boss.phase!=='transform'||boss.dead)continue;
      const x=boss.x+boss.w/2,y=boss.y+boss.h/2,r=boss.w*.65;
      g.lineStyle(3,0xffbd68,.5);g.strokeEllipse(x,y,r*2,r*1.6);this.plume(x,y,boss.facing,t,2);
    }
    if (p.hp > 0 && p.jetActive) this.plume(hero.x + p.w / 2 - p.facing * 12, hero.y + p.h * .67, 1, t, p.boost > 0 ? 1.4 : 1, true);
  }
}
