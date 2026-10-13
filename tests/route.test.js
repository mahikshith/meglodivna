import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/level.js';
import { createPlayer, PHYSICS, stepPlayer, overlaps } from '../src/physics.js';

for (const LEVEL of Object.values(LEVELS)) test(`${LEVEL.id}: entire authored route is traversable with legal movement inputs`, context => {
  const player = createPlayer(LEVEL.spawn.x + 12 - PHYSICS.playerWidth / 2, LEVEL.spawn.y + 46 - PHYSICS.playerHeight);
  const visited = [];
  const actions = new Set();
  const route = LEVEL.route;
  let frames = 0;
  let sinceJump = 0;
  let launched = false;
  let targetIndex = 0;
  while (targetIndex < route.length && frames < 120 * 440) {
    const marker = route[targetIndex];
    const target = LEVEL.solids.find(solid => solid.id === marker.id);
    const center = player.x + player.w / 2;
    const feet = player.y + player.h;
    if (player.grounded && Math.abs(feet - marker.y) < 0.01 && Math.abs(center - marker.x) < 60) {
      visited.push(marker.id);
      targetIndex++;
      continue;
    }
    const support = player.grounded && LEVEL.solids.find(solid => Math.abs(feet - solid.y) < 0.01
      && player.x < solid.x + solid.w && player.x + player.w > solid.x);
    const distance = marker.x - center;
    const move = Math.max(-1, Math.min(1, distance / 50));
    let jumpPressed = false;
    if (support && support.id !== target.id) {
      const launchX = Math.min(target.x - 40, support.x + support.w - 18);
      const edge = support.x + support.w + 2;
      const walkOff = target.y > support.y && LEVEL.solids.some(solid => solid !== support
        && solid.x <= edge && solid.x + solid.w > edge && solid.y >= support.y && solid.y <= support.y + 150);
      jumpPressed = !walkOff && center >= launchX;
    }
    if (player.grounded && player.wall) jumpPressed = true;
    if (launched && !player.grounded && sinceJump > 20 && player.vy >= -80 && player.jumps > 0 && distance > 150) jumpPressed = true;
    const drop = !!support?.oneWay && feet < target.y - 5 && center >= target.x && center <= target.x + target.w;
    if(drop)jumpPressed=true;
    const wasGrounded = player.grounded;
    const events = stepPlayer(player, { move, jumpPressed, jumpHeld: true, dashPressed: false, jet: false, down: drop },
      LEVEL.solids, PHYSICS.fixedStep);
    if (events.includes('jump') || events.includes('walljump')) sinceJump = 0;
    else sinceJump++;
    if (wasGrounded && events.includes('jump')) launched = true;
    if (events.includes('land')) launched = false;
    for (const event of events) actions.add(event);
    frames++;
    assert.ok(player.y < LEVEL.height + 70, `Fell before ${marker.id} at x=${player.x.toFixed(1)}`);
    assert.ok(!LEVEL.solids.some(solid => !solid.oneWay && overlaps(player, solid)), `Embedded in a solid near ${marker.id}`);
  }
  assert.equal(targetIndex, route.length,
    `Route stalled at ${route[targetIndex]?.id}: x=${player.x.toFixed(1)}, y=${player.y.toFixed(1)}, grounded=${player.grounded}`);
  assert.deepEqual(visited, route.map(marker => marker.id));
  assert.ok(actions.has('jump'));
  assert.ok(frames > 0 && frames / 120 < 440, `Traversal duration ${frames / 120}s`);
  context.diagnostic(`${LEVEL.id}: ${(frames / 120).toFixed(2)}s, ${visited.length} landings, no teleport or physics bypass. Dynamic mechanics/combat use the live campaign driver.`);
});
