import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultProgress, validateProgress, loadProgress, saveProgress, newCampaignProgress } from '../src/progress.js';
import { createWorld, equipItem, rewardPlayer, retryWorld, castSpell, stepWorld, STEP } from '../src/combat.js';

test('progress rejects unknown gear, invalid equipment, malformed charges, and unsafe IDs', () => {
  const raw = defaultProgress();
  raw.unlocked.gun.push('rail', 'fake', '__proto__');
  raw.equipped.gun = 'cannon';
  raw.charges = { cannon: Infinity, nova: -4 };
  raw.claimed = ['cache:valid', '<script>', 3, 'cache:valid'];
  raw.collections = ['soul-core', 'fake'];
  raw.checkpoint = -1;
  const progress = validateProgress(raw);
  assert.deepEqual(progress.unlocked.gun, ['carbine', 'rail']);
  assert.equal(progress.equipped.gun, 'carbine');
  assert.deepEqual(progress.charges, { cannon: 0, nova: 0 });
  assert.deepEqual(progress.claimed, ['cache:valid']);
  assert.deepEqual(progress.collections, ['soul-core']);
  assert.equal(progress.checkpoint, 0);
  assert.equal(validateProgress({ version: 99 }).version, 1);
});

test('save/load round trips discovered items and handles broken storage safely', () => {
  let value;
  const storage = { setItem: (_key, text) => { value = text; }, getItem: () => value };
  const progress = defaultProgress();
  progress.unlocked.spell.push('veil');
  progress.equipped.spell = 'veil';
  progress.charges.cannon = 2;
  assert.equal(saveProgress(progress, storage), true);
  assert.deepEqual(loadProgress(storage), progress);
  assert.deepEqual(loadProgress({ getItem: () => '{broken' }), defaultProgress());
  assert.equal(saveProgress(progress, { setItem: () => { throw Error('Quota'); } }), false);
});

test('equipment must be discovered and category prototype names fail safely', () => {
  const world = createWorld();
  assert.equal(equipItem(world, 'gun', 'rail'), false);
  assert.equal(equipItem(world, 'toString', 'rail'), false);
  assert.equal(rewardPlayer(world, { type: 'weapon', itemId: 'fake' }, 'bad'), false);
  assert.equal(world.progress.claimed.includes('bad'), false);
  assert.equal(rewardPlayer(world, { type: 'weapon', itemId: 'rail' }, 'rail-loot'), true);
  assert.equal(world.player.gun, 'rail');
  assert.equal(equipItem(world, 'gun', 'carbine'), true);
  assert.equal(rewardPlayer(world, { type: 'weapon', itemId: 'rail' }, 'rail-loot'), false);
});

test('retry preserves spent charges, claimed rewards, elapsed time, and defeated gates', () => {
  const world = createWorld();
  rewardPlayer(world, { type: 'cannon', value: 2 }, 'cache:test:cannon');
  rewardPlayer(world, { type: 'nova', value: 1 }, 'cache:test:nova');
  assert.equal(castSpell(world, 'eclipse'), true);
  world.player.charges.cannon--;
  world.progress.defeatedBosses.push(world.bosses[0].id);
  world.progress.destroyedProps.push(world.props[0].id);
  world.time = 80;
  world.timeLeft = 310;
  world.status = 'dead';
  const retry = retryWorld(world);
  assert.deepEqual(retry.player.charges, { cannon: 1, nova: 0 });
  assert.equal(retry.time, 80);
  assert.equal(retry.timeLeft, 310);
  assert.equal(retry.bosses[0].dead, true);
  assert.equal(retry.bosses[0].hp, 0);
  assert.equal(retry.props[0].dead, true);
  assert.ok(retry.gates.filter(gate => gate.bossId === retry.bosses[0].id).every(gate => gate.open));
  assert.equal(rewardPlayer(retry, { type: 'cannon', value: 2 }, 'cache:test:cannon'), false);
  assert.equal(retry.player.charges.cannon, 1);
});

