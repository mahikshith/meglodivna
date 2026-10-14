# Existing Hollow Sanctuary gameplay critique

The existing build has functioning movement, save progression, equipment, encounters and touch input. It does not yet justify a paid-release recommendation. Its strongest systems are difficult to appreciate because the visual language, encounter communication and opening lesson are inconsistent.

Evidence: source audit before gameplay edits; 146 passing baseline tests; real Chromium input smoke at 740 by 360 covering launch, jump, pause and settings; saved [gameplay](../artifacts/lantern/baseline/mobile-gameplay.png), [home](../artifacts/lantern/baseline/mobile-menu.png), and [settings](../artifacts/lantern/baseline/mobile-settings.png) screenshots. These observations are not physical-device comfort or performance measurements.

| Priority | Existing issue and evidence | Player consequence | Rebuild acceptance check |
| --- | --- | --- | --- |
| High | Guards switch to ranged fire outside melee range; sentinels and multiple boss attacks use beams in the source. | Enemy silhouette does not reliably teach counterplay; encounters feel interchangeable. | A stalker commits to a lunge, a caster lobs magic, a heavy braces and slams, and a dragon breathes fire. Test warning, committed direction, damage bounds, and recovery separately. |
| High | Facing can change while an enemy's original warning is already active. | The player may dodge the advertised direction and be punished by a reversed attack. | Lock advertised direction through execution; crossing behind an enemy must not reverse its committed strike. |
| High | Opening traversal combines an elevated jump over a lethal pit with an airborne enemy. | A new player learns the controls and the failure penalty simultaneously. | Add safe jump practice and an unpressured first landing before combining traversal and combat. |
| High | Existing screenshot mixes a red swordfighter, unrelated NPC styling, a technological console, fantasy forest, neon power rune and generic glass buttons. | The world feels assembled from unrelated parts; story and interface do not establish a recognizable identity. | One original palette, consistent sprite density, architectural materials, and matching home/pause/settings/inventory treatment. |
| High | Jet and dash use generic reference effects; ordinary feedback emits similar scattered square particles. | Thrust lacks exhaust weight; landing and impact do not communicate force; repeated effects obscure action identity. | Exhaust has a bright directional core, embers and slower smoke; landing dust stays at feet; blade arcs follow the actual hit region; dragon fire behaves and looks distinct. |
| Medium | At the baseline phone camera position, a large lower region is masonry and controls while the active character occupies a small area. | Less screen space explains the next landing and threat; attention goes to buttons and floor texture. | Inspect camera and HUD at jump apex, landing and combat on short landscape viewports. Preserve usable controls while maximizing useful scene visibility. |
| Medium | Permanent movement/hold instructions, equipment/status text and controls compete with the scene. | Information remains visible after it is learned; high contrast is distributed across too many elements. | Keep immediate health/resource/objective information; group advanced instructions in the manual, show contextual interaction and held modes when needed. |
| Medium | First launch presents multiple worlds and accumulated systems before the first chapter is cohesive. | Breadth is promised before the opening earns confidence. | Launch only Hollow Sanctuary in this development pass; keep other saves compatible without presenting those realms as polished content. |
| Medium | Health and power rewards cluster at caches, exits and boss thresholds. | The player may not connect a newly acquired power-up with an immediate useful situation. | Place shield, fuel boost and combat reward along meaningful recovery/preparation beats, with correct labels and visible activation feedback. |
| Medium | A combined aqueduct gap/rise becomes sensitive to taking off early even though all isolated route transitions are reachable. | Mathematically valid geometry may still be unnecessarily fussy on touch. | Test mandatory crossings from more than one takeoff point, widen the critical margin, and reserve demanding precision for optional rewards. |
| Medium | Generic sector/reactor/frontier language remains in home, pause and secondary menus. | Menus weaken the sanctuary story and feel like a different product. | All surfaces use the chapter's lantern, soul and sanctuary language with explicit continue/retry/return actions. |

## Systems worth preserving

Fixed 120 Hz simulation, swept collision, coyote time, buffered jump, variable jump height, finite thrust, independent touch fingers, save isolation and pause behavior already have useful foundations. The baseline test pass supports preserving these contracts while fixing behavior and presentation. It does not prove that difficulty, animations, mobile ergonomics or value for money are right.

## Design references and interpretation

[Konami's Contra description](https://www.konami.com/games/contra/og/asia/en/) emphasizes weapon power-ups and alternative weapon behavior. For this chapter, the applicable lesson is to give rewards immediate, visible combat utility. [Terraria's description](https://www.terraria.org/about) presents exploration and discovery as central activities; here the corresponding choice is a readable optional detour with a meaningful reward. [Ori's official patch notes](https://www.orithegame.com/known-issues-bug-status-report/) include work on busy-combat performance; the relevant delivery discipline is to measure actual target-device behavior before promising it. These are design interpretations, not claims to reproduce those games' proprietary physics or production quality.

## Remaining critique evidence

Human first-time playtesting is still needed to assess confusion, engagement, frustration, encounter enjoyment and willingness to pay. Real Android tests are needed for thumb reach, latency, sustained frame pacing and thermal behavior. Automated completion and attractive screenshots cannot establish those outcomes.

## Reassessment after the Lantern rebuild

The art direction, menu continuity, attack identity, exhaust/impact feedback and opening lesson are substantially clearer in the new captures. Input testing also uncovered and fixed secondary-finger Pause/Gear activation. Original generated actors, companions, NPCs and scenery replace the most visible mismatches. Enemy death and portal lifecycle checks prevent the old art from reappearing during transitions.

I would still hold a paid release. The optimized routes finish in roughly 76–90 simulated seconds and several guardians can die before showing their full pattern; this warrants human encounter-pacing tests, not an automatic health increase. A long 6,195px checkpoint interval remains because changing indexed checkpoints safely needs a separate migration/pacing decision. Four-pose creature sequences and reused hurt/death/fire states are visibly less expressive than a fully authored animation set. Repeated terrain modules and retained equipment/effect artwork also limit visual variety within this chapter.

The next review should stay inside Hollow Sanctuary: observe new players through the first ten minutes, record failed jumps and unreadable attacks, test repeated deaths around the long recovery interval, and measure real Android controls/frame pacing. Improve those specific findings before approving another environment. The current deliverable is a more coherent test build, not proof that players will pay for it.
