# Runeheart v0.5 module contracts

Plain JavaScript ES modules, Phaser 3.90 and Vite. Simulation uses top-left collider coordinates, positive y downward, pixels and seconds. DOM, artwork, camera and audio do not determine hits. `STEP=1/120`; rendering interpolates and drains bounded simulation events.

## Movement and input

`src/physics.js` exports `PHYSICS`, `createPlayer`, `stepPlayer`, `moveBody` and `overlaps`. Aether has a 28×60 body. Authored spawn/relay/portal coordinates retain the original 24×46 convention: `createWorld` converts x−2/y−14 to preserve center and feet. `createPlayer(x,y)` accepts actual collider coordinates. Solids are `{x,y,w,h,oneWay?}`; swept axis collision sets `grounded/wall/onOneWay` and stops velocity on exact contact.

Run speed is 320 px/s; gravity 1800 px/s²; held jump apex≈123 px; coyote time 0.10s; jump buffer 0.12s. Variable jump, one extra air jump, wall slide/jump and down+jump platform drop remain available. Dash runs at 620 px/s for 0.16s with 0.65s recharge. Jet fuel is 0…100, drains only during thrust and refills while grounded; armor/boost change consumption or thrust. Combat clamps the world ceiling/horizontal boundary and kills below `level.height+70`.

`stepPlayer(player,input,solids,dt)` mutates state and returns movement event names. `stepWorld` and `stepPlayer` require positive finite dt and subdivide values above 1/120; pressed actions apply once per caller frame. 30/60/120Hz caller inputs produce the same fixed simulation; 240Hz smaller-step motion is tested within pixel-scale tolerances.

`Controls(element,onPause,onRetry,onConfirm)` exposes `read(consume=true)` and `clear()`. Continuous fields: `move`, `jumpHeld`, `jet`, `shoot`, `aimUp`, `down`, `aimX/aimY`. Edge fields: `jumpPressed`, `dashPressed`, `slashPressed`, `spellPressed`, `interactPressed`, `cycleGunPressed`, `cycleSwordPressed`, `cycleSpellPressed`, `ultimatePressed`. Finite aim vectors above 0.25 magnitude direct the gun; explicit upward aim takes precedence.

Keyboard: A/D or arrows move; Space jumps; Shift dashes; J slashes; K fires; L/E thrusts; W/up aims up; S/down drops; Q casts; F interacts; C/V/X cycle equipment; Z spends Nova; Escape pauses; R retries. Gamepad A/B/X/RB/RT map to jump/dash/slash/thrust/fire; LT/Y/LB map to spell/interact/gun cycle, D-pad left/right to sword/spell cycle and right-stick click to Nova. Start pauses; modal gamepad controls confirm/navigate choices.

Touch has a floating analogue stick and four gameplay macros: Jump press jumps, hold 350ms thrusts; Attack pointerdown immediately requests a slash, hold 120ms fires; Dash presses directly; Power tap performs the context captured at press (interaction or spell), hold 450ms opens equipment. Separate Gear and Pause shortcuts clear active fingers. The stick has a 0.15 deadzone, fixed per-touch origin, immediate release stop and idle hide after 8s. Held buttons show progress/mode feedback. Pointer cancellation, blur, visibility loss and modals clear pending input; independent fingers retain ownership.

## Catalogue and progress

`src/catalog.js` exports `DIFFICULTIES/SWORDS/GUNS/ARMORS/SPELLS/RELICS/CATALOG`. Equipment categories are singular; relics are collection-only.

| Category | Stable IDs |
| --- | --- |
| 4 difficulties | ember, forge, inferno, extinction |
| 3 swords | rustfang, katana, saber |
| 5 guns | carbine, scatter, rail, rocket, cannon |
| 3 armors | courier, bulwark, wraith |
| 9 spells | cinder, siphon, thunder, veil, stasis, eclipse, clone, wolf, dragon |
| 6 relics | ember-heart, tide-glass, storm-seal, eclipse-fragment, regent-key, soul-core |

Difficulty changes wounds, enemy health, cadence, pressure, recovery and deadline without changing jump metrics. Rocket spends 4 resonance per shot; cannon/Nova spend finite charges. Equipment selection validates discoveries and IDs.

