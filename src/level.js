import { buildRuneWorlds } from './rune-worlds.js';
export const LEVELS = buildRuneWorlds();
export const LEVEL = LEVELS.soulforge;
export const WORLD_LIST = Object.values(LEVELS).map(level => ({ id:level.id, name:level.name, description:level.description, theme:level.theme, width:level.width, timeLimit:level.timeLimit, tint:level.zones[0].tint }));
export function getLevel(id='soulforge'){return LEVELS[id]||LEVEL;}
export function createEnemies(level=LEVEL){return level.enemies.map(enemy=>({...enemy}));}
