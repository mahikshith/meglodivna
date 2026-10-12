# ASH//SIGNAL original pixel art

`src/art.js` is the source for all 121 raster textures. No franchise artwork, external images, models, fonts or paid assets are used. The campaign travels from snow and flooded ruins through a furnace crypt, storm spire, eclipse citadel and soul reactor. Copper, ivory, ultraviolet, crimson and electric accents extend the original steel, cyan and amber palette. Two-pixel clusters, sloped armor plates, human limb proportions and small heads keep the courier and rifle guards distinct from cartoon characters.

Call `createArtTextures(scene)` before rendering. It returns `{key,width,height,anchor:{x,y},notes}` for every texture and safely reuses existing textures after a scene restart. Generation is deterministic and occurs only while loading. Canvas nearest-neighbor copies preserve hard pixel edges; use Phaser's pixel-art/round-pixel settings.

| Texture family | Count | Size | Anchor in pixels |
| --- | ---: | --- | --- |
| Courier idle/run/jump/fall | 14 | 64 × 72 | 32, 68 |
| Courier overhead slash | 4 | 128 × 160 | 64, 152 |
| Rifle guard walk | 4 | 48 × 56 | 24, 54 |
| Drone rotor/exhaust | 4 | 56 × 40 | 28, 20 |
| Missile turret | 1 | 56 × 56 | 28, 54 |
| Warden armor/core pulse | 4 | 128 × 144 | 64, 138 |
| Steel and wall tiles | 2 | 64 × 64 | 0, 0 |
| Snow trim | 1 | 64 × 32 | 0, 16 |
| Far / mid background | 2 | 960 × 720 | 0, 0 |
| Antenna / pipe / lamp / crate | 4 | 80 × 144 / 80 × 96 / 32 × 64 / 64 × 64 | bottom center |
| Six biome far / mid layers | 12 | 960 × 720 | 0, 0 |
| Mage / shade / sentinel | 12 | 64 × 80 | 32, 76 |
| Campaign Warden | 4 | 128 × 144 | 64, 138 |
| Hex Matriarch / Null Regent | 8 | 160 × 192 | 80, 184 |
| Mira / Orren / Vesper bodies | 3 | 64 × 80 | 32, 76 |
| Survivor portraits | 3 | 96 × 96 | 48, 48 |
| Named pickup capsules | 13 | 40 × 48 | 20, 24 |
| Equipment / spell / relic glyphs | 22 | 48 × 48 | 24, 24 |
| Barrel / cache / lever / gate | 4 | 64 × 80 / 64 × 64 / 48 × 64 / 96 × 192 | 32,78 / 32,62 / 24,62 / 48,190 |

Sprites face right and support horizontal flipping. Convert anchors to Phaser origins by dividing x/y by texture width/height. Align courier feet with `(player.x + player.w/2, player.y + player.h)`; combat and collision use simulation rectangles rather than art bounds. The enlarged slash frame contains the unchanged courier body at offset `(32,84)` and a long blade above it. Change the sprite origin on texture changes; do not resize the body. Snow icicles, blade pixels, drone exhaust and scenery props are decorative. Interactive barrel/cache/lever/gate collision and destruction come from world state. Slash arcs and active bullet/laser effects belong to gameplay rendering.

The far background is opaque; mid-background architecture is transparent. Both sit behind terrain and use different horizontal parallax rates. Scene particles provide moving snowfall and embers. Background colors stay dim enough that enemy lenses, blade trails and projectiles remain readable.

All textures total 41,942,784 bytes of uncompressed RGBA pixels (about 40.0 MiB), before renderer overhead. The fourteen background textures, including the two preserved prototype keys, account for most of that budget. Source canvases are discarded after texture creation; no procedural drawing runs during gameplay. Native Canvas generation, validation and preview export took 873ms on the development computer; that is not a measurement on an Android device.

Validation performed: module syntax; all 121 unique keys; declared dimensions; nonempty alpha; binary alpha with no blurred edges; sprite sheet and all six composed backgrounds inspected locally. Browser screenshots inspected for the title, armory, story and landscape HUD. Browser assertions passed for difficulty tiers, armory item icons/tabs, paused browsing, story choices/focus, non-dismissable story Escape, and fifteen touch targets at least44px.

`src/ui.js` exports `createCampaignUI(catalog,callbacks)`, returning `open(world)`, `close()`, `refresh(world)`, `renderHUD(world)` and `renderStory(story)`. Callbacks equip validated items, pause/resume the simulation, advance story lines/choices and supply texture data URLs. The UI reads simulation state but never imports combat. Native dialogs contain keyboard focus. Existing DOM IDs are retained.

`Controls` preserves previous verbs and adds Q/F/C/V/X/Z and corresponding gamepad/touch actions. Pointer IDs maintain independent simultaneous touches. Game input is suppressed while native dialogs are open. `Sound.play` accepts either the original string or a full event object to distinguish sorceries; Web Audio voices are capped at24. `setReducedFX` shortens heavy thunder/nova effects.

This slice uses a compact pose set. Upgrade the animation count and add hand-authored intermediate poses if production playtesting calls for smoother combat transitions.
