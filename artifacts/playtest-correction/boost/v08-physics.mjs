export const PHYSICS = Object.freeze({
  fixedStep: 1 / 120,
  playerWidth: 28,
  playerHeight: 60,
  runSpeed: 320,
  groundAcceleration: 2600,
  airAcceleration: 1500,
  friction: 2700,
  gravity: 1800,
  fallSpeed: 900,
  jumpSpeed: 670,
  airJumpSpeed: 625,
  jumpCutSpeed: 250,
  coyoteTime: 0.1,
  jumpBufferTime: 0.12,
  wallSlideSpeed: 110,
  wallJumpSpeed: 620,
  wallJumpPush: 410,
  wallLockTime: 0.14,
  dashSpeed: 620,
  dashDuration: 0.16,
  dashCooldown: 0.65,
  jetAcceleration: 2600,
  jetRiseSpeed: 330,
  fuelDrain: 50,
  fuelRefill: 55,
  dropThroughTime: 0.22,
});

const EPSILON = 0.00001;
const approach = (value, target, amount) => value < target
  ? Math.min(value + amount, target) : Math.max(value - amount, target);
const horizontalOverlap = (a, b) => a.x < b.x + b.w - EPSILON && a.x + a.w > b.x + EPSILON;
const verticalOverlap = (a, b) => a.y < b.y + b.h - EPSILON && a.y + a.h > b.y + EPSILON;

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createPlayer(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('Player position must be finite.');
  return {
    x, y, w: PHYSICS.playerWidth, h: PHYSICS.playerHeight, vx: 0, vy: 0, facing: 1,
    grounded: false, wall: 0, onOneWay: false, fuel: 100,
    dashTime: 0, dashCooldown: 0, jumps: 1, state: 'fall',
    coyote: 0, jumpBuffer: 0, wallLock: 0, dropThrough: 0,
    jumpCutPending: false, jetActive: false, lastJumpKind: 'ground',
  };
}

export function moveBody(body, solids, dt) {
  if (!Number.isFinite(dt) || dt <= 0) throw new RangeError('Physics step must be positive and finite.');
  const startX = body.x;
  let targetX = startX + body.vx * dt;
  let hitX = false;
  for (const solid of solids) {
    if (solid.oneWay || !verticalOverlap(body, solid)) continue;
    if (body.vx > 0 && startX + body.w <= solid.x + EPSILON && targetX + body.w >= solid.x) {
      targetX = Math.min(targetX, solid.x - body.w);
      hitX = true;
    } else if (body.vx < 0 && startX >= solid.x + solid.w - EPSILON && targetX <= solid.x + solid.w) {
      targetX = Math.max(targetX, solid.x + solid.w);
      hitX = true;
    }
  }
  if (hitX) body.vx = 0;
  body.x = targetX;

  const startY = body.y;
  let targetY = startY + body.vy * dt;
  let hitY = false;
  for (const solid of solids) {
    if (!horizontalOverlap(body, solid) || (solid.oneWay && body.dropThrough > 0)) continue;
    if (body.vy >= 0 && startY + body.h <= solid.y + EPSILON && targetY + body.h >= solid.y) {
      targetY = Math.min(targetY, solid.y - body.h);
      hitY = true;
    } else if (!solid.oneWay && body.vy < 0 && startY >= solid.y + solid.h - EPSILON && targetY <= solid.y + solid.h) {
      targetY = Math.max(targetY, solid.y + solid.h);
      hitY = true;
    }
  }
  if (hitY) body.vy = 0;
  body.y = targetY;
  body.grounded = false;
  body.wall = 0;
  body.onOneWay = false;
  for (const solid of solids) {
    if (horizontalOverlap(body, solid) && body.vy >= 0 && Math.abs(body.y + body.h - solid.y) < EPSILON
      && !(solid.oneWay && body.dropThrough > 0)) {
      body.onOneWay = body.grounded ? body.onOneWay && !!solid.oneWay : !!solid.oneWay;
      body.grounded = true;
    }
    if (!solid.oneWay && verticalOverlap(body, solid)) {
      if (Math.abs(body.x + body.w - solid.x) < EPSILON) body.wall = 1;
      else if (Math.abs(body.x - solid.x - solid.w) < EPSILON) body.wall = -1;
    }
  }
}

