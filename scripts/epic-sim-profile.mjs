// Bounded CPU profiling of the unchanged legal campaign driver. No actor or save overrides.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { Session } from 'node:inspector';
import { createHash } from 'node:crypto';
const seconds = Number(process.env.PROFILE_SECONDS || 240);
if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600) throw new Error('PROFILE_SECONDS must be in (0, 600].');
const label = process.env.PROFILE_LABEL || 'baseline';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('PROFILE_LABEL must be a simple filename.');
const output = new URL(`../artifacts/epic-rebuild/qa/performance/${label}/`, import.meta.url);
mkdirSync(output, { recursive: true });
const original = readFileSync(new URL('./combat-route.mjs', import.meta.url), 'utf8');
const sourceFiles = ['src/combat.js', 'src/physics.js', 'src/character-motion.js', 'src/ironfang.js', 'src/level.js', 'src/crossings.js', 'src/crossing-courses.js', 'scripts/combat-route.mjs', 'scripts/route-navigation.mjs', 'scripts/campaign-source.mjs'];
const hashes = Object.fromEntries(sourceFiles.map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
let source = original.slice(0, original.indexOf('\nconst report ='))
  .replace(/\b(from\s+|import\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
    (_, prefix, quote, relative) => `${prefix}${quote}${new URL(relative, new URL('./combat-route.mjs', import.meta.url)).href}${quote}`)
  .replace('totalFrames < 120 * 1800', `totalFrames < 120 * ${seconds}`)
  .replaceAll('stepWorld(world, controls, STEP);', 'profiledStep(world, controls, STEP);');
source += '\nglobalThis.profileResult = { frames: totalFrames, status: world.status, deaths, target: route[targetIndex]?.id, x: world.player.x, solids: world.solids.length, enemies: world.enemies.length, awake: world.enemies.filter(e => e.awake && !e.dead).length };';
source += '\nfunction profiledStep(...args) { const before = performance.now(); stepWorld(...args); globalThis.stepSamples.push(performance.now() - before); }';
globalThis.stepSamples = [];
const session = new Session(); session.connect();
const post = (name, params = {}) => new Promise((resolve, reject) => session.post(name, params, (error, result) => error ? reject(error) : resolve(result)));
await post('Profiler.enable'); await post('Profiler.setSamplingInterval', { interval: 1000 }); await post('Profiler.start');
const start = performance.now();
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const elapsedMs = performance.now() - start, { profile } = await post('Profiler.stop'); session.disconnect();
writeFileSync(new URL('cpu.cpuprofile', output), JSON.stringify(profile));
const samples = globalThis.stepSamples.sort((a, b) => a - b);
const nodes = new Map(profile.nodes.map(node => [node.id, node])), totals = new Map();
for (let i = 0; i < profile.samples.length; i++) {
  const frame = nodes.get(profile.samples[i]).callFrame;
  const file = frame.url.startsWith('data:') ? 'legal-driver' : frame.url.split('/').at(-1);
  const key = JSON.stringify({ function: frame.functionName || '(anonymous)', file, line: frame.lineNumber + 1 });
  totals.set(key, (totals.get(key) || 0) + profile.timeDeltas[i]);
}
const duration = profile.timeDeltas.reduce((a, b) => a + b, 0);
const topSelfSamples = [...totals].sort((a, b) => b[1] - a[1]).slice(0, 18)
  .map(([key, time]) => ({ ...JSON.parse(key), sampleMs: time / 1000, percent: time / duration * 100 }));
const summary = { kind: 'Bounded Node legal-input simulation CPU profile; no renderer or physical device', label,
  ...globalThis.profileResult, simulatedSeconds: globalThis.profileResult.frames / 120, elapsedMs,
  step: { meanMs: samples.reduce((a, b) => a + b, 0) / samples.length, p50Ms: samples[Math.floor(samples.length * .5)], p95Ms: samples[Math.floor(samples.length * .95)], p99Ms: samples[Math.floor(samples.length * .99)], maxMs: samples.at(-1) },
  hashes, topSelfSamples, measurementConditions: 'Node inspector sampling at1ms. Timing includes profiling overhead and CPU scheduling; no browser renderer or physical-device inference.' };
writeFileSync(new URL('summary.json', output), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
