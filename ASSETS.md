# v0.4 — Aether and extracted reference artwork

The primary Aether, Rift Crawler, Hexwing Raider, Crimson Mecha, Wyrm, friendly NPC and environment artwork comes from actual crops of the user's four local concept boards. Background masking and nearest-neighbor normalization prepare those pixels for play; no lookalike imagery or missing in-between frames was generated. Original procedural assets remain for other characters, weapons, wards, summons and effects.

The frozen packet contains **174 frame keys, 49 animation groups and 173 unique pixel payloads**. One stone/snow fallback alias shares an atlas rectangle. Printed “64×64,” frame counts and JSON on the boards are illustrative labels, not sheet metadata.

## Packet and provenance

Only atlas.png, atlas.json and manifest.json live in public/reference/. The pipeline is scripts/extract-reference-art.py; contact sheets and receipts are in artifacts/reference/. The full originals remain untouched in C:/Users/mahik/Downloads and are excluded from the Android payload.

| Source, all 1536×1024 | SHA-256 |
| --- | --- |
| 03_aether_character_sheet.png | c89e1a24bcd32acee81e2051910bf42e3b4555c41e80369c34d51a2aa2ccade4 |
| 02_asset_pack_all_characters.png | e5ac7d62c65ba90fa0c0f670e0aceac8f9032245485ee7b04b7941046b4e215a |
| 01_concept_board_full_world.png | 305b247a16240cab407cc4102f10fb0419dfe85eb794d0f507d6a5d004cb6283 |
| Designer.png | 6194801c4acc3d545aeda448e9ed822bf02c6ff284d4e9996dd28e165e4b3717 |

Each frame records source file/native sourceRect, scale, crop offset, mask method, pixel digest, dimensions, anchor and visible bounds. Actors additionally record trimmed body and attachment points. Crops avoid labels/dividers. Gradient fitting, source-alpha cleanup and dominant-component filtering remove the matte and detached neighboring fragments; edge-color unmixing limits halos. Extracted hair and glows retain soft alpha. Opaque tiles/scenery preserve their painted lighting.

artifacts/reference/extraction-report.json records isolated regeneration whose three output files matched the frozen packet byte for byte. Source and packet hashes were rechecked for render-budget.json. These receipts establish local provenance and reproducibility, not independent authorship/license verification.

## Import and registration

src/reference-art.js exports preloadReferenceArt(scene) and createReferenceArt(scene). Preload loads atlas reference-art and cached JSON reference-art-manifest; creation returns {atlasKey,frames,animations,sources,...} and checks every named frame. Render using sprite.setTexture('reference-art',frameKey), with metadata origins. All frames share one atlas texture.

| Family | Canvas and pixel anchor | Trimmed body x,y,w,h |
| --- | --- | --- |
| Aether ordinary | 128×128; feet 64,116 | 50,56,28,60 |
| Aether doublejump/jetidle/jet | 128×160; feet 64,116 | 50,56,28,60 |
| Aether dashtrail | 160×128; feet 96,116 | 82,56,28,60 |
| Crawler | 128×112; feet 64,100 | 34,59,60,41 |
| Raider | 128×112; anchor 64,100 | 47,43,34,45 |
| Mecha | 144×144; feet 64,128 | 38,57,52,71 |
| Wyrm | 256×224; fly 256×256; anchor 128,200 | 72,114,112,86 |
| Six NPCs | 96×128; feet 48,106 | 32,43,32,63 |

Aether's idle silhouette is **89 native pixels** tall. Extra transparent padding preserves jets, dash trails and folded Wyrm flight tails without changing body/attachment offsets. All fixed actor canvases have a clear outer edge. Read dimensions per frame instead of assuming 128×128.

Actual Aether groups: idle 3/run 5/jump 3/doublejump 3/fall 2/dash 3/dashtrail 2/jetidle 3/jet 6/fire 3/hurt 3/death 4. The first printed Shoot drawing remains ref-aether-fire-0 in aether-ready; aether-fire uses raised-hand frames 1–3. Crawler groups are idle 1/walk 3/attack 2/hurt 2/death 1; Raider idle 1/fly 4/fire 2/hurt 1/death 1; Mecha idle 1/walk 1/attack 2/fire 1/hurt 1/death 3; Wyrm idle 1/fly 2/fire 3/hurt 3/death 1. These enumerate real drawings, not complete authored animation strips.

