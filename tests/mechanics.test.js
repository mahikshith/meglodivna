import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL } from '../src/legacy-level.js';
import { createPlayer, stepPlayer } from '../src/physics.js';
import { createWorld as makeWorld, STEP, stepWorld, rewardPlayer, equipItem, castSpell, interact, advanceStory, retryWorld, spawnProjectile } from '../src/combat.js';
const createWorld = () => makeWorld(0, { level: LEVEL });

function world() {
  const result = createWorld();
  result.enemies = []; result.pickups = []; result.props = []; result.gates = []; result.solids = LEVEL.solids;
  return result;
}
function tick(state, frames, input = {}) { for (let frame = 0; frame < frames; frame++) { stepWorld(state, input, STEP); state.events.length = 0; } }
const enemy = (id, x, y = 564, hp = 200, type = 'turret') => ({ id, type, x, y, w: 30, h: 44, hp,
  facing: -1, minX: x - 100, maxX: x + 100, cooldown: 100, windup: 0, baseY: y });
function unlockSpell(state, id) { rewardPlayer(state, { type: 'spell', itemId: id }); }

test('overhead sword covers a tall vertical arc and never re-hits one target during a swing', () => {
  const state = world(); tick(state, 10);
  stepWorld(state, { slashPressed: true }, STEP);
  assert.equal(state.player.slashMode, 'horizontal');
  tick(state, 35);
  const target = enemy('overhead', state.player.x + 40, state.player.y - 70);
  state.enemies = [target];
  stepWorld(state, { slashPressed: true }, STEP);
  assert.equal(state.player.slashActive, false);
  assert.equal(state.player.slashBox.h, 90, 'blade reaches above the courier without the old oversized box');
  tick(state, 11);
  assert.equal(target.hp, 173);
  tick(state, 20);
  assert.equal(target.hp, 173);
});

test('sword and armor equipment changes real damage, lifesteal, defense, and resource limits', () => {
  const state = world(); tick(state, 10);
  rewardPlayer(state, { type: 'sword', itemId: 'saber' });
  state.player.hp = 50;
  const target = enemy('saber', state.player.x + 40);
  state.enemies = [target];
  stepWorld(state, { slashPressed: true }, STEP);
  tick(state, 8);
  assert.equal(target.hp, 165);
  assert.ok(state.player.hp > 50);
  rewardPlayer(state, { type: 'armor', itemId: 'bulwark' });
  assert.equal(state.player.maxHp, 135);
  assert.equal(state.player.maxMana, 80);
  assert.equal(state.player.fuelRate, 1.3);
  rewardPlayer(state, { type: 'armor', itemId: 'wraith' });
  assert.equal(state.player.maxHp, 85);
  assert.equal(state.player.maxMana, 140);
  assert.equal(state.player.fuelRate, 0.8);
});

test('scattergun creates five finite pellets and rail rounds pierce exactly three distinct targets', () => {
  const scatter = world(); rewardPlayer(scatter, { type: 'weapon', itemId: 'scatter' });
  stepWorld(scatter, { shoot: true }, STEP);
  assert.equal(scatter.projectiles.filter(projectile => projectile.active).length, 5);
  assert.ok(scatter.projectiles.filter(projectile => projectile.active).every(projectile => projectile.life < 0.65));
  const rail = world(); rewardPlayer(rail, { type: 'weapon', itemId: 'rail' });
  rail.enemies = [160, 220, 280, 340].map((x, index) => enemy(`rail-${index}`, x));
  stepWorld(rail, { shoot: true }, STEP); tick(rail, 30);
  assert.deepEqual(rail.enemies.map(target => target.hp), [172, 172, 172, 200]);
});

