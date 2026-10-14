import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, STEP } from '../src/combat.js';
import { overlaps } from '../src/physics.js';

test('a fresh lantern bearer can climb the optional Roots vault, recover its blade and return through its rift', () => {
  const world = createWorld(0, { worldId: 'soulforge', difficulty: 'forge' });
  const roots = world.level.rooms.find(room => room.kind === 'roots');
  const inRoots = item => item.x >= roots.x && item.x < roots.x + roots.w;
  const solid = name => world.level.solids.find(item => inRoots(item) && item.id.includes(name));
  const steps = world.level.solids.filter(item => inRoots(item) && item.id.includes('vault-step')).sort((a, b) => a.x - b.x);
  const vault = solid('side-vault');
  const chest = world.props.find(item => inRoots(item) && item.type === 'cache');
  const portal = world.level.portals.find(inRoots);
  assert.ok(vault && chest && portal && steps.length === 2);
  assert.equal(chest.dead, false);
  assert.equal(world.unlocks.sword.includes('katana'), false);
  const visited = new Set(), events = [];
  let frames = 0;

  const tick = input => {
    stepWorld(world, input, STEP);
    frames++;
    events.push(...world.events);
    world.events.length = 0;
    assert.equal(world.status, 'playing', `legal route failed at (${world.player.x.toFixed(1)}, ${world.player.y.toFixed(1)})`);
    assert.ok(frames < 120 * 60, 'optional route must finish within a minute of simulation');
  };
  // This pilot changes only ordinary input; live foes, collisions, fuel and rewards remain active.
  const walkTo = (target, at) => {
    for (let frame = 0; frame < 120 * 15; frame++) {
      const p = world.player, center = p.x + p.w / 2, feet = p.y + p.h;
      if (p.grounded && Math.abs(feet - target.y) < .01 && Math.abs(center - at) < 20) {
        visited.add(target.id); return;
      }
      const support = p.grounded && world.solids.find(item => Math.abs(feet - item.y) < .01 && p.x < item.x + item.w && p.x + p.w > item.x);
      let jumpPressed = false;
      if (support && support.id !== target.id) {
        const continuousFloor = support.y === target.y && target.x <= support.x + support.w;
        jumpPressed = !continuousFloor && center >= Math.min(target.x - 40, support.x + support.w - 18);
      }
      const drop = !!support?.oneWay && feet < target.y - 5 && center >= target.x && center <= target.x + target.w;
      tick({ move: Math.max(-1, Math.min(1, (at - center) / 40)), jumpPressed: jumpPressed || drop,
        jumpHeld: true, down: drop, jet: !p.grounded && feet > target.y + 20 && p.fuel > 0,
        slashPressed: p.slashCooldown <= STEP, shoot: true });
    }
    assert.fail(`could not land on ${target.id}: x=${world.player.x}, feet=${world.player.y + world.player.h}`);
  };

  walkTo(solid('root-bank'), roots.x + 325);
  walkTo(solid('broken-root'), solid('broken-root').x + 145);
  walkTo(solid('hanging-root'), solid('hanging-root').x + 150);
  for (const step of steps) walkTo(step, step.x + step.w / 2);
  walkTo(vault, vault.x + 50);
  assert.ok(steps.every(step => visited.has(step.id)), 'both authored vault steps were physically landed on');
  assert.ok(visited.has(vault.id), 'the optional upper platform was physically reached');
  for (let frame = 0; frame < 120 * 3 && !chest.dead; frame++) {
    tick({ move: .01, shoot: true, slashPressed: world.player.slashCooldown <= STEP });
  }
  assert.equal(chest.dead, true, 'ordinary attacks open the vault chest');
  assert.ok(world.unlocks.sword.includes('katana'), 'the vault grants its authored blade');
  assert.ok(world.progress.destroyedProps.includes(chest.id));
  assert.equal(world.progress.claimed.filter(claim => claim === `cache:${chest.id}:0`).length, 1, 'blade reward is claimed exactly once');

  walkTo(vault, portal.x - 35);
  const departure = { x: world.player.x, y: world.player.y };
  tick({ interactPressed: true });
  assert.ok(events.some(event => event.type === 'portal'), 'interact activates the return rift');
  assert.ok(events.some(event => event.type === 'portalarrival'), 'arrival has its own effect event');
  assert.ok(world.player.x < departure.x - 250 && world.player.y > departure.y + 200, 'the rift returns from the upper vault to the lower route');
  assert.equal(world.player.x, portal.to.x + 12 - world.player.w / 2);
  assert.equal(world.player.y + world.player.h, portal.to.y + 46);
  tick({});
  assert.ok(world.player.grounded, 'arrival settles on the authored route floor');
  assert.ok(!world.solids.some(item => overlaps(world.player, item)), 'arrival does not embed the player in terrain');
  assert.ok(world.unlocks.sword.includes('katana'), 'the recovered blade survives the return trip');
  assert.ok(world.player.hp > 0 && world.player.hp <= world.player.maxHp);
});
