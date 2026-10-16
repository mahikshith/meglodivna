import test from 'node:test';
import assert from 'node:assert/strict';
import { firingFrame, characterSocket, villainFrame, characterPoint } from '../src/character-motion.js';
import { CHARACTER_GEOMETRY, CHARACTER_ANIMATIONS } from '../src/character-geometry.js';
import { ironfangFrame, ironfangPoint, ironfangSocket, damageBounds, ironfangRotation } from '../src/ironfang.js';
import { IRONFANG_GEOMETRY } from '../src/ironfang-geometry.js';
import { weaponOrigin, createWorld, stepWorld, STEP, spawnProjectile, segmentHit } from '../src/combat.js';
import { bladeMotion } from '../src/blade-motion.js';
import { CATALOG } from '../src/catalog.js';

test('all armor rigs select authored airborne aim and crouch poses in both directions', () => {
  for (const armor of CATALOG.armor.map(item => item.id)) for (const facing of [-1, 1]) {
    const family = ['lanternplate', 'bulwark'].includes(armor) ? 'plate' : 'courier';
    const actor = { characterRevision: true, sword: 'rustfang', armor, x: 200, y: 300, w: 28, h: 60, facing, grounded: false, vx: 320 };
    for (const [vertical, expected] of [[0, 0], [.7, 1], [Math.PI / 2, 2], [-.6, 3]]) {
      actor.aimAngle = facing > 0 ? vertical : Math.PI - vertical;
      const key = firingFrame(actor); assert.equal(key, `cr-${family}gunair-${expected}`);
      const hand = characterSocket(actor, 'hand', key), muzzle = weaponOrigin(actor, 'gun');
      assert.deepEqual(muzzle, characterSocket(actor, 'gun', key));
      if (vertical > 0) assert.ok(muzzle.y > hand.y, 'downward artwork must put its barrel below the hand');
      if (vertical < 0) assert.ok(muzzle.y < hand.y, 'upward artwork must put its barrel above the hand');
      if (vertical === Math.PI / 2) assert.ok(Math.abs(muzzle.x - hand.x) < 2, 'vertical barrel must not emit beside the character');
    }
    actor.grounded = true; actor.crouching = true; actor.vx = 0;
    for (const shootCooldown of [0, .1]) {
      actor.shootCooldown = shootCooldown;
      assert.equal(firingFrame(actor), `cr-${family}guncrouch-${shootCooldown ? 1 : 0}`);
      assert.deepEqual(weaponOrigin(actor, 'gun'), characterSocket(actor, 'gun', firingFrame(actor)));
    }
  }
});

test('new firing pose sockets mirror around the unchanged physics body without vertical drift', () => {
  for (const key of Object.keys(CHARACTER_GEOMETRY).filter(key => /gunair|guncrouch/.test(key))) {
    const actor = { x: 100, y: 200, w: 28, h: 60, facing: 1 };
    for (const slot of ['hand', 'gun']) {
      const right = characterSocket(actor, slot, key), left = characterSocket({ ...actor, facing: -1 }, slot, key);
      assert.ok(Math.abs(right.x + left.x - 228) < 1e-8); assert.equal(right.y, left.y);
      assert.ok(Number.isFinite(right.x + right.y));
    }
  }
});

