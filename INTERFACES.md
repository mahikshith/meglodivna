# Fractured Realms v0.3 module contracts

Plain JavaScript ES modules, Phaser 3.90 and Vite. Collider coordinates use top-left `x/y`, positive y downward, pixels and seconds. Simulation runs at `STEP = 1/120` independently of DOM/rendering; the renderer interpolates and drains simulation events.

## Movement and controls

`src/physics.js` exports `PHYSICS`, `createPlayer(x,y)`, `stepPlayer(player,input,solids,dt)`, `overlaps(a,b)` and `moveBody(body,solids,dt)`. Bodies carry `x,y,w,h,vx,vy`; the courier collider is 24 × 46. Player state includes `facing` ±1, `grounded`, `wall` ±1/0, `onOneWay`, `fuel` 0–100, `jumps`, dash/coyote/buffer/drop timers, `jetActive` and `state`. `stepPlayer` mutates the body and returns movement event names. `moveBody` resolves swept rectangle and one-way movement with contact state. Both require finite positive `dt`.

Run speed is 320 px/s, gravity 1800 px/s², held jump apex about 123 pixels, coyote time 0.10s and jump buffer 0.12s. Variable jump, double jump, wall slide/jump and down+jump platform drop are supported. Dash is 620 px/s for 0.16s with 0.65s recharge. Jet fuel is finite; boost/armor modify lift or drain. Solids are `{x,y,w,h,oneWay?}`. Combat supplies live props/gates/platforms through `world.solids`, clamps the ceiling at y0 and bounds horizontal movement.

`Controls(element,onPause,onRetry,onConfirm)` in `src/input.js` exposes `read(consume=true)` and `clear()`:

- Continuous: `move` -1…1, `jumpHeld`, `jet`, `shoot`, `aimUp`, `down`, `aimX`, `aimY`.
- Edges: `jumpPressed`, `dashPressed`, `slashPressed`, `spellPressed`, `interactPressed`, `cycleGunPressed`, `cycleSwordPressed`, `cycleSpellPressed`, `ultimatePressed`.

Keyboard: A/D or arrows move; Space jump; Shift dash; J slash; K fire; L/E thrust; W/up aim upward; S/down drop; Q spell; F interact; C/V/X cycle gun/sword/spell; Z nova; Escape pause; R retry. Gamepad A/B/X/RB/RT are jump/dash/slash/thrust/fire. LT/Y/LB/D-pad-left/D-pad-right/right-stick-click are spell/interact/gun/sword/spell-cycle/nova; Start pauses. Left stick supplies movement and aim. A confirms focused dialog controls; D-pad left/right navigates them.

Touch uses an analogue joystick and four gesture buttons: **Jump** press jumps, holding 350ms also thrusts; **Attack** release before 180ms slashes, holding 180ms fires; **Dash** directly dashes; **Power** release before 450ms casts or performs a nearby contextual interaction, holding 450ms opens the paused equipment palette. Separate pause remains available. Pointer ownership supports simultaneous touches and cancellation. The radial stick has a 0.15 deadzone; finite aim vectors with magnitude >0.25 set the gun angle, with explicit `aimUp` taking precedence. Down+jump drops through one-way platforms. Modal dialogs suppress gameplay input; blur/visibility loss clears held state and pauses.

## Catalogue and persistent progress

`src/catalog.js` exports `DIFFICULTIES`, `SWORDS`, `GUNS`, `ARMORS`, `SPELLS`, `RELICS` and `CATALOG`. Equipment categories are singular `sword`, `gun`, `armor`, `spell`; `relic` is collection-only. There are 26 equipment/spell/relic definitions and four difficulty modes:

| Category | Count | Stable IDs |
| --- | --- | --- |
| Difficulty | 4 | ember, forge, inferno, extinction |
| Sword | 3 | rustfang, katana, saber |
| Gun | 5 | carbine, scatter, rail, rocket, cannon |
| Armor | 3 | courier, bulwark, wraith |
| Spell | 9 | cinder, siphon, thunder, veil, stasis, eclipse, clone, wolf, dragon |
| Relic | 6 | ember-heart, tide-glass, storm-seal, eclipse-fragment, regent-key, soul-core |

Definitions include `id,name,description,tint` plus actual damage/cooldown/range/resource/difficulty values. Difficulty scales damage, enemy health, cadence, pressure, recovery and deadline without changing core jump metrics. Rocket consumes four resonance per shot; cannon and Eclipse Nova consume finite earned charges. Equipment must be discovered before selection.

