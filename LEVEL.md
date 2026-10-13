# ASH//SIGNAL: Aether Revamp — authored worlds

Five selectable worlds share one measured movement model and have independently authored room sequences, stories, encounters, environmental mechanics, side caches, checkpoints, and boss identities. The user's four reference boards set the Revamp direction: forest ruins, floating islands, thunder castle, sky city and crystal caves. The existing layouts and source IDs remain fixed for save compatibility; no room order or geometry is randomized.

| World | Width | Static legal route | Latest Forge live proof | Retries in that proof |
| --- | --- | --- | --- | --- |
| Verdant — Forest Ruins (`soulforge`) | 84,400 px | 283.81 s | 339.05 s / 5:39.05 | 0 |
| Aerie — Floating Islands (`tide`) | 83,600 px | 270.93 s | 351.79 s / 5:51.79 | 0 |
| Tempest — Thunder Castle (`pyre`) | 83,600 px | 271.76 s | 350.11 s / 5:50.11 | 1 |
| Zenith — Sky City (`neon`) | 83,600 px | 271.00 s | 338.23 s / 5:38.23 | 0 |
| Prism — Crystal Caves (`veil`) | 83,600 px | 271.21 s | 342.25 s / 5:42.25 | 0 |

Every live proof exceeded 300 seconds without idle time padding. The controller used actual public gameplay actions: movement, variable jumps, double jumps, finite jet corrections, shooting, cuts, magic, valid armory changes, dialogue choices, interactions and legitimate retries. It never changed health, position, damage, invulnerability or the clock. All three bosses were triggered at their authored boundaries and defeated; every required story claim and gate was verified. Prism includes the fourth, counterfeit-guide conversation.

All five Forge proofs were regenerated after the final Revamp family alignment: 28×60 Aether, 60×41 Rift Crawler, 34×45 Hexwing Raider, measured hand/weapon/mouth origins and the 112×86 airborne Wyrm. Verdant also completed Ember in 355.84 s (two legitimate retries), Inferno in 374.88 s (one retry), and Extinction in 372.40 s (no retries and 101.72 s remaining). All eight runs passed with the same legal controller. Each final boss's recorded state passed through ground, the 0.9-second transformation warning and flying form; every run observed all three flying attack patterns before defeating it.

These are simulation times from efficient automated play, including time spent in legitimate retry attempts. Human fun, difficulty, Android control comfort and device performance require playtesting. Aerie, Tempest, Zenith and Prism have current live evidence on Forge; their other difficulty tiers are not claimed here. A single controller trace does not rank subjective difficulty, and different hazard timing can produce more retries on an easier tier. Further systems changes require fresh live proofs.

## World direction and concrete mechanics

**Verdant** begins in root-covered forest ruins and passes through the floating aqueduct, thunder castle, sky city, crystal caves and aether engine. Existing source IDs, six biome IDs and relay ordering remain for save compatibility. Its authored additions include conduit dungeons, machinery gaps, a spine ascent, a roofed shutter exchange and a stepped engine battle terrace. The Warden and Hex Matriarch guard Aether's route; the Null Regent's core transforms into a rocket wyrm at low health.

**Aerie** moves from cloudroot landing through the hanging aqueduct to the aether dock. Crosswind fields physically pull airborne and grounded movement left; moving rafts reach raised side caches. Terraces, tunnels and broken island bridges preserve the tested route beneath floating-island scenery. The Skyward Admiral, Cloud Oracle and Aether-Rocket Wyrm guard the stolen island engines. Selk, Orren and skyfleet deserter Vesper offer protection, spirit companions, soul drain and finite firepower.

**Tempest** crosses ironroot prison, steam battlements and the crown of thunder. Crumbling masonry decks punish hesitation but restore; castle forge vents cycle with readable inactive windows. A pressure valve physically opens the Thunder Marshal's conduit lock and strips its shield, creating a weakness window. The Tempest Witch and Stormforged Wyrm follow. Summit caches contain relics and resonance, and the story centers on freeing prisoners beneath the storm.

