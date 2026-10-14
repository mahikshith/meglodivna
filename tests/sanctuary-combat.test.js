import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, spawnProjectile, interact, STEP } from '../src/combat.js';
import { LEVEL } from '../src/level.js';

function arena(type = 'guard', x = 280) {
  const spawn = { x: 100, y: 564, label: 'Combat fixture' };
  const level = { ...LEVEL, width: 2200, height: 900, spawn, checkpoints: [spawn], pressureDisabled: true,
    solids: [{ id: 'floor', x: 0, y: 610, w: 2200, h: 200 }],
    enemies: [{ id: 'foe', type, x, y: 560, w: 34, h: 50, hp: 500, facing: -1 }],
    bosses: [{ id: 'guardian', type: 'warden', combatStyle: 'sanctuary', x: 1500, y: 490, w: 96, h: 120,
      hp: 1000, floorY: 610, triggerX: 1300, arenaStart: 1200, arenaEnd: 2150 }],
    props: [], gates: [], pickups: [], npcs: [], hazards: [], portals: [], enemyPortals: [],
    movingPlatforms: [], crumble: [], currents: [] };
  const world = createWorld(0, { level }); world.player.invincible = 100;
  return world;
}
function until(world, predicate, max = 600, controls = {}) {
  for (let i = 0; i < max; i++) { stepWorld(world, controls, STEP); if (predicate()) return; }
  assert.fail('Expected combat phase was never reached');
}

test('stalkers never shoot at range and commit to the warned side through lunge and recovery', () => {
  for (const type of ['guard', 'shade']) {
    const world = arena(type, 580), foe = world.enemies[0];
    for (let i = 0; i < 100; i++) stepWorld(world, {}, STEP);
    assert.equal(foe.windup, 0); assert.ok(!world.projectiles.some(p => p.active));
    until(world, () => foe.windup > 0);
    const facing = foe.facing;
    world.player.x = foe.x + 120;
    until(world, () => foe.dashTime > 0);
    assert.equal(foe.facing, facing); assert.equal(foe.dashFacing, facing);
    const start = foe.x;
    until(world, () => foe.dashTime === 0);
    assert.ok(foe.x < start - 45); assert.ok(foe.recovery > 0.3);
    const recoveryX = foe.x;
    for (let i = 0; i < 20; i++) stepWorld(world, {}, STEP);
    assert.equal(foe.x, recoveryX); assert.ok(!world.projectiles.some(p => p.active));
  }
});

test('cinders follow a ballistic arc and pooled straight bullets cannot inherit gravity', () => {
  const world = arena('mage', 500), mage = world.enemies[0];
  until(world, () => world.projectiles.some(p => p.active));
  const cinder = world.projectiles.find(p => p.active);
  assert.equal(cinder.kind, 'fire'); assert.equal(cinder.gravity, 520); assert.ok(cinder.vy < 0);
  const y = cinder.y, vy = cinder.vy;
  stepWorld(world, {}, STEP);
  assert.ok(Math.abs(cinder.y - y - vy * STEP - 260 * STEP * STEP) < 1e-8);
  assert.ok(Math.abs(cinder.vy - vy - 520 * STEP) < 1e-8);
  mage.cooldown = 100;
  until(world, () => !cinder.active);
  assert.ok(world.events.some(event => event.type === 'spark' && event.kind === 'fire'));
  const straight = spawnProjectile(world, 1000, 100, 200, 0, 'player');
  assert.equal(straight, cinder); assert.equal(straight.gravity, 0);
  stepWorld(world, {}, STEP); assert.equal(straight.y, 100);
});

test('heavy sentinel braces, slams only the low floor band, and leaves a punishable recovery', () => {
  for (const airborne of [false, true]) {
    const world = arena('sentinel', 240), foe = world.enemies[0];
    until(world, () => foe.windup > 0);
    const braceX = foe.x;
    for (let i = 0; i < 20; i++) stepWorld(world, {}, STEP);
    assert.equal(foe.x, braceX);
    world.player.invincible = 0;
    world.player.x = foe.x - 80;
    if (airborne) stepWorld(world, { jumpPressed: true, jumpHeld: true }, STEP);
    until(world, () => foe.attackTime > 0, 600, { jumpHeld: true });
    assert.equal(foe.attackKind, 'slam'); assert.equal(foe.attackBox.h, 25);
    assert.equal(!!foe.beam, false); assert.ok(foe.recovery > 0.8);
    assert.equal(world.player.hp < 100, !airborne);
  }
});

