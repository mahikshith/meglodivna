import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, stepPlayer, PHYSICS } from '../src/physics.js';
import { createWorld, stepWorld, STEP, spawnProjectile, weaponOrigin, castSpell, equipItem, upgradeSoulEngine } from '../src/combat.js';
import { defaultProgress, loadProgress, saveProgress, testArmoryProgress, newCampaignProgress, restartWorldProgress } from '../src/progress.js';
import { CATALOG } from '../src/catalog.js';

function arena() {
  const world = createWorld(0, { progress: testArmoryProgress() });
  const floor = { id: 'test-floor', x: 0, y: 600, w: 2200, h: 200 };
  world.level = { ...world.level, width: 2200, height: 900, solids: [floor], hazards: [], currents: [], pressureDisabled: true, exit: { x: 2100, y: 0, w: 10, h: 10 } };
  world.staticSolids = [floor]; world.solids = [floor];
  for (const key of ['enemies', 'bosses', 'props', 'gates', 'pickups', 'npcs', 'enemyPortals', 'portals', 'movingPlatforms', 'crumble']) world[key] = [];
  Object.assign(world.player, { x: 100, y: 540, invincible: 100, grounded: true });
  return world;
}
function target(x, y = 540, w = 50) {
  return { id: `target-${x}`, type: 'turret', x, y, w, h: 60, hp: 500, maxHp: 500, cooldown: 100, facing: -1, shield: 0 };
}
function run(world, seconds, input = {}) {
  for (let t = 0; t < seconds; t += STEP) { stepWorld(world, input); world.events.length = 0; }
}

test('boost consumes fuel in the air, keeps a committed direction and never becomes a sword attack', () => {
  const w = arena(), p = w.player;
  p.y = 400; p.grounded = false;
  w.enemies = [target(150, 400)];
  stepWorld(w, { move: 1, boostPressed: true, shoot: true, aimX: -1, aimY: 0 });
  assert.equal(p.vx, PHYSICS.dashSpeed); assert.equal(p.vy, 0);
  assert.equal(p.fuel, 100 - PHYSICS.boostFuel); assert.equal(p.slashTime, 0);
  assert.ok(w.events.some(e => e.type === 'boost'));
  stepWorld(w, { shoot: true, aimX: -1, aimY: 0 });
  assert.equal(p.vx, PHYSICS.dashSpeed); assert.equal(w.enemies[0].hp, 500);
  const dry = createPlayer(0, 100); dry.fuel = PHYSICS.boostFuel - 1;
  stepPlayer(dry, { boostPressed: true }, [], STEP); assert.equal(dry.dashTime, 0);
});

test('grounded down stops drift while firing and airborne down aim does not cancel thrust', () => {
  const w = arena(), p = w.player;
  p.vx = 320;
  stepWorld(w, { move: 1, down: true, shoot: true });
  assert.equal(p.vx, 0); assert.equal(p.crouching, true); assert.equal(p.shooting, true);
  p.y = 400; p.grounded = false; p.shootCooldown = 0;
  stepWorld(w, { move: 1, down: true, shoot: true, jet: true, aimX: 0, aimY: 1 });
  assert.ok(p.vx > 0); assert.ok(p.vy < 0); assert.equal(p.crouching, false);
  assert.equal(p.aimAngle, Math.PI / 2); assert.equal(p.jetActive, true);
});

test('rounds hit point-blank foes between the hand and illustrated muzzle in both directions', () => {
  for (const facing of [-1, 1]) {
    const w = arena(), p = w.player; p.x = 500; p.facing = facing; p.aimAngle = facing > 0 ? 0 : Math.PI;
    const hand = weaponOrigin(p, 'hand'), muzzle = weaponOrigin(p, 'gun');
    const e = target((hand.x + muzzle.x) / 2 - 1, hand.y - 15, 2); w.enemies = [e];
    stepWorld(w, { shoot: true });
    assert.ok(e.hp < 500, `point-blank facing ${facing}`);
    assert.ok(w.events.some(event => event.type === 'impact' && event.enemyId === e.id));
  }
});

