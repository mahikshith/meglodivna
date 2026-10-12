import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { LEVEL } from '../src/level.js';
import { PHYSICS } from '../src/physics.js';
import { createWorld, hazardState, STEP, stepWorld } from '../src/combat.js';

const route = LEVEL.route.flatMap(marker => marker.id === 'gauntlet-b'
  ? [{ id: 'gauntlet-cover-a', x: 5565, y: 540 }, { id: 'gauntlet-a', x: 6200, y: 610 }, marker]
  : marker.id === 'gauntlet-c'
    ? [{ id: 'gauntlet-cover-b', x: 7120, y: 534 }, { id: 'gauntlet-b', x: 7180, y: 610 }, marker]
    : [marker]);
let world = createWorld();
let targetIndex = 0;
let sinceJump = 0;
let launched = false;
let deaths = 0;
let totalFrames = 0;
const history = [];
const eventsSeen = new Set();
const trace = [];
let bossStartedAt = null;
let bossEndedAt = null;
const bossAttacks = new Set();

while (totalFrames < 120 * 240 && deaths < 6 && world.status !== 'won') {
  const p = world.player;
  if (world.status === 'dead') {
    history.push({ event: 'death', checkpoint: world.checkpoint, x: +p.x.toFixed(1),
      y: +p.y.toFixed(1), time: +world.time.toFixed(2), target: route[targetIndex]?.id });
    deaths++;
    const time = world.time;
    trace.push({ retry: world.checkpoint, time });
    world = createWorld(world.checkpoint);
    world.time = time;
    targetIndex = route.findIndex(marker => marker.x >= world.player.x);
    sinceJump = 0;
    launched = false;
    continue;
  }
  const marker = route[targetIndex] || route.at(-1);
  const target = LEVEL.solids.find(solid => solid.id === marker.id);
  const center = p.x + p.w / 2;
  const feet = p.y + p.h;
  if (p.grounded && Math.abs(feet - marker.y) < 0.01 && Math.abs(center - marker.x) < 60
    && targetIndex < route.length - 1) {
    history.push({ event: 'landing', id: marker.id, x: +p.x.toFixed(1), hp: p.hp, time: +world.time.toFixed(2) });
    targetIndex++;
    if (targetIndex >= route.length) break;
    continue;
  }
  const support = p.grounded && LEVEL.solids.find(solid => Math.abs(feet - solid.y) < 0.01
    && p.x < solid.x + solid.w && p.x + p.w > solid.x);
  const bossFight = !world.bossDefeated && targetIndex === route.length - 1 && p.x > 8150;
  const destination = bossFight ? 8390 : marker.x;
  const distance = destination - center;
  let move = Math.max(-1, Math.min(1, distance / 50));
  let jumpPressed = false;
  let dashPressed = false;
  let jet = false;
  if (!bossFight && support && support.id !== target.id) {
    const launchX = Math.min(target.x - 40, support.x + support.w - 18);
    const edge = support.x + support.w + 2;
    const walkOff = target.y > support.y && LEVEL.solids.some(solid => solid !== support
      && solid.x <= edge && solid.x + solid.w > edge && solid.y >= support.y && solid.y <= support.y + 150);
    jumpPressed = !walkOff && center >= launchX;
    if (jumpPressed && p.impaired > 0) { jumpPressed = false; move = 0; }
  }
  if (p.grounded && p.wall) jumpPressed = true;
  if (launched && !p.grounded && sinceJump > 20 && p.vy >= -80 && p.jumps > 0 && distance > 150) jumpPressed = true;
  const traversalJump = jumpPressed;

  if (!bossFight && p.grounded && p.impaired === 0) {
    const emp = LEVEL.hazards.find(hazard => hazard.type === 'emp' && hazard.x - center > 20 && hazard.x - center < 75);
    if (emp) jumpPressed = true;
  }
  if (!bossFight && move > 0) {
    const laser = LEVEL.hazards.find(hazard => hazard.type === 'laser'
      && hazard.x - center > -10 && hazard.x - center < 95 && feet > hazard.y);
    if (laser && hazardState(laser, world.time + STEP) !== 'off') {
      if (laser.x - center < 70 && p.dashCooldown <= STEP && p.impaired === 0) dashPressed = true;
      else if (laser.x - center > 30 && p.grounded) move = 0;
    }
  }
  if (bossFight) {
    const b = world.boss;
    if (b.attack === 2 && b.phase === 'charge' && b.timer < 0.32 && p.grounded) jumpPressed = true;
    jet = b.attack === 2 && b.phase === 'attack' && !p.grounded && p.fuel > 0;
    // Tiny rightward aim taps keep the rifle pointed at the Warden while camping.
    if (Math.abs(distance) < 5 && p.facing < 0) move = 0.02;
  }
  const overhead = world.enemies.find(enemy => !enemy.dead && enemy.type === 'drone'
    && Math.abs(enemy.x + enemy.w / 2 - center) < 28 && enemy.y + enemy.h < p.y + 18);
  const wasGrounded = p.grounded;
  const controls = { move, jumpPressed, jumpHeld: true, dashPressed, jet, down: false,
    slashPressed: p.slashCooldown <= STEP, shoot: true, aimUp: !!overhead };
  const previous = trace.at(-1);
  if (previous?.input && JSON.stringify(previous.input) === JSON.stringify(controls)) previous.frames++;
  else trace.push({ frames: 1, input: controls });
  stepWorld(world, controls, STEP);
  if (world.boss.active && bossStartedAt === null) bossStartedAt = world.time;
  if (world.boss.phase === 'attack' && !world.boss.dead) bossAttacks.add(world.boss.attack);
  if (world.bossDefeated && bossEndedAt === null) {
    bossEndedAt = world.time;
    history.push({ event: 'bossdefeated', time: +world.time.toFixed(2), hp: p.hp });
  }
  const events = world.events;
  for (const event of events) eventsSeen.add(event.type);
  if (events.some(event => event.type === 'jump' || event.type === 'walljump')) sinceJump = 0;
  else sinceJump++;
  if (wasGrounded && events.some(event => event.type === 'jump')) launched = traversalJump;
  if (events.some(event => event.type === 'land')) launched = false;
  for (const event of events) {
    if (['hurt', 'emp', 'bossstart', 'win'].includes(event.type)
      || (p.x > 5600 && p.x < 6600 && ['jump', 'dash', 'land'].includes(event.type))) {
      history.push({ event: event.type, x: +p.x.toFixed(1), hp: p.hp, shield: p.shield, time: +world.time.toFixed(2) });
    }
  }
  world.events.length = 0;
  totalFrames++;
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'Simulation must remain finite.');
}