test('guardian uses committed charge, local slam and cleave without lasers or missiles', () => {
  const world = arena(); world.enemies = [];
  const boss = world.boss; world.player.x = 1400;
  Object.assign(boss, { active: true, timer: 0, attack: 2 });
  const attacks = new Set(); let chargeStart;
  for (let i = 0; i < 1100; i++) {
    stepWorld(world, {}, STEP);
    if (boss.phase === 'charge') {
      assert.ok(boss.telegraph.kind);
      if (boss.attackKind === 'charge') chargeStart ??= boss.x;
    }
    if (boss.phase === 'attack') attacks.add(boss.attackKind);
    assert.equal(!!boss.beam, false);
  }
  assert.deepEqual([...attacks].sort(), ['charge', 'cleave', 'slam']);
  assert.ok(world.events.some(event => event.type === 'slam'));
  assert.ok(world.events.some(event => event.type === 'enemyattack' && event.kind === 'charge'));
  assert.ok(Number.isFinite(chargeStart)); assert.ok(!world.projectiles.some(p => p.active));
});

test('dragon transformation changes attack behavior to finite mouth flame with recovery', () => {
  const world = arena(); world.enemies = [];
  const boss = world.boss; world.player.x = 1400;
  Object.assign(boss, { type: 'regent', visualFamily: 'crimsonmecha', active: true, hp: 300, timer: 0 });
  stepWorld(world, {}, STEP); assert.equal(boss.form, 'transforming');
  until(world, () => boss.form === 'flying');
  assert.equal(boss.visualFamily, 'wyrm');
  until(world, () => world.events.some(event => event.type === 'dragonbreath'));
  assert.equal(boss.attackKind, 'breath'); assert.equal(boss.weaponSlot, 'mouth');
  const flames = world.projectiles.filter(p => p.active);
  assert.ok(flames.length > 0 && flames.every(p => p.kind === 'fire' && !p.missile && !p.homing && p.life <= 0.72));
  assert.equal(!!boss.beam, false);
  until(world, () => boss.phase === 'idle'); assert.ok(boss.timer >= 0.8);
});

test('movement and slash events expose exact effect direction and air jump identity', () => {
  const world = arena(); world.enemies = [];
  stepWorld(world, {}, STEP);
  stepWorld(world, { jumpPressed: true, jumpHeld: true, slashPressed: true }, STEP);
  assert.ok(world.events.some(e => e.type === 'jump' && e.kind === 'ground' && e.facing === 1));
  stepWorld(world, { jumpPressed: true, jumpHeld: true }, STEP);
  assert.ok(world.events.some(e => e.type === 'jump' && e.kind === 'air'));
  assert.ok(world.events.some(e => e.type === 'slash' && e.mode === 'horizontal' && e.combo === 0));
  until(world, () => world.player.slashCooldown === 0);
  stepWorld(world, { slashPressed: true }, STEP);
  assert.ok(world.events.some(e => e.type === 'slash' && e.mode === 'vertical' && e.combo === 1));
  world.pressureTimer = 0;
  for (let i = 0; i < 180; i++) stepWorld(world, {}, STEP);
  assert.equal(world.missileWarning, null); assert.ok(!world.projectiles.some(p => p.kind === 'pressure' && p.active));
});

test('portal arrival clears old dash, thrust and support state and announces the destination', () => {
  const world = arena(), p = world.player;
  world.level.portals = [{ id: 'return', x: p.x, y: p.y, w: 30, h: 60, to: { x: 800, y: 564 } }];
  Object.assign(p, { dashTime: 0.1, jetActive: true, grounded: true, wall: 1, vx: 620, vy: -300 });
  assert.equal(interact(world), true);
  assert.equal(p.vx, 0); assert.equal(p.vy, 0); assert.equal(p.dashTime, 0);
  assert.equal(p.jetActive, false); assert.equal(p.grounded, false); assert.equal(p.wall, 0);
  const arrival = world.events.find(e => e.type === 'portalarrival');
  assert.equal(arrival.x, p.x + p.w / 2); assert.equal(arrival.y, p.y + p.h); assert.equal(arrival.kind, 'player');
});
