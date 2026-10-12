# ASH//SIGNAL: Icebreak Foundry

The courier follows a severed weapons conduit into a frozen industrial district. Snow and low amber lamps mark safe ground; suspended steel and cyan security emitters mark the route into the foundry. The level is 9,400 × 720 pixels with an uninterrupted boss arena at its eastern end. Art can extend beyond a collider, but all landings use the explicit rectangles in `src/level.js`.

Target: 60–100 seconds for a first clean run, including cautious combat and the boss. The 9,150-pixel spawn-to-exit distance alone takes 28.6 seconds at full running speed; required climbing, broken decks, gates, and fighting extend it. This is a pacing target, not a measured human completion time.

| Section | Extent | Main decision | Recovery |
| --- | --- | --- | --- |
| Icebreak Outskirts | 0–1740 | Learn jump height over steel cover, blade versus rifle, and the first double-jump gap. Upper gantries let an experienced player flank the guards. | Start |
| Broken Viaduct | 1740–3460 | Three suspended decks rise and fall across 270–290-pixel gaps. Commit to momentum, use the second jump late, and reserve jet fuel to correct a miss. A missile turret forces a ranged approach. | Safe entry at x1780 |
| Furnace Ascent | 3460–5250 | Climb three 105-pixel risers and cross the 400-pixel steel spine. A wall jump can recover a missed riser or shorten the climb. Descending catwalks cross an open furnace pit; the lower floor contains fire. | Safe entry at x3490 |
| Killwire Gauntlet | 5250–7900 | Read a laser's pulse, then cross its dark interval. Jump the EMP strips to keep jet and dash available. A raised perch bypasses fire but houses a missile turret. Two gaps prevent a floor-only route. | Safe entry at x5280 |
| Warden Lock | 7900–9400 | Read boss windups, switch between rifle pressure and recovery-window blade attacks, and use the side perches for height. The exit follows the boss. | Boss recovery at x7940 |

## Physical route

Player collider: 24 × 46. Baseline floor: y610. Running speed: 320 px/s. Held first jump: approximately 123 pixels; second jump resets ascent with approximately 108 more pixels. Risers are 105, 105, 105, and 85 pixels high. The largest mandatory unsupported gap is 290 pixels; the 350-pixel furnace floor gap has descending catwalks above it. The main route does not depend on full jet fuel. Fuel is a recovery resource and a faster traversal option.

`LEVEL.route` lists landing waypoints using player-center x and feet y. It documents collision geometry and supports legal-input traversal tests. It is not an autoplay path. One-way platforms allow ascent from below and intentional drops; steel walls and cover are solid from every side.

Five checkpoint positions fit a full player collider on safe ground, clear of wall overlap, hazards, and initial enemies. Checkpoints precede each difficult section so a failed traversal does not repeat the entire level. Pickup placement provides health before the viaduct and boss, fuel on the ascent and descent, rapid fire at elevated combat positions, and optional shields on two exposed perches.

## Readability and fairness

- Each zone has one short action hint and a distinct vertical silhouette; the tall furnace spine is the central landmark.
- Lasers have more than one second of dark time. Rendering and combat must show a warning before activation; their phase offsets prevent a uniformly safe sprint through all gates.
- Missile turrets sit on visible supported decks, with a drone or guard serving as pressure rather than an invisible offscreen attack source.
- Bottom spikes occupy the gaps rather than standing ground. Fire and EMP remain shallow floor hazards; jumping clears them.
- Snow ground and warm lamps communicate recovery spaces; cold steel carries the demanding route. Particles and scenery must stay behind player and hazard silhouettes.
- Collision cost remains bounded: 27 solids, 18 hazards, 14 ordinary enemies, and one boss. Decoration is separate from collision and can be culled by the renderer.

## Verification boundary

`tests/level.test.js` checks unique IDs, finite world bounds, hazard windows, pickup types, safe spawn/checkpoint positions, contiguous arena geometry, supported enemy patrols, independent enemy factories, and analytical movement margins. The systems agent owns `tests/route.test.js`, which checks an actual legal-input traversal against `stepPlayer`. Physical traversal excludes combat and timed hazard damage; measured difficulty and first-run completion time require playtesting the integrated game.