test('limited cannon pierces foes and destructible cover while preserving essential floors', () => {
  const state = world(); rewardPlayer(state, { type: 'cannon', value: 1 }); equipItem(state, 'gun', 'cannon');
  state.enemies = [enemy('cannon-a', 220), enemy('cannon-b', 340)];
  const crate = { id: 'cannon-crate', type: 'crate', x: 270, y: 560, w: 40, h: 50, hp: 40, collidable: true };
  state.props = [crate]; state.solids = [...LEVEL.solids, crate];
  const floors = LEVEL.solids.map(solid => ({ ...solid }));
  stepWorld(state, { shoot: true }, STEP);
  assert.equal(state.player.charges.cannon, 0);
  assert.deepEqual(state.enemies.map(target => target.hp), [100, 100]);
  assert.equal(crate.dead, true);
  assert.ok(!state.solids.includes(crate));
  assert.deepEqual(LEVEL.solids, floors);
  assert.equal(state.player.beam.w, 1800);
  tick(state, 120, { shoot: true });
  assert.deepEqual(state.enemies.map(target => target.hp), [100, 100]);
});

test('cinder burns distant living enemies for its exact duration without flooding hit feedback', () => {
  const state = world(); const target = enemy('distant', 5000); state.enemies = [target];
  assert.equal(castSpell(state, 'cinder'), true);
  assert.equal(state.player.mana, 55);
  state.events.length = 0;
  for (let frame = 0; frame < 600; frame++) stepWorld(state, {}, STEP);
  assert.ok(Math.abs(target.hp - 170) < 0.001);
  assert.ok(target.burn < 0.000001);
  assert.ok(!state.events.some(event => ['hit', 'burn'].includes(event.type)));
  assert.ok(!castSpell(state, 'fake'));
});

test('siphon heals real dealt damage and thunder strikes multiple nearby targets', () => {
  const state = world(); state.player.hp = 40; unlockSpell(state, 'siphon');
  state.enemies = [enemy('soul-a', 220), enemy('soul-b', 350)];
  assert.equal(castSpell(state, 'siphon'), true);
  assert.equal(state.player.hp, 47);
  state.player.spellCooldown = 0; unlockSpell(state, 'thunder');
  const before = state.enemies.map(target => target.hp);
  assert.equal(castSpell(state, 'thunder'), true);
  assert.deepEqual(state.enemies.map((target, index) => before[index] - target.hp), [48, 48]);
  assert.ok(state.player.hp > 47);
});

test('shadow veil blocks fresh targeting but attacking breaks stealth', () => {
  const state = world(); unlockSpell(state, 'veil');
  const target = enemy('watcher', 300); target.cooldown = 0.01; state.enemies = [target];
  assert.equal(castSpell(state, 'veil'), true);
  tick(state, 100);
  assert.equal(target.cooldown, 0.01);
  assert.equal(state.projectiles.filter(projectile => projectile.active).length, 0);
  stepWorld(state, { shoot: true }, STEP);
  assert.equal(state.player.stealth, 0);
  assert.ok(target.cooldown < 0.01);
});

test('stasis slows actual enemy and hostile projectile movement and then expires', () => {
  const state = world(); unlockSpell(state, 'stasis');
  const drone = enemy('slow-drone', 400, 350, 200, 'drone'); drone.patrolDirection = 1; state.enemies = [drone];
  const normal = world(); normal.enemies = [{ ...drone }];
  const bullet = spawnProjectile(state, 450, 100, 100, 0, 'enemy');
  assert.equal(castSpell(state, 'stasis'), true);
  stepWorld(state, {}, STEP);
  stepWorld(normal, {}, STEP);
  assert.ok(Math.abs(bullet.x - 450 - 100 * STEP * 0.3) < 0.001);
  assert.ok(Math.abs((drone.x - 400) / (normal.enemies[0].x - 400) - 0.3) < 0.001, 'Stasis reduces actual AI displacement to30%');
  tick(state, 610);
  assert.equal(state.stasis, 0);
  assert.equal(drone.slow, 0);
});

