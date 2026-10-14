# Current rebuild — Lantern artwork for Hollow Sanctuary

Hollow Sanctuary now uses original artwork generated for this project with the built-in `image_gen` tool: the courier, three enemy identities, wolf, flame dragon, portal, Mira, Orren, pickups, chest, sanctuary panorama and modular scenery. These generated images are separate from the licensed Gothicvania graphics and the older user-supplied reference boards. No franchise artwork was downloaded for this rebuild. The historical sources and their license notices remain documented below without changing their terms.

## Preserved source images and exact prompts

All original generated PNGs are retained unchanged in [reference/lantern-source](reference/lantern-source/). The exact submitted prompt text is in [prompts.json](reference/lantern-source/prompts.json), identified by the keys below. Actual image dimensions are recorded here because the generator did not always honor the requested sheet dimensions or cell boundaries.

| Source file | Prompt key | Actual dimensions | SHA-256 |
| --- | --- | --- | --- |
| `courier-raw.png` | `courier` | 1024×1536 | `73428537e5c8495d0881d1b9c60aaacbe744c5416925aebbdfe12079bc5fafca` |
| `creatures-raw.png` | `creatures` | 1254×1254 | `fbf25e4471783485de06de28839db43cfc5decc1fe5290305c44b82cc834c1af` |
| `people-items-raw.png` | `peopleItems` | 1254×1254 | `7c8d1b4fe4e9a70f7102e412c3f6476570170b1dde5cc1584e75ef2ee3100a57` |
| `environment-raw.png` | `environment` | 1254×1254 | `fbc9f792c4cf36819d44d58f939a44be86fb53db5606332b7a885f41f27d68c3` |
| `sanctuary-raw.png` | `sanctuary` | 1536×1024 | `1fe267e52365250afc350a183cf4f9941eadda91538881e423d7db8a38b49883` |

## Extraction and registration

Run `python scripts/build-lantern-assets.py` and `python scripts/build-lantern-environment.py` with Python, Pillow, NumPy and SciPy. These are offline build dependencies. Runtime artifacts are in [public/lantern](public/lantern/); the art loader is [src/lantern-art.js](src/lantern-art.js).

Sprite extraction labels connected alpha silhouettes across the whole source image instead of cutting a nominal grid. This preserves the courier's sword and the guardian's raised axe where they cross nominal cell boundaries. Disconnected sprite details are assigned to the nearest complete silhouette. Alpha below 32 is discarded to remove the source's faint extraction halo; surviving pixels become opaque. This is intentional alpha cleanup, not a claim that the unprocessed generated source already had binary pixel edges. Nearest-neighbor resizing introduces no interpolation blur.

The courier and creature families use a shared 0.32 source scale. Mira and Orren use a shared 0.185 scale. Inspected anatomical pivots normalize each family to fixed canvases; swords, cloaks, wings and crouching poses do not change the body's render scale. The courier canvas is 128×112 with anchor (64,96) and fixed render body 20×60. The NPC canvas is 96×104 with anchor (48,88) and fixed render body 18×60. Creature canvases are 192×144 with anchor (96,112), and per-family body metadata. These render registrations do not replace the simulation's collision dimensions.

Items use tight crops with two pixels of transparent padding, center anchors and preserved aspect ratios. The chest is 70×51; collectible frames range from 22×44 to 40×39. The two 68×68 portraits intentionally crop the NPC art at the shoulders. Environment extraction keeps the four large alpha components, scales them by 0.35 and emits separate platform, arch, lantern and root PNGs. The panorama is reduced by nearest neighbor to 768×512. Source rectangles and provenance are stored in the sprite manifest and `environment.json`.

## Frame inventory and animation limits

The Lantern atlas contains **66 frame keys and 63 animation/state aliases** in one 2048×1024 PNG. These are not 63 independently authored animation cycles.

| Family | Extracted frames | Runtime names |
| --- | ---: | --- |
| Courier | 24: idle, run, air, horizontal slash, overhead slash, dash; four poses each | `lantern-hero-{group}-{0..3}`, `aether-*`, `hero-*` |
| Stalker, caster, guardian | 12: idle, anticipation, attack, recovery for each identity | `ln-{stalker,caster,guardian}-{0..3}` and state aliases |
| Wolf | 4 running poses | `ln-wolf-{0..3}`, `wolf-run/idle/attack` |
| Dragon | 3 flight poses and 1 breath pose | `ln-dragon-{0..3}`, `dragon-fly/fire/idle` |
| Portal | 4: dormant, forming, open, closing | `ln-portal-{0..3}`, `portal-dormant/form/open/close` |
| Mira and Orren | 8 subtle idle poses | `ln-npc-{mira,orren}-{0..3}`, `npc-mira/orren-idle`, compatibility `npc-villager/mage-idle` |
| Pickups and chest | 8 | `ln-item-{health,mana,fuel,shield,boost,rapid,chest,rune}` |
| Portraits | 2 | `ln-face-mira`, `ln-face-orren` |

