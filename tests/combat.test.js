import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL } from '../src/legacy-level.js';
import { createWorld as makeWorld, damagePlayer, hazardState, segmentHit, spawnProjectile, STEP, stepWorld } from '../src/combat.js';
const createWorld = checkpoint => makeWorld(checkpoint, { level: LEVEL });

const input = (changes = {}) => ({ move: 0, jumpPressed: false, jumpHeld: false, dashPressed: false,
  jet: false, down: false, slashPressed: false, shoot: false, aimUp: false, ...changes });
function isolatedWorld() {
  const world = createWorld();
  world.enemies = [];
  world.pickups = [];
  world.player.invincible = 0;
  return world;
}
function tick(world, frames, controls = input()) {
  for (let frame = 0; frame < frames; frame++) stepWorld(world, controls, STEP);
}
function target(x, y, hp = 100) {
  return { id: 'test-target', type: 'turret', x, y, w: 30, h: 44, hp,
    facing: -1, minX: x, maxX: x, cooldown: 100, windup: 0 };
}

test('shield absorbs first, damage grants invulnerability, and lethal damage enters dead state', () => {
  const world = isolatedWorld();
  const p = world.player;
  p.shield = 20;
  assert.equal(damagePlayer(world, 32, p.x + 50), true);
  assert.equal(p.shield, 0);
  assert.equal(p.hp, 100 - Math.max(0, 32 * world.rules.damage - 20));
  assert.equal(damagePlayer(world, 100, p.x + 50), false);
  assert.equal(p.hp, 100 - Math.max(0, 32 * world.rules.damage - 20));
  p.invincible = 0;
  p.dashTime = 0.1;
  assert.equal(damagePlayer(world, 100, p.x + 50), false);
  p.dashTime = 0;
  assert.equal(damagePlayer(world, 200, p.x + 50), true);
  assert.equal(p.hp, 0);
  assert.equal(world.status, 'dead');
  assert.ok(world.events.some(event => event.type === 'death'));
});

test('swept segments catch forward/reverse thin targets, including stationary inside points', () => {
  const box = { x: 50, y: 20, w: 2, h: 40 };
  assert.equal(segmentHit(0, 30, 100, 30, box), true);
  assert.equal(segmentHit(100, 30, 0, 30, box), true);
  assert.equal(segmentHit(0, 0, 100, 0, box), false);
  assert.equal(segmentHit(51, 30, 51, 30, box), true);
  assert.equal(segmentHit(55, 30, 55, 30, box), false);
  assert.equal(segmentHit(55, 30, 55, 30, box, 3), true);
});

test('projectile pool is bounded and expired bullets release their slots', () => {
  const world = isolatedWorld();
  for (let i = 0; i < 96; i++) assert.ok(spawnProjectile(world, 100, 20, 0, 0, 'player'));
  assert.equal(spawnProjectile(world, 100, 20, 0, 0, 'enemy'), undefined);
  assert.equal(world.projectiles.length, 96);
  world.projectiles.forEach(projectile => { projectile.life = STEP / 2; });
  stepWorld(world, input(), STEP);
  assert.equal(world.projectiles.filter(projectile => projectile.active).length, 0);
  assert.ok(spawnProjectile(world, 100, 20, 0, 0, 'enemy', true));
  world.projectiles[0].life = STEP / 2;
  stepWorld(world, input(), STEP);
  assert.equal(world.projectiles[0].active, false);
});

test('fast player bullets damage a crossed enemy once and then deactivate', () => {
  const world = isolatedWorld();
  const enemy = target(280, 100, 16);
  world.enemies = [enemy];
  const bullet = spawnProjectile(world, 200, 120, 30000, 0, 'player');
  stepWorld(world, input(), STEP);
  assert.equal(enemy.hp, 8);
  assert.equal(bullet.active, false);
  tick(world, 5);
  assert.equal(enemy.hp, 8);
});

test('a blade swing hits each enemy once and a later swing can hit again', () => {
  const world = isolatedWorld();
  tick(world, 5);
  const p = world.player;
  const enemy = target(p.x + 40, p.y);
  world.enemies = [enemy];
  stepWorld(world, input({ slashPressed: true }), STEP);
  assert.equal(enemy.hp, 73);
  tick(world, 25);
  assert.equal(enemy.hp, 73);
  tick(world, 12);
  stepWorld(world, input({ slashPressed: true }), STEP);
  assert.equal(enemy.hp, 46);
  assert.equal(p.slashId, 2);
});

test('rapid fire expires and shooting returns to the normal cadence', () => {
  const world = isolatedWorld();
  world.player.rapid = 0.03;
  stepWorld(world, input({ shoot: true }), STEP);
  assert.equal(world.player.shootCooldown, 0.075);
  tick(world, 12);
  assert.equal(world.player.rapid, 0);
  stepWorld(world, input({ shoot: true }), STEP);
  assert.equal(world.player.shootCooldown, 0.17);
});

