import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { getLevel } from '../src/level.js';
import { advanceStory, createWorld, equipItem, hazardState, retryWorld, weaponOrigin, STEP, stepWorld } from '../src/combat.js';
import { resumeRouteIndex } from './route-navigation.mjs';
import { archiveDriver, gameplaySources, sourceHash } from './campaign-source.mjs';

const outputDir = process.argv.includes('--correction') ? 'artifacts/playtest-correction' : 'artifacts';
const output = name => `${outputDir}/${name}`;
const provenance = { gameplaySourceHash: sourceHash(gameplaySources()),
  driverSources: archiveDriver(process.argv.includes('--correction') ? `${outputDir}/drivers` : undefined),
  startedAt: new Date().toISOString() };

const difficulty = process.argv[2] || 'forge';
assert.ok(['ember', 'forge', 'inferno', 'extinction'].includes(difficulty), 'Pass a supported difficulty ID.');
const worldId = process.argv[3] || 'soulforge';
const optional = process.argv.includes('--bellbeast');
const LEVEL = getLevel(worldId);
assert.equal(LEVEL.id, worldId, 'Pass a supported world ID.');
const route = LEVEL.campaignRoute || LEVEL.route;
const choices = Object.fromEntries(LEVEL.npcs.map(npc => [npc.id, (npc.choices.find(choice => choice.reward?.itemId === 'bulwark'
  || choice.reward?.itemId === 'siphon' || choice.reward?.type === 'cannon') || npc.choices[0]).id]));
let world = createWorld(0, { difficulty, worldId });
let targetIndex = 0, sinceJump = 0, launched = false, deaths = 0, totalFrames = 0;
const history = [], trace = [], eventsSeen = new Set(), conversations = new Set(), bossTimes = {}, triggerProof = {};
const guardianAttacks = {};
let lastControls = '';
let optionalStage = 'approach', optionalDone = false, optionalStarted = false;
const optionalProof = { method: 'Fresh campaign followed by ordinary jump, walk, combat, automatic portal contact and soul collection; no state overrides.', phases: new Set(), attacks: new Set(), soulsBefore: 0, entries: 0 };
function recordAction(action) { trace.push(action); lastControls = ''; }
function equip(category, id) {
  if (world.player[category] !== id && equipItem(world, category, id)) recordAction({ equip: { category, id } });
}

