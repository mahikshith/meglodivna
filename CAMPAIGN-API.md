# Campaign integration contract

Plain JS ES modules, fixed1/120 simulation, Phaser rendering. Coordinates/collider conventions unchanged. Initial prototype is committed before concurrent edits. Agents do not commit shared workspace changes.

## Combat/catalogue owner

Own `src/combat.js`, NEW `src/catalog.js`, optional `src/progress.js`, `src/physics.js` only if booster support needs it, combat/new gameplay tests. Preserve exports STEP/createWorld/stepWorld/say/hazardState/spawnProjectile/damagePlayer/segmentHit. `createWorld(checkpoint=0, options={difficulty:'forge',progress?,previous?})`; add `retryWorld(world)` for valid resource/collection/elapsed/boss/checkpoint persistence, and `equipItem(world, category, id)` for validated discovered items.

Catalog exports DIFFICULTIES (array id/name/label/descriptive stats), SWORDS, GUNS, ARMORS, SPELLS, RELICS (arrays id/name/description/tint/cost/etc), default/load/save progress if a progress module is used. Initial gun carbine, sword rustfang, armor courier; discovered gear/spells must be equipable from menu and pickups. Spell IDs: cinder (global burn), siphon (black magic lifesteal), thunder (lightning burst), veil (stealth), stasis (slows nearby foes), eclipse (single-use major nova). Cannon limited-charge high-damage piercing beam as a gun; equip/cycle unavailable items must fail safely.

World adds difficulty id, rules, bosses[] (world.boss alias finalboss for old interface), props[], gates[], npcs[], collections/unlocks, timeLeft, missileWarning {y,time}?; player: mana,maxMana,sword,gun,armor,spell,stealth,burn?,boost,laserTime,charges; projectiles have kind/tint; enemies have power,burn,slow; bosses have id,name,type,active,phase,hp,maxHp,beam,dead; world.activeBoss references relevant active foe. Larger vertical melee box (roughly90w×135h) aligned with a top-to-bottom arc. Renderer needs beam {x,y,w,h,tint} and spell events with type/spell/radius. Input adds spellPressed,cycleGunPressed,cycleSwordPressed,cycleSpellPressed,interactPressed,ultimatePressed. `interact(world)` may set world.story {npcId,speaker,lines:[{speaker,text}],choices:[{id,label,reward}],index}; renderer pauses simulation and calls `advanceStory(world,choiceId?)` to proceed/reward. Story progress must be safe across retry.

Combat uses world.solids derived from LEVEL solids + alive collidable props + closed gates. All near-player object loops should cull by distance (~1500), while timers for burns/boss/story remain correct. Essential static floors are not destroyed; cannon destroys all destructible obstacles/foes/projectiles along its beam (up to visible range1800px), rather than breaking the entire world's floor.

## Campaign owner

Own `src/level.js`, `tests/level.test.js`, `tests/route.test.js`, `scripts/combat-route.mjs` (adapt after combat API ready), `LEVEL.md`. Export LEVEL/createEnemies as before. Width target~65k, height720, baseline610, six biomes. Spawn/checkpoints safe; mandatory gaps<=280px, ledge rises<=105; no time padding. LEVEL.zones includes x,label,subtitle,biome,tint,sky; LEVEL.bosses=[3 unique boss objects id/name/type/x/y/w/h/hp/triggerX/arenaStart/arenaEnd], LEVEL.boss finalalias, exit final. Three bosses include Warden(military), Hex Matriarch(sorcery), Null Regent(mega finalboss). Enemy types guard/drone/turret/mage/shade/sentinel with power strings and distinct authored placements. Keep enemies on support geometry.

LEVEL.props include {id,type:'crate'|'barrel'|'cache',x,y,w,h,hp,collidable?,contents?}; LEVEL.gates include{id,x,y,w,h,leverId?,bossId?}; levers may be props with type:'lever', no hp, gateId; LEVEL.npcs includes id/name,x/y/portrait/lines/choices/reward; LEVEL.pickups types health/fuel/rapid/shield/boost/mana/weapon/sword/armor/spell/treasure/cannon/nova with itemId/value. Route markers use actual stable floors/platforms, plus optional boss/interaction metadata. Report approximate route length/timing honestly.

## Presentation/UI owner

Own `src/art.js`, `src/audio.js`, `src/input.js`, `index.html`, `src/style.css`, NEW `src/ui.js` (optional), visual notes. Preserve existing texture keys and add biome backgrounds (background-far-{biome}, background-mid-{biome}), mage/shade/sentinel sprites, boss-warden/hex/regent frames, npc portraits, pickup icons, weapon icons. Source pixels should remain detailed and mature. Palette extends copper/ivory/ultraviolet/crimson/electric colors; no simplistic color-only items.

Preserve old DOM IDs used in main and add difficulty select (id difficulty), armory button/id armory; catalogue modal/id catalogue, catalogue tabs/id catalogue-tabs, item grid/id catalogue-grid, close/id catalogue-close; mana bar/value, equipped label, timer countdown, missile-warning; story panel/id story-panel, portrait/id story-portrait, speaker/text/choices/next ids; power/hud controls. Buttons data-action map to extra input actions spell/interact/cycleGun/cycleSword/cycleSpell/ultimate; input handles Q spell,F interact,C gun,V sword,X spellcycle,Z ultimate; touch jet,aimUp and down available. Make touch groups semi-transparent with44px minimum targets, safe-area offsets, simultaneous touches, landscape Android layout. Main owns wiring/render logic unless UI module contract explicitly communicated.

## Lead owner

Own `src/main.js`, Android build/CI, package files, validation/browser scripts, root docs, git commits and integration. Thread communication may refine API; send changes promptly, keep old tests meaningful, avoid deleting safety tests to hide regressions.
