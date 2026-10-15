import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL } from '../src/level.js';
import { createWorld, STEP, stepWorld, spawnProjectile } from '../src/combat.js';

test('closed authored forcefields cannot be crossed with legal wall jumps, dash, and finite jet fuel', () => {
  for (const authored of LEVEL.gates) {
    const world = createWorld();
    world.enemies = []; world.pickups = [];
    const gate = world.gates.find(candidate => candidate.id === authored.id);
    Object.assign(world.player, { x: gate.x - 70, y: gate.y + gate.h - world.player.h });
    assert.equal(gate.y, 0);
    assert.equal(gate.h, authored.h);
    assert.ok(world.solids.includes(gate), 'Visible gate and actual collider share geometry');
    let wallJumps = 0;
    for (let frame = 0; frame < 120 * 8; frame++) {
      const p = world.player;
      stepWorld(world, { move: 1, jumpPressed: frame === 0 || (p.wall === 1 && frame % 18 === 0),
        jumpHeld: true, jet: true, dashPressed: frame % 90 === 0 }, STEP);
      wallJumps += world.events.filter(event => event.type === 'walljump').length;
      world.events.length = 0;
      assert.equal(world.status, 'playing', 'Regression must not pass merely because the player died');
      assert.ok(p.x + p.w <= gate.x + 0.0001, `${gate.id} was bypassed at frame${frame}`);
      assert.ok(p.y >= 0, 'World ceiling bounds the courier');
      assert.ok(p.fuel >= 0 && p.fuel <= 100);
    }
    assert.ok(wallJumps > 0, 'The attempted bypass must actually exercise wall jumps');
    assert.equal(gate.open, false);
  }
});

test('upper world boundary stops upward velocity and continuing jetpack consumes real fuel', () => {
  const world = createWorld(); world.enemies = []; world.pickups = [];
  Object.assign(world.player, { x: 100, y: 1, vy: -500 });
  const fuel = world.player.fuel;
  stepWorld(world, { jet: true }, STEP);
  assert.equal(world.player.y, 0);
  assert.equal(world.player.vy, 0);
  assert.ok(world.player.fuel < fuel);
});

test('an active offscreen boss advances combat while its attacks stay inside its arena', () => {
  const world = createWorld(); world.enemies = []; world.pickups = [];
  const boss = world.bosses[0];
  const beam = { x: 0, y: 570, w: LEVEL.width, h: 20 };
  Object.assign(boss, { active: true, phase: 'attack', attack: 2, timer: 0.4, beam, telegraph: beam });
  world.player.invincible = 0;
  const missile = spawnProjectile(world, world.player.x + 40, 580, -400, 0, 'enemy', true);
  missile.sourceId = boss.id;
  for (let frame = 0; frame < 120; frame++) { stepWorld(world, {}, STEP); world.events.length = 0; }
  assert.equal(world.player.hp, 100);
  assert.notEqual(boss.timer, 0.4);
  assert.notEqual(boss.phase, 'attack');
  assert.equal(boss.beam, null);
  assert.equal(world.activeBoss, null);
  assert.equal(missile.active, false);
  assert.equal(spawnProjectile(world, 100, 50, 100, 0, 'player').sourceId, null, 'Reused pool slots must clear source tags');
});

test('boss warnings and attack rectangles remain inside the authored arena', () => {
  const world = createWorld(); world.enemies = []; world.pickups = [];
  const boss = world.bosses[0];
  Object.assign(world.player, { x: boss.arenaStart + 50, y: 610 - world.player.h });
  Object.assign(boss, { active: true, attack: 1, timer: STEP / 2 });
  stepWorld(world, {}, STEP);
  assert.equal(boss.phase, 'charge');
  assert.ok(boss.telegraph.x >= boss.arenaStart);
  assert.ok(boss.telegraph.x + boss.telegraph.w <= boss.arenaEnd);
});
