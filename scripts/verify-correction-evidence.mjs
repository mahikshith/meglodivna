import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const paths = {
  art: 'artifacts/playtest-correction/qa/art/integrity.json',
  seam: 'artifacts/playtest-correction/qa/art/seam/report.json',
  campaign: 'artifacts/playtest-correction/campaign-summary.json',
  visual: 'artifacts/playtest-correction/qa/visual/report.json',
  controls: 'artifacts/playtest-correction/controls/report.json',
  story: 'artifacts/playtest-correction/qa/story/report.json',
  production: 'artifacts/playtest-correction/qa/production/report.json',
};
const reports = Object.fromEntries(Object.entries(paths).map(([name, path]) => [name, read(path)]));
const lineEndingOnly = [];
const verifyFile = (path, expected) => {
  if (digest(path) === expected) return;
  // Git normalizes text on Windows/Linux; images must match byte for byte.
  if (/\.(js|mjs|cjs|css|html|json|py|md|yml)$/.test(path)) {
    const normalized = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    for (const text of [normalized, normalized.replace(/\n/g, '\r\n')]) {
      if (createHash('sha256').update(text).digest('hex') === expected) {
        lineEndingOnly.push(path); return;
      }
    }
  }
  assert.fail(`Stale evidence: ${path}`);
};
const verify = hashes => {
  for (const [path, expected] of Object.entries(hashes)) verifyFile(path, typeof expected === 'string' ? expected : expected.sha256);
};

verify(reports.campaign.sources);
verify(reports.visual.hashes);
verify(reports.controls.sourceHashes);
verify(reports.production.sourceHashes);
verify(reports.production.distHashes);
assert.equal(reports.campaign.sourceUnchangedSinceSnapshot, true);
assert.equal(reports.campaign.campaigns.length, 9);
assert.equal(reports.campaign.unitTests.failed, 0);
assert.ok(reports.campaign.unitTests.passed >= 237);
for (const campaign of reports.campaign.campaigns) {
  assert.equal(campaign.status, 'won', `${campaign.world}/${campaign.difficulty}`);
  assert.equal(campaign.allCrossingGuardiansDefeated, true);
  assert.ok(campaign.seconds > 0);
  verifyFile(campaign.report, campaign.reportSha256);
  assert.equal(Object.keys(campaign.driverSources).length, 3);
  for (const driver of Object.values(campaign.driverSources)) verifyFile(driver.archive, driver.sha256);
}
assert.equal(reports.art.bossCorrectionFrames, 43);
assert.equal(reports.art.wolfCorrectionFrames, 8);
assert.ok(reports.art.measuredSolidGunMouthSockets >= 55);
for (const item of reports.art.textures) verifyFile(item.file, item.sha256);
assert.equal(reports.seam.passed, true);
assert.equal(reports.seam.records.length, 5);
assert.ok(reports.seam.records.every(record => record.changedOver8Fraction === 0 && record.maxChannelDelta <= 2));
assert.equal(reports.visual.passed, true);
assert.equal(reports.visual.fixtures.length, 58);
assert.deepEqual(reports.visual.errors, []);
assert.equal(reports.controls.ok, true);
assert.ok(reports.controls.checks.length >= 8);
assert.deepEqual(reports.controls.errors, []);
assert.equal(reports.story.checks.length, 4);
assert.equal(reports.production.status, 'pass');
assert.deepEqual(reports.production.runtimeErrors, []);
assert.deepEqual(reports.production.failedResources, []);
const version = read('package.json').version;
const gradle = readFileSync('android/app/build.gradle', 'utf8');
assert.equal(version, '0.10.0');
assert.ok(gradle.includes(`versionName '${version}-lantern'`));
assert.ok(gradle.includes('versionCode 11'));
assert.ok(gradle.includes("applicationId 'com.meglodivna.ashsignal'"));
const summary = {
  version: `${version}-lantern`, generatedAt: new Date().toISOString(),
  sourceAndEvidenceHashesVerified: true, lineEndingOnlyDifferences: [...new Set(lineEndingOnly)],
  unitTests: reports.campaign.unitTests,
  legalCampaigns: reports.campaign.campaigns.length,
  simulatedCampaignSeconds: reports.campaign.campaigns.map(({world, difficulty, seconds}) => ({world, difficulty, seconds})),
  isolatedVisualFixtures: reports.visual.fixtures.length,
  realInputScenarios: reports.controls.checks.length,
  storyBrowserChecks: reports.story.checks.length,
  productionSmoke: reports.production.status,
  art: {correctedBossFrames: reports.art.bossCorrectionFrames, correctedWolfFrames: reports.art.wolfCorrectionFrames,
    measuredSockets: reports.art.measuredSolidGunMouthSockets,
    rgbaDecodedBytes: reports.art.rgbaDecodedBytes},
  paintedPanoramaSeamsVerified: reports.seam.records.length,
  textureBudget: {rgbaBytes: reports.visual.textureBudget.rgbaBytes,
    sourceImages: reports.visual.textureBudget.textures.length, deviceMemoryMeasured: false},
  evidence: Object.fromEntries(Object.entries(paths).map(([name, path]) => [name, {path, sha256: digest(path)}])),
  physicalDeviceTested: false, humanTenMinuteTargetVerified: false,
  limits: 'Simulated campaign time is not human pacing. Browser art fixtures do not establish device comfort or sustained performance. Signed APK verification is separate in android-report.json.',
};
writeFileSync('artifacts/playtest-correction/validation.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({version: summary.version, tests: summary.unitTests.passed,
  campaigns: summary.legalCampaigns, visualFixtures: summary.isolatedVisualFixtures,
  inputScenarios: summary.realInputScenarios, storyChecks: summary.storyBrowserChecks}));
