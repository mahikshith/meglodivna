# Runeheart rebuild — player feedback drives acceptance

Branch: `codex/runeheart-rebuild`, starting from `Revamp` at `93e22e1`. Delivery target: `main`, signed Android version 5 or later. The old build is preserved in Git.

## Design decision

The player is a rune courier entering an abandoned sanctuary whose guardian machines have begun harvesting spirits. Recover the Ember Heart, Tide Glass and Storm Seal, release trapped allies, and sever the reactor. Powers are discoveries with a purpose. Optional vaults, vertical side routes and return portals make exploration worthwhile.

The original movement core already had buffered/coyote jumps, wall jumps, finite jet fuel and swept collision. Comparing `main` and `Revamp` shows only four changed physics lines; the largest problems are encounter placement, presentation, controls and camera framing. Reuse and test that core while replacing the long corridor design.

## Work packages and acceptance

| Work | Owner | Small steps | Acceptance evidence |
| --- | --- | --- | --- |
| Thumb controls | Controls agent | Enlarge targets; separate them; reserve bottom space; retain floating stick; reliable pointer cancellation; visible press feedback; simplify HUD/dialogue | Multiple phone viewport screenshots, simultaneous movement/attack/jump tests, measured gaps; hardware comfort remains a user test |
| Combat and physics | Physics agent | Expand patrols; chase/retreat/jump; telegraph directional attacks; sword combo timing; dash cut; protect heavy boss attacks; remove fixed floor assumptions | Movement/displacement, collision, damage and frame-rate tests; live browser combat |
| Coherent artwork | Assets agent | Research original authors; verify licenses; import true animation strips; align feet/hitboxes/muzzles; replace muddy hero and companion; layer full-height backgrounds | Source/license/hash record; animated action/contact sheets; runtime inspection |
| Authored worlds | Lead | Replace repeated corridors; create chambers with different traversal; safe teaching encounter; stone gates; optional vaults; shortcuts; compact boss arenas | Geometry/gate tests, legal traversal/combat traces, checkpoints and retry |
| Camera | Lead | Remove attack zoom-in; velocity look-ahead; vertical tracking; frame nearby threats; settle after teleport; edge warnings | Ground/jump/jet/boss/portal screenshots and pure framing tests |
| Story and rewards | Lead + controls | Short readable exchanges; concrete objectives; early choices; rune discovery; betrayal with a clear cost | Dialogue/choice/save tests and browser flow |
| Integration | Lead | Review shared changes; action matrix; real-input playtest; long soak; performance/error report | Fresh evidence from final code, no substitution of old reports |
| Delivery | Lead | Increment Android version; preserve certificate; build/lint; merge to CI branch; verify APK bytes; release; update README | Successful CI, signed APK receipt, exact latest download link |

## Research translated into implementation

- [Swordigo, author Play listing](https://play.google.com/store/apps/details?id=com.touchfoo.swordigo): adventure through varied locations, equipment and magic; use a small set of learnable actions and visible rewards.
- [Hollow Knight: Silksong, official site](https://hollowknightsilksong.com/): interconnected ascent, allies and quests; use readable encounter roles and routes that reconnect.
- [Ori and the Blind Forest, official site](https://www.orithegame.com/blind-forest/): expressive animation and environment-led storytelling; preserve silhouettes and atmosphere throughout vertical movement.
- [Awesome gamedev agent skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills): reviewed alongside the installed platformer, level-design and physics-tuning skills. More downloaded instructions are not a substitute for testing the game.

Original ideas: stone-powered seals make discoveries alter the route; a salvage sanctuary gives a safe place to compare spells; paired return portals turn vertical detours into shortcuts; guardian vulnerability follows a visible attack recovery rather than enormous health alone. Difficulty should change timing and resource pressure, not obscure controls.

## Evidence policy

An automated win proves a route can be completed under the recorded controls. A screenshot proves a rendered state. Neither proves that a game is enjoyable, commercially ready, or comfortable on a physical phone. Record failures and repair them; do not carry over the prior build’s completion claims.

## Integration decisions and latest feedback

The user's final terrain correction is implemented through opaque architectural solids, not transparent repeated tile bands. Deep ground and thin platforms have distinct side faces and matching collision tops. The castle source sheet was found to contain modular pieces rather than a finished panorama; it is assembled into an opaque composition before shipping. Giant in-world room-name watermarks were removed.

New art is selected CC0 Gothicvania animation from Ansimuz, with retained user-supplied robots/dragon and selected effect/item assets. The hero is full proportion, with authored run, jump and three sword pose sets. Retaining old weapon sockets avoids shifting physical projectiles independently from visible emitters.

Mobile has three large core actions, a separate Power button, contextual interaction, hold gestures, an eight-second fading floating stick, adjustable opacity and a reserved bottom control region. New camera logic follows height, looks ahead and widens for nearby guardians without losing the hero.

Current legal optimized routes take roughly 1.6–3 minutes. The previous guaranteed five-minute claim was removed. Five worlds reuse traversal/combat systems and some room archetypes; they are not five entirely separate art sets or proof of five-minute human sessions. Physical phone comfort and paid-app quality remain user testing criteria.

## Delivered checkpoint

Implemented all work packages above for v0.5. Validation:140 tests,245 clean harness rounds over30 minutes1.588 seconds,392 legal campaigns,5 browser replays,48 live input screenshots,54 action fixtures and20 environment captures. Android CI passed on main; signed APK and uploaded hashes verified. Latest link is in README. Remaining limitations:physical device feel/performance, minor cape clipping at extreme short-screen ascent, repeated room archetypes and no verified five-minute minimum. These are not hidden by the automated pass.
