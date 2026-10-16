import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/level.js';
import { createWorld, retryWorld, stepWorld } from '../src/combat.js';
import { loadProgress, saveProgress } from '../src/progress.js';

const inRealm = (level, x) => level.crossings.find(realm => x >= realm.x && x < realm.x + realm.w)?.id || null;
function isolate(world) {
  // Isolated checkpoint-contact fixture, not a legal traversal campaign.
  world.enemies = []; world.bosses = []; world.enemyPortals = []; world.portals = [];
  world.level = { ...world.level, hazards: [], currents: [], pressureDisabled: true };
  return world;
}
function touchRelay(world, index) {
  const cp = world.level.checkpoints[index], p = world.player;
  Object.assign(p, { x: cp.x + 12 - p.w / 2, y: cp.y + 46 - p.h, vx: 0, vy: 0, grounded: true });
  stepWorld(world);
}

for (const level of Object.values(LEVELS)) test(`${level.id}: out-of-order portal relays retry in the current realm and return to main`, () => {
  const relays = level.crossings.map(realm => level.checkpoints.flatMap((cp, index) => inRealm(level, cp.x + 12) === realm.id ? [index] : []));
  const main = level.checkpoints.flatMap((cp, index) => inRealm(level, cp.x + 12) === null ? [index] : []).at(-1);
  const store = new Map(), storage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) };
  let world = isolate(createWorld(main, { level }));
  // Water then fire then wind explicitly crosses from higher to lower checkpoint indices.
  for (const realmIndex of [1, 2, 0]) {
    const first = relays[realmIndex][0], later = relays[realmIndex][2];
    for (const index of [first, later]) {
      touchRelay(world, index);
      assert.equal(world.checkpoint, index); assert.equal(world.progress.checkpoint, index);
    }
    touchRelay(world, first);
    assert.equal(world.checkpoint, later, 'Walking backwards inside one realm must not regress the relay');
    saveProgress(world.progress, storage); const saved = loadProgress(storage);
    assert.equal(saved.checkpoint, later);
    world = retryWorld(world);
    assert.equal(inRealm(level, world.player.x + world.player.w / 2), level.crossings[realmIndex].id);
    assert.equal(world.progress.checkpoint, later); isolate(world);
  }
  touchRelay(world, main);
  assert.equal(world.checkpoint, main); assert.equal(world.progress.checkpoint, main);
  saveProgress(world.progress, storage);
  const saved = loadProgress(storage), reloaded = createWorld(saved.checkpoint, { level, progress: saved });
  assert.equal(inRealm(level, reloaded.player.x + reloaded.player.w / 2), null);
  assert.equal(reloaded.progress.checkpoint, main);
  assert.equal(retryWorld(world).checkpoint, main);
});

test('checkpoint loads suppress only earlier ordinary foes in that same realm and synchronize the selected relay', () => {
  const level = LEVELS.soulforge, flame = level.crossings[2];
  const index = level.checkpoints.findLastIndex(cp => inRealm(level, cp.x + 12) === flame.id), cp = level.checkpoints[index];
  const world = createWorld(index), priorHere = world.enemies.filter(enemy => !enemy.major && inRealm(level, enemy.x + enemy.w / 2) === flame.id && enemy.x < cp.x - 350);
  assert.ok(priorHere.length > 0); assert.ok(priorHere.every(enemy => enemy.dead));
  const elsewhere = world.enemies.filter(enemy => !enemy.major && inRealm(level, enemy.x + enemy.w / 2) !== flame.id);
  assert.ok(elsewhere.length > 0); assert.ok(elsewhere.every(enemy => !enemy.dead), 'A distant saved relay cannot erase an unexplored realm');
  const main = createWorld(0, { progress: world.progress });
  assert.equal(main.checkpoint, 0); assert.equal(main.progress.checkpoint, 0);
});