while (totalFrames < 120 * 1800 && deaths < 24 && world.status !== 'won') {
  const p = world.player;
  if (world.status === 'dead') {
    history.push({ event: 'death', checkpoint: world.checkpoint, x: +p.x.toFixed(1), y: +p.y.toFixed(1), hp: p.hp,
      time: +world.time.toFixed(2), target: route[targetIndex]?.id });
    recordAction({ retry: world.checkpoint });
    deaths++; world = retryWorld(world);
    if (optionalStarted && !optionalDone) { optionalStage = 'approach'; optionalStarted = false; }
    targetIndex = resumeRouteIndex(LEVEL, route, world.player);
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
  if (optional && !optionalDone && (optionalStarted || p.x > 10275 && p.x < 10550)) {
    optionalStarted = true;
    const beast = world.enemies.find(enemy => enemy.id === 'soulforge-bellbeast');
    const center = p.x + p.w / 2, feet = p.y + p.h;
    let targetX = 10452, jumpPressed = false, dashPressed = false, shoot = false, spellPressed = false;
    if (optionalStage === 'approach') {
      if (p.grounded && feet > 800 && Math.abs(center - 10410) < 75) jumpPressed = true;
      if (feet < 600) { optionalStage = 'fight'; optionalProof.entries++; optionalProof.soulsBefore = world.progress.souls; }
    }
    if (optionalStage === 'fight') {
      optionalProof.phases.add(beast.attackPhase || 'walk');
      if (beast.attackPhase === 'contact') optionalProof.attacks.add(beast.attackKind);
      targetX = Math.max(10730, beast.x - 150);
      jumpPressed = p.grounded && (beast.attackPhase === 'downswing' || beast.attackPhase === 'lift' && beast.attackProgress > .7);
      dashPressed = beast.attackKind === 'charge' && beast.attackPhase === 'contact' && Math.abs(beast.x - p.x) < 170 && p.dashCooldown <= STEP;
      shoot = !beast.dead;
      spellPressed = !beast.dead && p.mana >= 25 && p.spellCooldown <= STEP && p.hp < p.maxHp - 10;
      if (beast.dead) optionalStage = 'collect';
    }
    if (optionalStage === 'collect') {
      const soul = world.souls.find(drop => drop.id === 'soul:soulforge-bellbeast' && !drop.taken);
      targetX = soul?.x ?? center;
      if (!soul && world.progress.soulClaims.includes('soul:soulforge-bellbeast')) optionalStage = 'return';
    }
    if (optionalStage === 'return') {
      targetX = 10652;
      if (feet > 650) { optionalDone = true; optionalProof.collected = world.progress.souls - optionalProof.soulsBefore; optionalProof.returnedAt = world.time; }
    }
    const controls = { move: Math.max(-1, Math.min(1, (targetX - center) / 45)), jumpPressed, jumpHeld: true, dashPressed,
      slashPressed: optionalStage === 'fight' && p.slashCooldown <= STEP, shoot, spellPressed };
    if (shoot) { const origin = weaponOrigin(p, 'hand'); const dx = beast.x + beast.w / 2 - origin.x, dy = beast.y + beast.h / 2 - origin.y, length = Math.hypot(dx, dy); controls.aimX = dx / length; controls.aimY = dy / length; }
    recordAction({ frames: 1, input: controls }); stepWorld(world, controls, STEP); totalFrames++;
    for (const event of world.events) eventsSeen.add(event.type);
    world.events.length = 0;
    if (optionalDone) { targetIndex = route.findIndex(marker => marker.x > 10480); sinceJump = 0; launched = false; }
    continue;
  }
  const activeBoss = world.activeBoss && !world.activeBoss.dead ? world.activeBoss : world.bosses.find(b => b.active && !b.dead);
  let marker = route[targetIndex] || route.at(-1);
  if (marker.crossingId) {
    const crossing = LEVEL.crossings.find(entry => entry.id === marker.crossingId);
    if (world.gates.find(gate => gate.id === crossing.completionGate)?.open) {
      targetIndex += crossing.route.length + 1;
      continue;
    }
  }
  const target = marker.dynamic ? world.movingPlatforms.find(solid => solid.id === marker.id) : LEVEL.solids.find(solid => solid.id === marker.id);
  if (marker.dynamic) marker = { ...marker, x: target.x + marker.offsetX, y: target.y };
  const center = p.x + p.w / 2, feet = p.y + p.h;
  const support = p.grounded && world.solids.find(solid => Math.abs(feet - solid.y) < 0.01
    && p.x < solid.x + solid.w && p.x + p.w > solid.x);
  const markerBoss = marker.bossId && world.bosses.find(b => b.id === marker.bossId);
  const markerEnemy = marker.enemyId && world.enemies.find(enemy => enemy.id === marker.enemyId);
  const reached = p.grounded && Math.abs(feet - marker.y) < 0.01 && Math.abs(center - marker.x) < (marker.pickupId?12:55);
  const lever = marker.leverId && world.props.find(prop => prop.id === marker.leverId);
  const leverGate = lever && world.gates.find(gate => gate.id === lever.gateId);
  const needsStory = marker.npcId && !conversations.has(marker.npcId);
  if (!marker.portalId && (reached || markerBoss?.dead || markerEnemy?.dead) && (!markerBoss || markerBoss.dead) && (!markerEnemy || markerEnemy.dead) && !needsStory && (!leverGate || leverGate.open)
    && targetIndex < route.length - 1) {
    history.push({ event: 'landing', id: marker.id, x: +p.x.toFixed(1), hp: +p.hp.toFixed(1), time: +world.time.toFixed(2) });
    targetIndex++; continue;
  }

  const bossFight = !!activeBoss;
  // Mirror arrivals require turning to the flank instead of permanently holding fire toward the boss.
  const defender = bossFight && world.enemySummons.filter(e => !e.dead && e.phase === 'attack'
    && Math.abs(e.x + e.w / 2 - center) < 240 && Math.abs(e.y + e.h - feet) < 150)
    .sort((a,b) => Math.abs(a.x-center)-Math.abs(b.x-center))[0];
  const destination = markerEnemy && !markerEnemy.dead ? markerEnemy.x - 85 : defender ? defender.x + defender.w / 2 : bossFight ? activeBoss.x - 52 : marker.x;
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
  if (launched && !p.grounded && sinceJump > 20 && p.vy >= -80 && p.jumps > 0
    && (distance > 150 || feet > target.y + 10)) jumpPressed = true;
  const traversalJump = jumpPressed;
  if (!bossFight && p.grounded && p.impaired <= 0) {
    const floorHazard = LEVEL.hazards.find(h => (['emp', 'fire'].includes(h.type) || h.type === 'spikes' && h.period)
      && h.x - center > 20 && h.x - center < 85);
    if (floorHazard) jumpPressed = true;
  }
  if (!bossFight && move > 0) {
    const beam = LEVEL.hazards.find(h => ['laser','steam'].includes(h.type) && h.x - center > -10 && h.x - center < 110 && feet > h.y);
    if (beam && hazardState(beam, world.time + STEP) !== 'off') {
      if (beam.x - center < 70 && p.dashCooldown <= STEP && p.impaired <= 0) dashPressed = true;
      else if (beam.x - center > 30 && p.grounded) move = 0;
    }
  }
  // Recover a knocked-down jump beside the landing face, then steer back above it.
  if (!bossFight && !p.grounded && feet > target.y + 20 && Math.abs(distance) < 700 && p.fuel > 0) {
    jet = true;
    if (!target.oneWay && p.y >= target.y - 2 && p.x + p.w > target.x && p.x < target.x + target.w) {
      move = center < target.x + target.w / 2 ? -1 : 1;
    }
  }
  if (bossFight) {
    const b = activeBoss;
    bossTimes[b.id] ||= { started: world.time, attacks: new Set(), forms: new Set(), flyingAttacks: new Set() };
    bossTimes[b.id].forms.add(b.form);
    if (b.phase === 'attack') {
      bossTimes[b.id].attacks.add(b.attack);
      if (b.form === 'flying') bossTimes[b.id].flyingAttacks.add(b.attack);
    }
    if (b.phase === 'charge' && b.timer < 0.3 && p.grounded) jumpPressed = true;
    jet = b.phase === 'attack' && !!b.beam && !p.grounded && p.fuel > 0;
    if (Math.abs(distance) < 6 && p.facing < 0) move = 0.02;
    if (defender) move = Math.sign(defender.x + defender.w / 2 - center) * 0.65;
    const rocket = world.projectiles.find(shot => shot.active && shot.owner === 'enemy' && shot.heavy
      && Math.hypot(shot.x-center,shot.y-p.y-p.h/2) < 140);
    if (rocket && p.grounded) jumpPressed = true;
    if (rocket && p.dashCooldown <= STEP && Math.hypot(rocket.x-center,rocket.y-p.y-p.h/2) < 75) dashPressed = true;
  }
  const missile = world.missileWarning;
  if (missile && missile.time < 0.3 && p.grounded && Math.abs(missile.y - (p.y + 20)) < 45) jumpPressed = true;
  const nearby = [...world.enemies,...world.enemySummons.filter(e=>e.phase==='attack')].filter(e => !e.dead && Math.abs(e.x - p.x) < 600);
  const overhead = nearby.find(e => e.type === 'drone' && Math.abs(e.x + e.w / 2 - center) < 30 && e.y + e.h < p.y + 18);
  // Clear a visible occupied upper landing before committing a jump into its body.
  // This is an ordinary aimed-fire strategy, with live incoming attacks and fuel.
  const ledgeThreat = !bossFight && support && target.y < support.y - 30 && nearby.find(e => e.grounded
    && Math.abs(e.y + e.h - target.y) < 5 && e.x >= target.x && e.x <= target.x + target.w && Math.abs(e.x - center) < 450);
  if (ledgeThreat) { move = 0; jumpPressed = false; }
  const charges = typeof p.charges === 'object' ? p.charges.cannon : p.cannonCharges;
  const gun = bossFight && !defender && charges > 0 ? 'cannon' : 'carbine';
  equip('gun', gun);
  if (defender) equip('spell','thunder');
  const spellPressed = (bossFight || nearby.length > 0) && p.mana >= 25 && p.spellCooldown <= STEP && p.hp < p.maxHp - 8;
  const nova = typeof p.charges === 'object' ? p.charges.nova : p.novaCharges;
  const ultimatePressed = bossFight && nova > 0 && p.hp < p.maxHp * 0.6;
  const drop=!!support?.oneWay && feet<target.y-5 && center>=target.x && center<=target.x+target.w;
  if(drop&&!bossFight)jumpPressed=true;
  // A high maintenance recovery needs fuel as well as the ordinary double jump.
  // Rest on its safe floor until enough fuel has recharged instead of hopping forever.
  if (!bossFight && support && support.y - target.y > 200 && p.fuel < 65) {
    move = 0; jumpPressed = false; jet = false;
  }
  const wasGrounded = p.grounded;
  const controls = { move, jumpPressed, jumpHeld: true, dashPressed, jet, down: drop && !bossFight,
    slashPressed: p.slashCooldown <= STEP, shoot: true, aimUp: !bossFight && !!overhead,
    spellPressed, ultimatePressed, interactPressed };
  if (bossFight) {
    const aimTarget = defender || activeBoss, hand = weaponOrigin(p,'hand');
    const ax = aimTarget.x + aimTarget.w/2 - hand.x, ay = aimTarget.y + aimTarget.h/2 - hand.y, length = Math.hypot(ax,ay)||1;
    controls.aimX = ax/length; controls.aimY = ay/length;
  } else if (ledgeThreat) {
    const hand = weaponOrigin(p, 'hand'), ax = ledgeThreat.x + ledgeThreat.w / 2 - hand.x, ay = ledgeThreat.y + ledgeThreat.h / 2 - hand.y, length = Math.hypot(ax, ay) || 1;
    controls.aimX = ax / length; controls.aimY = ay / length; controls.aimUp = false;
  } else if (markerEnemy && !markerEnemy.dead) {
    const hand = weaponOrigin(p, 'hand'), ax = markerEnemy.x + markerEnemy.w / 2 - hand.x, ay = markerEnemy.y + markerEnemy.h / 2 - hand.y, length = Math.hypot(ax, ay) || 1;
    controls.aimX = ax / length; controls.aimY = ay / length;
  }
  const encoded = JSON.stringify(controls);
  if (encoded === lastControls && trace.at(-1)?.input) trace.at(-1).frames++;
  else { trace.push({ frames: 1, input: controls }); lastControls = encoded; }
  stepWorld(world, controls, STEP);
  if (marker.portalId && world.events.some(event => event.type === 'portal' && event.portalId === marker.portalId)) {
    const crossing = LEVEL.crossings.find(entry => entry.entryId === marker.portalId);
    const guardian = crossing && world.enemies.find(enemy => enemy.id === crossing.guardianId);
    history.push({ event: 'crossingportal', id: marker.portalId, time: +world.time.toFixed(2), guardianHealthOnEntry: guardian?.hp, guardianMaxHealth: guardian?.maxHp });
    targetIndex++; sinceJump = 0; launched = false;
  }
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
    if (event.type === 'enemyattack' && event.enemyId?.endsWith('-oath-guardian')) {
      guardianAttacks[event.enemyId] ||= new Set(); guardianAttacks[event.enemyId].add(event.kind || event.attack);
    }
    if (['hurt', 'emp', 'bossstart', 'win', 'gate', 'checkpoint'].includes(event.type)) history.push({ event: event.type,
      x: +p.x.toFixed(1), hp: +p.hp.toFixed(1), time: +world.time.toFixed(2) });
  }
  if (world.events.some(e => e.type === 'jump' || e.type === 'walljump')) sinceJump = 0; else sinceJump++;
  if (wasGrounded && world.events.some(e => e.type === 'jump')) launched = traversalJump;
  if (world.events.some(e => e.type === 'land')) launched = false;
  world.events.length = 0; totalFrames++;
  if (process.argv.includes('--progress') && totalFrames % (120 * 120) === 0) {
    console.error(JSON.stringify({ world: worldId, difficulty, elapsed: totalFrames * STEP,
      target: route[targetIndex]?.id, x: Math.round(p.x), y: Math.round(p.y), deaths }));
  }
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'Simulation must remain finite.');
}

