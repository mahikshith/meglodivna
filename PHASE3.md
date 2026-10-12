# Fractured Realms — implementation and acceptance ledger

Updated 13 October 2026 after gameplay source freeze. Priorities: comfortable Android controls, physically readable villains, then five selectable worlds with at least five minutes of legal live gameplay each. Existing saves remain valid. User authorized specialist agents, research, repository commits, APK delivery and a 30–40 minute development harness. Names, artwork, story and code are original.

## Final Android layout

The earlier dense grid is replaced by **four action buttons and a round joystick in a reserved 112 px bottom gutter**. The rendered world ends above the gutter, so controls do not cover landing surfaces. Dimensions are CSS pixels, not physical millimetres.

| Control | Size | Action |
| --- | --- | --- |
| Circular joystick | 112 × 112 px | Analogue movement/directional aim, 15% radial deadzone, clamped thumb travel and independent pointer. Up aims upward; down plus Jump drops through a one-way platform. |
| Jump arrow | 56 × 56 px | Press jumps; hold beyond 350 ms also engages the finite-fuel jetpack. |
| Attack sword | 52 × 52 px | Release a tap under 180 ms to slash; hold at least 180 ms to fire the equipped gun. |
| Dash | 48 × 48 px | Immediate sword dash, subject to its physical cooldown. |
| Power sigil/hand | 48 × 48 px | Release a tap under 450 ms to cast; near an NPC, lever, valve, conduit or travel portal it becomes a hand and interacts. Hold at least 450 ms to open the paused loadout on the spell tab without spending resonance. |
| Separate Pause | 44 × 44 px | Pause/resume through the existing menu, apart from the action arc. |

All actions have accessible labels. Gear, summons and other powers are selected in the loadout rather than adding persistent buttons. Keyboard/gamepad retain separate gameplay verbs; touch macros combine them to reduce clutter. Pointer cancellation, blur and modal opening clear held actions. Physical thumb comfort requires the user's next Android test.

## Ownership and tiny steps

“Implemented” means integrated source behavior exists; checks prove stated properties, not enjoyment or device comfort. Packaging is separate from source completion.