`src/progress.js` exports `WORLD_IDS`, `defaultProgress`, `validateProgress`, `loadProgress`, `saveProgress`, `newCampaignProgress`, `switchWorldProgress` and `restartWorldProgress`. Storage key remains `ash-signal-soulforge`, schema version 1 with `layoutVersion:2`. Global fields are `unlocked/equipped`, `collections` (an ID array) and `charges:{cannon,nova}`. Encounter fields are `worldId/checkpoint/claimed/defeatedBosses/openedGates/destroyedProps`; `worlds` stores per-world snapshots and `completedWorlds` records victories.

World switching preserves global discoveries and spent charges while swapping encounter snapshots. Restart resets only the selected world's encounters/completion and finite charges; fresh campaign resets all encounters/snapshots/completions/charges while retaining discoveries. `loadProgress` migrates version 1 records lacking a world ID or current layout version by keeping discoveries and resetting old encounters; standalone validation retains compatibility semantics. Corrupt/unavailable storage returns starters. Claims prevent reward/charge duplication through retries or world switches.

## Combat and authoritative geometry

`src/combat.js` exports `STEP`, `createWorld`, `retryWorld`, `stepWorld`, `equipItem`, `cycleItem`, `rewardPlayer`, `castSpell`, `interact`, `advanceStory`, `say`, `damagePlayer`, `spawnProjectile`, `segmentHit`, `weaponOrigin`, `projectileAim`, `beamHit` and `hazardState`.

`createWorld(checkpoint=0,{worldId,difficulty,progress,previous,level?})` defaults to Soulforge. Optional `level` injects an authored fixture; retry preserves that level, selected world, difficulty, claims, spent charges and threat clock. Deadline death restores the scaled deadline. Gameplay always reads `world.level`. `world.boss` aliases the final boss; `activeBoss` identifies the nearby active arena. Victory requires every boss dead and contact with the exit. Story and terminal states stop simulation; main pauses stepping for menus.

World owns player/rules/progress/collections, solids/staticSolids/movingPlatforms/crumble, enemies/bosses/allies/enemySummons/enemyPortals, props/gates/npcs/pickups, projectiles, checkpoint/time/timeLeft/status/events/dialogue/story/hitstop and pressure warning. `status` is playing/dead/won. Invalid, unaffordable or repeated actions fail safely.

`weaponOrigin(entity,slot='gun')` returns the physical/render source `{x,y}`. Aether's hand is center±16, feet−41; muzzle is13px along its aim from the hand. Echo uses these ratios at `h/60`. Crawler60×41 mouth is center±30,y+6; Raider34×45 muzzle center±30,y+22; Mecha muzzle center±56*h/71,y+23*h/71. Wyrm112×86 mouth/core is center±100,feet−72; shoulder launcher center±28,feet−100. Generic core is center,y+h*0.35. `blade/hand/core/gun/rocket/mouth` slots and `entity.weaponSlot/aimAngle` are authoritative; artwork/overlays must match them.

`projectileAim(entity,target,slot,spread=0,speed=340)` returns origin/angle/velocity aimed at target center. Wyrm mouth fire is constrained to forward±0.75rad. Beams/telegraphs carry `{x0,y0,x1,y1,width,tint,heavy,angle,x,y,w,h}`; damage uses the finite segment plus width, while the rectangle is compatibility/render data. Boss targets lock during charge but their source refreshes each tick through movement/leaps/blinks. Boss beams have≤1400px arena-limited range; cannon reaches1800px.

Sword taps buffer 0.12s through cooldown. `combo/slashMode` alternates horizontal→vertical→finisher; `slashFacing` locks the active cut independently of locomotion. `slashBox` is the actual directed attack rectangle. Each slash hits a target once, respects blocking solids and knocks/staggers ordinary foes; vertical swings lift and finishers push harder. Dash creates a swept sword cut, clears the parry window and never reflects projectiles. Normal parry lasts 0.10s and reflects at most 2 light shots, restoring 5 capped resonance per reflection. Heavy boss rockets/beams cannot be reflected. Skybreaker suppresses ordinary sentinel ward for 3s (`wardDisabled/wardRestore/weakened`), then restores it if alive; conduit protection remains.

