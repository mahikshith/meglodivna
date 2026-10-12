import { createPlayer, stepPlayer, overlaps, moveBody } from './physics.js';
import { LEVEL, createEnemies } from './level.js';

export const STEP = 1 / 120;
export function createWorld(checkpoint = 0) {
  const cp = LEVEL.checkpoints[checkpoint] || LEVEL.spawn;
  const player = Object.assign(createPlayer(cp.x, cp.y), {
    hp: 100, maxHp: 100, invincible: 0.7, shootCooldown: 0, slashCooldown: 0,
    slashTime: 0, slashId: 0, combo: 0, comboWindow: 0, rapid: 0, shield: 0, impaired: 0,
  });
  return {
    player, enemies: createEnemies().map(e => ({ ...e, baseY: e.y, cooldown: 1.1, windup: 0, dead: e.x < cp.x - 350 })),
    boss: { ...LEVEL.boss, maxHp: LEVEL.boss.hp, active: false, timer: 1.4, attack: 0, phase: 'idle', phaseTime: 0, lastSlash: -1 },
    projectiles: Array.from({ length: 96 }, () => ({ active: false })),
    pickups: LEVEL.pickups.map(item => ({ ...item, taken: item.x < cp.x - 300 })),
    checkpoint, time: 0, kills: 0, status: 'playing', events: [], bossDefeated: false,
    dialogue: '', dialogueTime: 0, hitstop: 0, deaths: 0,
  };
}

export function say(world, text, duration = 4) {
  world.dialogue = text; world.dialogueTime = duration;
}

function emit(world, type, x, y, extra = {}) {
  if (world.events.length < 80) world.events.push({ type, x, y, ...extra });
}

export function spawnProjectile(world, x, y, vx, vy, owner, missile = false) {
  const b = world.projectiles.find(item => !item.active);
  if (!b) return;
  Object.assign(b, { active: true, x, y, vx, vy, w: missile ? 14 : 8, h: missile ? 8 : 4,
    owner, missile, life: missile ? 5 : 2.2, damage: owner === 'player' ? 8 : missile ? 22 : 12 });
  return b;
}

// Swept segment catches fast bullets crossing thin hurt boxes between physics ticks.
export function segmentHit(x0, y0, x1, y1, box, padding = 0) {
  let near = 0, far = 1;
  for (const [start, end, low, high] of [[x0, x1, box.x - padding, box.x + box.w + padding],
    [y0, y1, box.y - padding, box.y + box.h + padding]]) {
    const d = end - start;
    if (Math.abs(d) < 0.0001) { if (start < low || start > high) return false; continue; }
    let a = (low - start) / d, b = (high - start) / d;
    if (a > b) [a, b] = [b, a];
    near = Math.max(near, a); far = Math.min(far, b);
    if (near > far) return false;
  }
  return true;
}

export function damagePlayer(world, amount, sourceX) {
  const p = world.player;
  if (p.invincible > 0 || p.dashTime > 0 || world.status !== 'playing') return false;
  const absorbed = Math.min(amount, p.shield); p.shield -= absorbed;
  p.hp = Math.max(0, p.hp - amount + absorbed); p.invincible = 0.85;
  p.vx = p.x < sourceX ? -230 : 230; p.vy = -170;
  emit(world, 'hurt', p.x + 12, p.y + 20); world.hitstop = 0.035;
  if (p.hp === 0) { world.status = 'dead'; emit(world, 'death', p.x + 12, p.y + 20); }
  return true;
}

function hitEnemy(world, e, damage) {
  if (e.dead || e.hp <= 0) return;
  e.hp = Math.max(0, e.hp - damage); e.flash = 0.1;
  emit(world, 'hit', e.x + e.w / 2, e.y + e.h / 2);
  if (e.hp === 0) {
    e.dead = true; world.kills++; emit(world, 'explode', e.x + e.w / 2, e.y + e.h / 2);
    if (e === world.boss) {
      world.bossDefeated = true; world.projectiles.forEach(b => { if (b.owner !== 'player') b.active = false; });
      say(world, 'WARDEN // SIGNAL LOST. Take the core. Get out.', 6);
    }
  }
}

export function hazardState(h, time) {
  if (!h.period && h.type !== 'laser') return 'active';
  const phase = ((time + (h.phase || 0)) % (h.period || 3.2));
  if (phase < (h.onTime || 1.2)) return 'active';
  return h.type === 'laser' && phase > (h.period || 3.2) - 0.55 ? 'warning' : 'off';
}

function enemyFire(world, e, missile = false, spread = 0) {
  const p = world.player, x = e.x + e.w / 2, y = e.y + e.h * 0.35;
  const angle = Math.atan2(p.y + 20 - y, p.x + 12 - x) + spread;
  const speed = missile ? 220 : e.type === 'drone' ? 270 : 340;
  spawnProjectile(world, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 'enemy', missile);
  emit(world, 'enemyshot', x, y);
}

