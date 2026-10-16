# Painted correction art (October 2026)

This packet addresses the v0.9 phone playtest. All `*-source.png` files here are unmodified output from the built-in `image_gen` tool. The approved Lantern sanctuary paintings, epic revision sheets, and illustrated courier were supplied as style and identity references. `wolf-reference.png` is a crop of the previous companion sheet used only as an image-generation reference. Exact generation instructions and input references are in `PROMPTS.md`.

| Source | Runtime use | Extraction |
| --- | --- | --- |
| `sanctuary/tide/pyre/storm/veil-source.png` | Five chapter backdrops, including all three crossing themes | Lanczos 1536x864 RGB; covered at fractional scale; alternating mirror tiles prevent a camera-wrap seam. |
| `threshold-source.png` | Active travel and exit portals | Alpha-tight crop, 512x704 maximum, 88 isolated red matte specks replaced with adjacent painted color. |
| `bull-painted-source.png` | 16 Minotaur poses, plus charge/morph aliases | Connected-alpha extraction; measured original-sized pivots, body and cannon sockets. |
| `dragon-painted-source.png`, `dragon-flight-painted-source.png` | 12 dragon attack/hurt/death poses and four full-body flight poses | Connected-alpha extraction; four large components in the flight sheet, transparent background, measured cannon/mouth sockets. |
| `wolf-painted-source.png` | Eight redesigned wolf companion poses | Lanczos normalize to `wolf-painted-raw.png`, then connected-alpha extraction with measured feet and mouth sockets. |
| `slash-source.png` | Four painted `if-cut-*` frames | Four equal source cells, alpha-tight crops and one fixed hand-side emitter. |

The existing illustrated courier source provides `public/painted-correction/courier-portrait.png` for dialogue. The other three companion designs and secondary villains are retained from the illustrated character revision; their phone-scale review is part of this correction but they are not claimed as new image generations. This packet keeps the existing fixed-step simulation and finite authored pose transitions.

Rebuild in order: `python scripts/build-playtest-correction-art.py`, `python scripts/build-ironfang-assets.py`, `python scripts/build-character-assets.py`, then `python scripts/validate-playtest-correction-art.py`. The final integrity report is `artifacts/playtest-correction/qa/art/integrity.json`; it checks source/output SHA-256, texture dimensions, 43 corrected boss/slash atlas keys, eight wolf poses, solid gun/mouth sockets and the transparent dragon flight source. The report counts 12 loaded textures in this packet and their decoded RGBA footprint; it is not a measured Android RAM or frame-rate result.

Contact sheets and animation GIFs are under `artifacts/playtest-correction/qa/art/`. Integrated 740x360 and 960x540 fixtures are separate from these extraction proofs. The portal's visual display can exceed its trigger bounds; actual gameplay collision and activation are determined by the world simulation. The corrected five panoramas are distinct chapter paintings, while mirror repetition and finite 4-to-16-frame animation cycles remain visible production limits.
