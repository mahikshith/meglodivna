import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, STEP, spawnProjectile, retryWorld, getSoulEngine, upgradeSoulEngine, equipItem, castSpell } from '../src/combat.js';
import { defaultProgress, validateProgress, saveProgress, loadProgress, switchWorldProgress } from '../src/progress.js';
import { LEVEL } from '../src/level.js';
import { bladeMotion, BLADE_ATTACKS } from '../src/blade-motion.js';
import { motionProfile, steerEnemy, groundImpact } from '../src/enemy-motion.js';
import { SWORDS } from '../src/catalog.js';

// Isolated mechanics fixtures; the optional route script separately proves access
// and combat using legal campaign input without state overrides.
function fixture(type = 'sentinel') {
  const spawn = { x: 100, y: 564 };
  const level = { ...LEVEL, width: 2000, height: 900, spawn, checkpoints: [spawn],
    solids: [{ id: 'floor', x: 0, y: 610, w: 2000, h: 200 }],
    enemies: [{ id: 'major-fixture', type, major: type === 'bellbeast', x: 320, y: 539, w: 52, h: 71, hp: 900, facing: -1 }],
    bosses: [{ id: 'fixture-boss', type: 'warden', combatStyle: 'sanctuary', x: 1500, y: 490, w: 96, h: 120, hp: 100,
      floorY: 610, triggerX: 1350, arenaStart: 1250, arenaEnd: 2000 }],
    gates: [], props: [], npcs: [], pickups: [], portals: [], hazards: [], enemyPortals: [], movingPlatforms: [], crumble: [], currents: [] };
  return createWorld(0, { level });
}
function tick(world, count, input = {}) { for (let i = 0; i < count; i++) stepWorld(world, input, STEP); }

test('motion profiles accelerate by mass, preserve step-rate behavior and expose distance-driven cycles', () => {
  const light = { type: 'guard', vx: 0 }, heavy = { type: 'sentinel', vx: 0 }, caster = { type: 'mage', vx: 0 };
  for (const actor of [light, heavy, caster]) steerEnemy(actor, 100, .1);
  assert.ok(light.vx > caster.vx && caster.vx > heavy.vx);
  assert.equal(motionProfile(heavy).jump, 0);
  const world = fixture('mage'); world.player.invincible = 100;
  tick(world, 40); const enemy = world.enemies[0];
  assert.equal(enemy.motion.profile, 'caster'); assert.ok(enemy.motion.distance > 0);
  assert.ok(enemy.motion.cycle >= 0 && enemy.motion.cycle < 1); assert.equal(enemy.y + enemy.h, 610);
});

test('heavy axe has ordered lift, downswing, contact and recovery; facing locks and damage waits for contact', () => {
  const world = fixture(), enemy = world.enemies[0], phases = [], impacts = [];
  world.player.invincible = 100;
  for (let i = 0; i < 700; i++) {
    stepWorld(world, {}, STEP);
    if (enemy.attackPhase && phases.at(-1) !== enemy.attackPhase) phases.push(enemy.attackPhase);
    if (enemy.attackPhase === 'lift') {
      world.player.x = enemy.x + enemy.w + 40;
      assert.equal(enemy.attackBox, null); assert.equal(enemy.facing, -1);
    }
    if (enemy.attackPhase === 'downswing') { assert.equal(enemy.attackBox, null); assert.equal(enemy.facing, -1); }
    impacts.push(...world.events.filter(event => event.type === 'slam')); world.events.length = 0;
    if (enemy.attackPhase === 'recovery') break;
  }
  assert.deepEqual(phases, ['lift', 'downswing', 'contact', 'recovery']); assert.equal(impacts.length, 1);
  assert.equal(impacts[0].bounds.y + impacts[0].bounds.h, 610); assert.equal(impacts[0].surfaceId, 'floor');
  assert.equal(impacts[0].weaponSocket.y, 610); assert.equal(enemy.attackBox, null);
  assert.ok(enemy.recovery > .7);
});

