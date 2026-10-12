# ASH//SIGNAL: SOULFORGE — implementation ledger

Goal: expand the working prototype into a roughly five-minute playable campaign and deliver an installable debug Android APK. Ancient soul magic powers modern military machinery; the courier carries the last unbound human soul. Mature pixel art and readable, dangerous combat remain the foundation.

## Difficulty

Ember (easy), Forge (medium, default), Inferno (hard), Extinction (ultra hard). Movement geometry and core input timing stay fair across modes. Modes scale incoming damage, enemy health, attack cadence, missile pressure, recovery, and a reactor deadline. Legendary powers give recovery opportunities rather than erasing all difficulty.

## Tiny tasks / ownership / acceptance

| ID | Request | Concrete implementation | Owner | Check |
| --- | --- | --- | --- | --- |
| C01 | Longer gameplay | Six connected biomes, approximately65k pixels with authored traversal and encounters | Campaign | Legal full route and measured duration |
| C02 | Changing environments | Snow border, flooded ruins, furnace crypt, storm spire, eclipse citadel, soul reactor | Campaign + presentation | Six visibly distinct scenes |
| C03 | Story mode | Chapter objectives and conversations with three friendly NPCs; choices grant different useful rewards | Campaign + lead | Interact, choose, resume, no input leak |
| C04 | Villains / mega villains | Warden, Hex Matriarch, and final Null Regent, distinct attack powers and visual silhouettes | Combat + art | Each boss defeated, phases telegraphed |
| C05 | Recurring missiles | Regent sends right-to-left missiles, with a warning lane before launch, periodically throughout the campaign | Combat + lead | Warning/spawn/death, pool bounded |
| C06 | Difficulty tiers | Ember/Forge/Inferno/Extinction with explicit easy→ultra-hard labels | Combat + UI | Tier effects and viable hard run |
| C07 | Different swords | Rustfang, storm katana, soul saber; large vertical overhead slash | Combat + art | Matching vertical hitbox/visual, no repeat swing hit |
| C08 | Guns / laser cannon | Carbine, scattergun, rail rifle, limited-charge Oblivion cannon piercing foes and destructible props | Combat + lead | Weapon cycling, finite ammo/beam cost, piercing damage |
| C09 | Jet booster / armors | Temporary thruster boost and three armors with meaningful defense/resource tradeoffs | Combat + UI | Fuel finite; equipped armor actually changes play |
| C10 | Fire sorcery | Cinder Plague ignites living enemies for seconds and drains health | Combat + lead | Burn duration/DOT/resource cost |
| C11 | Magic / black magic / shadow | Soul drain, lightning, shadow veil (stealth), stasis, and a limited-use eclipse nova | Combat + lead | Distinct mechanics, cooldowns, finite resources |
| C12 | Enemy powers | Pyromancer, shade assassin, lightning sentinel alongside rifle, drone, and rocket foes | Combat + campaign | Different readable attacks and counters |
| C13 | Treasures / collectibles | Relics, soul caches, and item unlocks persist locally; menu catalogue shows discovered items | Combat + UI | Locked entries, collection save/load, equip limits |
| C14 | Destructible / interactive world | Breakable crates, explosive barrels, soul caches, levers, and gates; essential terrain stays navigable | Combat + campaign + lead | Destroy visual+collider, chained explosion, gate opens |
| C15 | Pace / urgency | Reactor countdown, incoming missile pressure, escalating chapter encounters, low-time audiovisual warning | Combat + lead | Timeout is recoverable through retry; story pauses timer |
| C16 | Overwhelming single-use powers | Limited-charge cannon and eclipse nova, earned from caches/story, consume charges | Combat + UI | Cannot spam or exploit retry |
| C17 | Improved pickup language | Named illustrated capsules, glyphs, item labels and portraits replace generic color-only squares | Art + lead | In-world pickup/readability check |
| C18 | Destructive SFX/VFX | Impact, thunder, burn, laser, debris, shock rings, directional lighting and brief camera punch | Art/audio + lead | FX decay, reduced-FX option, bounded pools |
| C19 | 3D feeling in2D | Perspective debris, layered light, volumetric-looking shafts and camera scale; gameplay stays2D | Lead | Render/hitbox separation and mobile cost |
| C20 | Camera / dialogue | Boss framing, story focus and controlled shake/zoom that respects reduced motion | Lead | No navigation/collision changes |
| C21 | Android layout | Landscape fullscreen, safe areas, semi-transparent multi-touch clusters, aim/interact/power controls | UI + lead | Compact touch checks and APK build |
| C22 | Testable APK | Offline native Android WebView package, signed debug APK and install instructions | Lead | Build, APK manifest/signature, runtime if emulator available |
| C23 | Repo / CI / commits | Preserve baseline, milestone commits, GitHub Android workflow with downloadable APK artifact | Lead | Repo history and CI result |
| C24 | Own ideas | Resonance resource, friend reward choices, soul-powered machinery, threat clock and relic lore | All | Coherent story, clear gameplay value |

## Integration sequence

1. Commit the known working prototype and this ledger.
2. Build combat/catalogue, campaign, and presentation on disjoint files.
3. Integrate renderer/UI with the simulation contract; commit the campaign systems.
4. Validate mechanics, legal traversal, hard mode, mobile controls, and story flows; fix root causes.
5. Build offline APK, verify it, run repository CI, commit final evidence/documentation.

All requested categories are included. Final documentation will distinguish implemented, tested, and hardware-unverified behavior. No feature is considered done solely because it appears in a menu.

## Delivery state — 12 October 2026

C01–C21 and C24 are integrated in the playable campaign. C22 has an actual signed debug APK: the offline Android build and lint pass, its signature verifies, and its packaged production assets match the web build. C23 has pushed baseline, Android-shell and integrated-campaign commits; GitHub's automated APK build passed and produced the delivered package. Final CI results and its checksum are recorded in `VALIDATION.md`.

There are 121 original textures; three swords, four guns, three armors, six spells and six relics; six enemy archetypes; three bosses; three friendly conversations with reward choices; five gates; and fifteen safe relay positions. The cannon pierces enemies, projectiles and destructible cover for 1,800 pixels. Bosses resist its damage and structural floors remain intact so the route remains playable. Cinder burns ordinary foes globally and active bosses for five seconds; dormant bosses remain encounter-gated.

All four legal campaign proofs succeeded after containment fixes: Ember 251.89s, Forge 263.50s, Inferno 273.99s, Extinction 289.14s with one legitimate retry. Every proof exercises three boss attack patterns per boss, all NPC rewards, and all gates. 64 simulation tests include finite resources, save validation, rare charges surviving reload, full-height gate containment and arena-limited boss damage. Dialogue reading, exploration and hit-stop add wall-clock time to these efficient runs; five minutes is the intended play target, not an imposed wait.

Own design additions tie the requested systems together: stolen souls power the military foundry; resonance fuels spells; friend choices alter the available build; armor trades defense against magic/fuel; relic lore exposes the engine's history; and the Regent's artillery and reactor deadline create pressure between safe relays. EMP fields and enemy fire provide temporary power-downs. Shadow Veil permits stealth, but attacking reveals the courier.

Physical Android performance, controller calibration, perceived audio mix and human difficulty tuning remain unverified. The delivery is a playable debug campaign, with automated proof of reachability and mechanics; it is not a store release.