function updateBoss(world, dt) {
  const b = world.boss, p = world.player;
  if (b.dead) return;
  if (!b.active && p.x > 8100) {
    b.active = true; b.timer = 1.5;
    say(world, 'WARDEN // Unauthorized lifeform. Your heat signature ends here.', 5);
    emit(world, 'bossstart', b.x, b.y);
  }
  if (!b.active) return;
  b.flash = Math.max(0, (b.flash || 0) - dt);
  b.timer -= dt; b.phaseTime += dt;
  if (b.phase === 'idle' && b.timer <= 0) {
    b.attack = (b.attack + 1) % 3; b.phase = 'charge'; b.phaseTime = 0; b.timer = b.attack === 2 ? 1.1 : 0.7;
    b.aimY = Math.min(580, p.y + 22); b.aimX = p.x; emit(world, 'charge', b.x, b.y + 55);
  } else if (b.phase === 'charge' && b.timer <= 0) {
    b.phase = 'attack'; b.phaseTime = 0; b.timer = b.attack === 2 ? 0.75 : 0.14; b.shots = 0;
  }
  if (b.phase === 'attack') {
    if (b.attack === 2) {
      const beam = { x: Math.min(b.x, b.aimX) - 600, y: b.aimY - 7, w: Math.abs(b.x - b.aimX) + 700, h: 14 };
      b.beam = beam;
      if (overlaps(p, beam)) damagePlayer(world, 24, b.x);
      if (b.timer <= 0) finishBossAttack(b);
    } else if (b.timer <= 0) {
      const dir = p.x < b.x ? -1 : 1, muzzleX = b.x + (dir > 0 ? b.w + 8 : -8), muzzleY = b.y + 45;
      if (b.attack === 0) {
        for (const vy of [-110, 0, 110]) spawnProjectile(world, muzzleX, muzzleY, dir * 330, vy, 'enemy');
      } else {
        const angle = Math.atan2(p.y + 20 - muzzleY, p.x - muzzleX);
        spawnProjectile(world, muzzleX, muzzleY, Math.cos(angle) * 230, Math.sin(angle) * 230, 'enemy', true);
      }
      emit(world, 'enemyshot', muzzleX, muzzleY); b.shots++; b.timer = b.hp < b.maxHp / 2 ? 0.27 : 0.38;
      if (b.shots >= (b.attack === 0 ? 4 : 3)) finishBossAttack(b);
    }
  }
}

function finishBossAttack(b) { b.phase = 'idle'; b.timer = b.hp < b.maxHp / 2 ? 0.65 : 1.1; b.phaseTime = 0; b.beam = null; }

