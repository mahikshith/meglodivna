# Fractured Realms — original pixel assets

src/art.js creates/reuses **347** deterministic original raster textures and exports PALETTE, WORLD_ART and createArtTextures(scene). No franchise art, external images or paid assets were copied. Characters/objects use **one-pixel detail**; backgrounds/terrain use **two-pixel clusters**. Nearest-neighbor rendering and binary alpha preserve crisp edges.

Creation returns `{key,width,height,anchor:{x,y},notes}`. Inspect the dynamic manifest instead of asserting the old 121 count. Art generation happens during loading, not per gameplay frame. Original keys are preserved.

## Frames and anchors

| Family / keys | Size | Pixel anchor |
| --- | --- | --- |
| player-idle-0..3, player-run-0..7, player-jump/fall-0 |64×72 | feet32,68 |
| player-slash-0..3; player-slash-overhead/horizontal/finisher-0..3; player-lunge-0..3 |128×160 | feet64,152 |
| player-shoot-0..3, player-hurt-0..1, allied-clone-0..3 |64×72 | feet32,68 |
| guard-0..3 /drone-0..3 /turret-0 |48×56 /56×40 /56×56 | feet24,54 /center28,20 /feet28,54 |
| mage/shade/sentinel-0..3; mage-idle/cast/hurt-0..3 |64×80 | feet32,76 |
| wizard/witch-idle/cast/hurt-0..3 |80×96 | feet40,92 |
| boss-0..3; boss-warden-0..3 and run/attack/hurt-0..3 |128×144 | feet64,138 |
| boss-hex/regent-0..3 and run/attack/hurt-0..3 |160×192 | feet80,184 |
| npc-mira/orren/vesper and -0..3 idle frames |64×80 | feet32,76 |
| portrait-mira/orren/vesper/ysra |96×96 | center48,48 |
| weapon-carbine/scatter/rail/cannon/launcher/rocket |80×40 | handle16,24; muzzle74,20 |
| projectile-bullet/carbine/scatter/rail/rocket/pressure/fire/hex/needle/arc/dragonfire/ally |48×24 | center24,12 |
| shield-0..3 |96×112 | center48,56 |
| summon-circle/portal-0..3 |128×128 | center64,64 |
| wolf-0..3 /dragon-0..3 |96×64 /160×112 | feet48,60 /center80,56 |
| spike-trap-0..3 |96×64 |48,60 |
| pickup-{type}; pickup-{type}-0..3 |40×48 /64×80 | center20,24 /32,40 |
| icon-{catalogId},26 gear/spell/relic glyphs |48×48 | center24,24 |
| tile-steel/wall/tide/pyre/neon/veil; tile-snow |64×64 /64×32 |0,0 /0,16 |
| background-far/mid, plus far/mid-{snow,ruins,furnace,storm,eclipse,reactor} |960×720 |0,0 |

Pickup types: health/fuel/rapid/shield/boost/mana/weapon/sword/armor/spell/treasure/cannon/nova. New icon IDs include rocket/clone/wolf/dragon. Antenna/pipe/lamp/crate and barrel/cache/lever/gate sizes/anchors remain in the manifest.

## Physical alignment

Sprites face right; flip for left. Divide pixel anchors by frame dimensions to obtain Phaser origins. Feet align at `(body.x+body.w/2,body.y+body.h)`. The courier stays64×72 inside enlarged melee frames at offset32,84: change origin when switching textures, not body scale. Simulation vertical/horizontal/finisher/dash selects overhead/horizontal/finisher/lunge art.

Gun-ready hand local37,41 matches `(centerX+facing*5,y+h*.42)`. Separate guns render at **.6scale** around handle16,24. Their handle-to-muzzle vector58,-4 becomes34.8,-2.4. At aim angle a, the physical muzzle is `hand+(cos(a)*34.8+sin(a)*2.4,sin(a)*34.8-cos(a)*2.4)`. Shared weaponOrigin/projectileAim helpers are authoritative; boss/foe weaponSlot selects core/hand/gun/rocket.

Chest cores: Warden local62,61; Hex80,106; Regent80,98. These align with `(centerX,y+h*.35)` at the listed feet anchors. Aimed overlays use beam endpoints x0/y0/x1/y1 and width, and projectile angle/velocity. Artwork does not define damage boxes or rays. Shields/circles/portals have transparent centers.

Trap frames show retracted/warning/extended/retracting states; simulation owns timing/damage. Ally action/lifetime, portal arrival, pickup consumption and prop destruction are simulation-owned. Decoration adds no collision.

## World themes and budget

| World ID | Reused far/mid layer | Foreground / compact pieces |
| --- | --- | --- |
| soulforge | snow; renderer may use all six campaign biomes | tile-steel, tech-console |
| tide | ruins | tile-tide, sea-wave-0..3, sea-rock |
| pyre | furnace | tile-pyre, fire-column-0..3, dungeon-arch |
| neon | reactor | tile-neon, tech-cables, tech-console |
| veil | eclipse | tile-veil, wizard-tree, dungeon-arch |

WORLD_ART supplies far/mid/decor/tile keys. Bright top rims distinguish collidable surfaces from architecture. Compact wave256×96, fire96×128, arch128×160, console96×80, tree128×192, cables128×128 and rock128×96 textures can be reused/culled without another fullscreen image per room. Far layers are opaque; mid layers transparent. No triangular stage spotlight assets are added.

Total source allocation: **51,931,904 RGBA bytes /49.53MiB**, below the55MiB native validation budget. Ysra's96×96 witch portrait adds36,864 bytes; its pointed hat, violet eyes and long hair distinguish the guide from Orren. Fourteen960×720 full backgrounds are retained and reused across worlds. This is a source-pixel estimate; GPU copies/renderer overhead are additional and unmeasured.

## Evidence and sound

artifacts/assets/ contains PNGs and the dynamic manifest. **artifacts/refinement-art-sheet.png** shows actions, bosses, spellcasters, survivors, summons, traps, weapons and theme pieces; the final export incorporates portrait-ysra. **artifacts/refinement-asset-report.json** records asset dimensions, nonempty pixels, binary alpha, anchors, restart reuse and budget checks. Final integrated scene/browser/Android evidence belongs in VALIDATION.md.

Touch interface art uses a 112 px analogue stick, four curved gesture buttons and a 44 px center pause control in a reserved 112 px bottom gutter. Attack tap/180ms hold means slash/fire; Jump tap/350ms hold means leap/thrust; Power tap/450ms hold means cast-or-context-interact/paused Sorcery-gearing palette; Dash is direct. The root renderer adapts the full-width game viewport above the controls. These interface assets are separate from the 347 raster textures and do not change combat geometry.

Sound.play accepts event objects or legacy strings and differentiates carbine/scatter/rail/rocket, shield activation and summons. Finisher metadata selects heavier slash feedback. Thunder, cannon, destruction and sorcery remain brief; voices cap at24 and disconnect when finished. Mute/reduced effects remain available. Speaker mix, perceived feel and physical Android comfort are not established by asset checks.