test('first collision wins when a fast round crosses a foe and a wall in one tick', () => {
  for (const wallFirst of [false, true]) {
    const w = arena(), e = target(300, 300); w.enemies = [e];
    w.staticSolids.push({ x: wallFirst ? 250 : 370, y: 280, w: 3, h: 100 });
    const round = spawnProjectile(w, 200, 320, 30000, 0, 'player');
    stepWorld(w);
    assert.equal(e.hp, wallFirst ? 500 : 492); assert.equal(round.active, false);
    assert.ok(round.x < (wallFirst ? 250 : 301));
  }
});

test('every companion lands actual damage through the live projectile and contact simulation', () => {
  for (const type of ['wolf', 'raven', 'dragon', 'clone']) {
    const w = arena(), e = target(500); w.enemies = [e];
    assert.equal(castSpell(w, type), true); run(w, 6.5);
    assert.ok(e.hp < 500, `${type} must deal real damage before its summon expires`);
  }
});

test('armory tests unlock all gear in a separate save and preserve the campaign byte for byte', () => {
  const data = new Map(), storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const campaign = defaultProgress(); campaign.souls = 31; saveProgress(campaign, storage);
  const original = data.get('ash-signal-soulforge'), testProgress = loadProgress(storage, { testMode: true });
  for (const category of ['sword', 'gun', 'armor', 'spell']) assert.deepEqual(testProgress.unlocked[category], CATALOG[category].map(item => item.id));
  const w = createWorld(0, { progress: testProgress });
  assert.equal(w.progress.souls, 9999);
  for (const id of ['armor', 'artifact']) for (let rank = 1; rank <= 3; rank++) {
    assert.equal(upgradeSoulEngine(w, id).ok, true);
    assert.equal(w.progress.upgrades[id], rank);
  }
  assert.equal(w.progress.souls, 9999 - 285);
  assert.deepEqual(w.collections, []);
  assert.deepEqual(w.progress.openedGates, []);
  w.progress.charges = { cannon: 0, nova: 0 };
  for (const restart of [newCampaignProgress(w.progress), restartWorldProgress(w.progress, w.worldId)]) {
    assert.deepEqual(restart.charges, { cannon: 9, nova: 9 });
    assert.equal(restart.testMode, true);
  }
  assert.equal(equipItem(w, 'armor', 'wraith'), true); assert.equal(equipItem(w, 'gun', 'cannon'), true);
  saveProgress(w.progress, storage);
  assert.equal(data.get('ash-signal-soulforge'), original); assert.equal(loadProgress(storage).souls, 31);
  assert.equal(loadProgress(storage, { testMode: true }).equipped.armor, 'wraith');
});

test('Minotaur and dragon cannons emit rapid directed physical rounds from their registered gun mounts', () => {
  for (const flying of [false, true]) {
    const w = arena();
    const boss = createWorld().bosses.find(b => b.type === 'regent');
    Object.assign(boss, { x: 600, y: flying ? 360 : 600 - boss.h, baseY: flying ? 360 : 600 - boss.h,
      active: true, phase: 'attack', attackKind: 'cannon', phaseTime: 0, timer: .85, shots: 0,
      arenaStart: 0, arenaEnd: 2000, floorY: 600, aimX: 114, aimY: 570, facing: -1, attackFacing: -1,
      form: flying ? 'flying' : 'ground', visualFamily: flying ? 'wyrm' : boss.visualFamily });
    w.bosses = [boss]; w.boss = boss;
    stepWorld(w);
    const event = w.events.find(e => e.type === 'enemyshot');
    assert.equal(event.kind, 'cannonround'); assert.equal(event.weaponSlot, flying ? 'rocket' : 'gun');
    assert.deepEqual({ x: event.x, y: event.y }, weaponOrigin(boss, event.weaponSlot));
    assert.ok(w.projectiles.some(p => p.active && p.kind === 'cannonround' && p.vx < 0));
    run(w, .4); assert.ok(boss.shots >= 4);
  }
});