const report = { ...provenance, worldId, worldName: LEVEL.name, difficulty, status: world.status, optional: optional ? { ...optionalProof, phases: [...optionalProof.phases], attacks: [...optionalProof.attacks], complete: optionalDone } : undefined, playerBody: { w: world.player.w, h: world.player.h }, elapsed: +(totalFrames * STEP).toFixed(2), campaignTime: +world.time.toFixed(2),
  timeLeft: +world.timeLeft.toFixed(2), deaths, checkpoint: world.checkpoint, x: +world.player.x.toFixed(1), y: +world.player.y.toFixed(1),
  hp: +world.player.hp.toFixed(1), conversations: [...conversations], triggerProof,
  storyClaims: world.progress.claimed.filter(id => id.startsWith('npc:')),
  bosses: world.bosses.map(b => ({ id: b.id, dead: !!b.dead, hp: b.hp, body: { w: b.w, h: b.h },
    fightSeconds: bossTimes[b.id]?.ended ? +(bossTimes[b.id].ended - bossTimes[b.id].started).toFixed(2) : null,
    attacksSeen: [...(bossTimes[b.id]?.attacks || [])].sort(),
    formsSeen: [...(bossTimes[b.id]?.forms || [])],
    flyingAttacksSeen: [...(bossTimes[b.id]?.flyingAttacks || [])].sort() })),
  gates: world.gates.map(g => ({ id: g.id, open: !!g.open })),
  crossings: (LEVEL.crossings || []).map(crossing => {
    const entered = history.find(event => event.id === crossing.entryId && event.event === 'crossingportal');
    const returned = history.find(event => event.id === crossing.returnId && event.event === 'crossingportal');
    return { id: crossing.id, completed: world.gates.find(gate => gate.id === crossing.completionGate)?.open || false,
      guardianDefeated: world.progress.defeatedBosses.includes(crossing.guardianId),
      guardianHealthOnEntry: entered?.guardianHealthOnEntry, guardianMaxHealth: entered?.guardianMaxHealth,
      guardianAttacksSeen: [...(guardianAttacks[crossing.guardianId] || [])],
      seconds: entered && returned ? +(returned.time - entered.time).toFixed(2) : null };
  }),
  method: 'Legal movement/combat/armory/story actions only. Live enemies and hazards. No health, position, invulnerability, damage, or clock overrides. Legitimate retryWorld recovery.',
  target: route[targetIndex]?.id, events: [...eventsSeen].sort(), history };
