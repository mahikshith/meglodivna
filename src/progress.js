import { CATALOG } from './catalog.js';
import { getLevel } from './level.js';

const STARTERS = { sword: 'rustfang', gun: 'carbine', armor: 'courier', spell: 'cinder' };
const PREVIOUS_CROSSING_RELAYS = 14;
export const WORLD_IDS = ['soulforge', 'tide', 'pyre', 'neon', 'veil'];
const ENCOUNTER_KEYS = ['claimed', 'defeatedBosses', 'openedGates', 'destroyedProps'];
export function defaultProgress() {
  return { version: 1, layoutVersion: 3, unlocked: Object.fromEntries(Object.entries(STARTERS).map(([key, id]) => [key, [id]])),
    equipped: { ...STARTERS }, collections: [], claimed: [], defeatedBosses: [], openedGates: [],
    destroyedProps: [], charges: { cannon: 0, nova: 0 }, checkpoint: 0,
    worldId: 'soulforge', worlds: {}, completedWorlds: [], souls: 0, soulClaims: [], pendingSouls: [], upgrades: { armor: 0, artifact: 0 } };
}
const safeIds = value => Array.isArray(value)
  ? [...new Set(value.filter(id => typeof id === 'string' && /^[a-zA-Z0-9:_-]{1,80}$/.test(id)))].slice(0, 2048) : [];