test('single-use eclipse nova spends one charge, clears threats, and strongly damages bosses', () => {
  const state = world(); rewardPlayer(state, { type: 'nova', value: 1 });
  const boss = state.boss; Object.assign(boss, { active: true, x: 500, y: 490 });
  state.enemies = [enemy('nova', 300)];
  const missile = spawnProjectile(state, 400, 400, -100, 0, 'enemy', true);
  const hp = boss.hp;
  assert.equal(castSpell(state, 'eclipse'), true);
  assert.equal(state.player.charges.nova, 0);
  assert.equal(state.enemies[0].dead, true);
  assert.equal(missile.active, false);
  assert.ok(hp - boss.hp >= boss.maxHp * 0.25);
  state.player.spellCooldown = 0;
  assert.equal(castSpell(state, 'eclipse'), false);
  assert.equal(retryWorld(state).player.charges.nova, 0);
});

test('explosive barrels chain into adjacent props and cache rewards are claimed once', () => {
  const state = world(); rewardPlayer(state, { type: 'cannon', value: 1 }); equipItem(state, 'gun', 'cannon');
  state.props = [
    { id: 'barrel-a', type: 'barrel', x: 280, y: 560, w: 32, h: 50, hp: 1 },
    { id: 'barrel-b', type: 'barrel', x: 380, y: 560, w: 32, h: 50, hp: 1 },
    { id: 'cache-a', type: 'cache', x: 490, y: 560, w: 32, h: 50, hp: 20, contents: [{ type: 'cannon', value: 2 }] },
  ];
  stepWorld(state, { shoot: true }, STEP);
  assert.ok(state.props.every(prop => prop.dead));
  assert.equal(state.player.charges.cannon, 2);
  assert.ok(state.progress.claimed.includes('cache:cache-a:0'));
  assert.equal(rewardPlayer(state, { type: 'cannon', value: 2 }, 'cache:cache-a:0'), false);
});

test('ordinary destructible crates award authored recovery contents exactly once', () => {
  const state = world(); rewardPlayer(state, { type: 'cannon', value: 1 }); equipItem(state, 'gun', 'cannon');
  Object.assign(state.player, { hp: 40, mana: 20, fuel: 10, shield: 0 });
  const crate = { id: 'supply-crate', type: 'crate', x: 260, y: 560, w: 40, h: 50, hp: 30,
    contents: [{ type: 'health', value: 15 }, { type: 'fuel', value: 20 }, { type: 'mana', value: 25 }, { type: 'shield', value: 12 }] };
  state.props = [crate];
  stepWorld(state, { shoot: true }, STEP);
  assert.equal(crate.dead, true);
  assert.equal(state.player.hp, 40 + 15 * state.rules.recovery);
  assert.equal(state.player.fuel, 30);
  assert.ok(state.player.mana >= 20 + 25 * state.rules.recovery && state.player.mana < 21 + 25 * state.rules.recovery);
  assert.equal(state.player.shield, 12);
  assert.equal(rewardPlayer(state, { type: 'health', value: 15 }, 'prop:supply-crate:0'), false);
});

test('bypassing a gate cannot win before every campaign boss is defeated', () => {
  const state = world(); Object.assign(state.player, { x: LEVEL.exit.x + 8, y: 610 - state.player.h });
  state.boss.dead = true; state.boss.hp = 0; state.bossDefeated = true;
  stepWorld(state, {}, STEP);
  assert.equal(state.status, 'playing');
  state.bosses.forEach(boss => { boss.dead = true; boss.hp = 0; });
  stepWorld(state, {}, STEP);
  assert.equal(state.status, 'won');
});

test('an eclipse barrel explosion cannot restore a dead player through nova recovery', () => {
  const state = world(); rewardPlayer(state, { type: 'nova', value: 1 });
  Object.assign(state.player, { hp: 1, invincible: 0 });
  state.props = [{ id: 'deadly-barrel', type: 'barrel', x: state.player.x + 20, y: 560, w: 32, h: 50, hp: 1 }];
  assert.equal(castSpell(state, 'eclipse'), true);
  assert.equal(state.status, 'dead');
  assert.equal(state.player.hp, 0);
  stepWorld(state, { shoot: true, slashPressed: true }, STEP);
  assert.equal(state.player.hp, 0);
});