Ember Heart adds 2s burn to a finisher; first Tide Glass discovery grants 20 shield; Storm Seal dash kills return 15 capped fuel. Relic gates accept `requiresRelic` or `requiresRelics`; all listed IDs must be in `world.collections`. They open through discovery and persist; boss-linked conditions still require that boss. Travel portals may use the same rune requirements.

Projectiles occupy exactly 96 reusable slots and carry owner/position/velocity/kind/tint/angle/heavy/reflectable/damage/life/pierce/hitIds/sourceId. Swept segments handle fast collision. Boss-source shots expire outside the arena or after its death. Events are capped at 160 `{type,x,y,...}` entries, drained by main. Important details: `enemywindup:{enemyId,attack,time}`, `enemyshot:{weaponSlot,angle}`, `gate:{gateId,rune?}`, `bossdead:{bossId}`, `cannon:{beam,tint}`, `spell:{spell,radius,tint}`. DOT feedback is bounded separately from damage.

## Villains, bosses and summons

Ground villains use actual supporting spans or explicit `leashX/leashW`, not narrow legacy patrol hints. Crawler pursues and warns a bite/lunge; Raider pursues vertically and strafes/retreats; Mecha advances or backs off before an aimed beam; mage retreats/jumps and casts spread fire; shade pursues and warns a rush. Cover triggers real jumps; ledges and leashes bound movement. Runtime fields include `intent`, `action`, `windup/attackTime/dashTime/stagger`, facing, weapon slot and moving-origin telegraph. Rendering must distinguish locomotion, warning, attack and hurt states.

Bosses pursue/retreat through physics inside their arena. Families Warden/Hex/Regent have different volleys, beams, leaps and portals; enrage begins below 35% HP with short taunts/emotion. Standard charge warns≥0.85s, Hex≥0.9s and attack2 beams≥1.1s. Charge resists 65% ranged damage (`guarding`); recovery (`recovering`) gives 25% extra melee damage. Transform is protected. Hex/Regent blink exposes a safe exit≥0.7s before movement and grants arrival grace/recovery; inactive or distant bosses do not attack.

Regent warns transformation for 0.9s, cancels attacks and preserves center/feet while changing 112×132 to 112×86 (`form:ground/transforming/flying`, `visualFamily:wyrm`). Its base derives from authored floor/feet; flight hovers 45px with 16px bob and≤130px/s vertical speed. Mouth/launcher sources remain anatomical. Undertow warns 0.7s then pushes for 1.2s via `powerPulse`; Infernal shots burn; Overload accelerates rockets/adds a burst/shortens recovery; Mirror exposes `mirrorExit` before a delayed shade. These fields use the current room floor.

Allies cap at 3; enemy summons at 12. Summons use arrive→attack→expire with 0.7s harmless arrival and 0.35s expiry, bounded lifetime and real projectiles/collision. Clone 32×40 flies/fires for 10s, wolf pursues/bites for 8s, dragon flies/fires for 7s. Enemy portals warn 1.1s before queuing arrivals; `requiresClaim` can bind them to a story choice. Pools and lifetimes prevent accumulating actors.

`interact` chooses a nearby NPC, lever/valve/conduit or travel portal. Story is `{npcId,speaker,portrait,lines:[{speaker,text}],choices:[{id,label,reward,cost?,effect?}],index}`. `advanceStory(world,choiceId?)` advances lines or applies one validated, affordable, nonlethal choice. Veil's pact spends 25HP exactly once and starts its warned ambush. Travel requires explicit interaction and a finite valid exit; levers/conduits open linked gates or expose boss weakness.

## Authored worlds and environment

`src/level.js` exports `LEVEL/LEVELS/WORLD_LIST/getLevel/createEnemies`. `src/rune-worlds.js` builds the current five authored realms: soulforge/tide/pyre/neon/veil. `src/legacy-level.js` and `src/worlds.js` retain old maps for isolated regression fixtures, not playable defaults. Current worlds are 18770px wide, 1440px high with varied floor elevation, 11 named rooms, three 900/1200/1800HP boss bases and 900s Forge threat windows. Bosses provide `floorY`; code must not assume y610.

