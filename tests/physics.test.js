import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS, createPlayer, moveBody, overlaps, stepPlayer } from '../src/physics.js';

const DT = PHYSICS.fixedStep;
const floor = [{ x: -1000, y: 610, w: 3000, h: 100 }];
const controls = (changes = {}) => ({ move: 0, jumpPressed: false, jumpHeld: false, dashPressed: false, jet: false, down: false, ...changes });
function settledPlayer(solids = floor, x = 100, y = 610 - PHYSICS.playerHeight) {
  const player = createPlayer(x, y);
  stepPlayer(player, controls(), solids, DT);
  assert.ok(player.grounded);
  return player;
}
function jumpApex(holdFrames) {
  const player = settledPlayer();
  let apex = player.y;
  for (let frame = 0; frame < 120; frame++) {
    stepPlayer(player, controls({ jumpPressed: frame === 0, jumpHeld: frame < holdFrames }), floor, DT);
    apex = Math.min(apex, player.y);
  }
  return 610 - PHYSICS.playerHeight - apex;
}

test('full jump reaches authored height and releasing jump produces a short hop', () => {
  const full = jumpApex(120);
  const short = jumpApex(5);
  assert.ok(full > 115 && full < 135, `Full jump apex ${full}`);
  assert.ok(short > 20 && short < full * 0.6, `Short jump apex ${short}`);
});

test('run accelerates to its cap, releases stop, and fixed-step input is deterministic', () => {
  const a = settledPlayer();
  const b = settledPlayer();
  for (let frame = 0; frame < 120; frame++) {
    const input = controls({ move: frame < 100 ? 1 : 0 });
    stepPlayer(a, input, floor, DT);
    stepPlayer(b, input, floor, DT);
  }
  assert.deepEqual(a, b);
  assert.equal(a.vx, 0);
  assert.ok(a.x > 330 && a.x < 400);
});

test('jump can use coyote time and only one additional air jump', () => {
  const ledge = [{ x: 0, y: 610, w: 140, h: 100 }];
  const player = settledPlayer(ledge, 138);
  for (let frame = 0; frame < 5; frame++) stepPlayer(player, controls({ move: 1, jumpHeld: true }), ledge, DT);
  assert.equal(player.grounded, false);
  const coyoteJump = stepPlayer(player, controls({ move: 1, jumpPressed: true, jumpHeld: true }), ledge, DT);
  assert.ok(coyoteJump.includes('jump'));
  assert.equal(player.jumps, 1);
  assert.ok(player.vy < -640);
  stepPlayer(player, controls({ jumpHeld: true }), ledge, DT);
  assert.ok(stepPlayer(player, controls({ jumpPressed: true, jumpHeld: true }), ledge, DT).includes('jump'));
  assert.equal(player.jumps, 0);
  assert.ok(!stepPlayer(player, controls({ jumpPressed: true, jumpHeld: true }), ledge, DT).includes('jump'));
});

test('coyote time expires and buffered jump fires on landing', () => {
  const player = settledPlayer();
  for (let frame = 0; frame < 20; frame++) stepPlayer(player, controls(), [], DT);
  stepPlayer(player, controls({ jumpPressed: true, jumpHeld: true }), [], DT);
  assert.equal(player.jumps, 0, 'Expired coyote must consume the air jump');
  player.x = 100;
  player.y = 610 - player.h - 15;
  player.vy = 300;
  player.jumpBuffer = 0;
  let events = stepPlayer(player, controls({ jumpPressed: true, jumpHeld: true }), floor, DT);
  for (let frame = 0; frame < 10 && !events.includes('jump'); frame++) {
    events = stepPlayer(player, controls({ jumpHeld: true }), floor, DT);
  }
  assert.ok(events.includes('land'));
  assert.ok(events.includes('jump'));
  assert.equal(player.grounded, false);
  assert.equal(player.vy, -PHYSICS.jumpSpeed);
});

test('swept rectangles stop fast movement against thin walls, floors, and ceilings', () => {
  const wall = [{ x: 100, y: 0, w: 2, h: 300 }];
  const right = { x: 0, y: 50, w: 24, h: 46, vx: 30000, vy: 0 };
  moveBody(right, wall, DT);
  assert.equal(right.x, 76);
  assert.equal(right.vx, 0);
  assert.equal(right.wall, 1);
  const left = { x: 200, y: 50, w: 24, h: 46, vx: -30000, vy: 0 };
  moveBody(left, wall, DT);
  assert.equal(left.x, 102);
  assert.equal(left.wall, -1);
  const falling = { x: 10, y: 0, w: 24, h: 46, vx: 0, vy: 30000 };
  moveBody(falling, [{ x: 0, y: 100, w: 200, h: 2 }], DT);
  assert.equal(falling.y, 54);
  assert.equal(falling.grounded, true);
  const rising = { x: 10, y: 150, w: 24, h: 46, vx: 0, vy: -30000 };
  moveBody(rising, [{ x: 0, y: 100, w: 200, h: 2 }], DT);
  assert.equal(rising.y, 102);
  assert.equal(rising.vy, 0);
  assert.ok(!overlaps(right, wall[0]));
});

