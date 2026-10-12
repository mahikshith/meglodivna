# Soulforge module contracts

Plain JavaScript ES modules, Phaser 3.90 and Vite. Coordinates use collider top-left `x/y`, positive y downward; distances are pixels and durations are seconds. `STEP = 1/120`. Physics/combat are independent of DOM and renderer, so Node tests and recorded legal inputs can drive them directly.

## Movement and input

`src/physics.js` exports `PHYSICS`, `createPlayer(x,y)`, `stepPlayer(player,input,solids,dt)`, `overlaps(a,b)` and `moveBody(body,solids,dt)`. Body fields are `x,y,w,h,vx,vy`; player collider is 24 × 46. Additional movement state includes `facing` ±1, `grounded`, `wall` ±1/0, `onOneWay`, `fuel` 0–100, `jumps`, dash/coyote/buffer/drop timers, `jetActive` and `state`. `stepPlayer` mutates the body and returns movement event names; `moveBody` resolves rectangle/one-way movement and updates contact state. Both require a positive finite timestep.

Current values: run 320 px/s, gravity 1800 px/s², held jump about 123 pixels, coyote 0.10s, buffer 0.12s, dash 620 px/s for 0.16s with 0.65s recharge. Jet fuel remains finite; `boost` and armor `fuelRate` change thrust/drain without changing the core collider. Solids have `{x,y,w,h,oneWay?}`. Combat supplies `world.solids`, including live collidable props and closed gates, and bounds the player to the campaign.

`Controls(element,onPause,onRetry,onConfirm)` in `src/input.js` exposes `read(consume=true)` and `clear()`. Inputs are:

- Continuous: `move` -1…1, `jumpHeld`, `jet`, `shoot`, `aimUp`, `down`.
- Edges: `jumpPressed`, `dashPressed`, `slashPressed`, `spellPressed`, `interactPressed`, `cycleGunPressed`, `cycleSwordPressed`, `cycleSpellPressed`, `ultimatePressed`.

New keyboard edges are Q/F/C/V/X/Z. Gamepad LT/Y/LB/D-pad-left/D-pad-right/right-stick-click map to them respectively; A/B/X/RB/RT retain jump/dash/slash/thrust/fire. `down` drops through one-way platforms when combined with jump; firing supports facing direction or upward aim. Touch `data-action` names are left/right/jump/slash/shoot/dash/jet/aimUp/down/spell/interact/cycleGun/cycleSword/cycleSpell/ultimate. Pointer IDs preserve simultaneous touches. Open native dialogs suppress game input; gamepad A confirms focused dialog controls and D-pad left/right navigates them. Blur/visibility loss clears held state and requests pause.

## Catalogue and progress

`src/catalog.js` exports `DIFFICULTIES`, `SWORDS`, `GUNS`, `ARMORS`, `SPELLS`, `RELICS` and `CATALOG`. Equipment categories are singular `sword`, `gun`, `armor`, `spell`; `relic` is catalogue-only. Stable IDs:

| Category | IDs |
| --- | --- |
| Difficulty | ember, forge, inferno, extinction |
| Sword | rustfang, katana, saber |
| Gun | carbine, scatter, rail, cannon |
| Armor | courier, bulwark, wraith |
| Spell | cinder, siphon, thunder, veil, stasis, eclipse |
| Relic | ember-heart, tide-glass, storm-seal, eclipse-fragment, regent-key, soul-core |

Definitions contain `id,name,description,tint` plus relevant damage, cooldown, range, resource or difficulty values. `src/progress.js` exports `defaultProgress`, `validateProgress`, `loadProgress`, `saveProgress` and `newCampaignProgress`. Storage key: `ash-signal-soulforge`. Version-1 state contains `unlocked` and `equipped` by equipment category, `collections`, `claimed`, `defeatedBosses`, `openedGates`, `destroyedProps`, `charges:{cannon,nova}` and `checkpoint`. Validation filters known gear/relic IDs and bounded saved values; corrupt/unavailable storage returns starter progress. A new campaign preserves discoveries/equipment/relics while resetting encounter claims, charges and relay position.