`src/progress.js` exports `WORLD_IDS`, `defaultProgress`, `validateProgress`, `loadProgress`, `saveProgress`, `newCampaignProgress`, `switchWorldProgress(raw,id)` and `restartWorldProgress(raw,id)`. Storage key remains `ash-signal-soulforge`, schema version 1. State contains global `unlocked/equipped`, `collections`, `charges:{cannon,nova}`; active `worldId`, `checkpoint`, `claimed`, `defeatedBosses`, `openedGates`, `destroyedProps`; `worlds` encounter snapshots and `completedWorlds`.

Switching worlds snapshots only the active encounter/checkpoint fields and restores the destination snapshot. Discoveries/equipment and consumed finite charges remain global. Restarting a selected world resets only its encounters/checkpoint/completion entry and clears finite charges; other world snapshots survive. A fresh campaign preserves discoveries/equipment/relics while resetting all encounters, snapshots, completions and charges. Victory marks the selected world complete.

Validation filters known catalogue/world IDs and bounds saved values. Corrupt or unavailable storage returns starters. **Only `loadProgress` migrates v0.2 saves:** version-1 records lacking `worldId` retain discoveries/equipment/relics but reset old encounters, checkpoint and charges for expanded Soulforge. Standalone `validateProgress` keeps compatibility semantics; modern saves retain earned encounter state on reload.

## Simulation and authoritative weapon geometry

`src/combat.js` exports `STEP`, `createWorld(checkpoint=0,options={})`, `retryWorld`, `equipItem`, `cycleItem`, `say`, `spawnProjectile`, `segmentHit`, `weaponOrigin`, `projectileAim`, `beamHit`, `damagePlayer`, `hazardState`, `rewardPlayer`, `interact`, `advanceStory`, `castSpell` and `stepWorld(world,input={},dt=STEP)`.

Options accept `worldId`, `difficulty`, validated `progress` and `previous`. Soulforge is the default. All encounter geometry comes from `world.level`; retry preserves the selected world, difficulty, claims, spent resources, defeated encounters and elapsed threat clock. Deadline death grants a fresh scaled deadline. Invalid, unavailable, unaffordable and repeated reward/equipment/story actions fail safely.

World owns `worldId/level`, `player`, `difficulty/rules`, `progress`, `collections/unlocks` aliases, `staticSolids/solids`, `movingPlatforms/crumble`, `enemies/bosses`, `allies/enemySummons/enemyPortals`, `props/gates/npcs/pickups`, `projectiles`, `checkpoint`, `time/timeLeft`, `status`, `events`, `dialogue/story`, `hitstop` and `missileWarning:{y,time}|null`. Status is playing/dead/won. `world.boss` aliases the final boss; `activeBoss` is the active nearby arena encounter. Victory requires every boss dead. Story, terminal states and paused menus stop simulation stepping.

`weaponOrigin(entity,slot='gun')` is the single physical/render source. Slots are `core`, `hand`, `blade`, `gun`, `rocket`; it returns `{x,y}` from collider geometry and facing. Core is `(centerX,y+h*.35)`; hand is `(centerX+facing*5,y+h*.42)`. Player gun muzzle rotates the scaled handle-to-muzzle offset `(34.8,-2.4)` around the hand using `aimAngle` or upward aim. Foe guns/launchers use directional muzzle offsets. `projectileAim(entity,target,slot,spread=0,speed=340)` returns `{x,y,angle,vx,vy}` aimed at target center. Presentation uses `entity.weaponSlot/aimAngle` and these helpers, rather than inferring an attack's weapon.

Beams/telegraphs carry `{x0,y0,x1,y1,width,tint,heavy,angle,x,y,w,h}`. Endpoints and width determine damage via `beamHit`; `x/y/w/h` are compatibility/render bounds only. Boss beam angles are limited to ±0.75 radians around facing and range to 1400 pixels/arena bounds. Charge targets stay locked while origins refresh from the current core every tick, including leaps and blinks. Player cannon follows actual muzzle/aim and reaches 1800 pixels.