| ID | Small task and instruction | Owner | Status | Evidence or limitation |
| --- | --- | --- | --- | --- |
| P01 | Replace text movement buttons with the round analogue stick; preserve verbs. | Controls | Implemented | `tests/input.test.js`: radial deadzone, diagonal clamp, independent pointer and cancel/blur/modal release; browser stick plus Jump check. |
| P02 | Use four SVG action icons with tap/hold macros and accessible labels. | Controls | Implemented | Final dimensions above; browser checks four targets, reserved gutter and all macros. Supersedes the original eight-button proposal. |
| P03 | Put gear switching in a paused loadout and gate gameplay inputs. | Controls | Implemented | Catalogue locks/equip/pause/focus; long Power hold does not spend resonance. |
| P04 | Give each ordinary archetype directional intent and appropriate physical motion. | Systems | Implemented with limits | Collision-resolved chase/retreat/jump for ground enemies, shade dash, drone patrol/bob, mounted turret. Six archetypes, not separate AI per individual. |
| P05 | Give bosses advance/retreat/leap/recovery and readable emotions. | Systems | Implemented with limits | Dynamic-system tests cover movement, enrage and bounded taunts. Three physical families plus four world modifiers, not fifteen unrelated AI systems. |
| P06 | Share hand/core/launcher origins between simulation and render. | Systems + art | Implemented | `weaponOrigin`/`projectileAim` shared with render; mirrored/diagonal origin tests. |
| P07 | Render distinct projectiles, rockets and launcher recoil. | Art + lead | Implemented | Carbine/scatter/rail/rocket/cannon and enemy fire visuals; swept/diagonal damage checks. Phone visibility still unmeasured. |
| P08 | Separate useful light parries from heavy boss attacks. | Systems | Implemented | Two light parries per swing; heavy rockets/beams resist. Borrowed Spark refunds 5 capped resonance per legal light parry; tests exclude heavy refunds. |
| P09 | Alternate horizontal/overhead/finisher cuts and attacking sword dash. | Systems + art + lead | Implemented | Distinct poses/arcs/hitboxes, swept dash and once-per-swing damage; browser alternating-slash check. No imported 3D rig. |
| P10 | Animate real shields, pickups and activations. | Art + lead | Implemented | Shield frames/rings reflect state. Skybreaker suppresses ordinary sentinel wards for three seconds, restores them and preserves boss wards; regression tests. |
| P11 | Add temporary clone/wolf/dragon through arrival circles. | Systems + art | Implemented | Delayed arrival, targeting, attacks, cost and expiry; maximum three allies, grounded wolf collision; lifecycle tests. |
| P12 | Announce villain portals and summoned threats before damage. | Systems + lead | Implemented | Safe Hex exit/arrival recovery tests; delayed bounded enemy summons; Veil extra warned shade exit. |
| P13 | Rebuild wizard/witch/friendly art and portraits. | Art + world | Implemented with limits | New silhouettes, wizard/witch idle/cast/hurt sheets and Ysra portrait. Friendly NPCs remain dialogue actors rather than complete combat allies. |
| P14 | Add boss motive/taunts and meaningful friendly choices. | World + systems | Implemented | Taunt/enrage timers; one-time validated rewards. Disclosed 25-life Dragon Pact triggers an ambush once; cost/claim tests. |
| P15 | Replace triangle traps with mechanical warning/retracted/active frames. | World + art + systems | Implemented | `tests/hazards.test.js`; renderer derives frames from `hazardState`. Permanent pit traps remain always dangerous. |
| P16 | Remove stage-like spotlight cones. | Lead | Implemented | Background/presentation revision and spotlight overlay removal. Triangles still represent legitimate exhaust, debris and warning icons. |
| P17 | Highlight traversable surfaces with rims/material texture. | Lead + art | Implemented | Platform rim/material renderer and world tiles; browser world renders. Human recognition speed unmeasured. |
| P18 | Replace visible inbound words with red edge icon and lane cue. | Controls + lead | Implemented | Warning precedes heavy right-to-left missiles; browser icon/spawn check. Accessible warning text remains. |
| P19 | Aim lasers from anatomy with energy along their axis. | Systems + lead | Implemented | Shared endpoints/width, segment collision and moving-core warning tests; security lasers have emitter hardware. |
| P20 | Add close story/impact framing without moving physical geometry. | Lead | Implemented with limits | Restrained zoom/shake, story focus, reduced effects and elapsed-time smoothing. Android motion comfort untested. |
| P21 | Simulate currents, raft, crumble, steam, conduit and portals. | World + systems | Implemented | Dynamic tests: collision-aware drift, rider carry, crumble/restoration safety, shield links and destinations. Decorative scenery has no rigid-body simulation. |
| P22 | Extend Soulforge with traversal/combat/story beats. | World | Implemented; duration proven | Forge full live proof 335.70 s; all encounter objectives complete through legal inputs. |
| P23 | Build Tide: drowned fleet, tunnels and raft routes. | World | Implemented; duration proven | Forge 349.63 s; sea/current/raft properties and boss undertow warning 0.7 s → push 1.2 s. |
| P24 | Build Pyre: volcanic prison and pressure conduit. | World | Implemented; duration proven | Forge 336.77 s; crumble/steam/conduit and infernal boss burn. |
| P25 | Build Neon: techno transit and security machinery. | World | Implemented; duration proven | Forge 336.08 s; lifts/shutters and overload faster heavy rockets/extra volley/shorter recovery. |
| P26 | Build Veil: wizard crypt, mirror passage and suspicious guide. | World | Implemented; duration proven | Forge 336.59 s; portal/summon/bargain consequences and mirror modifier. |
| P27 | Research verified references and propose distinctive physical decisions. | Research | Complete | `research/PHASE3-RESEARCH.md`: primary sources, eight coherent ideas and truthful implemented/future status. |
| P28 | Catalogue actual traits and preserve independent world encounters. | Systems + controls | Implemented | Actual gear/summon costs; validated world snapshots/discoveries/spent charges/claims. Switch/restart/migration tests. |
| P29 | Run timed fresh-process development checks and investigate failures. | Lead + QA | Completed with repaired failures | 1800.002 real seconds, 25 rounds, 17 transient failed rounds during development; rounds 24/25 passed. Not 30 clean post-freeze minutes. |
| P30 | Build production/Android, lint and inspect the delivered APK. | Lead | Final packaging in progress | Source integrated; final source/APK rebuild and CI checks are being performed. Current outcome belongs in `VALIDATION.md`/`artifacts/android-report.json`; earlier Soulforge packaging is not evidence for this build. |