NPC keys are ref-npc-villager/mage/blacksmith/scientist/merchant/healer; matching ref-face-* crops and ref-face-aether support dialogue. Every equipment/effect/environment key and all 49 groups are in the manifest.

Art faces right. The renderer mirrors around the trimmed body center, scales uniformly by entity.h/body.h and aligns body center/bottom to simulation. Transparent wings, capes, trails and launchers do not enlarge hurtboxes. weaponOrigin and actual beam/projectile geometry remain authoritative.

| Canonical attachment in frame pixels | Body-relative placement |
| --- | --- |
| Aether hand 80,75; muzzle 93,75 | hand center±16,feet−41; horizontal muzzle center±29,feet−41 |
| Crawler muzzle 94,65 | center±30,body top+6 at native body size |
| Raider muzzle 94,65 | center±30,body top+22 at native body size |
| Mecha muzzle 120,80 | center±56×scale,feet−48×scale |
| Wyrm mouth 228,128; launcher 156,100 | mouth center±100,feet−72; launcher center±28,feet−100 at native 112×86 body size |

Aether attachments describe its canonical raised-fire stance, rather than a skeletal rig shared by every illustration. Aimed offsets rotate around the physical hand. Wyrm mouth registration is common across normalized poses; painted torso core coordinates remain per frame. Attack overlays use physical endpoints and projectile angles.

Original Warden 128×144/feet64,138 and Hex 160×192/feet 80,184 remain procedural. Chest points are 62,61 and 80,106; Warden has a 2px horizontal/±1px vertical art bob. Original Regent art remains available while reference Mecha/Wyrm supply the revamped transformation. Spellcasters, allied clone/wolf/dragon, traps, pickup glyphs and weapons remain in the generated manifest. Simulation owns state, damage, destruction, summons and trap timing; decoration adds no collision.

## Environment and budget

The atlas includes foreground tiles, platforms, ladders, spikes, arches, gates, trees, crystals, statues, water, torches, collectibles and forest/island/castle/cave/city panels. ref-tile-snow aliases the stone crop; it is not extracted snow terrain. Backgrounds are small painted panels, not seamless full-resolution panoramas.

With reference art present, createArtTextures creates/reuses **333** procedural textures and skips 14 legacy 960×720 backgrounds. The renderer adds ten reusable **480×360** far/mid compositions for five scenic themes: **343 generated textures**, plus one 2048×2048 atlas. These compositions reuse extracted panels/props once at boot, not per room. Procedural characters use one-pixel details; procedural terrain uses two-pixel clusters. Extracted pixels retain their source raster with nearest-neighbor sampling. Binary procedural alpha does not apply to extracted glows.

| Allocation / file | Bytes | Size |
| --- | ---: | ---: |
| 333 procedural texture pixels | 13,224,704 | 12.61MiB |
| Ten 480×360 composition pixels | 6,912,000 | 6.59MiB |
| 343 generated textures combined | 20,136,704 | 19.20MiB |
| One 2048×2048 atlas pixels | 16,777,216 | 16.00MiB |
| Combined RGBA pixel allocation estimate | **36,913,920** | **35.20MiB** |
| atlas.png | 1,722,171 | |
| atlas.json | 63,622 | |
| manifest.json | 166,293 | |
| Three reference files combined | **1,952,086** | **1.86MiB** |

artifacts/reference/render-budget.json contains the 343-key inventory and packet digests. This is a dimensions-based pixel estimate, not measured GPU/process memory. Built-in/font textures, GPU copies, framebuffers, temporary canvases, JS heap, audio and browser/native overhead are excluded.

## Inspection and limits

Final native previews are artifacts/reference/hero-contact-sheet.png, creatures-contact-sheet.png and environment-contact-sheet.png. Inspection found clean silhouettes without sheet labels or detached divider strokes; padding preserves jets/trails/tails. Creature families, survivor faces, foreground materials and collectibles remain distinguishable. The sheets fit differing canvas sizes into cells, so thumbnail size is not runtime scale.

Flattened boards supply sparse, sometimes inconsistent poses. Masking can lose extremely low-contrast pixels; scenery retains baked lighting; several idle/death groups contain one drawing. Asset checks establish extraction, padding, registration and budget arithmetic. Integrated gameplay/performance/Android evidence belongs in VALIDATION.md.

Touch glyphs and menus are separate SVG/CSS/DOM surfaces outside the texture count. Synthesized sound retains capped voices, event-specific feedback, mute and reduced effects. Physical Android comfort, speaker mix and subjective game feel are not established by this audit.
