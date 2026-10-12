# ASH//SIGNAL: SOULFORGE — campaign route

A courier carries the last unbound human soul through an ancient soul engine rebuilt as a military machine. The Warden burns prisoners into soldiers; the Hex Matriarch binds the dead into the foundry; the Null Regent commands both. The route crosses six authored biomes with changing elevation, enemy combinations, landmarks, and short recoveries.

The campaign is 65,000 × 720 pixels. The main physical route takes **220.47 seconds**, measured using continuous legal inputs, 137 landing markers, and the actual 120 Hz player simulation. It uses no teleport, invulnerability, or modified movement. This physical proof excludes combat, dynamic gates, and timed hazard damage.

The full live campaign was completed on all four tiers, with all three friendly conversations, both lever locks, all boss gates, and all three bosses defeated. Every boss used all three attack patterns. These efficient scripted runs combine legitimate armory choices, shooting, overhead cuts, parries, soul drain, finite cannon charges, and timed movement. Human reading and imperfect execution add time; the intended first skilled session remains roughly five minutes.

| Difficulty | Live campaign | Deaths / legal retries | Deadline remaining |
| --- | --- | --- | --- |
| Ember — easy | 251.89 s / 4:11.89 | 0 | 408.11 s |
| Forge — medium | 263.50 s / 4:23.50 | 0 | 246.50 s |
| Inferno — hard | 273.99 s / 4:33.99 | 0 | 176.01 s |
| Extinction — ultra hard | 289.14 s / 4:49.14 | 1 | 100.86 s |

| Boss | Base health | Forge fight | Inferno fight |
| --- | --- | --- | --- |
| The Warden | 1200 | 10.77 s | 13.70 s |
| Hex Matriarch | 1600 | 16.83 s | 18.07 s |
| Null Regent | 2600 | 18.14 s | 22.54 s |

| Chapter | Extent | Authored sequence | New pressure / recovery |
| --- | --- | --- | --- |
| Snow Border | 0–10800 | Border teaching → broken rift → refugee relay → steel spine → killwire → Warden | Rifle and rocket introductions; Mira offers Storm Katana or Bulwark Plate. |
| Flooded Ruins | 10800–21600 | Drowned arches → aqueduct → archive recovery → bell tower → sluice | Shade lunges and sorcery; Orren offers Soul Siphon or Stillgrave; the sluice requires its lever. |
| Furnace Crypt | 21600–32400 | Crypt approach → forge ascent → pulsed machinery → ossuary → Hex Matriarch | Fire, soul spells, and mixed enemies; Wraith Weave cache at the spine's summit. |
| Storm Spire | 32400–43200 | Deserter refuge → exposed causeway → lightning spine → batteries → killwire | Vesper offers two Oblivion Cannon charges or one Eclipse Nova; rail rifle and lightning unlocks. |
| Eclipse Citadel | 43200–54000 | Court → shadow galleries → killwire → rampart → procession → final seal | Close assassins combine with sentinels and rockets; Soul Saber and a once-only nova cache. |
| Soul Reactor | 54000–65000 | Airlock → pressure vents → corelift → soulwell → last relay → Null Regent | All previous mechanics return; the last cache grants finite cannon/nova recovery before the finale. |

## Movement and encounter design

The player collider is 24 × 46, baseline ground isy610, running speed is 320 px/s, and a held jump rises about 123 pixels. Main-path rises never exceed 105 pixels; unsupported gaps never exceed 250 pixels. The wider undercrypt floor pits have descending catwalks across them, leaving only 160 pixels unsupported on the chosen upper route. The main route does not depend on a full jet tank. Double jump and wall jump are essential recovery tools; jet fuel improves control and lets skilled players skip exposed landings.

The authored modules are fixed content, not procedural generation: five broken bridges, six400-pixel spines, four arched vaults, and five killwire corridors are placed in deliberate chapter orders. Deck heights and enemy powers change their rhythm. Optional perches hold soul caches, flanking positions, and boss height options. Static floors cannot be destroyed. Breakable crates, explosive barrel pairs, soul caches, and gates belong to the dynamic simulation.

Fifteen safe relay positions break up failure recovery. They provide solid support and clear wall, gate, hazard, and initial enemy overlap. Boss arenas are grounded, contiguous rooms with approach space before each activation threshold. Closed gate forcefields span the full playable height, from y0 to the ground at y610; the combat boundary prevents climbing above the world to bypass them. Boss gates open from actual boss death; the ruins and eclipse gates require safe, clearly marked levers placed before them. Story choices occur in calm space and give mutually useful equipment or magic rewards.

Laser gates offer 1.9 seconds of inactive time per 3.4 second pulse, including the visible warning interval handled by the combat renderer. Fire and EMP glyphs occupy shallow floor bands that a normal jump clears. Missile pressure, difficulty-dependent attack frequency, and the reactor deadline belong to combat rather than artificial route delays. Snow, teal water, copper embers, electric storm light, ultraviolet shadows, and crimson reactor glow distinguish each biome while retaining readable player and hazard silhouettes.

## Content and validation

The campaign contains 138 static solids, 64 hazards, 57 ordinary enemies, 3 bosses, 16 interactive/destructible props, 25 world pickups, 3 friendly NPCs with two reward choices each, and 5 gates. Enemy types are rifle guard, drone, missile turret, pyromancer, shade assassin, and lightning sentinel. Named equipment and reward IDs are validated against `src/catalog.js`; discovered gear and spell choices are handled by the combat catalogue.

`tests/level.test.js` checks object IDs and bounds, safe relays, actual landing surfaces, maximum gaps/rises, grounded boss arenas, gate/lever references, dialogue choices and reward IDs, supported props, all six enemy classes, independent factories, and supported patrols. `tests/route.test.js` proves the entire physical route with legal movement inputs. `scripts/combat-route.mjs` exercises the live campaign including enemies, hazards, story rewards, levers, bosses, legitimate retries, and the deadline.

The combat reports and replay inputs are saved in `artifacts/combat-route-{ember,forge,inferno,extinction}-report.json`, with matching `-inputs.json` files. Each report includes boss activation positions/times, the three exactly-once NPC reward claims, gates, attack coverage, remaining deadline, and any legitimate retry. The controller uses public gameplay APIs only and never overrides health, position, invulnerability, damage, or the countdown. Replay records include zero-time story advancement and valid equipment selection alongside held gameplay inputs.

All four final reports were regenerated after the full-height gate, world-ceiling, boss-arena containment, and tagged-projectile repairs. Boss activation occurred after the correct boundaries at x9052.10, x30301.90, and x62401.78. Inactive bosses remained at full health before activation; all five gates opened through their boss or lever condition, and Mira, Orren, and Vesper each granted exactly one story reward.

Human first-run difficulty and Android hardware feel still require playtesting. The legal-input controller proves campaign completion, not human mastery or device performance.
