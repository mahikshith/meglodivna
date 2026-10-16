import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/level.js';
import { advanceStory, createWorld, retryWorld, spawnProjectile, STEP, stepWorld } from '../src/combat.js';
import { INTRO_DURATION, introBeatAt, journeyStage, nextCrossing } from '../src/story.js';
import { storyPortraitKey } from '../src/ui.js';
import { resumeRouteIndex } from '../scripts/route-navigation.mjs';

test('opening is eighteen seconds, has stable boundaries and progresses from courier to knight', () => {
  assert.equal(INTRO_DURATION, 18);
  assert.equal(introBeatAt(0).index, 0);
  assert.equal(introBeatAt(6).index, 1);
  assert.equal(introBeatAt(12).index, 2);
  for (const value of [-1, 18, Infinity, NaN]) assert.equal(introBeatAt(value), null);
  assert.equal(journeyStage([]).id, 'courier');
  assert.equal(journeyStage(['ember-heart', 'tide-glass', 'storm-seal']).id, 'knight');
});

test('chapter dialogue resolves Aether and Mira portraits without invalid prefixes', () => {
  assert.equal(storyPortraitKey({ speaker: 'AETHER' }, { npcId: 'chapter:wind:opening', portrait: 'mira' }), 'ref-face-aether');
  assert.equal(storyPortraitKey({ speaker: 'COURIER' }, { npcId: 'chapter:wind:opening' }), 'ref-face-aether');
  assert.equal(storyPortraitKey({ speaker: 'MIRA' }, { npcId: 'chapter:wind:opening', portrait: 'portrait-mira' }), 'portrait-mira');
  assert.equal(storyPortraitKey({ speaker: 'MIRA' }, { npcId: 'chapter:wind:opening', portrait: 'mira' }), 'portrait-mira');
});

for (const level of Object.values(LEVELS)) test(`${level.id}: high lantern landings open the ordered crossing path and persist`, () => {
  assert.equal(level.crossings.length, 3);
  assert.equal(level.campaignRoute.filter(marker => marker.portalId).length, 6);
  assert.equal(level.checkpoints.filter(checkpoint => checkpoint.label.includes('crossing relay')).length, 15);
  assert.equal(level.campaignRoute.filter(marker => marker.dynamic).length, 14);
  const world = createWorld(0, { level });
  // Isolated landing/persistence fixture. This deliberately places the player;
  // the combat-route driver separately proves real traversal and combat.
  world.enemies = []; world.bosses = []; world.portals = [];
  for (const crossing of level.crossings) {
    const mainGate = world.gates.find(gate => gate.id === crossing.completionGate);
    assert.equal(mainGate.open, false);
    const shutters = world.gates.filter(gate => gate.id.startsWith(crossing.id) && gate.autoOpenAt);
    assert.equal(shutters.length, 7, 'Three teaching and four course shutters ask for visible high landings');
    assert.equal(crossing.route.some(marker => marker.leverId), false);
    for (const gate of shutters) {
      Object.assign(world.player, { x: gate.autoOpenAt.x + 15, y: gate.autoOpenAt.y - world.player.h,
        grounded: true, vx: 0, vy: 0 });
      stepWorld(world, {}, STEP);
      assert.equal(gate.open, true, gate.id);
      assert.ok(world.progress.openedGates.includes(gate.id));
    }
    assert.equal(mainGate.open, false, 'the guardian still holds the heart seal');
    world.progress.defeatedBosses.push(crossing.guardianId);
    stepWorld(world, {}, STEP);
    assert.equal(mainGate.open, true);
    const entry = level.portals.find(portal => portal.id === crossing.entryId);
    assert.equal(entry.disabledWhenGateOpen, crossing.completionGate);
    assert.equal(mainGate.requiresEnemyDefeated, crossing.guardianId);
    assert.ok(level.solids.some(solid => Math.abs(solid.y - entry.to.y - 46) < .001 && solid.x <= entry.to.x && solid.x + solid.w >= entry.to.x + 28));
    assert.ok(level.enemies.filter(enemy => enemy.id.startsWith(crossing.id)).length >= 3);
    assert.ok(crossing.route.length >= 47, 'Four distinct course sections follow each teaching chamber');
  }
  const retry = retryWorld(world);
  assert.ok(retry.gates.filter(gate => gate.id.includes('-crossing-')).every(gate => gate.open));
});