mkdirSync(outputDir, { recursive: true });
if (optional) {
  writeFileSync(output(`bellbeast-route-${difficulty}-report.json`), JSON.stringify(report, null, 2));
  writeFileSync(output(`bellbeast-route-${difficulty}-inputs.json`), JSON.stringify({ step: STEP, worldId, difficulty, records: trace }));
  assert.ok(optionalDone && optionalProof.collected === 80, 'Optional encounter must be reached, defeated, collected and returned through ordinary inputs.');
  assert.ok(['lift', 'downswing', 'contact', 'recovery'].every(phase => optionalProof.phases.has(phase)), 'The live optional fight must expose its complete attack cycle.');
}
if (!optional) {
writeFileSync(output(`combat-route-${worldId}-${difficulty}-report.json`), JSON.stringify(report, null, 2));
writeFileSync(output(`combat-route-${worldId}-${difficulty}-inputs.json`), JSON.stringify({ step: STEP, worldId, difficulty, records: trace }));
if (worldId === 'soulforge') {
  writeFileSync(output(`combat-route-${difficulty}-report.json`), JSON.stringify(report, null, 2));
  writeFileSync(output(`combat-route-${difficulty}-inputs.json`), JSON.stringify({ step: STEP, worldId, difficulty, records: trace }));
}
if (worldId === 'soulforge' && difficulty === 'forge') {
  writeFileSync(output('combat-route-report.json'), JSON.stringify(report, null, 2));
  writeFileSync(output('combat-route-inputs.json'), JSON.stringify({ step: STEP, worldId, difficulty, records: trace }));
}
}
console.log(JSON.stringify({ ...report, history: world.status === 'won' ? undefined : history.slice(-12) }, null, 2));
assert.equal(world.status, 'won', 'Legal campaign inputs must defeat every boss and reach the exit.');
assert.ok(world.bosses.every(b => b.dead), 'All three bosses must be defeated.');
for (const boss of report.bosses.filter(boss => world.bosses.find(b => b.id === boss.id).type === 'regent')) {
  assert.ok(boss.formsSeen.includes('transforming') && boss.formsSeen.includes('flying'), 'The final guardian must transform into the rocket wyrm during live combat.');
  if(difficulty!=='ember')assert.ok(boss.flyingAttacksSeen.length > 0, 'The rocket wyrm must attack in its flying form during live combat.');
}
assert.equal(conversations.size, LEVEL.npcs.length, 'Every authored story conversation must be completed.');
assert.equal(Object.keys(triggerProof).length, 3, 'All bosses must activate through their proper trigger.');
assert.ok(LEVEL.npcs.every(npc => world.progress.claimed.filter(id => id === `npc:${npc.id}`).length === 1), 'Each story reward is claimed exactly once.');
assert.ok(world.gates.every(g => g.open), 'Boss and path gates must open through gameplay.');
assert.ok(report.crossings.every(crossing => crossing.completed && crossing.guardianDefeated && crossing.seconds > 0), 'Each crossing must be entered, solved and returned, with its guardian defeated.');
assert.ok(world.collections.includes('ember-heart') && world.collections.includes('tide-glass') && world.collections.includes('storm-seal'), 'All three required stones are recovered through contact.');