const report = { status: world.status, elapsed: +(totalFrames * STEP).toFixed(2), deaths,
  checkpoint: world.checkpoint, x: +world.player.x.toFixed(1), y: +world.player.y.toFixed(1),
  hp: world.player.hp, bossHp: world.boss.hp, bossDefeated: world.bossDefeated,
  bossFightSeconds: bossEndedAt === null ? null : +(bossEndedAt - bossStartedAt).toFixed(2),
  bossAttacksSeen: [...bossAttacks].sort(),
  method: 'Legal inputs only, live enemies and hazards, no health or invulnerability overrides, legitimate checkpoint retries.',
  target: route[targetIndex]?.id, events: [...eventsSeen].sort(), history };
mkdirSync(new URL('../artifacts/', import.meta.url), { recursive: true });
writeFileSync(new URL('../artifacts/combat-route-report.json', import.meta.url), JSON.stringify(report, null, 2));
writeFileSync(new URL('../artifacts/combat-route-inputs.json', import.meta.url), JSON.stringify({ step: STEP, records: trace }));
console.log(JSON.stringify({ ...report, history: world.status === 'won' ? undefined : history.slice(-12) }, null, 2));
assert.equal(world.status, 'won', 'A legal-input combat route must defeat the Warden and reach the exit.');