test('one shared heart gate unlocks Wind, then Water, then Fire and tells their story', () => {
  const world = createWorld(), crossings = world.level.crossings;
  const entries = crossings.map(crossing => world.portals.find(portal => portal.id === crossing.entryId));
  assert.equal(new Set(entries.map(entry => entry.x)).size, 1);
  assert.equal(entries[0].requiresGateOpen, null);
  assert.deepEqual(entries.slice(1).map(entry => entry.requiresGateOpen), crossings.slice(0, 2).map(crossing => crossing.completionGate));
  assert.equal(nextCrossing(world.level, world.progress.openedGates).id, crossings[0].id);
  world.enemies = []; world.bosses = [];
  Object.assign(world.player, { x: entries[0].x, y: entries[0].y + 46 - world.player.h, grounded: true });
  stepWorld(world, {}, STEP);
  assert.equal(world.events.find(event => event.type === 'portal')?.portalId, crossings[0].entryId);
  assert.equal(world.story?.lines[0].speaker, 'MIRA');
  while (world.story) advanceStory(world);
  assert.ok(world.progress.claimed.includes('npc:chapter:wind:opening'));
  for (const [index, crossing] of crossings.entries()) {
    const seal = world.gates.find(gate => gate.id === crossing.completionGate);
    assert.equal(nextCrossing(world.level, world.progress.openedGates).id, crossing.id);
    world.progress.defeatedBosses.push(crossing.guardianId);
    stepWorld(world, {}, STEP);
    assert.equal(seal.open, true);
    if (index < crossings.length - 1) assert.equal(nextCrossing(world.level, world.progress.openedGates).id, crossings[index + 1].id);
  }
  assert.equal(nextCrossing(world.level, world.progress.openedGates), null);
});

test('a crossing guardian must actually die before its seal opens, and the defeat survives retry', () => {
  const world = createWorld(), crossing = world.level.crossings[0];
  const guardian = world.enemies.find(enemy => enemy.id === crossing.guardianId);
  const gate = world.gates.find(gate => gate.requiresEnemyDefeated === guardian.id);
  world.bosses = []; world.enemies = [guardian]; world.portals = [];
  Object.assign(world.player, { x: guardian.x - 160, y: guardian.y + guardian.h - world.player.h });
  stepWorld(world, {}, STEP);
  assert.equal(gate.open, false);
  const shot = spawnProjectile(world, guardian.x - 2, guardian.y + guardian.h / 2, 1000, 0, 'player');
  shot.damage = 1000;
  stepWorld(world, {}, STEP); stepWorld(world, {}, STEP);
  assert.equal(guardian.dead, true);
  assert.equal(gate.open, true);
  assert.ok(world.progress.defeatedBosses.includes(guardian.id));
  assert.equal(retryWorld(world).gates.find(entry => entry.id === gate.id).open, true);
});

test('a completed crossing leads into the next chapter and final completion closes the shared gate', () => {
  const level = LEVELS.soulforge, crossing = level.crossings[0];
  const world = createWorld();
  world.enemies = []; world.bosses = [];
  const gate = world.gates.find(gate => gate.id === crossing.completionGate);
  gate.open = true; world.progress.openedGates.push(gate.id);
  const entry = world.portals.find(portal => portal.id === crossing.entryId);
  Object.assign(world.player, { x: entry.x, y: entry.y + 46 - world.player.h });
  stepWorld(world, {}, STEP);
  assert.equal(world.events.find(event => event.type === 'portal')?.portalId, level.crossings[1].entryId);
  assert.ok(!world.events.some(event => event.type === 'portal' && event.portalId === crossing.entryId));
  const reloaded = createWorld(0, { progress: world.progress });
  reloaded.enemies = []; reloaded.bosses = [];
  for (const item of level.crossings) {
    const seal = reloaded.gates.find(gate => gate.id === item.completionGate);
    seal.open = true; reloaded.progress.openedGates.push(seal.id);
  }
  Object.assign(reloaded.player, { x: entry.x, y: entry.y + 46 - reloaded.player.h });
  stepWorld(reloaded, {}, STEP);
  assert.ok(!reloaded.events.some(event => event.type === 'portal'));
});

