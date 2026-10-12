# ASH//SIGNAL: Fractured Realms — authored worlds

Five selectable worlds share one measured movement model and have independently authored room sequences, stories, encounters, environmental mechanics, side caches, checkpoints, and boss identities. The layouts are fixed data; no room order or geometry is randomized.

| World | Width | Static legal route | Latest Forge live proof | Retries in that proof |
| --- | --- | --- | --- | --- |
| Soulforge — The Unbound Engine | 84,400 px | 283.79 s | 335.70 s / 5:35.70 | 0 |
| Tide — The Drowned Fleet | 83,600 px | 270.88 s | 349.63 s / 5:49.63 | 0 |
| Pyre — The Ember Dungeons | 83,600 px | 271.71 s | 336.77 s / 5:36.77 | 0 |
| Neon — The Last Transit | 83,600 px | 270.96 s | 336.08 s / 5:36.08 | 0 |
| Veil — The Mirror Graves | 83,600 px | 271.16 s | 336.59 s / 5:36.59 | 0 |

Every live proof exceeded 300 seconds without idle time padding. The controller used actual public gameplay actions: movement, variable jumps, double jumps, finite jet corrections, shooting, cuts, magic, valid armory changes, dialogue choices, interactions and legitimate retries. It never changed health, position, damage, invulnerability or the clock. All three bosses were triggered at their authored boundaries and defeated; every required story claim and gate was verified. Veil includes the fourth, counterfeit-guide conversation.

All five Forge proofs were regenerated after the final boss blink, core alignment, aimed beam, parry resonance, ward-break and world-power changes. Soulforge also completed Ember in 326.29 s (no retries), Inferno in 357.59 s (no retries), and Extinction in 382.49 s (one legitimate retry and 91.63 s remaining). All eight runs passed with the same legal controller; no simulation or geometry changes were needed.

These are simulation times from efficient automated play. Human fun, difficulty, Android control comfort and device performance require playtesting. Tide, Pyre, Neon and Veil have current live evidence on Forge; their other difficulty tiers are not claimed here. Further systems changes require fresh live proofs.

## World direction and concrete mechanics

**Soulforge** preserves the original snow border, drowned archive, furnace crypt, storm spire, eclipse citadel and reactor. Existing source IDs and relay ordering remain for save compatibility. Five new authored additions introduce conduit dungeons, machinery gaps, a spine ascent, a roofed shutter exchange and a stepped reactor battle terrace. Its guardians remain the Warden, Hex Matriarch and Null Regent; the courier carries the last unbound human soul.

**Tide** moves from wreck coast through the drowned hold to the abyssal engine. Undertow fields pull airborne and grounded movement left; moving rafts reach raised side caches over the drowned route. Long hull terraces interrupt sunken tunnels and broken fleet bridges. The Cutlass Admiral, Drowned Oracle and Leviathan Engine guard the souls powering a dead fleet. Selk, Orren and a mutinous Vesper offer protection, spirit companions, soul drain and finite firepower.

**Pyre** crosses basalt prison, steam ossuary and the mountain's heart. Crumbling landing decks punish hesitation but restore; steam vents cycle with readable inactive windows. A pressure valve physically opens the Infernal Marshal's conduit lock and strips its shield, creating a weakness window. The Ash Witch and Magma Regent follow. Summit caches contain relics and resonance, and the story centers on freeing prisoners from the furnace.

**Neon** is a transit graveyard, shutter exchange and signal central. Maintenance lifts reach side lofts. Lasers are mounted beneath authored machinery ceilings, while retracting spike strips and broken transit tracks test movement between stations. Line Zero, Cipher Sibyl and Omninet treat human souls as obsolete cargo. Technician Finch, cipher exile Ada and corporate deserter Rook expose the system's stakes.

