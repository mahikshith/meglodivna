import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { LEVELS } from '../src/level.js';
import { createPlayer, stepPlayer, PHYSICS } from '../src/physics.js';
import { createWorld, retryWorld, stepWorld, STEP } from '../src/combat.js';
import { defaultProgress, saveProgress, loadProgress } from '../src/progress.js';

const level = LEVELS.soulforge;
const oldIds = {
  solids: 'e4e0dfb5e2da26bca4974752c753548644c3bd0b7b3ba90d57187cc09f27b5f7',
  pickups: '2634e13a088a51ef314b0e2eff3d42942e5c63053860157e39d780eaefac7578',
  enemies: '4ea003cced2d24013c025fe3159a336f6783833437fb17e8cfeb11df20faa93d',
  props: 'e8d828ab268e34f47691d78d51f9c15ae7bc789886027664514633047ae1b11e',
  gates: '8fcd9fb390fa2cd0745bc6de599903bb87a063284f26e10721d4aa1498e8422b',
  bosses: '4679468d0f9b1554470d12c5c5a27e89a74e67c274e7e7a4b63b587f8da0ad56',
  npcs: 'a04a994c86295bd7a75f3ae6445093bcfec6e9e3618b7cf93260d3b67d440896',
  rooms: 'd750bbcb5637ee41b9292475ecb234f94ef41ab2d47ff59d26be7b863d6d55d3',
  portals: 'a3e581a5ea04c69bd759ee6d68713fc7918b45ed306ed1a90b2f615f06b667b6',
};

test('Hollow additions preserve every pre-rebuild ID and checkpoint index', () => {
  for (const [group, hash] of Object.entries(oldIds)) {
    const ids = level[group].filter(object => !object.id.includes('-hollow-')).map(object => object.id);
    assert.equal(createHash('sha256').update(JSON.stringify(ids)).digest('hex'), hash, group);
  }
  assert.deepEqual(level.checkpoints.map(cp => [cp.x, cp.y]), [
    [100, 1214], [2820, 1214], [4695, 814], [6100, 814], [12295, 1034], [13670, 1034], [17445, 634],
  ]);
});

// Isolated geometry fixtures: intentionally exclude combat; these are not campaign proof.
function jumpTo(source, target, startX, held = true) {
  const p = createPlayer(startX, source.y - PHYSICS.playerHeight);
  p.grounded = true; p.vx = PHYSICS.runSpeed;
  for (let tick = 0; tick < 240; tick++) {
    stepPlayer(p, { move: 1, jumpPressed: tick === 0, jumpHeld: held || tick === 0 }, [source, target], STEP);
    if (tick && p.grounded) return { player: p, target: Math.abs(p.y + p.h - target.y) < .01 };
    if (p.y > source.y + 400) break;
  }
  return { player: p, target: false };
}

test('safe practice shelf rewards a held jump and catches a failed tap on the floor', () => {
  const floor = level.solids.find(s => s.id === 'soulforge-sanctuary-1');
  const shelf = level.solids.find(s => s.id === 'soulforge-hollow-practice-ledge');
  assert.equal(jumpTo(floor, shelf, 700).target, true);
  const tap = jumpTo(floor, shelf, 700, false);
  assert.equal(tap.target, false);
  assert.ok(tap.player.grounded);
  assert.equal(tap.player.y + tap.player.h, floor.y);
  assert.ok(tap.player.x >= floor.x && tap.player.x + tap.player.w <= floor.x + floor.w);
});

test('aqueduct combined rise and gap supports a launch 40px before the edge', () => {
  const source = level.solids.find(s => s.id === 'soulforge-aqueduct-span-40');
  const target = level.solids.find(s => s.id === 'soulforge-aqueduct-span-42');
  const launch = source.x + source.w - PHYSICS.playerWidth - 40;
  assert.equal(jumpTo(source, { ...target, x: target.x + 30, w: target.w - 30 }, launch).target, false);
  assert.equal(jumpTo(source, target, launch).target, true);
});

