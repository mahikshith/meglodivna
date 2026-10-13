# Runeheart v0.5 — authored chambers

Five selectable realms use the same movement rules with different room order, elevations, environmental pressure and guardian powers. Each spans 18,770 × 1,440 world pixels and eleven named chambers. The old corridor layout is preserved in `src/legacy-level.js` for historical regression fixtures; the active layouts are in `src/rune-worlds.js`.

| Realm | Journey and distinct mechanic |
| --- | --- |
| Runeheart · Hollow Sanctuary | Lantern refuge → broken roots → bell ascent → ember keeper → aqueduct → tide vault → crypt → witch → storm ascent → engine → unbinding |
| Drowned Choir · Sluice Kingdom | Early aqueduct and vault; undertow currents, moving raft, water pressure guardians |
| Cinder Coven · Furnace Below | Early roofed crypt and steamworks; crumbling spans, furnace valve weakens the first guardian |
| Storm Archive · Broken Circuit | Early conduit and vertical mast; moving maintenance lift, machinery ceiling, overload guardians |
| Glass Necropolis · False Moon | Early mirror vault and crypt; mirror summons, Ysra's explicit blood-for-dragon pact and ambush |

## Objective and rewards

Recover the Ember Heart, Tide Glass and Storm Seal. The Tide vault gate requires its stone; the final seal requires all three. Defeating a guardian opens its own seal. A conduit lever opens a pressure door. Stones give a finisher burn, a first-discovery shield and fuel recovered from dash kills respectively.

Mira explains that the engine is burning people into light, including her brother. Her short exchange offers guardian armor or Soul Siphon. Veil's Ysra offers a dragon at an explicit 25-life cost and starts an ambush; refusing restores mana. These choices use the normal progression and once-only reward system.

Side vaults sit above the main route, contain equipment or spell rewards and offer return portals. Three successive optional ledges rise 100/105/100 pixels. The main route includes four-step 400-pixel ascents, low crypt ceilings, interrupted aqueduct spans, large supported boss arenas and relay checkpoints before demanding encounters. Stationary main-path geometry can be completed without relying on a moving platform's phase.

## Movement and terrain

Hero collision remains 28 × 60 pixels. Ground speed is 320 px/s; a held jump rises approximately 123 pixels. Jump buffering, coyote time, variable jump height, a second jump, wall jumping, finite jet fuel and a short sword dash are supported. Collision runs at 120 Hz; larger external simulation steps are subdivided.

Ground solids extend opaquely to the bottom of the world. `src/terrain.js` draws continuous foundations, broad landing caps, irregular beveled slabs, recessed joints, cracks, side shading and platform undersides directly from each collision rectangle. A visible top lies on the same y coordinate as the collision top. Thin one-way platforms stay visually distinct from deep ground. Background paintings cover vertical travel and use slower parallax; they do not define collisions.

Room metadata records the exit floor after elevation changes. Tools placing a character for inspection must use a route marker's feet y, not assume the room entrance shares that height. Legal gameplay and traces use the actual collision layout.

## Duration and difficulty evidence

The clean legal driver uses recorded movement, combat, equipment and dialogue inputs, including actual deaths/retries. Current optimized Forge runs complete in approximately 100–106 simulated seconds; the four Runeheart tiers range from about 97 to 177 seconds. These measurements do **not** meet a guaranteed five-minute minimum and do not estimate a first-time human playthrough. Optional discovery and experimentation are unmeasured. The 15-minute Forge deadline is an upper pressure limit, not a claim about content duration.

Ember, Forge, Inferno and Extinction change health/damage pressure, attack timing, resources and deadline. Extinction's recorded route needs retries. Automated victory proves reachability and survival under recorded controls, not subjective fairness or enjoyment.

## Data contracts

`src/level.js` exports `LEVEL`, `LEVELS`, `getLevel`, `WORLD_LIST` and `createEnemies`. Stable realm IDs remain `soulforge`, `tide`, `pyre`, `neon`, `veil`. Authored solids, route stops, hazards, NPC choices, guardians, gates, pickups, portals, moving platforms, currents and crumble rules are consumed by the same live simulation. `layoutVersion: 2` migrates old encounter/checkpoint positions while retaining equipment discoveries. Tests separately exercise the new levels and historical regression fixtures.