function migrateV2Checkpoint(index, worldId) {
  const level = getLevel(worldId);
  const originalCount = level.checkpoints.filter(checkpoint => checkpoint.x < level.mainWidth).length;
  if (index < originalCount) return index;
  const oldOffset = index - originalCount;
  const crossingIndex = Math.floor(oldOffset / PREVIOUS_CROSSING_RELAYS);
  const crossing = level.crossings[crossingIndex];
  if (!crossing) return 0;
  const relays = level.checkpoints.map((checkpoint, checkpointIndex) => ({ checkpoint, checkpointIndex }))
    .filter(({ checkpoint }) => checkpoint.x >= crossing.x && checkpoint.x < crossing.x + crossing.w);
  if (!relays.length) return originalCount - 1;
  const oldRelay = oldOffset % PREVIOUS_CROSSING_RELAYS;
  return relays[Math.min(relays.length - 1, Math.floor(oldRelay * relays.length / PREVIOUS_CROSSING_RELAYS))].checkpointIndex;
}
export function validateProgress(raw) {
  const progress = defaultProgress();
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return progress;
  if (raw.testMode === true) progress.testMode = true;
  progress.souls = Number.isSafeInteger(raw.souls) ? Math.max(0, Math.min(999999, raw.souls)) : 0;
  progress.soulClaims = safeIds(raw.soulClaims);
  for (const key of ['armor', 'artifact']) progress.upgrades[key] = Number.isInteger(raw.upgrades?.[key]) ? Math.max(0, Math.min(3, raw.upgrades[key])) : 0;
  const dropIds = new Set();
  progress.pendingSouls = (Array.isArray(raw.pendingSouls) ? raw.pendingSouls : []).filter(drop => {
    if (!drop || !safeIds([drop.id]).length || dropIds.has(drop.id) || progress.soulClaims.includes(drop.id)
      || !WORLD_IDS.includes(drop.worldId) || ![drop.x, drop.y].every(Number.isFinite)
      || drop.x < 0 || drop.x > 200000 || drop.y < 0 || drop.y > 10000 || !Number.isInteger(drop.value) || drop.value <= 0 || drop.value > 1000) return false;
    dropIds.add(drop.id); return true;
  }).slice(0, 2048).map(({ id, worldId, x, y, value }) => ({ id, worldId, x, y, value }));
  for (const [category, starter] of Object.entries(STARTERS)) {
    const known = CATALOG[category].map(item => item.id);
    progress.unlocked[category] = [...new Set([starter, ...safeIds(raw.unlocked?.[category]).filter(id => known.includes(id))])];
    if (progress.unlocked[category].includes(raw.equipped?.[category])) progress.equipped[category] = raw.equipped[category];
  }
  progress.collections = safeIds(raw.collections).filter(id => CATALOG.relic.some(item => item.id === id));
  for (const key of ['claimed', 'defeatedBosses', 'openedGates', 'destroyedProps']) progress[key] = safeIds(raw[key]);
  for (const key of ['cannon', 'nova']) {
    const value = raw.charges?.[key];
    progress.charges[key] = Number.isFinite(value) ? Math.max(0, Math.min(9, Math.floor(value))) : 0;
  }
  progress.checkpoint = Number.isInteger(raw.checkpoint) && raw.checkpoint >= 0 && raw.checkpoint < 1000 ? raw.checkpoint : 0;
  progress.worldId = WORLD_IDS.includes(raw.worldId) ? raw.worldId : 'soulforge';
  if (raw.layoutVersion === 2) progress.checkpoint = migrateV2Checkpoint(progress.checkpoint, progress.worldId);
  progress.completedWorlds = safeIds(raw.completedWorlds).filter(id => WORLD_IDS.includes(id));
  for (const id of WORLD_IDS) {
    const snapshot = raw.worlds?.[id];
    if (!snapshot || typeof snapshot !== 'object') continue;
    const checkpoint = Number.isInteger(snapshot.checkpoint) && snapshot.checkpoint >= 0 && snapshot.checkpoint < 1000 ? snapshot.checkpoint : 0;
    progress.worlds[id] = { checkpoint: raw.layoutVersion === 2 ? migrateV2Checkpoint(checkpoint, id) : checkpoint };
    for (const key of ENCOUNTER_KEYS) progress.worlds[id][key] = safeIds(snapshot[key]);
  }
  return progress;
}
export function switchWorldProgress(raw, id) {
  const progress = validateProgress(raw);
  if (!WORLD_IDS.includes(id) || progress.worldId === id) return progress;
  progress.worlds[progress.worldId] = { checkpoint: progress.checkpoint };
  for (const key of ENCOUNTER_KEYS) progress.worlds[progress.worldId][key] = [...progress[key]];
  const snapshot = progress.worlds[id];
  progress.worldId = id;
  progress.checkpoint = snapshot?.checkpoint || 0;
  for (const key of ENCOUNTER_KEYS) progress[key] = [...(snapshot?.[key] || [])];
  return progress;
}
export function newCampaignProgress(raw) {
  const progress = validateProgress(raw);
  for (const key of ['claimed', 'defeatedBosses', 'openedGates', 'destroyedProps']) progress[key] = [];
  progress.checkpoint = 0;
  progress.charges = progress.testMode ? { cannon: 9, nova: 9 } : { cannon: 0, nova: 0 };
  progress.worlds = {};
  progress.completedWorlds = [];
  return progress;
}
export function restartWorldProgress(raw, id) {
  const progress = switchWorldProgress(raw, id);
  if (!WORLD_IDS.includes(id)) return progress;
  progress.checkpoint = 0;
  for (const key of ENCOUNTER_KEYS) progress[key] = [];
  delete progress.worlds[id];
  progress.completedWorlds = progress.completedWorlds.filter(completed => completed !== id);
  progress.charges = progress.testMode ? { cannon: 9, nova: 9 } : { cannon: 0, nova: 0 };
  return progress;
}
export function testArmoryProgress(raw) {
  const progress = validateProgress(raw);
  progress.testMode = true;
  progress.souls = Math.max(progress.souls, 9999);
  for (const category of Object.keys(STARTERS)) progress.unlocked[category] = CATALOG[category].map(item => item.id);
  progress.charges = { cannon: 9, nova: 9 };
  return progress;
}
export function loadProgress(storage, { testMode = false } = {}) {
  try {
    const target = storage ?? globalThis.localStorage;
    if (testMode) {
      const saved = target?.getItem('ash-signal-soulforge-test-armory');
      return testArmoryProgress(saved ? JSON.parse(saved) : loadProgress(target));
    }
    const raw = JSON.parse(target?.getItem('ash-signal-soulforge') || 'null');
    // Old relays name different rooms. Keep the armory, restart encounters at the new sanctuary.
    if (raw && typeof raw === 'object' && raw.version === 1 && (![2, 3].includes(raw.layoutVersion) || !Object.hasOwn(raw, 'worldId'))) return newCampaignProgress(raw);
    return validateProgress(raw);
  }
  catch { return testMode ? testArmoryProgress() : defaultProgress(); }
}
export function saveProgress(progress, storage) {
  try { const target = storage ?? globalThis.localStorage; target?.setItem(progress.testMode ? 'ash-signal-soulforge-test-armory' : 'ash-signal-soulforge', JSON.stringify(validateProgress(progress))); return !!target; }
  catch { return false; }
}
