import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { LEVEL } from '../src/level.js';
import { PHYSICS } from '../src/physics.js';
import { advanceStory, createWorld, equipItem, hazardState, retryWorld, STEP, stepWorld } from '../src/combat.js';

const difficulty = process.argv[2] || 'forge';
assert.ok(['ember', 'forge', 'inferno', 'extinction'].includes(difficulty), 'Pass a supported difficulty ID.');
const route = LEVEL.route;
const choices = { mira: 'mira-armor', orren: 'orren-siphon', vesper: 'vesper-cannon' };
let world = createWorld(0, { difficulty });
let targetIndex = 0, sinceJump = 0, launched = false, deaths = 0, totalFrames = 0;
const history = [], trace = [], eventsSeen = new Set(), conversations = new Set(), bossTimes = {}, triggerProof = {};
let lastControls = '';
function recordAction(action) { trace.push(action); lastControls = ''; }
function equip(category, id) {
  if (world.player[category] !== id && equipItem(world, category, id)) recordAction({ equip: { category, id } });
}

while (totalFrames < 120 * 900 && deaths < 24 && world.status !== 'won') {
  const p = world.player;
  if (world.status === 'dead') {
    history.push({ event: 'death', checkpoint: world.checkpoint, x: +p.x.toFixed(1), y: +p.y.toFixed(1), hp: p.hp,
      time: +world.time.toFixed(2), target: route[targetIndex]?.id });
    recordAction({ retry: world.checkpoint });
    deaths++; world = retryWorld(world);
    targetIndex = route.findIndex(marker => marker.x >= world.player.x + world.player.w / 2);
    if (targetIndex < 0) targetIndex = route.length - 1;
    sinceJump = 0; launched = false; continue;
  }
  if (world.story) {
    const story = world.story;
    const choosing = story.index >= story.lines.length - 1;
    const choiceId = choosing ? choices[story.npcId] : undefined;
    recordAction({ storyAdvance: choiceId || null, npcId: story.npcId });
    advanceStory(world, choiceId);
    if (!world.story) { conversations.add(story.npcId); history.push({ event: 'story', npcId: story.npcId, choiceId }); }
    continue;
  }

  // These are normal armory actions; locked or undiscovered equipment fails safely.
  equip('armor', 'bulwark');
  equip('sword', 'saber');
  equip('spell', 'siphon');
  const activeBoss = world.activeBoss && !world.activeBoss.dead ? world.activeBoss : world.bosses.find(b => b.active && !b.dead);
  const marker = route[targetIndex] || route.at(-1);
  const target = LEVEL.solids.find(solid => solid.id === marker.id);
  const center = p.x + p.w / 2, feet = p.y + p.h;
  const support = p.grounded && world.solids.find(solid => Math.abs(feet - solid.y) < 0.01
    && p.x < solid.x + solid.w && p.x + p.w > solid.x);
  const markerBoss = marker.bossId && world.bosses.find(b => b.id === marker.bossId);
  const reached = p.grounded && Math.abs(feet - marker.y) < 0.01 && Math.abs(center - marker.x) < 55;
  const lever = marker.leverId && world.props.find(prop => prop.id === marker.leverId);
  const leverGate = lever && world.gates.find(gate => gate.id === lever.gateId);
  const needsStory = marker.npcId && !conversations.has(marker.npcId);
  if ((reached || markerBoss?.dead) && (!markerBoss || markerBoss.dead) && !needsStory && (!leverGate || leverGate.open)
    && targetIndex < route.length - 1) {
    history.push({ event: 'landing', id: marker.id, x: +p.x.toFixed(1), hp: +p.hp.toFixed(1), time: +world.time.toFixed(2) });
    targetIndex++; continue;
  }

  const bossFight = !!activeBoss;
  const destination = bossFight ? activeBoss.x - 52 : marker.x;
  const distance = destination - center;
  let move = Math.max(-1, Math.min(1, distance / 50));
  let jumpPressed = false, dashPressed = false, jet = false;
  let interactPressed = !bossFight && reached && (needsStory || (leverGate && !leverGate.open));
  if (interactPressed) move = 0;
  if (!bossFight && support && support.id !== target.id) {
    const launchX = Math.min(target.x - 40, support.x + support.w - 18);
    const edge = support.x + support.w + 2;
    const walkOff = target.y > support.y && LEVEL.solids.some(solid => solid !== support
      && solid.x <= edge && solid.x + solid.w > edge && solid.y >= support.y && solid.y <= support.y + 150);
    jumpPressed = !walkOff && center >= launchX;
    if (jumpPressed && p.impaired > 0) { jumpPressed = false; move = 0; }
  }
  if (p.grounded && p.wall && !bossFight) jumpPressed = true;
  if (launched && !p.grounded && sinceJump > 20 && p.vy >= -80 && p.jumps > 0 && distance > 150) jumpPressed = true;
  const traversalJump = jumpPressed;
  if (!bossFight && p.grounded && p.impaired <= 0) {
    const floorHazard = LEVEL.hazards.find(h => ['emp', 'fire'].includes(h.type) && h.x - center > 20 && h.x - center < 85);
    if (floorHazard) jumpPressed = true;
  }
  if (!bossFight && move > 0) {
    const beam = LEVEL.hazards.find(h => h.type === 'laser' && h.x - center > -10 && h.x - center < 110 && feet > h.y);
    if (beam && hazardState(beam, world.time + STEP) !== 'off') {
      if (beam.x - center < 70 && p.dashCooldown <= STEP && p.impaired <= 0) dashPressed = true;
      else if (beam.x - center > 30 && p.grounded) move = 0;
    }
  }
  if (bossFight) {
    const b = activeBoss;
    bossTimes[b.id] ||= { started: world.time, attacks: new Set() };
    if (b.phase === 'attack') bossTimes[b.id].attacks.add(b.attack);
    if (b.phase === 'charge' && b.timer < 0.3 && p.grounded) jumpPressed = true;
    jet = b.phase === 'attack' && !!b.beam && !p.grounded && p.fuel > 0;
    if (Math.abs(distance) < 6 && p.facing < 0) move = 0.02;
  }
  const missile = world.missileWarning;
  if (missile && missile.time < 0.3 && p.grounded && Math.abs(missile.y - (p.y + 20)) < 45) jumpPressed = true;
  const nearby = world.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < 600);
  const overhead = nearby.find(e => e.type === 'drone' && Math.abs(e.x + e.w / 2 - center) < 30 && e.y + e.h < p.y + 18);
  const charges = typeof p.charges === 'object' ? p.charges.cannon : p.cannonCharges;
  const gun = bossFight && charges > 0 ? 'cannon' : 'carbine';
  equip('gun', gun);
  const spellPressed = (bossFight || nearby.length > 0) && p.mana >= 25 && p.spellCooldown <= STEP && p.hp < p.maxHp - 8;
  const nova = typeof p.charges === 'object' ? p.charges.nova : p.novaCharges;
  const ultimatePressed = bossFight && nova > 0 && p.hp < p.maxHp * 0.6;
  const wasGrounded = p.grounded;
  const controls = { move, jumpPressed, jumpHeld: true, dashPressed, jet, down: false,
    slashPressed: p.slashCooldown <= STEP, shoot: true, aimUp: !bossFight && !!overhead,
    spellPressed, ultimatePressed, interactPressed };
  const encoded = JSON.stringify(controls);
  if (encoded === lastControls && trace.at(-1)?.input) trace.at(-1).frames++;
  else { trace.push({ frames: 1, input: controls }); lastControls = encoded; }
  stepWorld(world, controls, STEP);
  for (const b of world.bosses) {
    if (!b.active && !b.dead) assert.equal(b.hp, b.maxHp, `${b.id} must remain unharmed before its trigger.`);
    if (b.active && !triggerProof[b.id]) {
      assert.ok(p.x > b.triggerX, `${b.id} must activate only after crossing its authored trigger.`);
      triggerProof[b.id] = { triggerX: b.triggerX, activatedX: +p.x.toFixed(2), activatedTime: +world.time.toFixed(2) };
    }
    if (b.dead && bossTimes[b.id] && !bossTimes[b.id].ended) {
      bossTimes[b.id].ended = world.time; history.push({ event: 'bossdefeated', id: b.id, time: +world.time.toFixed(2), hp: +p.hp.toFixed(1) });
    }
  }
  for (const event of world.events) {
    eventsSeen.add(event.type);
    if (['hurt', 'emp', 'bossstart', 'win', 'gate', 'checkpoint'].includes(event.type)) history.push({ event: event.type,
      x: +p.x.toFixed(1), hp: +p.hp.toFixed(1), time: +world.time.toFixed(2) });
  }
  if (world.events.some(e => e.type === 'jump' || e.type === 'walljump')) sinceJump = 0; else sinceJump++;
  if (wasGrounded && world.events.some(e => e.type === 'jump')) launched = traversalJump;
  if (world.events.some(e => e.type === 'land')) launched = false;
  world.events.length = 0; totalFrames++;
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'Simulation must remain finite.');
}

