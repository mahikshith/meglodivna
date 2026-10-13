import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL } from '../src/level.js';
import { createWorld, stepWorld, spawnProjectile, rewardPlayer, retryWorld, interact, weaponOrigin, STEP } from '../src/combat.js';
import { PHYSICS, createPlayer, stepPlayer, overlaps } from '../src/physics.js';

const floor = { id: 'floor', x: 0, y: 1260, w: 2000, h: 180 };
function fixture(type, x = 750) {
  const spawn = { x: 100, y: 1214, label: 'Fixture' };
  const enemy = { id: 'foe', type, x, y: type === 'drone' ? 1040 : 1216, w: 30, h: 44, hp: 1000,
    facing: -1, minX: x - 55, maxX: x + 55, power: 'fixture' };
  const boss = { id: 'fixture-boss', type: 'warden', x: 1800, y: 1140, w: 96, h: 120, hp: 1000,
    floorY: 1260, arenaStart: 1500, arenaEnd: 2000, triggerX: 1600 };
  const level = { ...LEVEL, id: 'soulforge', width: 2000, height: 1440, spawn, checkpoints: [spawn],
    solids: [floor], enemies: type ? [enemy] : [], bosses: [boss], props: [], gates: [], pickups: [], npcs: [],
    movingPlatforms: [], crumble: [], currents: [], enemyPortals: [], portals: [], hazards: [] };
  return createWorld(0, { level });
}
function tick(world, frames, input = {}) {
  for (let frame = 0; frame < frames; frame++) { stepWorld(world, input, STEP); world.events.length = 0; }
}

test('ground villains chase across hundreds of pixels rather than old55px patrol hints', () => {
  for (const type of ['guard', 'shade', 'mage', 'sentinel']) {
    const world = fixture(type), foe = world.enemies[0], start = foe.x;
    tick(world, 240);
    assert.equal(world.status, 'playing');
    assert.ok(start - foe.x > 110, `${type} displacement=${start - foe.x}`);
    assert.equal(foe.facing, -1); assert.equal(foe.intent, 'chase');
    assert.ok(foe.minX < start - 55 && foe.maxX > start + 55);
    assert.ok(foe.x >= 0 && foe.x + foe.w <= floor.w);
  }
});

test('Raider pursues vertically and strafes while Mecha retreats at close range', () => {
  const flight = fixture('drone'), raider = flight.enemies[0], startX = raider.x, startY = raider.y;
  tick(flight, 180);
  assert.ok(startX - raider.x > 140); assert.ok(Math.abs(raider.y - startY) > 30);
  assert.equal(raider.intent, 'strafe'); assert.equal(raider.facing, -1);
  const ground = fixture('sentinel', 230), mecha = ground.enemies[0], start = mecha.x;
  tick(ground, 100); assert.ok(mecha.x > start + 35); assert.equal(mecha.facing, -1);
});

test('each villain warns before its directed attack and refreshes warning from its moving anatomy', () => {
  for (const type of ['guard', 'drone', 'mage', 'sentinel', 'shade']) {
    const world = fixture(type, 380), foe = world.enemies[0];
    let warned = 0, warningStart, movedWarning = false, attacked = false;
    for (let frame = 0; frame < 240; frame++) {
      stepWorld(world, {}, STEP);
      if (foe.windup > 0) {
        warned++;
        assert.ok(foe.telegraph);
        const origin = weaponOrigin(foe, foe.weaponSlot);
        assert.ok(Math.abs(foe.telegraph.x0 - origin.x) < 0.001 && Math.abs(foe.telegraph.y0 - origin.y) < 0.001);
        warningStart ??= foe.x; movedWarning ||= Math.abs(foe.x - warningStart) > 3;
      }
      if (foe.attackTime > 0) { attacked = true; break; }
      world.events.length = 0;
    }
    assert.ok(attacked && warned >= 25, `${type} warned${warned}frames before attack`);
    assert.ok(movedWarning, `${type} must remain visibly active during charge`);
  }
});

test('a crawler jumps a real obstacle and still collides with the room floor', () => {
  const world = fixture('guard', 500);
  world.staticSolids.push({ id: 'step', x: 340, y: 1180, w: 70, h: 80 });
  let jumped = false;
  for (let frame = 0; frame < 360; frame++) {
    stepWorld(world, {}, STEP); world.events.length = 0;
    const foe = world.enemies[0]; jumped ||= foe.vy < -300;
    assert.ok(!overlaps(foe, floor)); assert.ok(foe.y + foe.h <= floor.y + 0.001);
  }
  assert.ok(jumped, 'Pursuit must actually jump cover');
});