test('ground impacts clip to real support and arena, and cannot fabricate cracks in midair', () => {
  const floor = { id: 'shelf', x: 100, y: 600, w: 180, h: 30 };
  const actor = { x: 120, y: 500, w: 60, h: 100, facing: -1, arenaStart: 120, arenaEnd: 250 };
  const impact = groundImpact(actor, [floor], 250);
  assert.deepEqual(impact.bounds, { x: 120, y: 572, w: 130, h: 28 });
  actor.y -= 20; assert.equal(groundImpact(actor, [floor], 250), null);
});

test('axe and Bellbeast contact sockets match authored body scales and mirrored facing', () => {
  const floor = { id: 'floor', x: 0, y: 600, w: 2000, h: 30 };
  for (const [type, h, w, ratio] of [['sentinel', 71, 52, 171 / 220], ['warden', 120, 96, 171 / 220], ['bellbeast', 166, 190, 91 / 210]]) {
    const actor = { type, x: 500, y: 600 - h, w, h, facing: 1 }, center = actor.x + actor.w / 2;
    const right = groundImpact(actor, [floor], 285);
    actor.facing = -1; const left = groundImpact(actor, [floor], 285);
    assert.ok(Math.abs(right.weaponSocket.x - center - ratio * h) < 1e-9);
    assert.ok(Math.abs(left.weaponSocket.x - center + ratio * h) < 1e-9);
    assert.equal(right.weaponSocket.y, floor.y); assert.deepEqual(right.bounds, left.bounds);
  }
});

test('blade anticipation, contact and recovery share mirrored anatomical bounds', () => {
  for (const [combo, mode] of ['horizontal', 'vertical', 'finisher'].entries()) {
    const duration = BLADE_ATTACKS[mode].duration;
    const p = { x: 100, y: 300, w: 28, h: 60, combo, slashFacing: 1, slashDuration: duration, slashTime: duration };
    assert.equal(bladeMotion(p, SWORDS[0]).active, false);
    assert.equal(bladeMotion(p, SWORDS[0]).poseIndex, 0);
    p.slashTime = duration - BLADE_ATTACKS[mode].start - .001;
    const right = bladeMotion(p, SWORDS[0]); assert.equal(right.active, true); assert.equal(right.poseIndex, 1, 'first damaging tick shows the committed blade');
    p.slashFacing = -1; const left = bladeMotion(p, SWORDS[0]);
    assert.equal(left.bounds.x + right.bounds.x + right.bounds.w, 2 * (p.x + p.w / 2));
    assert.ok(right.bounds.w <= 64 && right.bounds.h <= 90);
    p.slashTime = duration - (BLADE_ATTACKS[mode].start + BLADE_ATTACKS[mode].end) / 2 - .001;
    assert.equal(bladeMotion(p, SWORDS[0]).poseIndex, 2); assert.equal(bladeMotion(p, SWORDS[0]).active, true);
    p.slashTime = duration - BLADE_ATTACKS[mode].end - .001; assert.equal(bladeMotion(p, SWORDS[0]).active, false);
    assert.equal(bladeMotion(p, SWORDS[0]).poseIndex, 3);
  }
});

test('automatic portal pairs respect pause, activate arrival, require exit and cooldown, and never chain', () => {
  const world = fixture(); world.enemies = [];
  world.portals = [
    { id: 'a', pairId: 'pair', destinationId: 'b', x: 95, y: 550, w: 40, h: 60, to: { x: 600, y: 564 } },
    { id: 'b', pairId: 'pair', destinationId: 'a', dormant: true, x: 600, y: 550, w: 40, h: 60, to: { x: 100, y: 564 } },
    { id: 'chain', pairId: 'chain', x: 600, y: 550, w: 40, h: 60, to: { x: 1000, y: 564 } },
  ];
  world.status = 'paused'; tick(world, 120); assert.equal(world.player.x, 98);
  world.status = 'playing'; tick(world, 1); assert.equal(world.player.x, 598); assert.equal(world.portals[1].dormant, false);
  tick(world, 240); assert.equal(world.player.x, 598, 'overlap never bounces even after cooldown');
  tick(world, 35, { move: 1 }); assert.equal(world.portalExitLock, false);
  for (let i = 0; i < 90 && world.player.x > 300; i++) stepWorld(world, { move: -1 }, STEP);
  assert.equal(world.player.x, 98); assert.equal(world.events.filter(e => e.type === 'portal').length, 2);
  const retry = retryWorld(world); assert.equal(retry.portalCooldown, 0); assert.equal(retry.portalExitLock, false);
});

