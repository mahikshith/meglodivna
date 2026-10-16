# The Last Lantern v0.9.0 — Oath Crossings test build

This rebuild connects the illustrated sanctuary to three required portal trials, an eighteen-second rescue-story opening, and a courier-to-knight journey. The wind canopy, moonlit causeway and ember forge have different currents, moving or brittle platforms, high-switch puzzles, recovery lanterns and guardian encounters.

The Minotaur has new illustrated locomotion, charge, axe and rotary-gun poses. Its dragon form moves its neck, torso, legs and tail, pitches during flight, and fires physical cannon rounds from measured sockets. Painted muzzle flashes, propulsion, debris and ground impacts replace the previous blob shots and line-only melee effects. Circular enemy shields are removed. Detailed masonry and scenery preserve the approved sanctuary palette and world dimensions.

Boost replaces the separate sword dash. Tap it for fuel-powered propulsion, including in the air; hold for sustained thrust. Attack-button drag aims independently of the movement joystick. Running, flying and shooting remain compatible, while grounded crouch stops movement. Swept bullet collision includes visible enemy anatomy and point-blank muzzle overlap. Companions inflict real damage, and area spells stay within range and the current portal realm.

All 22 swords, firearms, armor sets and spells are unlocked for testing. The test armory uses a separate save key so earned campaign progress remains intact. Equipping limited-use powers restores their test charges. Fresh test journeys start with nine special charges and 9,999 test souls so every Soul Engine tier is affordable. Application ID and the persistent signing certificate remain unchanged.

## Evidence

The final build passes **231 unit tests, nine complete legal campaigns, 53 isolated visual fixtures and eight real-input browser scenarios**. Campaigns finish in **10:52 to 11:43**; Extinction includes one normal checkpoint retry, and the other eight runs have no deaths. All 27 portal-guardian encounters begin at full health, attack and end in defeat. These timings describe the recorded automated routes, not a minimum human speedrun.

- [Campaign summary](https://github.com/mahikshith/meglodivna/blob/v0.9.0-lantern/artifacts/epic-rebuild/campaign-summary.json): ordinary fixed-step gameplay inputs, without injected health, position, damage or clock.
- [Phone-sized rendering fixtures](https://github.com/mahikshith/meglodivna/blob/v0.9.0-lantern/artifacts/epic-rebuild/qa/visual/report.json): isolated states for inspecting art, muzzle registration, boss movement, effects and portal scenery.
- [Real keyboard and multitouch inputs](https://github.com/mahikshith/meglodivna/blob/v0.9.0-lantern/artifacts/epic-rebuild/qa/controls/report.json): independent aim and movement, downward fire with thrust, fuel costs, crouch stability and every equipment choice.
- [Production smoke](https://github.com/mahikshith/meglodivna/blob/v0.9.0-lantern/artifacts/epic-rebuild/qa/production/report.json): compiled offline payload, opening story, menus, equipment and decoded image/font resources.
- The release's `android-report.json` records the exact signed APK hash, application/version identifiers and embedded asset hashes. CI downloads the uploaded APK and checks that its bytes match before it is called the latest delivery.

## Scope and limitations

The Ramayana research distinguishes cited episodes from original game inventions; see [character and power notes](https://github.com/mahikshith/meglodivna/blob/v0.9.0-lantern/docs/RAMAYANA-STORY-AND-CROSSINGS.md). The opening's symbolic figures are illustrations, not newly playable epic-character rigs. Existing illustrated secondary villains and companions are retained and integrated with measured collision anatomy.

Animation uses finite authored frame strips. The bull-to-dragon change stages rebuilt poses; it is not a continuous anatomical morph. Four airborne firing directions and two crouched firing poses select the closest authored angle. Repeated course rhythm, first-human completion time and enjoyment still require player observation. Automated completion times do not establish a minimum possible speedrun.

This is a signed debug prerelease. No physical Android comfort, sustained frame rate, thermal, memory or audio-mix measurements are claimed. Calculated texture storage is reported separately from device memory.

The [feedback checklist](https://github.com/mahikshith/meglodivna/blob/main/docs/EPIC-REBUILD-CHECKLIST.md) preserves remaining validation work. Fifteen selected development skills are installed locally and recorded in [the skill memory](https://github.com/mahikshith/meglodivna/blob/v0.9.0-lantern/docs/GAME-SKILL-MEMORY.md); the game stays on Phaser 3.90 and its existing fixed-step simulation.