Player adds health/resonance maxima, equipment, finite charges, buff/impairment/cooldown timers, `combo/slashMode`, `slashBox`, `parryTime/parries`, `beam/laserTime`. Melee alternates horizontal, vertical and finisher; dash creates a swept damaging sword lunge. Each swing hits a target once. A 0.10s parry window reflects at most two **light** projectiles per swing. Borrowed Spark grants five capped resonance per successful reflection. Heavy boss rockets and beams cannot be reflected or refunded. Skybreaker sets ordinary sentinel `wardDisabled/weakened` to three seconds, temporarily removes its saved shield and restores it if alive; boss conduit protection remains intact.

Projectiles use a fixed 96-entry pool and carry position/velocity, `owner`, `missile/kind/tint/angle`, `heavy/reflectable`, `damage/life/pierce`, `hitIds`, `sourceId`. Segment collision catches fast shots; enemy boss-source projectiles deactivate outside their arena or after source death. Pending events are capped at 160 `{type,x,y,...details}` records. Main drains them; `Sound.play` accepts the whole event. Key event details include spell `{spell,radius,tint}`, cannon `{beam,tint}`, enemyshot `{weaponSlot,angle}`, bossdead `{bossId}`, gate `{gateId}`, debris `{kind}`, parry, burn, summon/portal warnings/arrivals/expiry, currentwarning, storyreward and equip.

## Actors, powers, summons and interactions

Guard/shade/mage/sentinel actors pursue or retreat, aim directionally, respect patrol limits/ledges and can jump obstacles. Drones patrol vertically/horizontally; turrets launch missiles. Sentinel rays, mage fire and shade dashes use distinct damage mechanics. Foes/bosses carry burn, slow, flash, shields and weakened/emotion state. Shield resistance and timed weakness affect actual damage; shield-gate/conduit locks resist until opened.

Boss families are Warden, Hex and Regent with charge/attack/recovery, physics movement, pursuit/retreat, leaps or hovering, enrage and brief taunts. Hex/Regent can announce `portalSource` and `portalExit:{x,y,time}` before a delayed safe blink; arrival grants `arrivalGrace` and recovery. Bosses cannot advance attacks or harm the player while far outside the authored arena.

World powers modify those families: **Undertow** exposes `powerPulse:{x,y,w,h,vx,vy,time,phase}` with 0.7s warning then a 1.2s actual current; **Infernal** projectiles apply timed burn; **Overload** increases rocket speed, adds a burst and shortens recovery; **Mirror** announces `mirrorExit:{x,y,time}` before an extra delayed shade summon. Rendering reads these simulation fields for warnings.

Allies are capped at three; enemy summons at twelve. Summon records carry `type`, `phase` arrive/attack/expire, `time/life`, position/body, facing and attack/cooldown state. Arrival lasts 0.7s with no hidden damage; expiry fades for 0.35s then removes the actor. Clone fires a rifle for ten seconds, wolf physically pursues/bites for eight, dragon flies and fires for seven. Enemy portals cycle idle → 1.1s warning → 0.7s arrival → bounded attacker lifetime → expiry; optional `requiresClaim` gates activation. Portal attacks and summoned projectiles reuse existing bounded collision systems.

`interact` selects nearby NPCs, levers/conduits/valves or travel portals. Story is `{npcId,speaker,portrait,lines:[{speaker,text}],choices:[{id,label,reward,cost?,effect?}],index}`. `advanceStory(world,choiceId?)` advances dialogue or grants one validated reward. Costs apply exactly once and cannot be lethal/unaffordable. Veil's pact claims its choice, spends the advertised 25 health and starts its warned ambush portal. Travel portals announce finite exits and move only through explicit interaction; conduits/valves open linked gates or expose boss weakness.

## World data and environmental physics

`src/level.js` exports `LEVEL`, `LEVELS`, `WORLD_LIST`, `getLevel(id)` and `createEnemies(level=LEVEL)`. `src/worlds.js` builds deterministic authored extensions/worlds. IDs are soulforge/tide/pyre/neon/veil. Soulforge width is 84,400 pixels; the other four are 83,600. All are 720 high with ground y610, spawn `{x:100,y:560}` and a Forge base threat window of 620 seconds, scaled by difficulty. `LEVEL` is Soulforge; `WORLD_LIST` supplies menu metadata `{id,name,description,width,timeLimit,tint}`.