const report = { difficulty, status: world.status, elapsed: +(totalFrames * STEP).toFixed(2), campaignTime: +world.time.toFixed(2),
  timeLeft: +world.timeLeft.toFixed(2), deaths, checkpoint: world.checkpoint, x: +world.player.x.toFixed(1), y: +world.player.y.toFixed(1),
  hp: +world.player.hp.toFixed(1), conversations: [...conversations], triggerProof,
  storyClaims: world.progress.claimed.filter(id => id.startsWith('npc:')),
  bosses: world.bosses.map(b => ({ id: b.id, dead: !!b.dead, hp: b.hp,
    fightSeconds: bossTimes[b.id]?.ended ? +(bossTimes[b.id].ended - bossTimes[b.id].started).toFixed(2) : null,
    attacksSeen: [...(bossTimes[b.id]?.attacks || [])].sort() })),
  gates: world.gates.map(g => ({ id: g.id, open: !!g.open })),
  method: 'Legal movement/combat/armory/story actions only. Live enemies and hazards. No health, position, invulnerability, damage, or clock overrides. Legitimate retryWorld recovery.',
  target: route[targetIndex]?.id, events: [...eventsSeen].sort(), history };
mkdirSync(new URL('../artifacts/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../artifacts/combat-route-${difficulty}-report.json`, import.meta.url), JSON.stringify(report, null, 2));
writeFileSync(new URL(`../artifacts/combat-route-${difficulty}-inputs.json`, import.meta.url), JSON.stringify({ step: STEP, difficulty, records: trace }));
if (difficulty === 'forge') {
  writeFileSync(new URL('../artifacts/combat-route-report.json', import.meta.url), JSON.stringify(report, null, 2));
  writeFileSync(new URL('../artifacts/combat-route-inputs.json', import.meta.url), JSON.stringify({ step: STEP, difficulty, records: trace }));
}
console.log(JSON.stringify({ ...report, history: world.status === 'won' ? undefined : history.slice(-12) }, null, 2));
assert.equal(world.status, 'won', 'Legal campaign inputs must defeat every boss and reach the exit.');
assert.ok(world.bosses.every(b => b.dead), 'All three bosses must be defeated.');
assert.equal(conversations.size, 3, 'All three story conversations must be completed.');
assert.equal(Object.keys(triggerProof).length, 3, 'All bosses must activate through their proper trigger.');
assert.ok(LEVEL.npcs.every(npc => world.progress.claimed.filter(id => id === `npc:${npc.id}`).length === 1), 'Each story reward is claimed exactly once.');
assert.ok(world.gates.every(g => g.open), 'Boss and lever gates must be opened through gameplay.');
