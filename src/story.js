// Original Lantern fiction, inspired by the Ramayana's rescue, crossing and service motifs.
export const INTRO_BEATS = [
  { duration: 6, title: 'The stolen dawn', speaker: 'MIRA', art: 'sanctuary', text: 'The Regent stole our dawn and bound our people inside his iron heart.' },
  { duration: 6, title: 'A promise across worlds', speaker: 'AETHER', art: 'crossing', text: 'I was only a courier. But no ocean, storm or iron gate should keep a family apart.' },
  { duration: 6, title: 'Carry the light home', speaker: 'MIRA', art: 'oath', text: 'Gather the three stones. Restore the wind, water and flame. Bring them home.' },
];
export const INTRO_DURATION = INTRO_BEATS.reduce((seconds, beat) => seconds + beat.duration, 0);
export function introBeatAt(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds >= INTRO_DURATION) return null;
  let start = 0;
  for (const [index, beat] of INTRO_BEATS.entries()) {
    if (seconds < start + beat.duration) return { ...beat, index, progress: (seconds - start) / beat.duration };
    start += beat.duration;
  }
  return null;
}
export const JOURNEY = [
  { id: 'courier', title: 'The last courier', objective: 'Find Mira and learn why the sanctuary has fallen.', relic: null },
  { id: 'keeper', title: 'Bearer of embers', objective: 'Free the Keeper and carry his Ember Heart.', relic: 'ember-heart' },
  { id: 'wayfinder', title: 'Wayfinder of the lost', objective: 'Recover Tideglass and follow the missing voices.', relic: 'tide-glass' },
  { id: 'knight', title: 'Knight of the lantern', objective: 'Restore the three crossings, then unbind the Regent.', relic: 'storm-seal' },
];
export function journeyStage(collections = []) { return [...JOURNEY].reverse().find(stage => !stage.relic || collections.includes(stage.relic)); }

export const CROSSINGS = [
  { id: 'wind', name: 'The Windward Canopy', mentor: 'The Wind Messenger', biome: 'storm', scene: 'sky', material: 'grass', tint: 0xaac9b1, sky: 0x142f36,
    subtitle: 'Climb to each wind bell. Open its shutter, then ride the updraft onward.', mechanism: 'wind bells', weather: 'pollen', power: 'wolf' },
  { id: 'water', name: 'The Moonlit Causeway', mentor: 'The Bridge Keeper', biome: 'ruins', scene: 'islands', material: 'ruins', tint: 0x87b9c7, sky: 0x122b3d,
    subtitle: 'Reach the high sluices. Release the bridges while the tide pulls against you.', mechanism: 'sluice valves', weather: 'rain', power: 'stasis' },
  { id: 'fire', name: 'The Ember Oath', mentor: 'The Ash Sentinel', biome: 'furnace', scene: 'castle', material: 'metal', tint: 0xd9ad85, sky: 0x34212a,
    subtitle: 'Cross the brittle stone. Vent each furnace from its upper valve.', mechanism: 'furnace vents', weather: 'embers', power: 'dragon' },
];