**Zenith** rises from cloudline station through prism exchange to the city crown. Maintenance lifts reach side lofts. Lasers remain mounted beneath authored machinery ceilings, while retracting spike strips and broken transit tracks test movement between towers. Line Zero, Cipher Sibyl and Zenith Rocket Wyrm threaten the people whose souls power the city. Skyline technician Finch, cipher exile Ada and watch deserter Rook expose the system's stakes.

**Prism** follows luminous grotto, mirror sanctum and the prism's heart. Mirror passages identify their destination before interaction; enemy summoning rifts warn before arrival and expire. Ysra's optional Dragon Pact explicitly costs 25 life and activates an actual ambush rift; refusing preserves blood and grants resonance. The Prism Sentinel, Witch of Mirrors and Crystalbound Wyrm guard Aether's stolen name. Summit relics and mirror side paths provide reasons to explore beyond the main route.

## Movement and route contract

World height is 720 px and baseline ground is y610. Aether's player collider is 28×60. Running speed is 320 px/s; a held jump rises about 123 px. Main-path ledge rises stay at or below 105 px and unsupported gaps at or below 250 px. Roofed tunnels provide jump clearance; upper terraces, 400-pixel spines, descending catwalks and suspended decks give each route a changing silhouette. Authored spawn/relay positions preserve the original center and feet: runtime subtracts 2 px from x and 14 px from y when constructing the larger hero. Tests inspect the actual runtime body at every relay.

`LEVEL.route` / each selected level's `route` uses player-center x and feet y on a named static solid. It also identifies required NPC, lever and boss stops. Moving rafts and lifts offer optional side routes and supported loot; the stable main geometry remains traversable at any motion phase. Current force, crumble timing, vent damage, gates, travel portals and summons belong to the live simulation.

Closed forcefields span y0–610, and the upper world boundary prevents climbing around them. Boss gates open from actual boss death. Relays precede demanding sections and are supported, clear of static walls and initial hazards. Static essential floors cannot be destroyed. Enemy patrols and interactive props have explicit supported surfaces.

## API and environmental data

`src/level.js` exports `LEVEL` (Verdant, stable ID `soulforge`, default), `LEVELS`, `getLevel(id)`, `WORLD_LIST` and `createEnemies(level = LEVEL)`. IDs remain `soulforge`, `tide`, `pyre`, `neon`, `veil`; display names do not change saved world identity. Runtime world state owns its selected `level` and `worldId`; claims, boss state and checkpoints are isolated per world by the progress system.

`level.theme`, each `zone.theme` and `WORLD_LIST.theme` provide semantic `{ scene, foreground }` data. Scene values are `forest`, `islands`, `castle`, `sky`, `crystal`; foreground values are `grass`, `ruins`, `stone`, `metal`, `crystal`. Verdant changes its zone theme along the six-stage route. These names describe art direction without embedding texture keys in collision data.

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

Run live proofs with `node scripts/combat-route.mjs <difficulty> <worldId>`. Reports and compact replay actions are saved as `artifacts/combat-route-<worldId>-<difficulty>-report.json` and matching `-inputs.json`. Verdant (`soulforge`) Forge retains the common `combat-route-report.json` and `combat-route-inputs.json` aliases for existing replay tooling. Reports record the display name, actual hero and boss body sizes, trigger positions, exactly-once NPC claims, gates, boss attack coverage, ground/transformation/flying forms, flying attack coverage, deadlines, health and legitimate retries.

The legal controller can recover a knocked-down jump by lifting beside a platform face and steering back above it. This uses finite fuel and normal collisions. It does not disable the enemy or bypass collision. Optional portal travel, side-cache routes and every possible NPC alternative require their own focused tests or human exploration; a main-route completion does not claim exhaustive branch coverage.