## World and combat

`src/combat.js` exports `STEP`, `createWorld(checkpoint=0,options={})`, `retryWorld(world)`, `equipItem(world,category,id)`, `cycleItem`, `say`, `spawnProjectile`, `segmentHit`, `damagePlayer`, `hazardState`, `rewardPlayer`, `interact`, `advanceStory`, `castSpell` and `stepWorld(world,input={},dt=STEP)`.

`options` accepts `difficulty`, validated `progress` and `previous` world state. `createWorld` returns independent encounter objects; `retryWorld` retains difficulty, discoveries, claims, charges, defeated bosses/gates and elapsed campaign state. Deadline death grants a fresh deadline on retry. Equip/cast/reward/story functions reject invalid, unavailable or repeated actions instead of granting resources. `segmentHit` returns a boolean for a swept segment/rectangle test; `hazardState` returns active/warning/off.

World contains `player`, `difficulty/rules`, `progress`, `collections/unlocks` aliases, `solids`, `enemies`, `bosses`, `props`, `gates`, `npcs`, `pickups`, `projectiles`, `dynamicHazards`, `checkpoint`, `time/timeLeft`, `status`, `events`, `dialogue`, `story`, `hitstop` and `missileWarning:{y,time}|null`. `world.boss` aliases the final Regent; `activeBoss` identifies the current arena encounter. Status is playing/dead/won.

Combat adds player `hp/maxHp`, `mana/maxMana`, equipment IDs, `charges:{cannon,nova}`, buff/impairment/stealth/cooldown timers, `slashBox`, `beam` and `laserTime`. Overhead boxes are 90 × 135, 96 × 145 or 100 × 155 according to sword. Each swing can hit a target once; projectile reflection uses the active melee region. Cannon/effects use `{x,y,w,h,tint}` beams. Enemy/boss runtime state includes burn, slow, flash, attacks and telegraphs; bosses also carry active/phase/dead state. Near-player operations cull distant objects while ongoing resource/effect timers remain simulation-owned.

The projectile pool has 96 reusable entries; active shots carry position/velocity, owner, missile/kind/tint, damage, life, pierce, hit IDs and source ID. Events are bounded to 160 pending entries and contain `{type,x,y,...details}`. Presentation drains them after each rendered update. Important additions include spell `{spell,radius,tint}`, thunder, burn, cannon `{beam,tint}`, debris `{kind}`, gate `{gateId}`, bossdead `{bossId}`, missilewarning, story, storyreward and equip. `Sound.play` accepts the full event object.

`interact` opens the nearest survivor/lever interaction. Story is `{npcId,speaker,portrait,lines:[{speaker,text}],choices:[{id,label,reward}],index}`. `advanceStory(world,choiceId?)` advances valid lines or grants a once-only final choice. `stepWorld` stops during story, death or victory; the renderer also stops stepping in pause/catalogue menus. No visual effect or dialogue handler changes movement geometry.

## Campaign data

`src/level.js` exports `LEVEL` and `createEnemies()`. LEVEL is 65,000 × 720, spawn `{x:100,y:560}`, base ground y610 and exit `{x:64840,y:540,w:50,h:70}`. It includes authored `solids`, `hazards`, `route`, `checkpoints`, `zones`, `bosses`, `props`, `gates`, `npcs` and `pickups`. `LEVEL.boss` aliases the final boss. See `LEVEL.md` for route metrics; checkpoints and mandatory landing surfaces are tested against actual physics.

Zone records are `{x,label,subtitle,biome,tint,sky}`. Biome IDs/starts are snow/0, ruins/10800, furnace/21600, storm/32400, eclipse/43200 and reactor/54000. Enemy types are guard/drone/turret/mage/shade/sentinel with identity, geometry, health, facing, patrol limits and power. Boss records add id/name/type, trigger/arena bounds and base health: Warden 1200, Hex 1600, Regent 2600; difficulty scales health. Safe relays are `{x,y,label}`.