Idle changes are subtle. Firearm poses reuse courier idle; hurt/death reuse the landing crouch. Air/low slashes adapt overhead/horizontal poses. Creature walk, hurt and death aliases hold or reuse supplied action poses; the sheet does not contain complete walk or death cycles. Wolf idle and attack reuse running poses. Dragon breath touches the original source border, leaving a cut flame tip; runtime flame effects extend that emitter. Portal stages exist in the atlas, but their presence alone is not proof that every runtime transition uses all four stages.

Dust, exhaust smoke, sparks, flame trails, shock rings and dash afterimages are procedural presentation effects in [src/lantern-fx.js](src/lantern-fx.js), not additional generated sprite animations. The presentation pool caps at 240 particles and six dash ghosts. Existing rendering also retains its older bounded effects pool. Neither presentation system defines damage or collision.

## Integration, retained assets and evidence

`createLanternArt` merges Lantern frames and aliases over the Runeheart/reference manifests. Each frame's `atlasKey` remains authoritative. The current Hollow renderer selects the new living actors, NPCs, portraits, collectible icons, chest, portals and sanctuary scenery. Retained Runeheart and reference assets still provide equipment/weapon overlays, several projectile/effect textures, barrels/levers, compatibility fallbacks and the other saved realm presentations. Original generated texture infrastructure also remains loaded. This is a staged replacement, not a claim that every old texture was removed. Historical Gothicvania graphics retain their CC0 notices; the supplied reference-board pixels are not relicensed under those notices.

Build assertions check nonempty sprites, preservation of retained alpha pixels, clear frame edges, atlas capacity, valid animation references and consistent hero/NPC body metadata. Inspected extraction proofs are `artifacts/lantern/courier-contact.png`, `creatures-contact.png`, `people-contact.png`, `items-contact.png`, and the corresponding courier/creature/people motion GIFs. Contact sheets establish registration and silhouette quality; they do not prove gameplay.

Independent review inspected current landscape captures `artifacts/lantern/ui/740x360-play.png`, `640x360-play.png`, `1280x720-play.png`, `740x360-home.png`, `740x360-settings.png` and `artifacts/lantern/qa/failure-740x360.png`. These are browser captures, not Android-device evidence. The UI report and separate input/effect QA report must be read for their actual pass/fail state; an attractive screenshot does not override a failed input check.

At this revision, `public/lantern` occupies **1,406,455 compressed bytes**. Its six PNG source images require **10,448,380 bytes (9.96 MiB)** for one uncompressed RGBA copy, including the 8 MiB atlas. This is an incremental Lantern subtotal, not total runtime/process memory and not device performance evidence. The historical budget below predates this additional packet and must not be read as the current combined total.

# Historical v0.5 — Runeheart crisp pixel assets

