import { moveBody, overlaps } from './physics.js';
import { companionFrame, characterSocket, firingFrame } from './character-motion.js';

export const COMPANIONS = Object.freeze({
  wolf: { w: 60, h: 34, speed: 300, acceleration: 1250, jump: 660, range: 112, windup: .14, contact: .22, recovery: .48, cooldown: .95 },
  clone: { w: 28, h: 60, speed: 215, acceleration: 1050, jump: 620, range: 650, windup: .18, contact: .10, recovery: .28, cooldown: .85 },
  dragon: { w: 72, h: 48, speed: 235, acceleration: 560, range: 470, windup: .3, contact: .42, recovery: .4, cooldown: 1.45, flying: true },
  raven: { w: 42, h: 30, speed: 330, acceleration: 1000, range: 420, windup: .2, contact: .55, recovery: .55, cooldown: 1.6, flying: true },
});
const center = a => ({ x: a.x + a.w / 2, y: a.y + a.h / 2 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const approach = (a, b, n) => a + Math.max(-n, Math.min(n, b - a));

export function placeCompanion(world, a) {
  const p = world.player, profile = COMPANIONS[a.type];
  for (const height of profile.flying ? [80, 140, 20, 200] : [0, 60, 120]) {
    for (const offset of [-70 * p.facing, 70 * p.facing, 0, -130 * p.facing, 130 * p.facing]) {
      const candidate = { x: Math.max(0, Math.min(world.level.width - a.w, p.x + offset)), y: Math.max(0, p.y + p.h - a.h - height), w: a.w, h: a.h };
      if (!world.solids.some(s => overlaps(candidate, s))) { Object.assign(a, candidate); return true; }
    }
  }
  return false;
}

// Expanded-body visibility is also used for path smoothing. Flying creatures
// treat one-way ledges as obstacles; grounded creatures may drop through them.
export function flightPath(actor, goal, solids, segmentHit) {
  const start = center(actor), paddingX = actor.w / 2 + .01, paddingY = actor.h / 2 + .01;
  const obstacles = solids.filter(s => Math.abs(s.x + s.w / 2 - start.x) < s.w / 2 + 900 && Math.abs(s.y + s.h / 2 - start.y) < s.h / 2 + 700)
    .map(s => ({ x: s.x - paddingX, y: s.y - paddingY, w: s.w + paddingX * 2, h: s.h + paddingY * 2 }));
  const clear = (a, b) => !obstacles.some(s => segmentHit(a.x, a.y, b.x, b.y, s));
  if (clear(start, goal)) return [goal];
  // A bounded visibility graph around solid corners avoids grid rounding and
  // narrow-corridor corner cutting. Only full-body-clear edges are traversed.
  const nodes = [start, goal];
  for (const s of obstacles) for (const x of [s.x - 18, s.x + s.w + 18]) for (const y of [s.y - 18, s.y + s.h + 18]) {
    const p = { x, y };
    if (distance(p, start) < 1000 && y >= 0 && !obstacles.some(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)) nodes.push(p);
  }
  const cost = nodes.map(() => Infinity), previous = [], closed = new Set(); cost[0] = 0;
  for (let iteration = 0; iteration < Math.min(nodes.length, 180); iteration++) {
    let current = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i++) if (!closed.has(i) && cost[i] + distance(nodes[i], goal) < best) { current = i; best = cost[i] + distance(nodes[i], goal); }
    if (current < 0) break;
    if (current === 1) {
      const path = []; for (let i = 1; i !== 0; i = previous[i]) path.unshift(nodes[i]); return path;
    }
    closed.add(current);
    for (let i = 1; i < nodes.length; i++) if (!closed.has(i)) {
      const next = cost[current] + distance(nodes[current], nodes[i]);
      if (next < cost[i] && clear(nodes[current], nodes[i])) { cost[i] = next; previous[i] = current; }
    }
  }
  return [];
}

function groundMove(a, goal, solids, dt, profile) {
  const dx = goal.x - center(a).x, direction = Math.sign(dx), feet = a.y + a.h;
  let speed = Math.abs(dx) > 20 ? direction * Math.min(profile.speed, Math.abs(dx) * 5) : 0;
  const brakingDistance = (a.vx || 0) ** 2 / (2 * profile.acceleration) + 20;
  const ahead = direction > 0 ? a.x + a.w + brakingDistance : a.x - brakingDistance;
  const support = x => solids.find(s => x >= s.x && x <= s.x + s.w && s.y >= feet - 2 && s.y <= feet + 72);
  const obstacle = solids.find(s => !s.oneWay && s.x < ahead + 5 && s.x + s.w > ahead - 5 && s.y < feet && s.y + s.h > a.y);
  if (a.grounded && direction) {
    const jumpHeight = profile.jump ** 2 / 3600;
    if (obstacle) {
      const landingX = direction > 0 ? obstacle.x + a.w / 2 + 5 : obstacle.x + obstacle.w - a.w / 2 - 5;
      const headroom = !solids.some(s => !s.oneWay && s !== obstacle && overlaps({ x: Math.min(a.x, landingX - a.w / 2), y: obstacle.y - a.h - 8, w: Math.abs(landingX - center(a).x) + a.w, h: a.h }, s));
      if (feet - obstacle.y < jumpHeight - 12 && obstacle.w >= a.w && headroom) a.vy = -profile.jump;
      else speed = 0;
    } else if (!support(ahead)) {
      const landing = [60, 100, 140, 175].map(n => support(ahead + direction * n)).find(Boolean);
      if (landing && Math.abs(dx) > 80) a.vy = -profile.jump;
      else speed = 0;
    }
    if (a.onOneWay && goal.y > feet + 80 && Math.abs(dx) < 120) { a.dropThrough = .24; a.y += 2; }
  }
  a.dropThrough = Math.max(0, (a.dropThrough || 0) - dt);
  a.vx = approach(a.vx || 0, speed, profile.acceleration * dt);
  a.vy = Math.min(900, (a.vy || 0) + 1800 * dt);
  moveBody(a, solids, dt);
}

function flyMove(a, goal, solids, dt, profile, segmentHit, dive) {
  a.navigationTime = Math.max(0, (a.navigationTime || 0) - dt);
  if (!a.path || !a.navigationTime || distance(goal, a.navigationGoal || goal) > 75) {
    a.path = flightPath(a, goal, solids, segmentHit); a.navigationGoal = goal; a.navigationTime = .32;
  }
  const c = center(a);
  while (a.path.length && distance(c, a.path[0]) < 4) a.path.shift();
  const waypoint = a.path[0] || c, dx = waypoint.x - c.x, dy = waypoint.y - c.y, length = Math.hypot(dx, dy);
  const speed = Math.min(dive ? 760 : profile.speed, length * 6), acceleration = dive ? 3000 : profile.acceleration;
  a.vx = approach(a.vx || 0, dx / (length || 1) * speed, acceleration * dt);
  a.vy = approach(a.vy || 0, dy / (length || 1) * speed, acceleration * dt);
  // For aerial bodies, one-way platforms block every approach direction.
  moveBody(a, solids.map(s => s.oneWay ? { ...s, oneWay: false } : s), dt);
}

export function updateCompanion(world, a, dt, api) {
  const profile = COMPANIONS[a.type]; if (!profile) return;
  a.animationTime = (a.animationTime || 0) + dt;
  a.cooldown = Math.max(0, (a.cooldown || 0) - dt);
  const old = center(a), oldX = a.x, p = world.player;
  const solids = world.solids.filter(s => Math.abs(s.x + s.w / 2 - old.x) < s.w / 2 + 1100);
  const visible = (from, to) => !solids.some(s => !s.oneWay && api.segmentHit(from.x, from.y, to.x, to.y, s));
  const candidates = api.targets.filter(e => distance(center(e), old) < 1000 && distance(center(e), center(p)) < 1400);
  let target = candidates.find(e => e.id === a.targetId);
  if (!target || !a.attackPhase) target = candidates.sort((x, y) => distance(center(x), old) + (visible(old, center(x)) ? 0 : 500) - distance(center(y), old) - (visible(old, center(y)) ? 0 : 500))[0];
  a.targetId = target?.id || null;
  if (a.attackPhase && a.attackPhase !== 'recovery' && (!target || !visible(old, center(target)))) { a.attackPhase = 'recovery'; a.attackElapsed = 0; a.cooldown = profile.cooldown; }
  const facing = target ? Math.sign(center(target).x - old.x) : Math.sign(p.x - a.x);
  if (facing) a.facing = facing;
  if (target && a.type === 'clone') a.aimAngle = Math.atan2(center(target).y - old.y, center(target).x - old.x);
  const goal = target ? { x: center(target).x - a.facing * (a.type === 'wolf' ? 65 : a.type === 'raven' ? 125 : 180),
    y: profile.flying ? Math.max(35, target.y - (a.type === 'raven' ? 110 : 35)) : target.y + target.h }
    : { x: p.x - p.facing * (a.type === 'raven' ? 100 : 70), y: profile.flying ? Math.max(35, p.y - 70) : p.y + p.h };
  // A preferred stand-off position may be inside a wall. Approach a clear point
  // above the target instead of repeatedly planning to an unreachable interior.
  if (profile.flying && solids.some(s => overlaps({ x: goal.x - a.w / 2 - 4, y: goal.y - a.h / 2 - 4, w: a.w + 8, h: a.h + 8 }, s))) {
    const anchor = target || p; goal.x = anchor.x + anchor.w / 2; goal.y = Math.max(a.h, anchor.y - 90);
  }
  if (!a.attackPhase && target && !a.cooldown && distance(old, center(target)) < profile.range && visible(old, center(target))
    && (a.type !== 'wolf' || Math.abs(old.y - center(target).y) < 85)) {
    a.attackPhase = 'lift'; a.attackElapsed = 0; a.struck = false; a.shotTimer = 0; a.cooldown = profile.cooldown;
  }
  if (a.attackPhase) {
    a.attackElapsed += dt;
    const duration = a.attackPhase === 'lift' ? profile.windup : a.attackPhase === 'contact' ? profile.contact : profile.recovery;
    a.attackProgress = Math.min(1, a.attackElapsed / duration);
    if (a.attackElapsed >= duration) {
      a.attackPhase = a.attackPhase === 'lift' ? 'contact' : a.attackPhase === 'contact' ? 'recovery' : '';
      a.attackElapsed = 0; a.attackProgress = 0;
      if (a.type === 'wolf' && a.attackPhase === 'contact' && a.grounded) a.vy = -180;
    }
  }
  const contact = a.attackPhase === 'contact';
  if (profile.flying) {
    const diving = a.type === 'raven' && contact && target;
    if (diving) {
      const hitGoal = center(target);
      const expanded = solids.map(s => ({ x: s.x - a.w / 2, y: s.y - a.h / 2, w: s.w + a.w, h: s.h + a.h }));
      if (expanded.some(s => api.segmentHit(old.x, old.y, hitGoal.x, hitGoal.y, s))) { a.attackPhase = 'recovery'; a.attackElapsed = 0; a.path = null; }
      else { a.path = [hitGoal]; a.navigationGoal = hitGoal; a.navigationTime = .32; }
    }
    flyMove(a, diving && a.attackPhase === 'contact' ? center(target) : goal, solids, dt, profile, api.segmentHit, diving && a.attackPhase === 'contact');
  } else {
    const moveGoal = a.type === 'wolf' && contact && target ? center(target) : a.attackPhase && a.type === 'clone' ? { ...goal, x: old.x } : goal;
    groundMove(a, moveGoal, solids, dt, profile);
  }
  a.distance = (a.distance || 0) + Math.abs(a.x - oldX);
  a.x = Math.max(0, Math.min(world.level.width - a.w, a.x)); a.y = Math.max(0, a.y);
  if (a.y > world.level.height + 100) { a.life = 0; return; }
  a.action = a.attackPhase ? 'attack' : Math.hypot(a.vx, a.vy) > 8 ? 'run' : 'idle';
  a.attackTime = contact ? profile.contact - a.attackElapsed : 0;
  if (!target || a.attackPhase !== 'contact') return;
  const key = companionFrame(a), slot = a.type === 'raven' ? 'claw' : a.type === 'clone' ? 'hand' : 'mouth';
  const origin = characterSocket(a, slot, key) || center(a), aim = center(target);
  if (!visible(origin, aim)) return;
  if (a.type === 'wolf' || a.type === 'raven') {
    const touch = api.segmentHit(old.x, old.y, center(a).x, center(a).y, target, a.type === 'wolf' ? 22 : 16)
      || overlaps({ x: origin.x - 15, y: origin.y - 15, w: 30, h: 30 }, target);
    if (touch && !a.struck) {
      a.struck = true;
      if (a.type === 'raven') target.weakened = Math.max(target.weakened || 0, 1.8);
      api.hitEnemy(world, target, a.type === 'wolf' ? 18 : 15);
      api.emit(world, 'summonattack', origin.x, origin.y, { kind: a.type, facing: a.facing, enemyId: target.id });
    }
  } else {
    a.shotTimer -= dt;
    if (a.shotTimer > 0 || (a.type === 'clone' && a.struck)) return;
    a.shotTimer = .10; a.struck = true;
    const muzzle = a.type === 'clone' ? characterSocket(a, 'gun', firingFrame(a)) : origin;
    const angle = Math.atan2(aim.y - muzzle.y, aim.x - muzzle.x); a.aimAngle = angle;
    if (!visible(origin, muzzle)) return;
    const shot = api.spawnProjectile(world, muzzle.x, muzzle.y, Math.cos(angle) * (a.type === 'dragon' ? 540 : 700), Math.sin(angle) * (a.type === 'dragon' ? 540 : 700), 'player');
    if (shot) {
      shot.kind = a.type === 'dragon' ? 'dragonfire' : 'ally'; shot.damage = a.type === 'dragon' ? 6 : 12;
      shot.tint = a.type === 'dragon' ? 0xffbc67 : 0xbee9dc; shot.life = a.type === 'dragon' ? .9 : 1.3;
      if (a.type === 'clone') { shot.sweepX = origin.x; shot.sweepY = origin.y; }
    }
    api.emit(world, 'summonattack', muzzle.x, muzzle.y, { kind: a.type, facing: a.facing, angle });
  }
}
