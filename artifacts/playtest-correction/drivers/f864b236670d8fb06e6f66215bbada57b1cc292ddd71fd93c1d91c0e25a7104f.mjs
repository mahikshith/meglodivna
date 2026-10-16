import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';

export const digest = value => createHash('sha256').update(value).digest('hex');
const renderOnly = new Set(['main.js', 'ui.js', 'audio.js', 'art.js', 'lantern-art.js', 'reference-art.js', 'runeheart-art.js', 'terrain.js', 'lantern-fx.js']);
export function gameplaySources() {
  return Object.fromEntries(readdirSync('src').filter(name => name.endsWith('.js') && !renderOnly.has(name)).sort()
    .map(name => { const path = `src/${name}`; return [path, { sha256: digest(readFileSync(path)), modifiedAt: statSync(path).mtime.toISOString() }]; }));
}
export const sourceHash = sources => digest(JSON.stringify(Object.fromEntries(Object.entries(sources).map(([path, source]) => [path, source.sha256]))));
export function archiveDriver(directory = 'artifacts/epic-rebuild/drivers') {
  mkdirSync(directory, { recursive: true });
  return Object.fromEntries(['scripts/combat-route.mjs', 'scripts/route-navigation.mjs', 'scripts/campaign-source.mjs'].map(path => {
    const source = readFileSync(path), sha256 = digest(source), archive = `${directory}/${sha256}.mjs`;
    writeFileSync(archive, source);
    return [path, { sha256, archive }];
  }));
}