test('story pauses the threat clock and validates a once-only reward choice across retries', () => {
  const state = createWorld(); state.enemies = [];
  const npc = state.npcs[0]; Object.assign(state.player, { x: npc.x, y: npc.y });
  assert.equal(interact(state), true);
  const time = state.time, timeLeft = state.timeLeft;
  tick(state, 120, { move: 1, shoot: true });
  assert.equal(state.time, time); assert.equal(state.timeLeft, timeLeft);
  while (state.story.index < state.story.lines.length - 1) assert.equal(advanceStory(state), true);
  assert.equal(advanceStory(state, 'forged-choice'), false);
  const choice = npc.choices[0];
  assert.equal(advanceStory(state, choice.id), true);
  assert.equal(state.story, null);
  const retry = retryWorld(state); const restoredNpc = retry.npcs.find(candidate => candidate.id === npc.id);
  Object.assign(retry.player, { x: restoredNpc.x, y: restoredNpc.y });
  assert.equal(interact(retry), true);
  assert.deepEqual(retry.story.choices, []);
  assert.ok(retry.progress.claimed.includes(`npc:${npc.id}`));
});

test('lever gates leave collision immediately and stay open on retry', () => {
  const state = createWorld(); const lever = state.props.find(prop => prop.type === 'lever');
  const gate = state.gates.find(candidate => candidate.id === lever.gateId || candidate.leverId === lever.id);
  Object.assign(state.player, { x: lever.x, y: lever.y });
  assert.ok(state.solids.includes(gate));
  assert.equal(interact(state), true);
  assert.equal(gate.open, true);
  assert.ok(!state.solids.includes(gate));
  assert.equal(retryWorld(state).gates.find(candidate => candidate.id === gate.id).open, true);
});

test('mage, shade, and sentinel attacks have distinct live powers', () => {
  for (const type of ['mage', 'shade', 'sentinel']) {
    const state = world(); const target = enemy(`power-${type}`, 300, 564, 200, type);
    target.cooldown = STEP / 2; state.enemies = [target];
    stepWorld(state, {}, STEP);
    if (type === 'mage') assert.equal(state.projectiles.filter(projectile => projectile.active && projectile.kind === 'fire').length, 3);
    if (type === 'shade') { assert.ok(target.dashTime > 0); const x = target.x; stepWorld(state, {}, STEP); assert.ok(target.x < x); }
    if (type === 'sentinel') {
      for (let frame = 0; frame < 240 && !target.attackBox; frame++) stepWorld(state, {}, STEP);
      assert.equal(target.attackKind, 'slam'); assert.equal(target.attackBox.w, 300);
      assert.equal(target.attackBox.h, 25); assert.ok(target.recovery > 0.6);
      assert.ok(!target.beam && state.events.some(event => event.type === 'slam'));
    }
  }
});

test('missile pressure warns before spawning right-to-left bounded attacks', () => {
  const state = world(); state.pressureTimer = STEP / 2;
  stepWorld(state, {}, STEP);
  assert.ok(state.missileWarning?.time > 0);
  assert.equal(state.projectiles.filter(projectile => projectile.active).length, 0);
  tick(state, 140);
  const missile = state.projectiles.find(projectile => projectile.active && projectile.kind === 'pressure');
  assert.ok(missile && missile.vx < 0 && missile.x > state.player.x);
  assert.equal(state.projectiles.length, 96);
});

test('booster increases real lift and fuel economy but jet fuel remains finite', () => {
  const normal = createPlayer(0, 300), boosted = createPlayer(0, 300); boosted.boost = 10;
  for (let frame = 0; frame < 60; frame++) {
    stepPlayer(normal, { jet: true }, [], STEP); stepPlayer(boosted, { jet: true }, [], STEP);
  }
  assert.ok(boosted.y < normal.y);
  assert.ok(boosted.fuel > normal.fuel);
  for (let frame = 0; frame < 700; frame++) stepPlayer(boosted, { jet: true }, [], STEP);
  assert.equal(boosted.fuel, 0); assert.equal(boosted.jetActive, false);
  const state = world(); rewardPlayer(state, { type: 'boost', value: 0.03 }); tick(state, 5);
  assert.equal(state.player.boost, 0);
});