Levels own solids/hazards/route/checkpoints/zones/rooms/landmarks/bosses/props/gates/npcs/pickups and dynamic environment arrays. Route markers use player-center x/feet y plus optional `bossId/npcId/leverId/pickupId`. Relays use authored 24×46 top-left `{x,y,label}`. Ground extends to the lower world boundary; closed seal fields extend from y0 to their supporting floor. Optional vaults/return portals supplement the mandatory rune route.

Currents `{x,y,w,h,vx,vy}` apply swept displacement; moving platforms `{id,x,y,w,h,axis,distance,period,phase,kind,oneWay?}` oscillate/carry riders; crumble `{solidId,delay,restore}` cracks, removes and restores its solid safely. Travel portals use `{id,x,y,w,h,to:{x,y},requiresRelic?,requiresRelics?}`. Periodic laser/fire/steam/spikes/EMP use `period/onTime/phase`; `hazardState` returns active/warning/off, with timed spikes warning0.35s before activation. Permanent spikes stay active; EMP temporarily disables dash/thrust.

Destructible crate/barrel/cache contents grant validated rewards once; barrels chain and terrain remains intact. Props may include `hp/collidable/contents/gateId/bossId`. Pickup types: health/fuel/rapid/shield/boost/mana/weapon/sword/armor/spell/treasure/cannon/nova, with `itemId/value` where applicable. See `LEVEL.md` for geometry and `REBUILD.md` for acceptance.

## Rendering, UI and Android

`src/runeheart-art.js` exports preload/create artwork, `RUNEHEART_THEMES`, `createRuneheartParallax` and `runeheartFrameKey`. The bundled CC0 Gothicvania pack uses real GIF animation frames and full-height panoramas; `public/runeheart/manifest.json` records frames/provenance/animations. Legacy reference items/effects and Mecha/Wyrm anatomy remain combined per-frame using `atlasKey`. The Runeheart manifest currently publishes 184 frames; exact assets/licenses belong in `ASSETS.md`.

Frames provide width/height/anchor/body and optional sockets. Hero native body 14×30 renders at 2× into the 28×60 collider; canonical hand/muzzle match the unchanged simulation points. `setReference` scales by actor height/trimmed-body height, aligns body center/feet and mirrors noncentral anchors correctly. Weapon overlays use the same interpolated hero body and authoritative muzzle; slash effects follow `slashBox/slashFacing`. Beams draw real segments. Death freezes terminal action effects rather than continuing attacks. Procedural fallback effects never supply simulation damage.

`src/camera.js` exports `cameraTarget/followCamera`: velocity look-ahead, vertical following, bounded combat zoom0.72…1 and teleport settling. Zoom never enlarges beyond1 for attacks; extreme ascent prioritizes the hero with edge threat markers. `src/terrain.js` builds opaque terrain from the exact collision rectangle, with visible top at collider y; scenic backgrounds/decorations do not create floors.

`createCampaignUI(catalog,callbacks)` exposes open/close/refresh/renderHUD/renderStory and validated equipment/story callbacks. HUD shows resources, rune objectives and boss guard/recovery. Power context and held-mode feedback come from live state. `Sound` starts after interaction, accepts full events and caps voices at 24.

Main owns lifecycle, interpolation, camera, effects and event/UI integration. Desktop canvas 960×540; coarse-pointer canvas 960×adaptive 240…540 above a 164px landscape gutter (286px portrait), plus safe areas. Floating stick 124px; Jump/Attack 100px, Dash 92px, Power 80px and Gear/Pause 48px. Native dialogs suppress gameplay. DEV-only `window.__ASH` provides QA hooks; production retains native Back handling without that development API.

Android bundles the same web simulation through WebViewAssetLoader. `npm run android:sync` copies the build to app assets. Application ID stays `com.meglodivna.ashsignal`; SDK36/JDK17/API24+, landscape, DOM storage and lifecycle/Back handling; versionCode 5/versionName 0.5.0-runeheart. Preserve the release signing certificate for upgrades; no Internet permission is needed.

Validation artifacts distinguish pure unit checks, legal spawn-to-exit simulation traces, browser captures and device evidence. The continuous harness records source hashes, actual wall-clock duration, separate simulated seconds, every failed round and repeated legal campaigns. It cannot establish physical-phone comfort or performance. Final counts and delivery receipts live in `VALIDATION.md` and `artifacts/`; prior Revamp results are not Runeheart acceptance evidence.
