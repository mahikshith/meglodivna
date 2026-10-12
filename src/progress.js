import { CATALOG } from './catalog.js';

const STARTERS = { sword: 'rustfang', gun: 'carbine', armor: 'courier', spell: 'cinder' };
export function defaultProgress() {
  return { version: 1, unlocked: Object.fromEntries(Object.entries(STARTERS).map(([key, id]) => [key, [id]])),
    equipped: { ...STARTERS }, collections: [], claimed: [], defeatedBosses: [], openedGates: [],
    destroyedProps: [], charges: { cannon: 0, nova: 0 }, checkpoint: 0 };
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
  return progress;
}
export function newCampaignProgress(raw) {
  const progress = validateProgress(raw);
  for (const key of ['claimed', 'defeatedBosses', 'openedGates', 'destroyedProps']) progress[key] = [];
  progress.checkpoint = 0;
  progress.charges = { cannon: 0, nova: 0 };
  return progress;
}
export function loadProgress(storage) {
  try { return validateProgress(JSON.parse((storage ?? globalThis.localStorage)?.getItem('ash-signal-soulforge') || 'null')); }
  catch { return defaultProgress(); }
}
export function saveProgress(progress, storage) {
  try { const target = storage ?? globalThis.localStorage; target?.setItem('ash-signal-soulforge', JSON.stringify(validateProgress(progress))); return !!target; }
  catch { return false; }
}
