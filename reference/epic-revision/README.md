# Illustrated combat and journey production

Generated with the built-in `image_gen` tool, 17 October 2026. Exact generation/edit prompts are in `complete-prompts.json`. The approved Lantern sanctuary and illustrated character sheets were the visual references. Sources are retained unmodified; runtime extraction is in `scripts/epic_assets.py` and the existing atlas builders.

## Accepted sources

- `bull-raw.png`: 16 full-body Minotaur poses. The four run/charge frames change leg contacts, torso lean, cloth and suspended stride. Four axe poses expose anticipation, contact and recovery. Four cannon poses include shoulder/arm recoil. Gun barrel movement is authored in finite poses, not a mechanical simulation.
- `dragon-raw.png`: 12 illustrated cannon-dragon poses; its four flight poses were superseded because torso motion was too limited. The attack, recoil and defeat poses remain in use.
- `dragon-flight-raw.png`: the replacement four-frame flight cycle, with distinct neck, torso, hindleg, tail and wing poses. This is full-body frame animation, not a skeletal rig. Its nominal body bounds stay fixed while the inspected visible hurtboxes and weapon sockets vary with pose.
- `hero-rifle-final.png`: four air-aim directions and two crouched firing poses for both courier and Lanternplate. `hero-fire-raw.png` is a rejected first version whose weapons looked like swords; none of its pixels are shipped.
- `environment-raw.png`: platform, arch, lantern and root textures replace the previous environment props at the same world dimensions.
- `fx-raw.png`: painted ground impact, muzzle flash, booster exhaust, cannon bullet/shell, chips and axe arc. Soft-alpha effects use inspected crop bounds with edge fades. Existing cut/breath/dust sequences are retained where not replaced.
- `intro-raw.png`: three original-fiction cutscene panels matching The Stolen Dawn / A Promise Across Worlds / Carry the Light Home. Eagle and monkey figures are narrative symbols; their appearance here does not assert new playable companion controllers.
- `realms-raw.png`: Windward Canopy, Moonlit Causeway, Ember Oath environment panoramas.
- `stone-raw.png`: a newly generated 1254-by-1254 illustrated masonry surface. Extraction matches opposing 24-pixel edge strips, leaving the interior source unchanged. Runtime retains a 303-by-306 world tile. `stone-prompt.json` preserves its exact prompt; `stone-tiled.jpg` shows a three-by-three repetition check.

## Final published contracts

`public/ironfang` contains **67 frame keys, 20 animation bindings and two atlas pages**. Of these, 39 have actor geometry; 55 keys use this revision's generated sources, including eight charge/cannon aliases and three staged transformation aliases. `public/character-revision` contains **180 frame keys, 112 animation bindings and three atlas pages**; twelve new keys supply courier/Lanternplate air and crouched rifle poses. Counts are frame keys, not unique animations or unique drawings.

All **72 secondary-villain frames** across stalker (12), caster (12), guardian (16), Wispknight (12), Bellbeast (12) and dragon (8) now have `hurtboxes: [{x,y,w,h}]` in the manifest and `CHARACTER_GEOMETRY`. Live head, torso, legs and dragon-tail regions are measured in source coordinates, then tightened to retained alpha. Traveling weapons, external claw blades, wing membranes and flowing cape margins are excluded. Death poses retain an alpha-tightened body fallback. This metadata supplements rather than resizes the movement body. `CHARACTER_ANIMATIONS` exports the exact same 112 sequences as the manifest so simulation and rendering can select a common pose.

Four modular scenery props, six 1254-by-418 journey panels and one masonry texture accompany the atlases. Existing illustrated enemy identities remain; this revision adds their anatomical damage regions rather than claiming newly generated designs for all six families.

## Extraction and registration

Connected alpha cores determine ownership, including the correction of thin incidental bridges between figures. Erosion determines ownership only; visible source alpha is restored from the original pixels. A single scale applies to each source family. Lanczos resampling preserves the illustrated detail. Each published frame records SHA-256, crop rectangle, source pivot and measured gun/mouth/contact sockets. Atlas pages are capped at 2048 pixels, and original logical canvas metadata is retained by `atlas_pack.py`.

Run `python scripts/build-ironfang-assets.py`, `python scripts/build-character-assets.py`, `python scripts/build-lantern-environment.py`, then `python scripts/epic_assets.py` to reproduce the runtime outputs and previews. `build-lantern-fx.py` also reapplies the current masonry after rebuilding the retained FX pack. Run `python scripts/validate-epic-assets.py` for source/output hashes, atlas aliases/bounds, sockets, hurtboxes, panorama dimensions and masonry seam assertions. The results are in `artifacts/epic-revision/integrity.json`; `node --test tests/illustrated-assets.test.js` checks atlas canvases and runtime rifle registration. Contact sheets, anatomical overlays and animation GIFs are under `artifacts/epic-revision/`. These are isolated visual fixtures; they are not legal gameplay campaigns or physical-device tests. The root delivery report records integrated verification separately.

## Honest limits

The stronger flight sequence deliberately changes body silhouette; it has four authored poses rather than continuous skeletal motion. Crouching provides two horizontal firing poses and air aim provides four authored directions. The Minotaur-to-dragon transition currently stages the rebuilt full-body bull and dragon poses; it is not a generated anatomical morph strip. Existing illustrated stalker, caster, guardian, knight, bellbeast and companion sheets are retained. No physical-device comfort or performance claim is made by this asset pack.