Runeheart uses genuine animation and environment graphics by **Luis Zuno / Ansimuz**, selected from his [Gothicvania Patreon collection](https://opengameart.org/content/gothicvania-patreons-collection), [Gothicvania Town](https://opengameart.org/content/gothicvania-town) and [Bridge expansion](https://opengameart.org/content/gothicvania-bridge-expansion-pack-1). The author's pages label the graphics CC0; the downloaded packages also contain public-domain/commercial-use notices. The Bridge notice explicitly allows modification and redistribution. Graphics alone are imported. Source music has separate terms and is excluded, as is demo game code.

The previous v0.4 concept-board packet remains a compatibility source for equipment/effects and the existing mechanical boss/Wyrm forms. The new hero, Hellhound, Dark Ghost, town inhabitants and main scenery use the licensed pixel package. The runtime deliberately retains the old Mecha/Wyrm animation aliases because their attack anatomy and frozen collision geometry already agree; the newly packaged Hell Beast/Winged Demon are available for a future visual adapter with visible casting sockets.

## Files and reproducibility

- Source ZIPs and their unmodified extracted files: `reference/runeheart-sources/`, outside the public/Android payload.
- Deterministic selection/translation/packing: `scripts/build-runeheart-assets.py`.
- Runtime: `public/runeheart/` contains twelve files: atlas PNG/JSON, manifest, license notices and eight background PNGs.
- Contact sheets, authored-motion GIF and audit receipts: `artifacts/runeheart/`.
- Runtime adapter: `src/runeheart-art.js`.

Run the asset builder with the installed Python/Pillow runtime. It requires the three preserved source ZIP extractions. Manifest entries record source filename, SHA-256, actual crop rectangle or GIF frame index, normalization, dimensions, body, anchor and sockets. Aliases reuse atlas rectangles. Source ZIP hashes:

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| Gothicvania collection | 4,001,163 | 081a88f814d1c38b57a97af3659723bb15ed655e00847fcba0d8c08f4b98757f |
| Town | 9,084,942 | 11c32d7416814e1832c502e76426623065792c3d95a8514be42e59fe6b0b0651 |
| Bridge | 170,400 | d46c5f739bbde80be9b7372559a9316987bb5e13ead4b64fcb436fe6745cfb26 |

The source hero PNG strips have inconsistent opaque export remnants. The clean author GIF frames are used instead. No inferred frame-count labels, flattened concept crops, matte removal or AI interpolation are involved in the new hero sequences.

## Real animations and registration

The packet has **184 frame keys, 166 unique pixel payloads and 62 animation groups**, including compatibility/state aliases. These are group/frame counts, not a claim of 62 independently authored sequences. Every imported actor pixel has alpha 0 or 255 and uses nearest-neighbor rendering.

| Source family | Authored selected sequences |
| --- | --- |
| Hero | idle 4, run 12, jump 5, grounded slash 6, air slash 6, low slash 4, hurt 3, crouch 3, climb 7 |
| Hellhound | idle 6, walk 12, run 5, jump 6 |
| Dark Ghost | idle 7, shriek 4, vanish 7 |
| Hell Beast | idle 6, breath 4, burn 6 |
| Winged Demon | idle 6, attack 8 |
| Wolf | run 4 |
| Town people | woman idle 7, bearded idle 5, hat man idle 4, old man idle 8 |

Hero keys use `rh-hero-{state}-{index}`. Both `hero-*` and existing `aether-*` animation names resolve to the new frames, including `aether-air-slash` and `aether-crouch-slash`. Dash maps to real low-slash/lunge poses. Double-jump, jet and firearm states reuse authored poses with runtime effects/held weapons. Hero and Demon death aliases hold a final pose and fade; the package does not contain dedicated death animations for them. Wolf idle/attack reuse its run strip. Creature hit/walk aliases without a matching source strip also reuse documented source poses.

| Family | Native canvas; anchor | Trimmed body x,y,w,h |
| --- | --- | --- |
| Hero | 128×112; feet 64,96 | 57,66,14,30 |
| Hellhound | 96×64; feet 48,56 | 33,36,30,20 |
| Dark Ghost | 80×96; anchor 40,80 | 31.5,57.5,17,22.5 |
| Hell Beast | 128×128; feet 64,112 | 52,76.5,24,35.5 |
| Winged Demon | 256×208; anchor 128,184 | 100,141,56,43 |
| Wolf | 80×48; feet 40,40 | 25,24,30,16 |
| Town NPC | 80×80; feet 40,72 | 32,40,16,32 |

The hero body renders at exactly 2× for the simulation's 28×60 hurtbox, with approximately 78 visible pixels of standing height. Cape, hair and blade extend outside that forgiving body. GIF jump poses are translated to stable feet; the physical jump is not counted twice. Source pixels are preserved without smoothing. All hero frames have at least a two-pixel clear outer edge.

Hero hand is native **(72,75.5)** and muzzle **(78.5,75.5)**. Relative to feet (64,96), 2× gives hand center ±16 / feet−41, then a 13-world-pixel aimed muzzle offset. These preserve authoritative `weaponOrigin`; the held weapon overlay must use its own handle/muzzle registration. For new creature art, natural claws/skulls do not necessarily match the simulation's historical gun/rocket sockets. Manifest attachment notes identify explicit casting/emitter overlays; they are not assertions that every source drawing contains a physical gun at that point.

## Adapter and environment

`preloadRuneheartArt(scene)` loads atlas `runeheart-art`, its cached manifest and eight large paintings. `createRuneheartArt(scene, legacyManifest?)` validates named frames and returns `{atlasKey,frames,animations,backgrounds,...}`. When merging the old packet, each frame's `atlasKey` is authoritative: render with `meta.atlasKey || art.atlasKey`. Body/feet alignment remains `scale=entity.h/meta.body.h`, centered on the physical body and mirrored around that center.

`createRuneheartParallax(scene, theme, viewportH)` returns `update(cameraX,cameraY,floorScreenY?)`, `resize(width,height)`, `destroy()` and layer views. The optional horizon is measured before the renderer adds its screen offset. With the renderer's −120 vertical overscan offset, it passes `room.floorY-cameraY+120`. Themes include soulforge/forest, tide/town, pyre/crypt, neon/night-city, veil/moon and citadel. The helper preserves image aspect ratio, uses integer scale and wraps whole panoramas rather than miniature tree patterns. Its opaque backing covers upper routes, and vertical parallax stays bounded by painting overscan.

Neon splits its existing PNG into sky and building subframes without another GPU image. Buildings and town/moon foregrounds render at native 2×, align their bottom to the room horizon and use four persistent panorama copies for wrap. Foreground alpha is 0.4. The forest uses a cooler tint and lighter backing at 0.7 alpha, and crypt/cloud paintings are subdued so combat and terrain stay brighter.

The source Gothic Castle “background” is a **modular panel sheet**, not a seamless painting. The builder now crops its chapel, stairs, window and statue panels individually, removes their RGB7 empty backing, and assembles one opaque masonry hall with columns/cornice. Its transparent gutters are never displayed. The forest combines three large licensed tree props with original pixel sky/trunks; the city combines three grounded authored building clusters with an original dusk sky. Town/cloud paintings and their transparent foreground layers stay separate. The renderer supplies substantial solid floor foundations, capstones and structural supports; transparent terrain strips alone do not form a complete floor.

New compatible environment keys include `ref-tile-{stone,steel,wood,glass,circuit,grass}` and `ref-prop-{platform,castle,house,tree,house-a,house-b,house-c,barrel,crate,crate-stack,street-lamp,wagon,well,sign,chest,pillar,statue,arch,torch}`. The platform frame is a horizontal wood cap. The grass frame is a top strip intended for an opaque floor backing. NPC idle loops are `npc-villager-idle`, `npc-mage-idle`, `npc-scientist-idle`, `npc-healer-idle`; static `ref-npc-*` aliases remain available.

## Budget and verification

The new packet alone occupies **465,343 compressed bytes**. Its 2048×2048 RGBA atlas is 16 MiB; eight native paintings total 6,086,656 RGBA bytes. Combined uncompressed texture storage for this packet is **21.80 MiB**. The retained reference atlas and generated assets also remain loaded; this is the new-packet subtotal.

`artifacts/runeheart/asset-budget.json` records every compiled file hash and confirms nonempty frames, binary alpha, atlas bounds, source existence, clear hero edges, opaque composed backgrounds and unchanged hero sockets. Native hero/creature/environment contact sheets and `hero-authored-animation.gif` were visually inspected. A second deterministic build matched the compiled hashes. Root's refreshed suite contains twenty integrated render fixtures: the skyline is visible behind the ground, the forest is subdued, and solid floor foundations retain readable landing rims. These fixtures are separate from legal route proofs and do not establish Android comfort or device performance.

The combined current runtime source-image budget is:

| Loaded source images | Count | RGBA bytes | MiB per copy |
| --- | ---: | ---: | ---: |
| Generated characters, weapons, effects and props | 333 | 13,224,704 | 12.61 |
| Runeheart atlas | 1 | 16,777,216 | 16.00 |
| Runeheart paintings | 8 | 6,086,656 | 5.80 |
| Retained reference atlas | 1 | 16,777,216 | 16.00 |
| **Total** | **343** | **52,865,792** | **50.42** |

`artifacts/runeheart/runtime-texture-budget.json` derives this from the current generated manifest and loaded image dimensions. Background subframes and aliases share their source texture and are not counted twice. The ten old hidden synthesized backdrop textures were removed; generated `background-*` textures are also skipped when reference art is present.

This **50.42 MiB is one uncompressed RGBA copy**, not measured process RAM. A scenario retaining both decoded CPU images/canvases and GPU copies is approximately **100.83 MiB**, before render buffers, graphics geometry, cached icon canvases/data URLs, transient painter canvases, browser overhead and driver allocations. Actual retention depends on the browser/device.

Distribution attribution is in `public/licenses/NOTICES.txt` and `Gothicvania-CC0-NOTICE.txt`. They distinguish licensed Gothicvania graphics, user-supplied reference-board pixels and original procedural work; the reference atlas is not claimed under the Gothicvania CC0 license.
