# Shared implementation contract

ES modules, plain JavaScript, Phaser 3.90 renderer, Vite. Pure simulation is Node-testable. Coordinates use x/y at the top-left of colliders, positive y downward. Units are pixels and seconds. Simulation step is 1/120 s.

## Physics (systems agent)

`src/physics.js` exports `PHYSICS`, `createPlayer(x,y)`, `stepPlayer(player,input,solids,dt)`, `overlaps(a,b)`, `moveBody(body,solids,dt)`.

Player: x,y,w=24,h=46,vx,vy,facing (+1/-1), grounded, wall (+1/-1/0), fuel (0..100), dashTime, dashCooldown, jumps (remaining air jumps), state (idle/run/jump/fall/wall/dash/jet). Extra timers allowed. Input: move (-1..1), jumpPressed, jumpHeld, dashPressed, jet (held), down (held). Solids: x,y,w,h, optional oneWay=true. `stepPlayer` returns an array of event names (jump, land, dash, jet, walljump). Caller handles health/combat. Max run 300..330; full jump apex 115..135, double jump, fuel recharge on ground; max horizontal dash ~620. Jetpack must be finite and not allow unlimited ascent.

`moveBody` resolves velocity movement against rectangles without tunneling at the fixed step. Reset grounded/wall as appropriate. Physics agent writes tests covering jump cut, coyote/buffer, collisions, wall jump, fuel/dash limits.

## Level (level agent)

`src/level.js` exports `LEVEL` and `createEnemies()`. LEVEL: width=9400, height=720, spawn={x:100,y:560}, solids=[{x,y,w,h,oneWay?}], hazards=[{type:'laser'|'fire'|'spikes'|'emp',x,y,w,h,period?,onTime?,phase?}], checkpoints=[{x,y,label}], pickups=[{id,type:'health'|'fuel'|'rapid'|'shield',x,y}], zones=[{x,label,subtitle}], boss={x:8500,y:490,w:88,h:110,hp:640}, exit={x:9250,y:540,w:50,h:70}. Safe starting floor y610. Traversal ~25..40s + boss ~15s. Required gaps must work using jump/double jump/dash/jet mechanics. No floor-only corridor.

Enemies: id,type:'guard'|'drone'|'turret',x,y,w,h,hp,facing,minX,maxX. Caller implements AI. Guards ~30×44; drone ~40×30; turret ~40×46. Solids may include detail tags for renderer. Each zone must be navigable and arena ground contiguous. Agent writes data validation tests and route notes, does not modify physics. Final Warden tuning is hp=640, with faster attack recovery below half health.

## Assets (asset agent)

`src/art.js` exports `PALETTE` and `createArtTextures(scene)` (returns manifest). Use original pixel artwork, runtime Canvas textures via `scene.textures.addCanvas(key,canvas)`, `document.createElement('canvas')`; no external libraries. Keys: player-idle-0..3, player-run-0..7, player-jump-0, player-fall-0, player-slash-0..3 (64×72 each), guard-0..3 (48×56), drone-0..3 (56×40), turret-0 (56×56), boss-0..3 (128×144), tile-steel (64×64), tile-snow (64×32), tile-wall (64×64), background-far and background-mid (960×720 tileable preferred), props (antenna, pipe, lamp, crate). Player feet anchor (32,68), hurt collider smaller than visible silhouette. Human proportions, armored silhouette, cyan blade, amber cloth, charcoal steel palette. Dense pixel details, hard pixel edges, NO emoji/geometric placeholder characters. Canvas nearest-neighbor, no blur. Full strip consistency by shared drawing functions. Manifest lists keys,width,height,anchor and notes. Lead draws particles/beams/bullets.