Hazards are laser/fire/spikes/emp rectangles with optional period/onTime/phase. Props are crate/barrel/cache/lever with id/geometry, optional hp/collidable/contents/gateId. Gates reference either bossId or leverId; closed gate forcefields span y0…610. Essential static floors are never destroyed. Pickups use health/fuel/rapid/shield/boost/mana/weapon/sword/armor/spell/treasure/cannon/nova with optional itemId/value. NPCs use stable mira/orren/vesper IDs, portrait keys, lines and validated reward choices.

## Art, DOM UI and sound

`src/art.js` exports `PALETTE` and `createArtTextures(scene)`. The latter creates/reuses 121 original crisp Canvas textures and returns `{key,width,height,anchor:{x,y},notes}` entries. Source pixels are generated during loading; no procedural art drawing runs per gameplay frame. Dimensions/anchors are authoritative in `ASSETS.md` and the exported manifest.

Courier idle/run/air is 64 × 72, feet 32/68. Slash is 128 × 160, feet 64/152; the body remains the same size at offset 32/84. Update the Phaser origin when swapping textures. New mage/shade/sentinel and friendly NPC art is 64 × 80, feet 32/76. Warden is 128 × 144, feet 64/138; Hex/Regent are 160 × 192, feet 80/184. Pixel art never defines combat colliders.

Preserved prototype keys remain available. Campaign keys are `background-{far|mid}-{biome}`, `{mage|shade|sentinel}-0..3`, `boss-{warden|hex|regent}-0..3`, `npc-{mira|orren|vesper}`, `portrait-{npcId}`, `pickup-{type}`, `icon-{catalogId}`, barrel/cache/lever/gate. Far layers are opaque and mid layers transparent; both render behind terrain. Capsules use a center anchor. Renderer owns particles, weather, lighting, beam/arc animation and camera effects.

`createCampaignUI(catalog,callbacks)` in `src/ui.js` returns `open(world)`, `close()`, `refresh(world)`, `renderHUD(world)` and `renderStory(story)`. Callbacks are `onEquip(category,id)`, `onOpen`, `onClose`, `onStoryNext`, `onStoryChoice(id)` and `iconUrl(textureKey)`. Main owns world mutation and pause/resume; UI does not import combat. Native dialogs manage focus. IDs include difficulty/armory, catalogue/catalogue-tabs/catalogue-grid/catalogue-close, mana-bar/mana-value/equipped/countdown/missile-warning, story-panel/story-portrait/story-speaker/story-text/story-choices/story-next, plus the preserved health/fuel/menu/boss controls.

`Sound` in `src/audio.js` exposes `start`, `play(eventOrType,detail?)`, `update(active,intense)`, `setMuted` and `setReducedFX`. Web Audio starts after user interaction; voices are capped at 24 and disconnect on completion. Reduced effects shorten heavy sounds and limit renderer motion/flashes.

## Rendering and Android boundary

`src/main.js` owns Phaser rendering, interpolation, camera, event consumption, UI callbacks and game lifecycle. Render resolution is 960 × 540; DOM and Phaser scale to the viewport. DEV-only `window.__ASH` exposes controlled test hooks; production retains only `window.ashBack` for native Back handling.

`npm run android:sync` builds `dist/` and copies it into `android/app/src/main/assets/public/`. The Java activity loads that directory through AndroidX WebViewAssetLoader at `https://appassets.androidplatform.net/assets/public/index.html`, supports local DOM storage, requests landscape orientation and forwards pause/Back events to the web game. The APK requires API24+, is built with SDK36/JDK17, and uses application ID `com.meglodivna.ashsignal`. `assembleDebug` signs the test APK with a debug key; CI caches its own key. Runtime assets are bundled and the manifest has no Internet permission. Native packaging does not supply a second game simulation.
