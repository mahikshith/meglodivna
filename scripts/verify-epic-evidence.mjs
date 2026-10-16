import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const paths = {
  art: 'artifacts/epic-revision/integrity.json',
  campaign: 'artifacts/epic-rebuild/campaign-summary.json',
  visual: 'artifacts/epic-rebuild/qa/visual/report.json',
  controls: 'artifacts/epic-rebuild/qa/controls/report.json',
  production: 'artifacts/epic-rebuild/qa/production/report.json',
};
const reports = Object.fromEntries(Object.entries(paths).map(([name, path]) => [name, read(path)]));
const lineEndingOnly = [];
const verifyFile = (path, expected) => {
  if (digest(path) === expected) return;
  // Git normalizes text between Windows checkouts and Linux CI; binary art remains exact.
  if (/\.(js|mjs|cjs|css|html|json|py|md|yml)$/.test(path)) {
    const text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    if ([text, text.replace(/\n/g, '\r\n')].some(value => createHash('sha256').update(value).digest('hex') === expected)) {
      lineEndingOnly.push(path); return;
    }
  }
  assert.fail(`Stale evidence: ${path}`);
};
const verify = hashes => {
  for (const [path, expected] of Object.entries(hashes)) verifyFile(path, typeof expected === 'string' ? expected : expected.sha256);
};
verify(reports.art.files);
verify(reports.campaign.sources);
verify(reports.visual.hashes);
verify(reports.controls.sourceHashes);
verify(reports.production.sourceHashes);
verify(reports.production.distHashes);
assert.equal(reports.campaign.sourceUnchangedSinceSnapshot, true);
assert.equal(reports.campaign.campaigns.length, 9);
for (const campaign of reports.campaign.campaigns) {
  assert.equal(campaign.status, 'won');
  assert.ok(campaign.seconds >= 600, `Under ten minutes: ${campaign.world}/${campaign.difficulty}`);
  assert.equal(campaign.allCrossingGuardiansDefeated, true);
  verifyFile(campaign.report, campaign.reportSha256);
  assert.equal(Object.keys(campaign.driverSources).length, 3);
  for (const driver of Object.values(campaign.driverSources)) verifyFile(driver.archive, driver.sha256);
}
assert.equal(reports.campaign.unitTests.failed, 0);
assert.equal(reports.visual.passed, true);
assert.equal(reports.visual.fixtures.length, 53);
assert.equal(reports.controls.ok, true);
assert.equal(reports.controls.checks.length, 8);
assert.equal(reports.production.status, 'pass');
assert.deepEqual(reports.production.runtimeErrors, []);
assert.deepEqual(reports.production.failedResources, []);
const version = read('package.json').version, gradle = readFileSync('android/app/build.gradle', 'utf8');
assert.ok(gradle.includes(`versionName '${version}-lantern'`));
assert.ok(gradle.includes("applicationId 'com.meglodivna.ashsignal'"));
const summary = {
  version, generatedAt: new Date().toISOString(), sourceAndEvidenceHashesVerified: true, lineEndingOnlyDifferences: [...new Set(lineEndingOnly)],
  unitTests: reports.campaign.unitTests, legalCampaigns: reports.campaign.campaigns.length,
  campaignSeconds: reports.campaign.campaigns.map(c => ({ world: c.world, difficulty: c.difficulty, seconds: c.seconds })),
  isolatedVisualFixtures: reports.visual.fixtures.length, realInputScenarios: reports.controls.checks.length,
  productionSmoke: reports.production.status, textureBudget: { rgbaBytes: reports.visual.textureBudget.rgbaBytes, sourceImages: reports.visual.textureBudget.textures.length, deviceMemoryMeasured: false },
  evidence: Object.fromEntries(Object.entries(paths).map(([name, path]) => [name, { path, sha256: digest(path) }])),
  physicalDeviceTested: false, humanPacingMeasured: false,
  limits: 'Finite frame animation and staged transformation. Legal simulation time is not a minimum human speedrun or device performance measurement. Signed APK verification is recorded separately in the release android-report.json.',
};
writeFileSync('artifacts/epic-rebuild/validation.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ version, tests: summary.unitTests.passed, campaigns: summary.legalCampaigns, visualFixtures: summary.isolatedVisualFixtures, inputScenarios: summary.realInputScenarios }));