test('first exposed crossing is clear of the relocated drone and has no global missile pressure', () => {
  const drone = level.enemies.find(e => e.id === 'soulforge-drone-8');
  const bank = level.solids.find(s => s.id === 'soulforge-cistern-bank-44');
  assert.ok(drone.x >= bank.x && drone.x + drone.w <= bank.x + bank.w);
  assert.equal(drone.y + drone.h, bank.y);
  assert.equal(level.pressureDisabled, true);
  assert.ok(level.bosses.every(b => b.combatStyle === 'sanctuary'));
  const world = createWorld(0, { worldId: 'soulforge', difficulty: 'extinction' });
  world.pressureTimer = 0;
  for (let frame = 0; frame < 600; frame++) stepWorld(world, {}, STEP);
  assert.equal(world.missileWarning, null);
  assert.equal(world.player.hp, world.player.maxHp);
  assert.ok(Object.values(LEVELS).filter(w => w.id !== 'soulforge').every(w => !w.pressureDisabled));
});

test('loose powerups activate on contact, expire normally and stay claimed after retry', () => {
  const definitions = level.pickups.filter(p => p.id.includes('-hollow-') && p.type !== 'mana');
  assert.deepEqual(definitions.map(p => p.type).sort(), ['boost', 'fuel', 'rapid', 'shield']);
  for (const pickup of definitions) {
    assert.ok(level.solids.some(s => s.y === pickup.y + 28 && pickup.x - 14 >= s.x && pickup.x + 14 <= s.x + s.w), pickup.id);
    const fixture = { ...level, enemies: [], hazards: [], props: [], pickups: [pickup] };
    const world = createWorld(0, { level: fixture, worldId: 'soulforge' });
    Object.assign(world.player, { x: pickup.x - 14, y: pickup.y + 28 - 60, fuel: 0 });
    stepWorld(world, {}, STEP);
    assert.ok(world.pickups[0].taken);
    const field = pickup.type;
    assert.ok(world.player[field] >= pickup.value && world.player[field] <= pickup.value + 1, pickup.id);
    const claim = `pickup:${pickup.id}`;
    assert.equal(world.progress.claimed.filter(id => id === claim).length, 1);
    if (field === 'boost' || field === 'rapid') {
      for (let frame = 0; frame < 1000; frame++) stepWorld(world, {}, STEP);
      assert.equal(world.player[field], 0, `${field} expires`);
    }
    const retry = retryWorld(world);
    assert.ok(retry.pickups[0].taken);
    assert.equal(retry.player[field], field === 'fuel' ? 100 : 0);
    assert.equal(retry.progress.claimed.filter(id => id === claim).length, 1);
  }
});

test('existing claimed items and opened seals survive a saved checkpoint reload', () => {
  const progress = defaultProgress();
  progress.checkpoint = 3;
  progress.claimed = ['pickup:soulforge-spell-3', 'pickup:soulforge-treasure-35', 'npc:soulforge-mira'];
  progress.collections = ['ember-heart'];
  progress.defeatedBosses = ['soulforge-warden'];
  progress.openedGates = ['soulforge-guardian-seal-34'];
  let value;
  const storage = { setItem: (_key, text) => { value = text; }, getItem: () => value };
  assert.equal(saveProgress(progress, storage), true);
  const restored = loadProgress(storage);
  const world = createWorld(restored.checkpoint, { progress: restored });
  assert.equal(world.checkpoint, 3);
  assert.equal(world.player.x + world.player.w / 2, 6112);
  assert.ok(world.pickups.find(p => p.id === 'soulforge-spell-3').taken);
  assert.ok(world.bosses.find(b => b.id === 'soulforge-warden').dead);
  assert.ok(world.gates.find(g => g.id === 'soulforge-guardian-seal-34').open);
  assert.ok(world.pickups.filter(p => p.id.includes('-hollow-')).every(p => !p.taken));
});
