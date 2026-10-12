import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL, createEnemies } from '../src/level.js';
import { PHYSICS, overlaps } from '../src/physics.js';

test('level geometry, IDs, and timed hazards stay inside the world', () => {
  assert.equal(LEVEL.width, 9400);
  assert.equal(LEVEL.height, 720);
  const ids = new Set();
  for (const object of [...LEVEL.solids, ...LEVEL.hazards, ...LEVEL.pickups, ...createEnemies()]) {
    assert.ok(object.id && !ids.has(object.id), `duplicate or absent ID: ${object.id}`);
    ids.add(object.id);
    assert.ok(Number.isFinite(object.x) && Number.isFinite(object.y));
    assert.ok(object.x >= 0 && object.y >= 0);
    assert.ok(object.x + (object.w ?? 0) <= LEVEL.width, `${object.id}: horizontal bounds`);
    assert.ok(object.y + (object.h ?? 0) <= LEVEL.height, `${object.id}: vertical bounds`);
    if ('w' in object) assert.ok(object.w > 0 && object.h > 0, `${object.id}: positive collider`);
    if ('period' in object) {
      assert.ok(object.onTime > 0 && object.onTime < object.period, `${object.id}: readable off window`);
      assert.ok(object.phase >= 0 && object.phase < object.period);
      assert.ok(object.period - object.onTime > 1, `${object.id}: crossing window`);
    }
  }
  for (const solid of LEVEL.solids) assert.ok(['snow', 'steel'].includes(solid.material));
  for (const hazard of LEVEL.hazards) assert.ok(['laser', 'fire', 'spikes', 'emp'].includes(hazard.type));
  for (const pickup of LEVEL.pickups) assert.ok(['health', 'fuel', 'rapid', 'shield'].includes(pickup.type));
});

test('spawn and all checkpoints have safe standing room and recovery margins', () => {
  for (const point of [LEVEL.spawn, ...LEVEL.checkpoints]) {
    const player = { ...point, w: 24, h: 46 };
    const ground = LEVEL.solids.find(solid => player.x >= solid.x && player.x + player.w <= solid.x + solid.w
      && Math.abs(player.y + player.h - solid.y) <= 4);
    assert.ok(ground, `checkpoint ${point.label ?? 'spawn'} has solid support`);
    for (const solid of LEVEL.solids) assert.ok(!overlaps(player, solid), 'recovery starts outside walls');
    const recoveryArea = { x: player.x - 28, y: player.y, w: player.w + 56, h: player.h };
    for (const hazard of LEVEL.hazards) assert.ok(!overlaps(recoveryArea, hazard), 'recovery has hazard clearance');
    for (const enemy of createEnemies()) assert.ok(!overlaps(recoveryArea, enemy), 'recovery has enemy clearance');
  }
});

test('arena ground is contiguous and route markers identify actual landing surfaces', () => {
  const arena = LEVEL.solids.find(solid => solid.id === 'warden-floor');
  assert.equal(arena.y, 610);
  assert.ok(arena.x <= LEVEL.boss.x && arena.x + arena.w >= LEVEL.exit.x + LEVEL.exit.w);
  assert.ok(LEVEL.boss.x - arena.x >= 500, 'boss checkpoint offers approach space');
  for (const marker of LEVEL.route) {
    const solid = LEVEL.solids.find(candidate => candidate.id === marker.id);
    assert.ok(solid, `unknown route surface ${marker.id}`);
    assert.equal(marker.y, solid.y);
    assert.ok(marker.x - 12 >= solid.x && marker.x + 12 <= solid.x + solid.w);
  }
  for (let index = 1; index < LEVEL.zones.length; index++) assert.ok(LEVEL.zones[index].x > LEVEL.zones[index - 1].x);
  assert.ok(LEVEL.guides.every(guide => guide.text.length <= 64), 'hints remain brief');
});

test('mandatory gap bounds fit a held double jump and foundry risers fit one held jump', () => {
  const firstApex = PHYSICS.jumpSpeed ** 2 / (2 * PHYSICS.gravity);
  const toApex = PHYSICS.jumpSpeed / PHYSICS.gravity;
  const pairs = [
    ['icebreak-floor', 'viaduct-entry'], ['viaduct-entry', 'bridge-a'],
    ['bridge-a', 'bridge-b'], ['bridge-b', 'bridge-c'], ['bridge-c', 'foundry-entry'],
    ['gauntlet-a', 'gauntlet-b'], ['gauntlet-b', 'gauntlet-c'],
  ];
  for (const [fromId, toId] of pairs) {
    const from = LEVEL.solids.find(solid => solid.id === fromId);
    const to = LEVEL.solids.find(solid => solid.id === toId);
    const rise = from.y - to.y;
    const secondFlight = (PHYSICS.airJumpSpeed + Math.sqrt(PHYSICS.airJumpSpeed ** 2
      + 2 * PHYSICS.gravity * (firstApex - rise))) / PHYSICS.gravity;
    const range = PHYSICS.runSpeed * (toApex + secondFlight);
    const gap = to.x - from.x - from.w;
    assert.ok(gap + 24 < range, `${fromId}→${toId}: ${gap}px fits ${Math.floor(range)}px range`);
  }
  const risers = ['foundry-entry', 'foundry-riser-a', 'foundry-riser-b', 'foundry-riser-c', 'foundry-wall']
    .map(id => LEVEL.solids.find(solid => solid.id === id));
  for (let index = 1; index < risers.length; index++) {
    assert.ok(risers[index - 1].y - risers[index].y <= firstApex - 10, 'single-jump rise has vertical margin');
  }
  assert.ok((LEVEL.exit.x - LEVEL.spawn.x) / PHYSICS.runSpeed >= 28, 'scale supports 30s+ with required climbing and combat');
});

test('enemy factories isolate mutable combat state and patrols remain supported', () => {
  const first = createEnemies();
  const second = createEnemies();
  first[0].hp = 0;
  assert.equal(second[0].hp, 30);
  for (const enemy of second) {
    assert.ok(['guard', 'drone', 'turret'].includes(enemy.type));
    assert.ok(enemy.minX <= enemy.x && enemy.x <= enemy.maxX);
    assert.ok(enemy.minX >= 0 && enemy.maxX + enemy.w <= LEVEL.width);
    assert.ok(enemy.hp > 0);
    if (enemy.type === 'drone') continue;
    assert.ok(LEVEL.solids.some(solid => solid.y === enemy.y + enemy.h
      && enemy.minX >= solid.x && enemy.maxX + enemy.w <= solid.x + solid.w), `${enemy.id}: supported patrol`);
  }
});