export function stepPlayer(player, input, solids, dt) {
  if (!Number.isFinite(dt) || dt <= 0) throw new RangeError('Physics step must be positive and finite.');
  // A slow display must not stretch dash, thrust or jump timing into one large integration.
  if (dt > PHYSICS.fixedStep + 1e-9) {
    const events = [], held = { ...input, jumpPressed: false, dashPressed: false };
    for (let remaining = dt, first = true; remaining > 1e-9; first = false) {
      const tick = Math.min(PHYSICS.fixedStep, remaining);
      events.push(...stepPlayer(player, first ? input : held, solids, tick)); remaining -= tick;
    }
    return events;
  }
  const events = [];
  const wasGrounded = player.grounded;
  const wasJetActive = player.jetActive;
  const move = Math.max(-1, Math.min(1, input.move || 0));
  player.coyote = player.grounded ? PHYSICS.coyoteTime : Math.max(0, player.coyote - dt);
  player.jumpBuffer = input.jumpPressed ? PHYSICS.jumpBufferTime : Math.max(0, player.jumpBuffer - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.dashTime = Math.max(0, player.dashTime - dt);
  player.wallLock = Math.max(0, player.wallLock - dt);
  player.dropThrough = Math.max(0, player.dropThrough - dt);
  if (player.grounded) {
    player.jumps = 1;
    player.fuel = Math.min(100, player.fuel + PHYSICS.fuelRefill * dt);
  }
  if (move && player.dashTime === 0 && player.wallLock === 0) player.facing = Math.sign(move);

  if (input.down && input.jumpPressed && player.grounded && player.onOneWay) {
    player.dropThrough = PHYSICS.dropThroughTime;
    player.y += 2;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
  }
  if (player.jumpBuffer > 0 && player.dashTime === 0) {
    if (player.grounded || player.coyote > 0) {
      player.vy = -PHYSICS.jumpSpeed;
      player.lastJumpKind = 'ground';
      events.push('jump');
    } else if (player.wall) {
      player.lastJumpKind = 'wall';
      player.vy = -PHYSICS.wallJumpSpeed;
      player.vx = -player.wall * PHYSICS.wallJumpPush;
      player.facing = -player.wall;
      player.wallLock = PHYSICS.wallLockTime;
      player.jumps = 1;
      events.push('walljump');
    } else if (player.jumps > 0) {
      player.lastJumpKind = 'air';
      player.vy = -PHYSICS.airJumpSpeed;
      player.jumps--;
      events.push('jump');
    }
    if (events.length) {
      player.grounded = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      player.jumpCutPending = true;
    }
  }
  if (input.dashPressed && player.dashCooldown === 0 && player.dashTime === 0) {
    player.dashTime = PHYSICS.dashDuration;
    player.dashCooldown = PHYSICS.dashCooldown;
    player.jumpCutPending = false;
    events.push('dash');
  }

  player.jetActive = false;
  if (player.dashTime > 0) {
    player.vx = player.facing * PHYSICS.dashSpeed;
    player.vy = 0;
  } else {
    if (player.wallLock === 0) {
      const acceleration = player.grounded ? PHYSICS.groundAcceleration : PHYSICS.airAcceleration;
      player.vx = approach(player.vx, move * PHYSICS.runSpeed, (move ? acceleration : PHYSICS.friction) * dt);
    }
    if (player.jumpCutPending && !input.jumpHeld) {
      player.vy = Math.max(player.vy, -PHYSICS.jumpCutSpeed);
      player.jumpCutPending = false;
    }
    player.vy = Math.min(PHYSICS.fallSpeed, player.vy + PHYSICS.gravity * dt);
    player.jetActive = !!input.jet && !player.grounded && player.fuel > 0;
    if (player.jetActive) {
      const boost = player.boost > 0 ? 1.4 : 1;
      const drain = PHYSICS.fuelDrain * (player.fuelRate || 1) * (boost > 1 ? 0.6 : 1);
      const thrustTime = Math.min(dt, player.fuel / drain);
      if (player.vy > -PHYSICS.jetRiseSpeed * boost) {
        player.vy = Math.max(-PHYSICS.jetRiseSpeed * boost, player.vy - PHYSICS.jetAcceleration * boost * thrustTime);
      }
      player.fuel = Math.max(0, player.fuel - drain * dt);
      player.jumpCutPending = false;
      if (!wasJetActive) events.push('jet');
    } else if (player.wall && player.vy > PHYSICS.wallSlideSpeed) {
      player.vy = PHYSICS.wallSlideSpeed;
    }
  }

  const motionX = player.x;
  moveBody(player, solids, dt);
  player.motionDistance = (player.motionDistance || 0) + Math.abs(player.x - motionX);
  if (player.dashTime > 0 && player.wall && player.vx === 0) player.dashTime = 0;
  if (player.grounded) {
    player.jumps = 1;
    player.jetActive = false;
    player.jumpCutPending = false;
    if (!wasGrounded) events.push('land');
    if (player.jumpBuffer > 0 && player.dashTime === 0) {
      player.vy = -PHYSICS.jumpSpeed;
      player.lastJumpKind = 'ground';
      player.grounded = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      player.jumpCutPending = true;
      events.push('jump');
    }
  }
  if (player.vy >= 0) player.jumpCutPending = false;
  player.state = player.dashTime > 0 ? 'dash' : player.jetActive ? 'jet'
    : player.grounded ? (Math.abs(player.vx) > 8 ? 'run' : 'idle')
      : player.wall && player.vy > 0 ? 'wall' : player.vy < 0 ? 'jump' : 'fall';
  return events;
}