test('sword press near recovery is buffered, combos alternate, and movement cannot reverse an active blade', () => {
  const world = fixture(); tick(world, 2); const p = world.player;
  stepWorld(world, { slashPressed: true }, STEP); const id = p.slashId;
  tick(world, 22); stepWorld(world, { slashPressed: true, move: -1 }, STEP);
  assert.equal(p.slashId, id); tick(world, 14, { move: -1 });
  assert.equal(p.slashId, id + 1); assert.equal(p.slashMode, 'vertical'); assert.equal(p.slashFacing, -1);
  stepWorld(world, { move: 1 }, STEP);
  assert.equal(p.facing, 1); assert.equal(p.slashFacing, -1); assert.ok(p.slashBox.x < p.x);
});

test('melee knocks a live crawler away once, cancels its charge and cannot cut through a solid wall', () => {
  const world = fixture('guard', 160); tick(world, 2); const foe = world.enemies[0], start = foe.x;
  foe.cooldown = 0.1;
  stepWorld(world, { slashPressed: true }, STEP); const hp = foe.hp;
  assert.ok(hp < foe.maxHp && foe.stagger > 0 && foe.vx > 0); assert.equal(foe.windup, 0);
  tick(world, 8); assert.equal(foe.hp, hp); assert.ok(foe.x > start + 8);
  const blocked = fixture('guard', 160);
  blocked.staticSolids.push({ id: 'wall', x: 135, y: 1140, w: 8, h: 120 });
  stepWorld(blocked, { slashPressed: true }, STEP);
  assert.equal(blocked.enemies[0].hp, blocked.enemies[0].maxHp);
});

test('dash sword kills in its swept path, but neither light bullets nor heavy beams are parried by dash', () => {
  const world = fixture('guard', 185); world.enemies[0].hp = 30;
  tick(world, 2);
  const p = world.player, light = spawnProjectile(world, p.x + 75, p.y + 25, 0, 0, 'enemy');
  const heavy = spawnProjectile(world, p.x + 80, p.y + 25, 0, 0, 'enemy', true); heavy.heavy = true; heavy.reflectable = false;
  stepWorld(world, { dashPressed: true, move: 1 }, STEP); tick(world, 20, { move: 1 });
  assert.equal(world.enemies[0].dead, true); assert.equal(world.kills, 1);
  assert.equal(light.owner, 'enemy'); assert.equal(heavy.owner, 'enemy'); assert.equal(p.parryTime, 0);
});

test('runes open only their required seals, persist across retry and gate optional travel portals', () => {
  const world = fixture(), p = world.player;
  world.gates = [{ id: 'ember-seal', x: 500, y: 0, w: 25, h: 1260, requiresRelic: 'ember-heart' },
    { id: 'last-seal', x: 900, y: 0, w: 25, h: 1260, requiresRelics: ['tide-glass', 'storm-seal'] }];
  world.level.gates = world.gates.map(gate => ({ ...gate }));
  stepWorld(world, {}, STEP); assert.ok(world.solids.includes(world.gates[0]));
  rewardPlayer(world, { type: 'treasure', itemId: 'ember-heart' }, 'rune:ember');
  assert.equal(world.gates[0].open, true); assert.ok(!world.solids.includes(world.gates[0]));
  rewardPlayer(world, { type: 'treasure', itemId: 'tide-glass' }, 'rune:tide');
  assert.equal(p.shield, 20); assert.ok(!world.gates[1].open);
  world.level.portals = [{ id: 'sealed-travel', x: p.x, y: p.y, w: 30, h: 60, requiresRelic: 'storm-seal', to: { x: 400, y: 1214 } }];
  assert.equal(interact(world), false);
  rewardPlayer(world, { type: 'treasure', itemId: 'storm-seal' }, 'rune:storm');
  assert.equal(world.gates[1].open, true); assert.equal(interact(world), true);
  const retry = retryWorld(world); assert.ok(retry.gates.every(gate => gate.open));
  assert.equal(rewardPlayer(retry, { type: 'treasure', itemId: 'tide-glass' }, 'rune:tide'), false);
});

test('Ember finisher burns a surviving foe and Storm dash kill restores a bounded amount of fuel', () => {
  const world = fixture('guard', 165), p = world.player, foe = world.enemies[0];
  world.collections.push('ember-heart', 'storm-seal'); p.combo = 1; p.comboWindow = 0.5;
  stepWorld(world, { slashPressed: true }, STEP); assert.equal(p.combo, 2); assert.ok(foe.burn > 0);
  const before = foe.hp; tick(world, 15); assert.ok(foe.hp < before);
  const dash = fixture('guard', 185); dash.collections.push('storm-seal'); dash.player.fuel = 10; dash.enemies[0].hp = 30;
  stepWorld(dash, { move: 1, dashPressed: true }, STEP); assert.ok(dash.player.fuel >= 25 && dash.player.fuel < 26);
});

