import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, damagePlayer, rewardPlayer, retryWorld, STEP, stepWorld } from '../src/combat.js';
import { DIFFICULTIES } from '../src/catalog.js';

test('four tiers increase wounds, health, cadence and missile pressure while reducing recovery/deadline', () => {
  let previous;
  for (const mode of DIFFICULTIES) {
    const world = createWorld(0, { difficulty: mode.id });
    world.player.invincible = 0;
    damagePlayer(world, 20, world.player.x + 50);
    assert.ok(Math.abs(world.player.hp - (100 - 20 * mode.damage)) < 0.001);
    world.player.hp = 20;
    rewardPlayer(world, { type: 'health', value: 20 });
    assert.ok(Math.abs(world.player.hp - (20 + 20 * mode.recovery)) < 0.001);
    if (previous) {
      assert.ok(world.enemies[0].hp > previous.enemies[0].hp);
      assert.ok(mode.cadence < previous.rules.cadence);
      assert.ok(mode.missilePeriod < previous.rules.missilePeriod);
      assert.ok(mode.deadline < previous.rules.deadline);
    }
    previous = world;
  }
});

test('difficulty does not alter core running or jumping physics', () => {
  const results = DIFFICULTIES.map(mode => {
    const world = createWorld(0, { difficulty: mode.id });
    world.enemies = []; world.pickups = []; world.props = []; world.solids = world.solids.filter(solid => !solid.collidable);
    for (let frame = 0; frame < 100; frame++) stepWorld(world, { move: 1, jumpPressed: frame === 10, jumpHeld: true }, STEP);
    return [world.player.x, world.player.y, world.player.vx, world.player.vy];
  });
  for (const result of results) assert.deepEqual(result, results[0]);
});

test('deadline causes a real loss and a legitimate retry restores the reactor window', () => {
  const world = createWorld();
  world.timeLeft = STEP / 2;
  stepWorld(world, {}, STEP);
  assert.equal(world.status, 'dead');
  assert.equal(world.player.hp, 0);
  assert.equal(world.deathReason, 'deadline');
  const retry = retryWorld(world);
  assert.equal(retry.status, 'playing');
  assert.equal(retry.timeLeft, retry.rules.deadline * ((retry.level.timeLimit || 510) / 510));
  assert.equal(retry.time, world.time);
});