test('dragon cannon recoil cycles authored mounts and rotated sockets preserve their anatomical radius', () => {
  for (const facing of [-1, 1]) for (const flightPitch of [-.18, .18]) {
    const actor = { type: 'regent', combatStyle: 'sanctuary', form: 'flying', attackKind: 'cannon', phase: 'attack',
      x: 300, y: 200, w: 112, h: 86, facing, flightPitch };
    const frames = new Set();
    for (const phaseTime of [.001, .06, .12]) {
      actor.phaseTime = phaseTime; const key = ironfangFrame(actor); frames.add(key);
      assert.ok(key.startsWith('if-dragon-cannon-'));
      const rotated = ironfangSocket(actor, 'rocket'), neutral = ironfangSocket({ ...actor, flightPitch: 0 }, 'rocket');
      const pivot = { x: actor.x + actor.w / 2, y: actor.y + actor.h };
      assert.ok(Math.abs(Math.hypot(rotated.x - pivot.x, rotated.y - pivot.y) - Math.hypot(neutral.x - pivot.x, neutral.y - pivot.y)) < 1e-8);
      assert.notDeepEqual(rotated, neutral); assert.deepEqual(weaponOrigin(actor, 'rocket'), rotated);
      const boxes = damageBounds(actor), meta = IRONFANG_GEOMETRY[key];
      for (let index = 0; index < boxes.length; index++) {
        const source = meta.hurtboxes[index], bounds = boxes[index];
        for (const x of [source.x, source.x + source.w]) for (const y of [source.y, source.y + source.h]) {
          const p = ironfangPoint(actor, { x, y }, key);
          assert.ok(p.x >= bounds.x - 1e-8 && p.x <= bounds.x + bounds.w + 1e-8);
          assert.ok(p.y >= bounds.y - 1e-8 && p.y <= bounds.y + bounds.h + 1e-8);
        }
      }
    }
    assert.equal(frames.size, 3); assert.equal(ironfangRotation({ ...actor, phase: 'transform' }), 0);
  }
});

test('a fast projectile hits the visibly rotated dragon head in both directions', () => {
  for (const facing of [-1, 1]) {
    const world = createWorld(), boss = world.bosses.find(actor => actor.type === 'regent');
    world.enemies = []; world.props = []; world.gates = []; world.enemyPortals = []; world.npcs = []; world.portals = [];
    world.staticSolids = []; world.solids = []; world.movingPlatforms = []; world.crumble = [];
    world.bosses = [boss];
    Object.assign(boss, { x: boss.arenaStart + 400, y: 500, baseY: 500, active: true, form: 'flying', visualFamily: 'wyrm',
      h: 86, phase: 'charge', attackKind: 'cannon', timer: 100, phaseTime: 0, shield: 0, facing, flightPitch: .15, aimX: 0, aimY: 0 });
    Object.assign(world.player, { x: boss.x - 300, y: 550, invincible: 100 });
    const head = damageBounds(boss)[1], start = facing > 0 ? head.x + head.w + 10 : head.x - 10;
    const round = spawnProjectile(world, start, head.y + head.h / 2, -facing * 30000, 0, 'player');
    const hp = boss.hp; stepWorld(world, {}, STEP);
    assert.ok(boss.hp < hp); assert.equal(round.active, false); assert.ok(round.hitIds.includes(boss.id));
  }
});

test('boost selects no blade motion or active sword bounds and charge uses four distance-driven poses', () => {
  const player = { x: 0, y: 0, w: 28, h: 60, dashTime: .16, slashTime: 0, combo: 0, facing: 1 };
  const motion = bladeMotion(player, CATALOG.sword[0]); assert.equal(motion.active, false); assert.notEqual(motion.mode, 'dash');
  const actor = { type: 'regent', combatStyle: 'sanctuary', form: 'ground', phase: 'attack', attackKind: 'charge' };
  const frames = [0, .25, .5, .75].map(cycle => ironfangFrame({ ...actor, motion: { cycle } }));
  assert.deepEqual(frames, ['if-bull-charge-0', 'if-bull-charge-1', 'if-bull-charge-2', 'if-bull-charge-3']);
});

