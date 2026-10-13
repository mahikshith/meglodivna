import { CATALOG } from './catalog.js';

const STARTERS = { sword: 'rustfang', gun: 'carbine', armor: 'courier', spell: 'cinder' };
export const WORLD_IDS = ['soulforge', 'tide', 'pyre', 'neon', 'veil'];
const ENCOUNTER_KEYS = ['claimed', 'defeatedBosses', 'openedGates', 'destroyedProps'];
export function defaultProgress() {
  return { version: 1, layoutVersion: 2, unlocked: Object.fromEntries(Object.entries(STARTERS).map(([key, id]) => [key, [id]])),
    equipped: { ...STARTERS }, collections: [], claimed: [], defeatedBosses: [], openedGates: [],
    destroyedProps: [], charges: { cannon: 0, nova: 0 }, checkpoint: 0,
    worldId: 'soulforge', worlds: {}, completedWorlds: [] };
}
const safeIds = value => Array.isArray(value)
  ? [...new Set(value.filter(id => typeof id === 'string' && /^[a-zA-Z0-9:_-]{1,80}$/.test(id)))].slice(0, 2048) : [];
export function validateProgress(raw) {
  const progress = defaultProgress();
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return progress;
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
  progress.completedWorlds = safeIds(raw.completedWorlds).filter(id => WORLD_IDS.includes(id));
  for (const id of WORLD_IDS) {
    const snapshot = raw.worlds?.[id];
    if (!snapshot || typeof snapshot !== 'object') continue;
    progress.worlds[id] = { checkpoint: Number.isInteger(snapshot.checkpoint) && snapshot.checkpoint >= 0 && snapshot.checkpoint < 1000 ? snapshot.checkpoint : 0 };
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
  progress.charges = { cannon: 0, nova: 0 };
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
  progress.charges = { cannon: 0, nova: 0 };
  return progress;
}
export function loadProgress(storage) {
  try {
    const raw = JSON.parse((storage ?? globalThis.localStorage)?.getItem('ash-signal-soulforge') || 'null');
    // Old relays name different rooms. Keep the armory, restart encounters at the new sanctuary.
    if (raw && typeof raw === 'object' && raw.version === 1 && (raw.layoutVersion !== 2 || !Object.hasOwn(raw, 'worldId'))) return newCampaignProgress(raw);
    return validateProgress(raw);
  }
  catch { return defaultProgress(); }
}
export function saveProgress(progress, storage) {
  try { const target = storage ?? globalThis.localStorage; target?.setItem('ash-signal-soulforge', JSON.stringify(validateProgress(progress))); return !!target; }
  catch { return false; }
}
