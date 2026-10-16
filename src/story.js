// Original Lantern fiction, inspired by the Ramayana's rescue, crossing and service motifs.
export const INTRO_BEATS = [
  { duration: 6, title: 'The stolen dawn', speaker: 'MIRA', art: 'sanctuary', text: 'The Regent bound Orren and our people inside his iron heart. The sanctuary is losing its light.' },
  { duration: 6, title: 'A promise to return', speaker: 'AETHER', art: 'crossing', text: 'I am only a courier. But I will cross every storm and bring your brother home.' },
  { duration: 6, title: 'Follow the lantern', speaker: 'MIRA', art: 'oath', text: 'Find the three stones. At the heart, cross wind, then water, then fire. I will keep the lantern lit.' },
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
    subtitle: 'Climb to each wind bell. Landing there opens the path. Ride the updraft onward.', mechanism: 'wind bells', weather: 'pollen', power: 'wolf',
    opening: [{ speaker: 'MIRA', text: 'Orren followed the wind bells. Reach their high ledges and the path will answer your steps.' },
      { speaker: 'AETHER', text: 'I can hear him in the storm. One bell, one landing, one step closer.' }],
    ending: [{ speaker: 'MIRA', text: 'The wind carries his signal again. Follow the next lit gate into the water.' }] },
  { id: 'water', name: 'The Moonlit Causeway', mentor: 'The Bridge Keeper', biome: 'ruins', scene: 'islands', material: 'ruins', tint: 0x87b9c7, sky: 0x122b3d,
    subtitle: 'Cross the moving rafts. Land at each high lantern to open the next bridge.', mechanism: 'lantern bridges', weather: 'rain', power: 'stasis',
    opening: [{ speaker: 'MIRA', text: 'The crossing broke. The Bridge Keeper left lanterns on the high stones to guide anyone still searching.' },
      { speaker: 'AETHER', text: 'I will follow the rafts and leave every bridge open for the families behind me.' }],
    ending: [{ speaker: 'MIRA', text: 'The causeway shelters the families now. The final gate leads through fire to Orren.' }] },
  { id: 'fire', name: 'The Ember Oath', mentor: 'The Ash Sentinel', biome: 'furnace', scene: 'castle', material: 'metal', tint: 0xd9ad85, sky: 0x34212a,
    subtitle: 'Time the vents. Land at each upper lantern to open a safe route.', mechanism: 'furnace vents', weather: 'embers', power: 'dragon',
    opening: [{ speaker: 'MIRA', text: 'Only the Ash Sentinel stands between us and Orren. Rest at every lantern; the lower walk will catch a fall.' },
      { speaker: 'AETHER', text: 'No one stays bound because their path is harder. I will bring them all through this fire.' }],
    ending: [{ speaker: 'MIRA', text: 'All three crossings hold. Enter the heart and break the Regent’s bond.' }] },
];

export function nextCrossing(level, openedGates = []) {
  return level.crossings?.find(crossing => !openedGates.includes(crossing.completionGate)) || null;
}