**Veil** follows ivory catacombs, counterfeit sanctum and the throne of names. Mirror passages identify their destination before interaction; enemy summoning rifts warn before arrival and expire. Ysra's optional Dragon Pact explicitly costs 25 life and activates an actual ambush rift; refusing preserves blood and grants resonance. The Boneward Sentinel, Witch of Mirrors and Grave Sovereign guard a stolen name. Summit relics and mirror side paths provide reasons to explore beyond the main route.

## Movement and route contract

World height is 720 px and baseline ground is y610. The player collider is 24 × 46. Running speed is 320 px/s; a held jump rises about 123 px. Main-path ledge rises stay at or below 105 px and unsupported gaps at or below 250 px. Roofed tunnels provide jump clearance; upper terraces, 400-pixel spines, descending catwalks and suspended decks give each route a changing silhouette.

`LEVEL.route` / each selected level's `route` uses player-center x and feet y on a named static solid. It also identifies required NPC, lever and boss stops. Moving rafts and lifts offer optional side routes and supported loot; the stable main geometry remains traversable at any motion phase. Current force, crumble timing, vent damage, gates, travel portals and summons belong to the live simulation.

Closed forcefields span y0–610, and the upper world boundary prevents climbing around them. Boss gates open from actual boss death. Relays precede demanding sections and are supported, clear of static walls and initial hazards. Static essential floors cannot be destroyed. Enemy patrols and interactive props have explicit supported surfaces.

## API and environmental data

`src/level.js` exports `LEVEL` (Soulforge default), `LEVELS`, `getLevel(id)`, `WORLD_LIST` and `createEnemies(level = LEVEL)`. IDs are `soulforge`, `tide`, `pyre`, `neon`, `veil`. Runtime world state owns its selected `level` and `worldId`; claims, boss state and checkpoints are isolated per world by the progress system.

`src/worlds.js` contains the shared collision-metric room builders, fixed chapter arrays and per-world authored mechanics. Each level has `solids`, `hazards`, `route`, `enemies`, `bosses`, `gates`, `props`, `pickups`, `npcs`, `checkpoints`, `zones`, `guides`, and a Forge `timeLimit` of 620 seconds. Difficulty scales that clock.

- `movingPlatforms`: ID, collider, axis, distance, period, phase and kind (`raft` or `lift`).
- `currents`: rectangle, horizontal/vertical force and tint.
- `crumble`: stable solid ID, delay and restoration time.
- Timed steam, spikes, fire and laser hazards: collider, period, active duration and phase.
- `enemyPortals`: location, enemy type, period, lifetime and optional required choice claim.
- Travel `portals`: visible rectangle, destination and one-way flag; interaction performs travel.
- Story choices: validated reward, explicit optional cost, and an optional ambush effect. Reward claims are once-only.

Named clone, wolf and dragon spell unlocks are available through authored pickups or dialogue. Side loft and summit caches carry relics, resonance and finite power charges. Existing catalogue IDs are reused and validated rather than inventing unavailable items.

## Verification and artifacts

`tests/level.test.js` validates the expanded default world. `tests/worlds.test.js` checks all five world boundaries, metadata, independent state, routes, rewards, supported relays, boss arenas, gates and environmental references. `tests/route.test.js` performs continuous legal-input static traversal in each world. All 18 owned level/world/route checks pass.

Run live proofs with `node scripts/combat-route.mjs <difficulty> <worldId>`. Reports and compact replay actions are saved as `artifacts/combat-route-<worldId>-<difficulty>-report.json` and matching `-inputs.json`. Soulforge Forge retains the common `combat-route-report.json` and `combat-route-inputs.json` aliases for existing replay tooling. Reports record trigger positions, exactly-once NPC claims, gates, boss attack coverage, deadlines, health and legitimate retries.

The legal controller can recover a knocked-down jump by lifting beside a platform face and steering back above it. This uses finite fuel and normal collisions. It does not disable the enemy or bypass collision. Optional portal travel, side-cache routes and every possible NPC alternative require their own focused tests or human exploration; a main-route completion does not claim exhaustive branch coverage.