test('EMP disables dash and jet, reduces movement, and clears after leaving the field', () => {
  const world = isolatedWorld();
  const p = world.player;
  const emp = LEVEL.hazards.find(hazard => hazard.type === 'emp');
  assert.ok(emp);
  p.x = emp.x + 5;
  p.y = emp.y - p.h + 8;
  stepWorld(world, input(), STEP);
  assert.equal(p.impaired, 2);
  p.x = LEVEL.spawn.x;
  p.y = LEVEL.spawn.y + 46 - p.h;
  stepWorld(world, input({ move: 1, dashPressed: true, jet: true }), STEP);
  assert.equal(p.dashTime, 0);
  assert.equal(p.jetActive, false);
  tick(world, 120, input({ move: 1 }));
  assert.ok(p.vx <= 192.001);
  p.x = LEVEL.spawn.x;
  p.y = LEVEL.spawn.y + 46 - p.h;
  tick(world, 130);
  assert.equal(p.impaired, 0);
  stepWorld(world, input({ dashPressed: true }), STEP);
  assert.ok(p.dashTime > 0);
});

test('checkpoint activation restores resources and respawn uses that checkpoint', () => {
  const world = isolatedWorld();
  const cp = LEVEL.checkpoints[2];
  Object.assign(world.player, { x: cp.x + 12 - world.player.w / 2, y: cp.y + 46 - world.player.h, hp: 40, fuel: 5 });
  stepWorld(world, input(), STEP);
  assert.equal(world.checkpoint, 2);
  assert.equal(world.player.hp, 40 + 22 * world.rules.recovery);
  assert.equal(world.player.fuel, 100);
  const respawned = createWorld(world.checkpoint);
  assert.equal(respawned.player.x + respawned.player.w / 2, cp.x + 12);
  assert.equal(respawned.player.y + respawned.player.h, cp.y + 46);
  assert.equal(respawned.player.hp, 100);
  assert.ok(respawned.enemies.filter(enemy => enemy.x < cp.x - 350).every(enemy => enemy.dead));
});

test('terminal worlds stop advancing and exit requires boss defeat', () => {
  const world = isolatedWorld();
  Object.assign(world.player, { x: LEVEL.exit.x + 8, y: 610 - world.player.h, invincible: 1 });
  stepWorld(world, input(), STEP);
  assert.equal(world.status, 'playing');
  world.bossDefeated = true;
  world.bosses.forEach(boss => { boss.dead = true; boss.hp = 0; });
  stepWorld(world, input(), STEP);
  assert.equal(world.status, 'won');
  const time = world.time;
  const x = world.player.x;
  stepWorld(world, input({ move: 1, shoot: true }), STEP);
  assert.equal(world.time, time);
  assert.equal(world.player.x, x);
  world.status = 'dead';
  stepWorld(world, input(), STEP);
  assert.equal(world.time, time);
});

test('lethal damage on the exit cannot be overwritten by victory or a health pickup', () => {
  const world = isolatedWorld();
  const p = world.player;
  Object.assign(p, { x: LEVEL.exit.x + 8, y: 610 - p.h, hp: 1, invincible: 0 });
  world.bossDefeated = true;
  world.boss.dead = true;
  world.enemies = [target(p.x, p.y)];
  world.pickups = [{ id: 'test-health', type: 'health', x: p.x + 12, y: p.y + 20, taken: false }];
  stepWorld(world, input(), STEP);
  assert.equal(world.status, 'dead');
  assert.equal(p.hp, 0);
  assert.equal(world.pickups[0].taken, false);
});

test('boss cycles through readable charge/attack/recovery and all three attacks', () => {
  const world = isolatedWorld();
  Object.assign(world.player, { x: world.boss.arenaStart + 150, y: 610 - world.player.h, invincible: 100 });
  Object.assign(world.boss, { active: true, timer: 0.01 });
  const phases = new Set();
  const attacks = new Set();
  for (let frame = 0; frame < 1800; frame++) {
    stepWorld(world, input(), STEP);
    phases.add(world.boss.phase);
    if (world.boss.phase === 'attack') attacks.add(world.boss.attack);
  }
  assert.deepEqual([...attacks].sort(), [0, 1, 2]);
  assert.ok(phases.has('idle') && phases.has('charge') && phases.has('attack'));
  assert.ok(world.events.some(event => event.type === 'charge'));
  assert.ok(world.events.some(event => event.type === 'enemyshot'));
});

test('boss death opens exit and clears hostile projectiles', () => {
  const world = isolatedWorld();
  Object.assign(world.player, { x: world.boss.x - 200, y: 610 - world.player.h, invincible: 1 });
  // Isolate the kill transition after its enrage warning has already completed.
  Object.assign(world.boss, { active: true, hp: 8, shield: 0, timer: 100, enraged: true });
  const hostile = spawnProjectile(world, world.player.x - 400, 300, 0, 0, 'enemy');
  spawnProjectile(world, world.boss.x - 3, world.boss.y + 30, 920, 0, 'player');
  stepWorld(world, input(), STEP);
  assert.equal(world.boss.hp, 0);
  assert.equal(world.boss.dead, true);
  assert.equal(world.bossDefeated, true);
  assert.equal(hostile.active, false);
});

test('laser cycle exposes warning, off, and active intervals', () => {
  const laser = { type: 'laser', period: 3, onTime: 1.45 };
  assert.equal(hazardState(laser, 0.1), 'active');
  assert.equal(hazardState(laser, 1.6), 'off');
  assert.equal(hazardState(laser, 2.8), 'warning');
  assert.equal(hazardState(laser, 3.1), 'active');
});