## Legal live gameplay evidence

These durations use full live combat/hazards and legal movement, weapon, gear and dialogue actions; no added waiting. They are simulated gameplay duration, not guaranteed human completion time. Movement-only route tests omit combat and are not the five-minute evidence.

| World / difficulty | Live gameplay |
| --- | ---: |
| Soulforge / Forge | 335.70 s |
| Tide / Forge | 349.63 s |
| Pyre / Forge | 336.77 s |
| Neon / Forge | 336.08 s |
| Veil / Forge | 336.59 s |
| Soulforge / Ember | 326.29 s |
| Soulforge / Inferno | 357.59 s |
| Soulforge / Extinction | 382.49 s, one retry |

Reports: `artifacts/combat-route-<world>-<difficulty>-report.json`, with generated traces beside them. Route/world tests separately cover geometry, identifiers, valid rewards/gates and actionable environment properties. Reachability/duration does not establish non-repetition or addictiveness.

## Timed harness evidence

`artifacts/deep-harness-report.json` records 30 minutes of repeated fresh-process simulation and bounded soak checks while source was changing: 25 rounds, 17 transient failed rounds, final rounds 24/25 passed. Failures were investigated and repaired. Its final `passed` status must be read alongside that development failure history. The integration lead reports 99 passing tests for frozen gameplay source.

This is regression/stability evidence, not 30 clean minutes of post-freeze browser or Android play. Browser layout/render checks sometimes use isolated position fixtures; they are separate from legal-input campaign proofs and physical device assessment.

## Original design direction

Borrowed Spark and Break the Ward are implemented additions: legal light parries recover capped resonance; thunder creates a three-second ordinary sentinel opening while boss defenses require their authored counterplay. The following concepts also have real source behavior:

1. **Undertow routes:** water currents alter aerial drift; rafts create moving landing targets above drowned passages.
2. **Broken furnace oath:** valves and conduits create boss weakness windows; fire powers and machinery share one visual language.
3. **Mirror hunt:** enemies announce portal exits before repositioning; direction becomes a tactical clue rather than hidden damage.
4. **Echo covenant:** temporary companions arrive through summoning circles and spend resonance; they have their own attack and lifetime.
5. **Counterfeit guide:** a tempting reward can carry a clearly communicated curse or encounter consequence; inspect dialogue before choosing.
6. **Weapon anatomy:** every shot has an identifiable launcher, hand or exposed core; heavy attacks cannot be erased by an ordinary sword.

## Shared interfaces

World IDs: soulforge/tide/pyre/neon/veil. Level module exports LEVEL (default), LEVELS, getLevel(id), WORLD_LIST and createEnemies(level=LEVEL). World state owns level/worldId. Rendering rebuilds static views on world changes. Boss beams use endpoints x0/y0/x1/y1 and width; the same authoritative weaponOrigin is used in simulation and presentation. New presentation keys are announced by the art agent. Input remains verbs independent from UI text/icons.

The five worlds reuse room builders and three physical boss families under fifteen named encounters; four world powers add real behavioral differences. Additional independently authored boss patterns remain future work. Stationary-clone flanking, player-portal beam redirection, cross-world spared-enemy story flags and optional rescue time refunds remain research proposals, not implemented features.

Physical Android performance, thumb reach, sound mix and player engagement still require human/device testing. Browser multi-touch and APK builds provide evidence but do not replace that assessment. Addictive/fun is a playtesting goal, not an automated assertion. Final packaging evidence is maintained by the integration lead.
