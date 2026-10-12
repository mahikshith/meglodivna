# ASH//SIGNAL original pixel art

`src/art.js` is the source for all 40 raster textures. No franchise artwork, external images, models, fonts or paid assets are used. The art direction is a cold weapons foundry: charcoal steel, rust, blue snow, cyan plasma and worn amber cloth. Two-pixel clusters, sloped armor plates, human limb proportions and small heads keep the courier and rifle guards distinct from cartoon characters.

Call `createArtTextures(scene)` before rendering. It returns `{key,width,height,anchor:{x,y},notes}` for every texture and safely reuses existing textures after a scene restart. Generation is deterministic and occurs only while loading. Canvas nearest-neighbor copies preserve hard pixel edges; use Phaser's pixel-art/round-pixel settings.

| Texture family | Count | Size | Anchor in pixels |
| --- | ---: | --- | --- |
| Courier idle/run/jump/fall/slash | 18 | 64 × 72 | 32, 68 |
| Rifle guard walk | 4 | 48 × 56 | 24, 54 |
| Drone rotor/exhaust | 4 | 56 × 40 | 28, 20 |
| Missile turret | 1 | 56 × 56 | 28, 54 |
| Warden armor/core pulse | 4 | 128 × 144 | 64, 138 |
| Steel and wall tiles | 2 | 64 × 64 | 0, 0 |
| Snow trim | 1 | 64 × 32 | 0, 16 |
| Far / mid background | 2 | 960 × 720 | 0, 0 |
| Antenna / pipe / lamp / crate | 4 | 80 × 144 / 80 × 96 / 32 × 64 / 64 × 64 | bottom center |

Sprites face right and support horizontal flipping. Convert anchors to Phaser origins by dividing x/y by texture width/height. Align courier feet with `(player.x + player.w/2, player.y + player.h)`; combat and collision use simulation rectangles rather than art bounds. Snow icicles, blades, drone exhaust and all props are decorative. Slash arcs and active bullet/laser effects belong to gameplay rendering.

The far background is opaque; mid-background architecture is transparent. Both sit behind terrain and use different horizontal parallax rates. Scene particles provide moving snowfall and embers. Background colors stay dim enough that enemy lenses, blade trails and projectiles remain readable.

All textures total 6,390,016 bytes of uncompressed RGBA pixels (about 6.1 MiB), before renderer overhead. The two backgrounds account for most of that budget. Source canvases are discarded after texture creation; no procedural drawing runs during gameplay.

Validation performed: module syntax; all 40 unique keys; declared dimensions; nonempty alpha; binary alpha with no blurred edges; sprite sheet and composed background inspected locally. Scene-scale, frame timing and gameplay readability are checked by the integration playtest.

This slice uses a compact pose set. Upgrade the animation count and add hand-authored intermediate poses if production playtesting calls for smoother combat transitions.