export function stepWorld(world, input, dt = STEP) {
  if (world.status !== 'playing') return;
  const p = world.player;
  world.time += dt; world.dialogueTime = Math.max(0, world.dialogueTime - dt);
  p.aimUp = !!input.aimUp;
  for (const key of ['invincible', 'shootCooldown', 'slashCooldown', 'slashTime', 'comboWindow', 'rapid', 'impaired']) p[key] = Math.max(0, p[key] - dt);
  const physicsInput = p.impaired ? { ...input, move: input.move * 0.6, dashPressed: false, jet: false } : input;
  for (const name of stepPlayer(p, physicsInput, LEVEL.solids, dt)) emit(world, name, p.x + 12, p.y + 46);
  p.x = Math.max(0, Math.min(LEVEL.width - p.w, p.x));
  if (p.y > LEVEL.height + 70) {
    p.hp = 0; world.status = 'dead'; emit(world, 'death', p.x, p.y); return;
  }
  if (input.slashPressed && p.slashCooldown <= 0) {
    p.combo = p.comboWindow > 0 ? (p.combo + 1) % 3 : 0;
    p.comboWindow = 0.65; p.slashCooldown = 0.28; p.slashTime = 0.2; p.slashId++;
    emit(world, 'slash', p.x + 12 + p.facing * 32, p.y + 22, { facing: p.facing });
  }
  if (input.shoot && p.shootCooldown <= 0) {
    p.shootCooldown = p.rapid > 0 ? 0.075 : p.impaired > 0 ? 0.36 : 0.17;
    const up = input.aimUp; const x = p.x + 12 + (up ? 0 : p.facing * 20), y = p.y + 18;
    spawnProjectile(world, x, y, up ? 0 : p.facing * 920, up ? -920 : 0, 'player');
    emit(world, 'shot', x, y);
  }
  const slashBox = { x: p.facing > 0 ? p.x + 8 : p.x - 68, y: p.y - 7, w: 84, h: 62 };
  for (const e of world.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, (e.flash || 0) - dt);
    if (p.slashTime > 0 && e.lastSlash !== p.slashId && overlaps(slashBox, e)) {
      e.lastSlash = p.slashId; hitEnemy(world, e, p.combo === 2 ? 40 : 27); world.hitstop = 0.035;
    }
    if (e.dead || Math.abs(e.x - p.x) > 900) continue;
    const distance = Math.abs(e.x - p.x);
    if (e.type === 'drone') {
      e.patrolDirection ||= e.facing;
      e.x += e.patrolDirection * 38 * dt;
      if (e.x <= e.minX) e.patrolDirection = 1;
      if (e.x >= e.maxX) e.patrolDirection = -1;
      e.y = e.baseY + Math.sin(world.time * 1.7 + e.x * 0.01) * 24;
    }
    else if (e.type === 'guard') {
      e.vx = distance < 330 ? 0 : e.facing * 48; e.vy = (e.vy || 0) + 1800 * dt;
      moveBody(e, LEVEL.solids, dt);
      if (e.x <= e.minX) e.facing = 1;
      if (e.x >= e.maxX) e.facing = -1;
    }
    if (distance < 650) {
      e.facing = p.x < e.x ? -1 : 1; e.cooldown -= dt;
      if (e.cooldown < 0.48) e.windup = 0.48 - Math.max(0, e.cooldown);
      if (e.cooldown <= 0) {
        enemyFire(world, e, e.type === 'turret'); e.cooldown = e.type === 'drone' ? 1.7 : e.type === 'turret' ? 2.4 : 1.45; e.windup = 0;
      }
    }
    if (overlaps(p, e)) damagePlayer(world, 16, e.x);
  }
  const b = world.boss;
  if (b.active && !b.dead && p.slashTime > 0 && b.lastSlash !== p.slashId && overlaps(slashBox, b)) {
    b.lastSlash = p.slashId; hitEnemy(world, b, p.combo === 2 ? 26 : 18); world.hitstop = 0.04;
  }
  updateBoss(world, dt);
  if (b.active && !b.dead && overlaps(p, b)) damagePlayer(world, 20, b.x);
  for (const projectile of world.projectiles) {
    if (!projectile.active) continue;
    const oldX = projectile.x, oldY = projectile.y;
    if (projectile.missile && projectile.owner !== 'player') {
      const angle = Math.atan2(p.y + 20 - projectile.y, p.x + 12 - projectile.x);
      projectile.vx += Math.cos(angle) * 70 * dt; projectile.vy += Math.sin(angle) * 70 * dt;
    }
    projectile.x += projectile.vx * dt; projectile.y += projectile.vy * dt; projectile.life -= dt;
    if (projectile.life <= 0) { projectile.active = false; continue; }
    if (p.slashTime > 0 && projectile.owner === 'enemy' && overlaps(slashBox, projectile)) {
      projectile.owner = 'player'; projectile.vx = p.facing * 920; projectile.vy = -30; projectile.damage = 16;
      emit(world, 'parry', projectile.x, projectile.y); continue;
    }
    if (LEVEL.solids.some(s => !s.oneWay && segmentHit(oldX, oldY, projectile.x, projectile.y, s, 1))) {
      projectile.active = false; emit(world, projectile.missile ? 'explode' : 'spark', projectile.x, projectile.y); continue;
    }
    if (projectile.owner === 'player') {
      const enemy = world.enemies.find(e => !e.dead && segmentHit(oldX, oldY, projectile.x, projectile.y, e, 2));
      const target = enemy || (b.active && !b.dead && segmentHit(oldX, oldY, projectile.x, projectile.y, b, 2) ? b : null);
      if (target) { projectile.active = false; hitEnemy(world, target, projectile.damage); }
    } else if (segmentHit(oldX, oldY, projectile.x, projectile.y, p, 2)) {
      projectile.active = false; damagePlayer(world, projectile.damage, projectile.x);
      emit(world, projectile.missile ? 'explode' : 'spark', projectile.x, projectile.y);
    }
  }
  for (const h of LEVEL.hazards) {
    if (!overlaps(p, h) || hazardState(h, world.time) !== 'active') continue;
    if (h.type === 'emp') {
      if (p.impaired <= 0) { emit(world, 'emp', p.x, p.y); say(world, 'EMP FIELD // Thrusters offline. Keep moving.', 2.2); }
      p.impaired = 2;
    } else damagePlayer(world, h.type === 'laser' ? 24 : h.type === 'spikes' ? 30 : 18, h.x);
  }
  if (world.status !== 'playing') return;
  for (const item of world.pickups) {
    if (item.taken || !overlaps(p, { ...item, x: item.x - 14, y: item.y - 16, w: 28, h: 32 })) continue;
    item.taken = true; emit(world, 'pickup', item.x, item.y, { kind: item.type });
    if (item.type === 'health') p.hp = Math.min(p.maxHp, p.hp + 35);
    if (item.type === 'fuel') p.fuel = 100;
    if (item.type === 'rapid') { p.rapid = 12; say(world, 'OVERDRIVE // Rapid fire. Twelve seconds. Make them count.', 3); }
    if (item.type === 'shield') p.shield = 35;
  }
  LEVEL.checkpoints.forEach((cp, i) => {
    if (i > world.checkpoint && Math.abs(p.x - cp.x) < 70 && Math.abs(p.y - cp.y) < 110) {
      world.checkpoint = i; p.hp = Math.min(100, p.hp + 22); p.fuel = 100;
      emit(world, 'checkpoint', cp.x, cp.y); say(world, `RELAY // ${cp.label}. Route secured.`, 2.5);
    }
  });
  if (world.bossDefeated && overlaps(p, LEVEL.exit)) {
    world.status = 'won'; emit(world, 'win', p.x, p.y);
  }
}