test('major soul reward stays uncollected through save/retry, collects once and cannot duplicate', () => {
  const world = fixture('bellbeast'); world.player.invincible = 100;
  const enemy = world.enemies[0]; enemy.shield = 0;
  const shot = spawnProjectile(world, enemy.x + 15, enemy.y + 20, 0, 0, 'player'); shot.damage = 5000;
  tick(world, 1); assert.equal(enemy.dead, true); assert.equal(world.progress.souls, 0);
  assert.equal(world.souls.length, 1); assert.equal(world.progress.pendingSouls.length, 1);
  let json; const storage = { setItem: (_key, value) => { json = value; }, getItem: () => json };
  assert.equal(saveProgress(world.progress, storage), true);
  const loaded = createWorld(0, { level: world.level, progress: loadProgress(storage) });
  assert.equal(loaded.enemies[0].dead, true); assert.equal(loaded.souls.length, 1);
  for (let i = 0; i < 240 && loaded.progress.souls === 0; i++) stepWorld(loaded, { move: 1 }, STEP);
  assert.equal(loaded.progress.souls, 80); assert.equal(loaded.progress.pendingSouls.length, 0);
  const retry = retryWorld(loaded); assert.equal(retry.souls.length, 0); assert.equal(retry.progress.soulClaims.length, 1);
  assert.equal(switchWorldProgress(retry.progress, 'tide').souls, 80);
});

test('old saves migrate Soul Engine safely; guarded purchases apply armor and artifact tradeoffs', () => {
  const raw = defaultProgress(); delete raw.souls; delete raw.upgrades; delete raw.pendingSouls; delete raw.soulClaims;
  assert.deepEqual(validateProgress(raw).upgrades, { armor: 0, artifact: 0 });
  const world = fixture(); assert.equal(upgradeSoulEngine(world, 'armor').reason, 'insufficient');
  assert.equal(upgradeSoulEngine(world, 'bogus').reason, 'unknown');
  world.progress.souls = 500; const hp = world.player.hp;
  assert.equal(upgradeSoulEngine(world, 'armor').ok, true); assert.equal(world.player.maxHp, 110); assert.equal(world.player.hp, hp, 'upgrades do not refill wounds');
  assert.equal(upgradeSoulEngine(world, 'artifact').ok, true); assert.equal(world.player.maxMana, 115);
  assert.equal(upgradeSoulEngine(world, 'lanternplate').ok, true); assert.equal(equipItem(world, 'armor', 'lanternplate'), true);
  assert.equal(world.player.maxHp, 130); assert.equal(world.player.maxMana, 85); assert.equal(world.player.fuelRate, 1.5);
  assert.equal(world.player.damageTaken, .7 * .97); assert.equal(upgradeSoulEngine(world, 'lanternplate').reason, 'complete');
  for (let i = 0; i < 2; i++) assert.equal(upgradeSoulEngine(world, 'armor').ok, true);
  assert.equal(upgradeSoulEngine(world, 'armor').reason, 'complete');
  const restored = createWorld(0, { level: world.level, progress: JSON.parse(JSON.stringify(world.progress)) });
  assert.equal(restored.player.maxHp, 150); assert.equal(getSoulEngine(restored).offers.find(offer => offer.id === 'armor').complete, true);
});

test('raven dives to expose a ward without creating another generic companion bullet', () => {
  const world = fixture('sentinel'); world.player.invincible = 100; world.progress.souls = 35;
  assert.equal(upgradeSoulEngine(world, 'raven').ok, true); assert.equal(castSpell(world, 'raven'), true);
  const enemy = world.enemies[0]; let exposed = false;
  for (let i = 0; i < 480; i++) { stepWorld(world, {}, STEP); exposed ||= enemy.weakened > 0; }
  assert.ok(exposed); assert.ok(enemy.hp < enemy.maxHp);
  assert.ok(!world.projectiles.some(projectile => projectile.owner === 'player'));
});