test('a saved crossing relay retains a usable retreat portal without replaying the entry', () => {
  const level = LEVELS.soulforge;
  const checkpoint = level.checkpoints.findIndex(entry => entry.label.includes('Windward Canopy') && entry.label.includes('relay'));
  const world = createWorld(checkpoint), retreat = world.portals.find(portal => portal.id === `${level.crossings[0].id}-retreat`);
  assert.equal(retreat.dormant, false);
  // Isolated portal contact fixture after a checkpoint load; no entry passage has happened.
  world.enemies = []; world.bosses = [];
  Object.assign(world.player, { x: retreat.x, y: retreat.y + 46 - world.player.h });
  stepWorld(world, {}, STEP);
  assert.ok(world.events.some(event => event.type === 'portal' && event.portalId === retreat.id));
  assert.ok(world.player.x < level.mainWidth);
});

test('crossing sections change their physical challenge and preserve supported recovery relays', () => {
  const level = LEVELS.soulforge;
  const [windTrial, waterTrial, fireTrial] = level.crossings;
  const windBells = level.gates.filter(gate => gate.id.startsWith(windTrial.id) && gate.autoOpenAt);
  assert.equal(windBells.length, 7);
  assert.ok(windBells.every(gate => level.currents.some(current => current.id.startsWith(windTrial.id)
    && gate.autoOpenAt.x + gate.autoOpenAt.w / 2 >= current.x
    && gate.autoOpenAt.x + gate.autoOpenAt.w / 2 <= current.x + current.w)));
  const teachingRafts = level.movingPlatforms.filter(platform => platform.id.startsWith(`${waterTrial.id}-teaching-raft-`));
  assert.equal(teachingRafts.length, 3);
  assert.ok(teachingRafts.every(platform => waterTrial.route.some(marker => marker.id === platform.id && marker.dynamic)));
  const fireSteps = level.crumble.filter(entry => entry.solidId.startsWith(`${fireTrial.id}-step-`));
  assert.equal(fireSteps.length, 3);
  assert.equal(level.hazards.filter(hazard => hazard.id.startsWith(`${fireTrial.id}-vent-`)).length, 3);
  const rafts = level.movingPlatforms.filter(platform => platform.id.includes('-causeway-raft-'));
  assert.deepEqual(new Set(rafts.map(raft => raft.axis)), new Set(['x', 'y']));
  const wind = level.currents.filter(current => current.id.includes('-high-draft-'));
  assert.ok(wind.some(current => current.vx === -48) && wind.some(current => current.vy === -40));
  const vents = level.hazards.filter(hazard => hazard.id.includes('-furnace-breath-'));
  assert.deepEqual(new Set(vents.map(vent => vent.period)), new Set([3.6, 3.1]));
  for (const checkpoint of level.checkpoints.filter(entry => entry.label.includes('crossing relay'))) {
    const floor = level.solids.find(solid => solid.x <= checkpoint.x && solid.x + solid.w >= checkpoint.x + 28
      && Math.abs(solid.y - checkpoint.y - 46) < .001);
    assert.ok(floor, checkpoint.label);
    assert.ok(!level.crumble.some(crumble => crumble.solidId === floor.id), 'Recovery must not collapse after loading.');
  }
});