test('secondary villains share authored render/collision frame selection through anticipation, contact and recovery', () => {
  const cases = [
    [{ type: 'guard', attackPhase: 'contact' }, 'cr-stalker-6'],
    [{ type: 'wispknight', attackPhase: 'contact', attackProgress: .25 }, 'cr-wispknight-5'],
    [{ type: 'wispknight', attackPhase: 'contact', attackProgress: .75 }, 'cr-wispknight-6'],
    [{ type: 'sentinel', attackPhase: 'lift', attackProgress: .65 }, 'cr-guardian-6'],
    [{ type: 'warden', attackPhase: 'contact' }, 'cr-guardian-9'],
    [{ type: 'sentinel', attackPhase: 'recovery', attackProgress: .8 }, 'cr-guardian-11'],
    [{ type: 'bellbeast', attackPhase: 'contact' }, 'cr-bellbeast-6'],
    [{ type: 'mage', attackPhase: 'contact' }, 'cr-caster-6'],
    [{ type: 'drone', attackPhase: 'contact' }, 'cr-dragon-5'],
    [{ type: 'sentinel', attackKind: 'charge', attackPhase: 'contact', vx: 390, motion: { cycle: .6 } }, 'cr-guardian-2'],
  ];
  for (const [state, expected] of cases) {
    const actor = { ...state, characterRevision: true, x: 200, y: 100, w: 28, h: 60, facing: 1 };
    assert.equal(villainFrame(actor), expected); assert.ok(CHARACTER_GEOMETRY[expected].hurtboxes.length >= 2);
    const right = damageBounds(actor), left = damageBounds({ ...actor, facing: -1 });
    assert.equal(right.length, CHARACTER_GEOMETRY[expected].hurtboxes.length);
    for (let i = 0; i < right.length; i++) {
      assert.ok(Math.abs(right[i].x + right[i].w + left[i].x - 428) < 1e-8);
      assert.equal(left[i].y, right[i].y); assert.equal(left[i].w, right[i].w); assert.equal(left[i].h, right[i].h);
    }
  }
  for (const [animation, frames] of Object.entries(CHARACTER_ANIMATIONS).filter(([name]) => /^(stalker|caster|wispknight|guardian|bellbeast|dragon)-/.test(name))) {
    assert.ok(frames.every(key => CHARACTER_GEOMETRY[key].hurtboxes?.length), `${animation} must never revert to an unmeasured movement box`);
  }
});

test('the live projectile sweep hits measured secondary head anatomy and rejects a detached axe blade', () => {
  for (const type of ['guard', 'mage', 'wispknight', 'sentinel', 'bellbeast', 'drone']) for (const facing of [-1, 1]) {
    const world = createWorld(), enemy = { id: `anatomy-${type}`, type, characterRevision: true, x: 3000, y: 500, w: 28, h: 60,
      facing, hp: 100, maxHp: 100, shield: 0, cooldown: 100, attackPhase: 'contact', attackProgress: .25 };
    world.enemies = [enemy]; world.bosses = []; world.props = []; world.gates = []; world.enemyPortals = []; world.portals = [];
    world.movingPlatforms = []; world.crumble = []; world.staticSolids = []; world.solids = [];
    world.level = { ...world.level, hazards: [], currents: [], pressureDisabled: true };
    const head = damageBounds(enemy)[0], x = head.x + head.w / 2, y = head.y + head.h / 2;
    const shot = spawnProjectile(world, x, y, 0, 0, 'player');
    stepWorld(world, {}, STEP); assert.equal(enemy.hp, 92, `${type}/${facing} illustrated head accepts damage`); assert.equal(shot.active, false);
  }
  const guardian = { type: 'sentinel', characterRevision: true, x: 200, y: 100, w: 66, h: 90, facing: 1, attackPhase: 'contact' };
  const key = villainFrame(guardian), blade = characterPoint(guardian, key, CHARACTER_GEOMETRY[key].sockets.contact);
  assert.ok(damageBounds(guardian).every(box => !segmentHit(blade.x, blade.y, blade.x, blade.y, box)), 'axe tip is not flesh');
  const legacy = { type: 'guard', x: 0, y: 0, w: 30, h: 44 };
  assert.deepEqual(damageBounds(legacy), [legacy]);
});
