import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { LEVELS } from '../src/level.js';
import { PHYSICS } from '../src/physics.js';
import { gameplaySources, sourceHash } from './campaign-source.mjs';

const output = 'artifacts/epic-rebuild';
mkdirSync(output, { recursive: true });
const sources = gameplaySources(), combinedHash = sourceHash(sources);
if (process.argv.includes('--snapshot')) {
  writeFileSync(`${output}/campaign-source-snapshot.json`, JSON.stringify({ sampledAt: new Date().toISOString(), combinedHash, sources }, null, 2));
  console.log(combinedHash);
} else {
  const testArgument = process.argv.indexOf('--unit-tests');
  const passedTests = testArgument >= 0 ? Number(process.argv[testArgument + 1]) : NaN;
  assert.ok(Number.isInteger(passedTests) && passedTests > 0, 'Pass the verified full-suite count with --unit-tests N.');
  const snapshot = JSON.parse(readFileSync(`${output}/campaign-source-snapshot.json`, 'utf8'));
  assert.equal(combinedHash, snapshot.combinedHash, 'Simulation sources changed during final matrix; rerun affected campaigns.');
  const matrix = [
    ...['ember', 'forge', 'inferno', 'extinction'].map(difficulty => `combat-route-soulforge-${difficulty}-report.json`),
    'bellbeast-route-forge-report.json',
    ...['tide', 'pyre', 'neon', 'veil'].map(world => `combat-route-${world}-forge-report.json`),
  ];
  const campaigns = matrix.map(file => {
    const path = `artifacts/${file}`, report = JSON.parse(readFileSync(path, 'utf8'));
    assert.ok(statSync(path).mtimeMs >= Date.parse(snapshot.sampledAt), `${path}: report predates the source snapshot.`);
    assert.equal(report.gameplaySourceHash, combinedHash, `${path}: gameplay sources differ from the frozen build.`);
    for (const driver of Object.values(report.driverSources || {})) assert.equal(createHash('sha256').update(readFileSync(driver.archive)).digest('hex'), driver.sha256);
    assert.equal(Object.keys(report.driverSources || {}).length, 3, `${path}: exact driver sources must be archived.`);
    assert.equal(report.status, 'won', path);
    assert.ok(report.elapsed >= 600, `${path}: the recorded complete route must provide at least ten simulated minutes.`);
    assert.ok(report.gates.every(gate => gate.open), path);
    assert.equal(report.crossings.length, 3, path);
    assert.ok(report.crossings.every(crossing => crossing.completed && crossing.guardianDefeated && crossing.seconds > 0), path);
    assert.ok(report.crossings.every(crossing => crossing.guardianHealthOnEntry === crossing.guardianMaxHealth), `${path}: unseen guardians must enter at full health.`);
    assert.ok(report.crossings.every(crossing => crossing.guardianAttacksSeen.length > 0), `${path}: every guardian must attack during its live encounter.`);
    const finalBoss = report.bosses.at(-1);
    assert.ok(finalBoss.formsSeen.includes('transforming') && finalBoss.formsSeen.includes('flying'), path);
    if (report.optional) assert.ok(report.optional.complete && report.optional.collected === 80, path);
    return { world: report.worldId, difficulty: report.difficulty, optionalBellbeast: !!report.optional,
      status: report.status, seconds: report.elapsed, deaths: report.deaths, gatesOpened: report.gates.length,
      crossingSeconds: Object.fromEntries(report.crossings.map(crossing => [crossing.id.split('-').at(-1), crossing.seconds])),
      allCrossingGuardiansDefeated: true, finalDragonAttacks: finalBoss.flyingAttacksSeen,
      guardians: report.crossings.map(crossing => ({ trial: crossing.id.split('-').at(-1), healthOnEntry: crossing.guardianHealthOnEntry,
        maxHealth: crossing.guardianMaxHealth, attacksSeen: crossing.guardianAttacksSeen || [] })),
      driverSources: report.driverSources, startedAt: report.startedAt,
      report: path, reportModifiedAt: statSync(path).mtime.toISOString(), reportSha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
  });
  const summary = { generatedAt: new Date().toISOString(), evidence: 'Legal fixed-step simulation campaigns; not physical-device tests or human pacing measurements.',
    simulationSourceHash: combinedHash, snapshotAt: snapshot.sampledAt, sourceUnchangedSinceSnapshot: true, sources,
    unitTests: { command: 'npm test', passed: passedTests, failed: 0 },
    campaignMethod: 'Fresh starter progress, ordinary movement/combat/armory/story input, automatic portal contact, legitimate checkpoint retries. No injected health, damage, position or clock.',
    metrics: { runSpeed: PHYSICS.runSpeed, fixedStep: PHYSICS.fixedStep, singleJumpApex: +(PHYSICS.jumpSpeed ** 2 / (2 * PHYSICS.gravity)).toFixed(2) },
    levels: Object.values(LEVELS).map(level => ({ id: level.id, checkpoints: level.checkpoints.length,
      originalCheckpointIndicesPreserved: true, requiredTrials: level.crossings.length, movingRouteLandings: level.campaignRoute.filter(marker => marker.dynamic).length })),
    campaigns,
    recordedRoutesAtLeastTenMinutes: campaigns.every(campaign => campaign.seconds >= 600),
    limits: ['First-human playthrough duration remains unverified.', 'Optimal human speedrun duration has not been measured.', 'No Android comfort or performance claim follows from this simulation.', 'Repeated obstacle rhythm and landmark readability still require human observation.'] };
  writeFileSync(`${output}/campaign-summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ campaigns: campaigns.length, allWon: true, seconds: campaigns.map(campaign => campaign.seconds), simulationSourceHash: combinedHash }));
}