test('exact-edge contact stops velocity on that tick and nearest collision ignores solid order', () => {
  const body = { x: 0, y: 50, w: 24, h: 46, vx: 120, vy: 480 };
  moveBody(body, [{ x: 25, y: 0, w: 2, h: 200 }, { x: 0, y: 100, w: 200, h: 2 }], DT);
  assert.equal(body.x, 1);
  assert.equal(body.y, 54);
  assert.equal(body.vx, 0);
  assert.equal(body.vy, 0);
  const fast = { x: 0, y: 20, w: 24, h: 46, vx: 30000, vy: 0 };
  moveBody(fast, [{ x: 150, y: 0, w: 2, h: 300 }, { x: 100, y: 0, w: 2, h: 300 }], DT);
  assert.equal(fast.x, 76);
});

test('one-way platforms permit rising and down+jump dropping, but catch descending bodies', () => {
  const platforms = [{ x: 0, y: 100, w: 250, h: 12, oneWay: true }];
  const player = createPlayer(50, 130);
  player.vy = -600;
  for (let frame = 0; frame < 20; frame++) moveBody(player, platforms, DT);
  assert.ok(player.y < 100 - player.h);
  player.vy = 600;
  for (let frame = 0; frame < 30; frame++) moveBody(player, platforms, DT);
  assert.equal(player.y, 100 - player.h);
  assert.equal(player.onOneWay, true);
  stepPlayer(player, controls({ down: true, jumpPressed: true, jumpHeld: true }), platforms, DT);
  assert.equal(player.grounded, false);
  assert.ok(player.dropThrough > 0);
  for (let frame = 0; frame < 40; frame++) stepPlayer(player, controls(), platforms, DT);
  assert.ok(player.y > 112);
});

test('wall slide limits falling speed and wall jump pushes away without instant input reversal', () => {
  const walls = [{ x: 200, y: -100, w: 30, h: 800 }];
  const player = createPlayer(200 - PHYSICS.playerWidth, 150);
  player.vy = 500;
  stepPlayer(player, controls({ move: 1 }), walls, DT);
  stepPlayer(player, controls({ move: 1 }), walls, DT);
  assert.ok(player.vy <= PHYSICS.wallSlideSpeed);
  assert.equal(player.state, 'wall');
  const events = stepPlayer(player, controls({ move: 1, jumpPressed: true, jumpHeld: true }), walls, DT);
  assert.ok(events.includes('walljump'));
  assert.equal(player.facing, -1);
  assert.ok(player.vx < -390);
  assert.ok(player.vy < -600);
  stepPlayer(player, controls({ move: 1, jumpHeld: true }), walls, DT);
  assert.ok(player.vx < 0);
  assert.equal(player.jumps, 1);
});

test('dash has finite duration and cooldown and ends immediately on a wall', () => {
  const player = createPlayer(0, 100);
  let count = 0;
  for (let frame = 0; frame < 60; frame++) {
    const events = stepPlayer(player, controls({ dashPressed: true }), [], DT);
    count += events.filter(event => event === 'dash').length;
    if (frame === 0) {
      assert.equal(player.vx, PHYSICS.dashSpeed);
      assert.equal(player.vy, 0);
    }
    if (frame === 25) assert.equal(player.dashTime, 0);
  }
  assert.equal(count, 1);
  const wall = [{ x: player.x + 28, y: -1000, w: 10, h: 5000 }];
  for (let frame = 0; frame < 30; frame++) stepPlayer(player, controls(), [], DT);
  stepPlayer(player, controls({ dashPressed: true }), wall, DT);
  stepPlayer(player, controls(), wall, DT);
  assert.equal(player.dashTime, 0);
  assert.equal(player.vx, 0);
});

test('jet fuel exhausts, cannot sustain ascent, and refills only while grounded', () => {
  const player = createPlayer(100, 300);
  let lowestY = player.y;
  for (let frame = 0; frame < 300; frame++) {
    stepPlayer(player, controls({ jet: true }), [], DT);
    lowestY = Math.min(lowestY, player.y);
  }
  assert.equal(player.fuel, 0);
  assert.equal(player.jetActive, false);
  assert.ok(player.vy > 0);
  assert.ok(lowestY > -400, `Finite ascent reached ${lowestY}`);
  player.y = 610 - player.h;
  player.vy = 0;
  stepPlayer(player, controls(), floor, DT);
  for (let frame = 0; frame < 240; frame++) stepPlayer(player, controls({ jet: true }), floor, DT);
  assert.equal(player.fuel, 100);
  assert.equal(player.grounded, true);
});

test('invalid position and time fail instead of poisoning the simulation', () => {
  assert.throws(() => createPlayer(NaN, 0), TypeError);
  assert.throws(() => stepPlayer(createPlayer(0, 0), controls(), [], 0), RangeError);
  assert.throws(() => moveBody(createPlayer(0, 0), [], Infinity), RangeError);
});