test('new campaign keeps discoveries but resets earned charges and encounter state', () => {
  const progress = defaultProgress();
  progress.unlocked.gun.push('cannon');
  progress.collections.push('soul-core');
  progress.claimed.push('npc:vesper');
  progress.defeatedBosses.push('regent');
  progress.openedGates.push('final-gate');
  progress.destroyedProps.push('final-cache');
  progress.charges.cannon = 8;
  progress.checkpoint = 20;
  const fresh = newCampaignProgress(progress);
  assert.ok(fresh.unlocked.gun.includes('cannon'));
  assert.deepEqual(fresh.collections, ['soul-core']);
  for (const key of ['claimed', 'defeatedBosses', 'openedGates', 'destroyedProps']) assert.deepEqual(fresh[key], []);
  assert.deepEqual(fresh.charges, { cannon: 0, nova: 0 });
  assert.equal(fresh.checkpoint, 0);
  assert.equal(progress.charges.cannon, 8, 'Reset must not mutate the saved snapshot');
});

test('consumed cannon and nova charges survive immediate save and a cold reload', () => {
  const world = createWorld(); world.enemies = []; world.props = []; world.pickups = [];
  rewardPlayer(world, { type: 'cannon', value: 1 }, 'cold-cannon');
  rewardPlayer(world, { type: 'nova', value: 1 }, 'cold-nova');
  assert.equal(castSpell(world, 'eclipse'), true);
  assert.equal(equipItem(world, 'gun', 'cannon'), true);
  stepWorld(world, { shoot: true }, STEP);
  assert.deepEqual(world.progress.charges, { cannon: 0, nova: 0 });
  let value;
  const storage = { setItem: (_key, text) => { value = text; }, getItem: () => value };
  assert.equal(saveProgress(world.progress, storage), true);
  const reloaded = createWorld(0, { progress: loadProgress(storage) });
  assert.deepEqual(reloaded.player.charges, { cannon: 0, nova: 0 });
  assert.equal(castSpell(reloaded, 'eclipse'), false);
  assert.equal(rewardPlayer(reloaded, { type: 'cannon', value: 1 }, 'cold-cannon'), false);
  stepWorld(reloaded, { shoot: true }, STEP);
  assert.equal(reloaded.player.laserTime, 0);
});

test('loading a v0.2 save migrates translated encounters while preserving discoveries and subsequent saves', () => {
  const legacy = defaultProgress(); delete legacy.worldId; delete legacy.worlds; delete legacy.completedWorlds;
  legacy.unlocked.gun.push('rail', 'cannon'); legacy.equipped.gun = 'rail'; legacy.collections = ['soul-core'];
  legacy.claimed = ['npc:vesper']; legacy.defeatedBosses = ['warden', 'hex', 'regent'];
  legacy.openedGates = ['final-gate']; legacy.destroyedProps = ['final-cache']; legacy.checkpoint = 14;
  legacy.charges = { cannon: 8, nova: 3 };
  assert.equal(validateProgress(legacy).checkpoint, 14, 'Standalone validation remains compatible');
  let value = JSON.stringify(legacy);
  const storage = { getItem: () => value, setItem: (_key, text) => { value = text; } };
  const migrated = loadProgress(storage);
  assert.equal(migrated.worldId, 'soulforge'); assert.equal(migrated.checkpoint, 0);
  assert.deepEqual(migrated.unlocked.gun, ['carbine', 'rail', 'cannon']); assert.equal(migrated.equipped.gun, 'rail');
  assert.deepEqual(migrated.collections, ['soul-core']); assert.deepEqual(migrated.charges, { cannon: 0, nova: 0 });
  for (const key of ['claimed', 'defeatedBosses', 'openedGates', 'destroyedProps', 'completedWorlds']) assert.deepEqual(migrated[key], []);
  assert.deepEqual(migrated.worlds, {});
  const world = createWorld(migrated.checkpoint, { progress: migrated });
  assert.equal(world.player.x, world.level.checkpoints[0].x); assert.ok(world.bosses.every(boss => !boss.dead));
  migrated.checkpoint = 2; migrated.claimed.push('new-cache'); migrated.charges.cannon = 1;
  assert.equal(saveProgress(migrated, storage), true); assert.deepEqual(loadProgress(storage), migrated);
});