Each level owns `solids`, `hazards`, `route`, `checkpoints`, `zones`, `bosses`, `props`, `gates`, `npcs`, `pickups`, `currents`, `movingPlatforms`, `crumble`, `portals` and `enemyPortals`. Routes contain ordered player-center/feet waypoints `{id,x,y,verb}`; safe relays are `{x,y,label}`. Worlds use three boss families with prefixed IDs except original Soulforge IDs. Base health is 1200/1600/2600 in Soulforge and 1600/2000/3200 elsewhere before difficulty scaling. Mandatory boss gates span y0…610.

Environment schemas: currents `{x,y,w,h,vx,vy}` apply swept displacement; moving platforms `{id,x,y,w,h,axis,distance,period,phase,kind}` oscillate and carry grounded riders; crumble `{solidId,delay,restore}` cracks after occupancy, removes its solid and restores safely; travel portals `{id,x,y,w,h,to:{x,y},oneWay?}` expose their exits. Timed laser/fire/steam/spikes/EMP use rectangles and optional `period/onTime/phase`. `hazardState` returns active/warning/off; timed spikes warn in the last 0.35s before rising, while permanent pit spikes remain active. EMP disables jet/dash temporarily.

Props include crate/barrel/cache/lever/conduit/valve with identity/geometry and optional `hp,collidable,contents,gateId`. Destruction/explosions award contents once and update persistent claims. Essential terrain remains intact. Pickup types are health/fuel/rapid/shield/boost/mana/weapon/sword/armor/spell/treasure/cannon/nova with optional `itemId/value`. NPC/choice/gate IDs and all rewards are authored and validated per world. See `LEVEL.md` for route metrics and `PHASE3.md` for the final feature ledger.

## Art, UI, audio and mobile boundary

`src/art.js` exports `PALETTE`, `WORLD_ART` and `createArtTextures(scene)`. It creates/reuses 347 deterministic original pixel textures at load time and returns `{key,width,height,anchor:{x,y},notes}`. Source RGBA allocation is 51,931,904 bytes / 49.53MiB; GPU copies and renderer overhead are additional. `ASSETS.md` and the manifest define exact keys/anchors; art never defines colliders.

Courier frames are 64 × 72 with feet 32/68; enlarged cut/lunge frames are 128 × 160 with feet 64/152 and unchanged body offsets. Warden is 128 × 144, feet 64/138; Hex/Regent 160 × 192, feet 80/184. Weapon textures are 80 × 40, handle16/24 and muzzle74/20 at scale0.6. Pose families include horizontal/overhead/finisher/lunge, run/attack/hurt actors, shields, summoning circles/portals, wolf/dragon, projectile kinds, trap frames, world terrain/backgrounds and 26 catalogue icons. Presentation anchors these to physical feet/muzzles/cores and reads simulation phases rather than producing damage itself.

`createCampaignUI(catalog,callbacks)` returns `open/close/refresh/renderHUD/renderStory`; callbacks are `onEquip`, `onOpen`, `onClose`, `onStoryNext`, `onStoryChoice`, `iconUrl`. UI reads validated progress and asks main to mutate simulation. Native dialogs own focus. `Sound` exposes `start`, `play(eventOrType,detail?)`, `update(active,intense)`, `setMuted`, `setReducedFX`; Web Audio begins after user interaction and caps voices at24.

`src/main.js` owns lifecycle, Phaser rendering/interpolation, camera, particles/weather, overlays, event consumption and UI callbacks. Desktop renders 960 × 540. Coarse-pointer mobile renders full width960 with adaptive height280…540 above a reserved112px control gutter; DOM scaling and safe-area padding preserve the touch layout. Reduced effects limit motion/flashes. DEV-only `window.__ASH` exposes controlled QA hooks; production retains `window.ashBack` for native Back handling.

`npm run android:sync` builds web assets and copies them to `android/app/src/main/assets/public/`. Android loads bundled files through AndroidX WebViewAssetLoader at `https://appassets.androidplatform.net/assets/public/index.html`, enables DOM storage, requests landscape and forwards pause/Back. Application ID is `com.meglodivna.ashsignal`; API24+, SDK36, JDK17; **versionCode3**, **versionName0.3.0-fractured-realms**. Debug APKs use a debug signing key; runtime assets are bundled with no Internet permission. Android hosts the same simulation rather than supplying a second engine.

Validation boundary: 100 Node tests cover simulation/data/input/progress; all eight final legal combat proofs won. Browser/deep harness and APK build/packaging evidence are maintained by the lead in `artifacts/`; documentation edits do not replace device or visual validation.
