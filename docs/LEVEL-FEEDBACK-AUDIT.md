# Story and level feedback audit

The expanded chapters now require three mechanically different portal trials before the final guardian. The audit separates implemented level behavior, simulation evidence and the human experience that still needs observation. It applies the installed level-design skill's movement metrics, critical-path checks and teach, practice, test pacing guidance, while preserving the user's approved artwork and art-first production direction.

## Feedback and implemented response

| User feedback | Implemented response | Evidence and remaining limit |
| --- | --- | --- |
| Give the hero a motive and a journey from weak courier to leader. | An eighteen-second opening establishes a rescue promise. Mira and Orren explain the captured community and engine. Collected stones advance the journey titles from courier to lantern knight. | Story timing/boundary and progression tests pass. Titles are narrative progression, not hidden stat changes. |
| Use Ramayana inspiration and explain character powers and weaknesses. | Original rescue, messenger, bird and bridge motifs are distinguished from the cited epic episodes. The cannon dragon and Regent remain original fiction. | [Character notes and primary-text links](RAMAYANA-STORY-AND-CROSSINGS.md). No claim that newly named epic figures are fully rigged playable characters. |
| Extend levels beyond a brief corridor and add meaningful portals. | Every world gains three required crossings, nine high switch puzzles, 104 later landings per crossing, three guardian fights and forty-two rescue relays. Each crossing has four named sections with changing motion conditions. | Every trial must be entered, completed and returned through contact portals in the campaign driver. Main-route gate collisions prevent skipping unfinished trials. |
| Give environments different physics and interactables. | Wind affects airborne movement across a climb reaching 660 units; water requires an authored route over fifty-one moving rafts, alternating rising and sideways motion; fire combines increasingly high brittle ledges and staggered vents with a recoverable lower walk. | Live campaigns use the same current, moving-platform, crumble and collision systems as play. Clever fuel-powered shortcuts remain legitimate. |
| Include exploration and useful rewards. | Each trial has an optional elevated reliquary, resource courts and a companion/spell reward. | Optional treasure rooms are additional routes; campaign success does not pretend to prove every optional reward was collected. |
| Make the game winnable and allow recovery. | Original checkpoint indices remain stable. New relays sit on real supported platforms. Progress advances within each realm and can switch to another realm's relays when trials are played out of order. Trial shutters and guardian defeats persist; the first landing offers a retreat portal; completed entrances stop recapturing the hero. | Checkpoint geometry, out-of-order trials, save/retry recovery, gate persistence, portal debounce and all-difficulty campaigns are checked. Android save/update testing belongs to the delivery audit. |
| Reach at least ten minutes per level. | Each trial develops through four sections, recovery beats and a guardian climax. | All nine complete legal runs measure 652.37–702.96 seconds, with known destinations and immediate dialogue advancement. Human first-play pacing and the fastest possible completion remain **unverified**; no artificial wait timer was added. |

Enemy artwork, firing sockets, collision fixes, boost controls and companion attack changes are covered by the combat and rendering workstreams. This level audit does not use passing traversal tests as evidence that their animations look good on a physical phone.

## Pacing judgment

**Teach:** the portal landing names the trial and provides retreat. The first three chambers introduce its high switch route and environmental behavior at modest elevation. The water teaching area includes a low raft; the first moving-raft route landing has a lower catch ledge. The fire trial announces its brittle platform and vent rhythm before the long crossing. Early chambers still contain enemies and fall risk; this is a combat platformer introduction, not a claim of a completely harmless tutorial.

**Practice and variation:** the wind course alternates ascent and descent with changing air direction. The tidal course alternates fixed resting islands and oscillating rafts. The forge alternates high brittle bridges, timed vents and lower recovery terrain. Optional reliquaries branch from the teaching route and rejoin it. Existing main-world rooms still supply the earlier story, rune hunt and boss rhythm.

**Rest and test:** a permanent relay, health and resonance appear every eight course landings. The final resting landing precedes the bound guardian. Defeating the guardian opens a real collider, then the oath lever restores the heart seal and gives a direct portal home. The final main boss tests combat after all three returns; no long empty backtracking is required.

The long courses reuse obstacle patterns. Their physical differences and repeated rest points are verified; whether the repetition remains engaging and whether landmarks are readable on a phone require observed human play. Automated completion alone cannot establish addiction, comfort or entertainment value.

## Geometry and evidence boundaries

The courier runs at 320 world units per second; the single held-jump apex is about 124.69 units. Ordinary required stair rises span 70 to 110 units. Double jump, finite fuel and boost remain available through normal controls. Moving landings are evaluated at their live position, not a static coordinate. Wind drafts begin above standing height so they do not silently remove a grounded jump. The forge's maintenance walk prevents a missed vent window from producing an unavoidable fall loop.

The original static-route tests isolate baseline jump geometry. Crossing interaction fixtures deliberately position the player beside switches and therefore establish interaction and persistence only. The full campaign driver performs normal movement, combat, armory and story actions, including its optional Bellbeast approach and portal return. Its recordings contain no health, position, clock, damage or invulnerability overrides.

The final measured matrix, gameplay source hashes and exact archived driver hashes are stored in [the campaign summary](../artifacts/epic-rebuild/campaign-summary.json). All 231 automated tests pass. Every completed campaign opens all twenty-one gates and witnesses all three crossing guardians attack from full starting health; all final dragons transform and attack. Eight runs use no retries; Extinction uses one. Physical-device performance, touch comfort and first-player time remain separate acceptance checks.