test('Minotaur charge follows a ballistic arc and emits its ground impact only on real landing', () => {
  const w = arena(), boss = createWorld().bosses.find(b => b.type === 'regent');
  Object.assign(boss, { x: 700, y: 600 - boss.h, baseY: 600 - boss.h, grounded: true,
    active: true, phase: 'charge', attackKind: 'charge', phaseTime: .7, timer: 0,
    arenaStart: 0, arenaEnd: 2000, floorY: 600, aimX: 114, aimY: 570, facing: -1, attackFacing: -1 });
  w.bosses = [boss]; w.boss = boss;
  let apex = boss.y, impact = null; const startX = boss.x, startY = boss.y;
  for (let i = 0; i < 70; i++) {
    stepWorld(w); apex = Math.min(apex, boss.y);
    const event = w.events.find(e => e.type === 'slam' && e.kind === 'charge');
    if (event) { assert.equal(boss.grounded, true); impact = event; }
    w.events.length = 0;
  }
  assert.ok(apex < startY - 20); assert.ok(boss.x < startX - 100);
  assert.ok(impact); assert.equal(impact.surfaceY, 600);
});

test('area spells affect nearby foes but never distant, vertically remote or disconnected crossing guardians', () => {
  for (const spell of ['cinder', 'siphon', 'thunder', 'stasis', 'eclipse']) {
    const w = arena(), local = target(200), far = target(65000), high = target(250, 2500), crossing = target(600);
    w.level.crossings = [{ id: 'separate-realm', x: 500, w: 500 }];
    w.enemies = [local, far, high, crossing];
    for (const enemy of w.enemies) Object.assign(enemy, { shield: 20, major: true });
    const snapshots = [far, high, crossing].map(enemy => ({ ...enemy }));
    assert.equal(castSpell(w, spell), true);
    assert.ok(local.hp < 500 || local.burn > 0 || local.slow > 0, `${spell} must affect its local encounter`);
    assert.deepEqual([far, high, crossing], snapshots, `${spell} must not mutate another encounter`);
    assert.equal(w.progress.defeatedBosses.length, 0);
  }
});

test('nova respects realm and vertical boundaries for destructibles and hostile rounds too', () => {
  const w = arena(); w.level.crossings = [{ id: 'separate-realm', x: 500, w: 500 }];
  w.props = [200, 600].map(x => ({ id: `crate-${x}`, type: 'crate', x, y: 540, w: 30, h: 40, hp: 30, collidable: true }));
  const near = spawnProjectile(w, 300, 500, 100, 0, 'enemy'), crossing = spawnProjectile(w, 650, 500, 100, 0, 'enemy'), high = spawnProjectile(w, 300, 2400, 100, 0, 'enemy');
  assert.equal(castSpell(w, 'eclipse'), true);
  assert.equal(w.props[0].dead, true); assert.equal(w.props[1].hp, 30); assert.equal(w.props[1].dead, undefined);
  assert.equal(near.active, false); assert.equal(crossing.active, true); assert.equal(high.active, true);
});

test('physics rejects boost below its exact cost and EMP cancels propulsion without interfering with aim', () => {
  for (const fuel of [0, PHYSICS.boostFuel - .001, PHYSICS.boostFuel]) {
    const p = createPlayer(100, 300); p.fuel = fuel;
    stepPlayer(p, { boostPressed: true, move: 1 }, [], STEP);
    assert.equal(p.boostActive, fuel === PHYSICS.boostFuel);
    assert.equal(p.fuel, fuel === PHYSICS.boostFuel ? 0 : fuel);
  }
  const w = arena(), p = w.player; p.y = 300; p.grounded = false; p.impaired = 1;
  stepWorld(w, { boostPressed: true, jet: true, shoot: true, aimX: -1, aimY: 0, move: 1 });
  assert.equal(p.boostActive, false); assert.equal(p.jetActive, false); assert.equal(p.fuel, 100);
  assert.equal(p.facing, -1); assert.ok(p.vx > 0); assert.equal(p.shooting, true);
  const direct = createPlayer(100, 300); direct.dashTime = .1; direct.impaired = 1;
  stepPlayer(direct, { boostPressed: true, jet: true }, [], STEP);
  assert.equal(direct.dashTime, 0); assert.equal(direct.jetActive, false); assert.equal(direct.fuel, 100);
});
