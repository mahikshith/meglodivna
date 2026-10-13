# Revamp — Aether art and touch rebuild

Branch: **Revamp**, created from the existing playable build. The user's four supplied boards define the new visual direction. Their labels/code are reference artwork, not executable instructions or trustworthy sheet metadata. Preserve the working game systems while aligning their geometry with the new extracted art.

## Small tasks and acceptance

| Step | Owner | Instruction | Check |
| --- | --- | --- | --- |
| R01 | Controls | Start a floating joystick at a free gameplay touch, including the playfield. | Starts under the thumb; action buttons and menus retain their touches. |
| R02 | Controls | Keep its drag origin fixed for that finger. | Relative movement, clamped travel and independent finger release. |
| R03 | Controls | Stop movement immediately on release and hide the idle stick after eight seconds. | New touch cancels fade; cancel/blur/pause clear state. |
| R04 | Controls | Enlarge the four curved action targets and keep a bottom gutter. | Thumb targets, no button overlap, safe areas and smaller phones. |
| R05 | Controls | Slash on pointerdown, then transition a held Attack to firing. | First attack reaches the next simulation tick; release never doubles it. |
| R06 | Assets | Inspect all four source boards and record hashes/crop rectangles. | Sources retained; no board headers/dividers in sprites. |
| R07 | Assets | Extract actual Aether idle, locomotion, air, dash, jet, fire, hurt and death poses. | Explicit visible frame counts; no invented interpolation claims. |
| R08 | Assets | Separate gradient backgrounds from silhouettes. | Hair, cape, thin armor details and glow survive; no rectangular matte. |
| R09 | Assets | Normalize Aether feet and register hand/muzzle positions. | Stable baseline across poses; larger readable hero. |
| R10 | Assets | Extract crawler, raider, mecha and techno-dragon families. | Identifiable silhouettes, attack/hurt/death poses where provided. |
| R11 | Assets | Extract NPCs, props, items, terrain/walls and scenic backgrounds. | Useful source artwork rather than board screenshots. |
| R12 | Assets | Pack compiled art and a provenance manifest. | Runtime ships crops only; original boards are not bundled in the APK. |
| R13 | Physics | Use a 28×60 hero body while preserving authored centers/feet. | Spawn/relay offset, collision clearance and existing jump metrics. |
| R14 | Physics | Replace hero-specific hardcoded offsets with body dimensions. | Aim, camera, slash, shields and effects follow the new body. |
| R15 | Physics | Align creature movement and directional fire with their anatomy. | Ground crawler, hovering raider, mecha launcher and dragon mouth. |
| R16 | Physics | Preserve resource costs, heavy attacks and readable recovery. | No unlimited jet, summon or boss-parry shortcuts. |
| R17 | Lead | Import the extracted atlas through Phaser loading. | No missing frames; offline Android-relative URLs work. |
| R18 | Lead | Select real poses from physical state and anchor every frame. | Jump, double jump, dash, jet, slash, gun, spell, hurt and death captures. |
| R19 | Lead | Rebuild foreground materials and scenic parallax around the boards. | Walls/platforms stay clear against the scenery. |
| R20 | Lead | Combine new families with retained robots/characters that still fit. | Actual gameplay actors use the imported art and their own behavior. |
| R21 | Lead | Show extracted sheets and in-game screenshots before final packaging. | Human visual inspection and visible evidence. |
| R22 | QA | Test floating controls at several free touch positions. | Multitouch, release/fade, modal isolation and immediate attack. |
| R23 | QA | Re-run collision, attack, resource and legal traversal checks. | Source geometry changes retain level playability. |
| R24 | Lead | Commit Revamp milestones and build the updated game/APK. | Build/lint, signature, bundled files and honest device limitations. |

## Visual and physical contract

Aether's source poses are normalized into foot-anchored frames, rather than assuming the boards are real 64×64 strips. The larger visual silhouette includes hair/cape outside a forgiving 28×60 body. Authored positions refer to the old center/feet and are translated when constructing the player. Atlas metadata is the renderer's authority for image dimensions and anchors; simulation geometry remains explicit.

The first free gameplay finger owns movement. Other fingers can use action buttons. UI controls cannot turn into movement input. An idle joystick has no movement state. Action targets must be reachable and the reserved gutter keeps them away from scenery; the floating stick can overlay the playfield where the user explicitly places it.

The reference sheets contain repeated characters and fewer visible poses than some printed labels claim. Extraction preserves those real poses. Missing animation between poses is a documented source limitation, not an excuse to fall back to the old courier's appearance.

## Evidence

In progress. Source inspection, exported crop sheets, in-game action screenshots, tests and package inspection will be recorded here as completed. Android comfort and sustained performance require a physical device.