test('30/60/120Hz caller frames yield the same120Hz movement, combat input edges and bounded thrust', () => {
  const worlds = [30, 60, 120].map(rate => {
    const world = fixture();
    for (let frame = 0; frame < rate * 2; frame++) stepWorld(world, { move: 1, jumpPressed: frame === 0, jumpHeld: true,
      dashPressed: frame === rate / 2, slashPressed: frame === rate, jet: frame >= rate }, 1 / rate);
    return world;
  });
  for (const world of worlds.slice(1)) for (const key of ['x', 'y', 'vx', 'vy', 'fuel', 'slashId']) {
    assert.ok(Math.abs(world.player[key] - worlds[0].player[key]) < 0.001, `${key} caller rate diverged`);
  }
  assert.equal(worlds[0].player.slashId, 2, 'One dash and one tap, never one attack per substep');
  const a = createPlayer(100, 1260 - PHYSICS.playerHeight), b = createPlayer(100, 1260 - PHYSICS.playerHeight);
  stepPlayer(a, {}, [floor], STEP); stepPlayer(b, {}, [floor], STEP);
  stepPlayer(a, { move: 1, jumpPressed: true, jumpHeld: true, jet: true }, [floor], 1 / 30);
  for (let frame = 0; frame < 4; frame++) stepPlayer(b, { move: 1, jumpPressed: frame === 0, jumpHeld: true, jet: true }, [floor], STEP);
  assert.deepEqual(a, b);
});

test('smaller240Hz steps keep jump height and finite fuel within pixel-scale tolerances', () => {
  const runs = [120, 240].map(rate => {
    const p = createPlayer(100, floor.y - PHYSICS.playerHeight);
    stepPlayer(p, {}, [floor], 1 / rate); let apex = p.y;
    for (let frame = 0; frame < rate; frame++) {
      stepPlayer(p, { move: 1, jumpPressed: frame === 0, jumpHeld: true }, [floor], 1 / rate); apex = Math.min(apex, p.y);
    }
    const jet = createPlayer(100, 900);
    for (let frame = 0; frame < rate * 3; frame++) stepPlayer(jet, { jet: true }, [], 1 / rate);
    assert.equal(jet.fuel, 0); assert.equal(jet.jetActive, false); assert.ok(jet.vy > 0);
    return { p, apex };
  });
  assert.ok(Math.abs(runs[0].apex - runs[1].apex) < 3);
  assert.ok(Math.abs(runs[0].p.x - runs[1].p.x) < 2);
});

test('vertical boss powers and pressure shots use the current room floor instead of the old610px floor', () => {
  for (const power of ['undertow', 'mirror']) {
    const world = fixture(), boss = world.boss;
    Object.assign(world.player, { x: 1550, y: 1200 });
    Object.assign(boss, { active: true, power, phase: 'idle', attack: 2, timer: 0 });
    stepWorld(world, {}, STEP);
    if (power === 'undertow') { assert.equal(boss.powerPulse.y + boss.powerPulse.h, 1260); assert.ok(boss.powerPulse.y > 610); }
    else assert.equal(boss.mirrorExit.y + 44, 1260);
  }
  const world = fixture(); world.pressureTimer = 0; stepWorld(world, {}, STEP);
  assert.ok(world.missileWarning.y > 1180);
});

test('boss guard resists real ranged hits during warning and recovery rewards actual melee timing', () => {
  const damage = (phase, melee) => {
    const world = fixture(), boss = world.boss;
    Object.assign(world.player, { x: 1600, y: floor.y - world.player.h });
    Object.assign(boss, { active: true, x: 1650, shield: 0, phase, timer: 10, attack: 0 });
    if (!melee) {
      const shot = spawnProjectile(world, boss.x + 10, boss.y + 40, 0, 0, 'player'); shot.damage = 100;
    }
    const hp = boss.hp; stepWorld(world, { slashPressed: melee }, STEP);
    return { damage: hp - boss.hp, boss };
  };
  const warning = damage('charge', false), attack = damage('attack', false);
  assert.equal(warning.damage, 35); assert.equal(attack.damage, 100); assert.equal(warning.boss.guarding, true);
  const recovery = damage('idle', true), active = damage('attack', true);
  assert.ok(Math.abs(recovery.damage / active.damage - 1.25) < 0.001); assert.equal(recovery.boss.recovering, true);
  const transform = damage('transform', false); assert.equal(transform.damage, 0);
});