test('a missed moving raft can be recovered with ordinary vertical double jump and finite thrust', () => {
  const world = createWorld(0, { worldId: 'neon' });
  world.enemies = []; world.bosses = []; world.portals = [];
  world.level = { ...world.level, hazards: [], pressureDisabled: true };
  const raft = world.movingPlatforms.find(platform => platform.id.endsWith('-causeway-raft-10'));
  const catchLedge = world.solids.find(solid => solid.id.endsWith('-raft-catch-10'));
  const p = world.player;
  // Isolated recovery fixture; the full campaign separately reaches this raft legally.
  world.time = 360;
  Object.assign(p, { x: catchLedge.x + 120, y: catchLedge.y - p.h, grounded: true, vx: 0, vy: 0 });
  let sinceJump = 100, landed = false;
  for (let frame = 0; frame < 180 && !landed; frame++) {
    const feet = p.y + p.h, distance = raft.x + 170 - p.x - p.w / 2;
    const jumpPressed = p.grounded || sinceJump > 20 && p.vy >= -80 && p.jumps > 0 && feet > raft.y + 10;
    stepWorld(world, { move: Math.max(-1, Math.min(1, distance / 50)), jumpPressed, jumpHeld: true,
      jet: !p.grounded && feet > raft.y + 20 && p.fuel > 0 }, STEP);
    sinceJump = world.events.some(event => event.type === 'jump') ? 0 : sinceJump + 1;
    world.events.length = 0;
    landed = p.grounded && Math.abs(p.y + p.h - raft.y) < .001;
  }
  assert.ok(landed, 'The catch ledge must permit recovery to the moving raft in under 1.5 seconds.');
  assert.ok(p.fuel >= 0 && p.fuel <= 100);
});

for (const worldId of Object.keys(LEVELS)) test(`${worldId}: furnace maintenance recovery remains legal after empty fuel recharges`, () => {
  const world = createWorld(0, { worldId });
  world.enemies = []; world.bosses = []; world.portals = [];
  world.level = { ...world.level, hazards: [], pressureDisabled: true };
  const ledge = world.solids.find(solid => solid.id.endsWith('-fire-course-16'));
  const walk = world.solids.find(solid => solid.id.endsWith('-fire-maintenance-walk'));
  const p = world.player;
  Object.assign(p, { x: ledge.x + 190, y: walk.y - p.h, grounded: true, vx: 0, vy: 0, fuel: 0 });
  let sinceJump = 100, landed = false;
  for (let frame = 0; frame < 420 && !landed; frame++) {
    const feet = p.y + p.h;
    const jumpPressed = p.grounded ? p.fuel >= 65 : sinceJump > 20 && p.vy >= -80 && p.jumps > 0 && feet > ledge.y + 10;
    stepWorld(world, { jumpPressed, jumpHeld: true, jet: !p.grounded && feet > ledge.y + 20 && p.fuel > 0 }, STEP);
    sinceJump = world.events.some(event => event.type === 'jump') ? 0 : sinceJump + 1;
    world.events.length = 0;
    landed = p.grounded && Math.abs(p.y + p.h - ledge.y) < .001;
  }
  assert.ok(landed, 'The 315-unit recovery climb must remain possible with ordinary finite fuel.');
  assert.ok(p.fuel > 0 && p.fuel <= 100);
});

test('campaign retries select markers in the current realm, including the entry behind the heart checkpoint', () => {
  const level = LEVELS.soulforge, route = level.campaignRoute;
  const main = createWorld(6), mainMarker = route[resumeRouteIndex(level, route, main.player)];
  assert.equal(mainMarker.portalId, level.crossings[0].entryId);
  for (const crossing of level.crossings) {
    const index = level.checkpoints.findIndex(cp => cp.x >= crossing.x && cp.x < crossing.x + crossing.w);
    const world = createWorld(index), marker = route[resumeRouteIndex(level, route, world.player)];
    assert.ok(marker.id.startsWith(crossing.id));
    assert.equal(marker.x, level.checkpoints[index].x + 12);
  }
});
