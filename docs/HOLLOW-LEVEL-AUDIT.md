# Hollow Sanctuary level audit

Initial read-only audit for Stage 5, 14 October 2026; the authorized implementation is recorded below. Applied `research/level-design/SKILL.md` and its pacing reference: measure movement, teach safely, test under pressure, then reward and recover.

## Implemented Stage 5 changes and evidence

- Added a 150×22 one-way practice shelf at (800,1210), 50 pixels above the refuge floor, with a resonance pickup at (875,1182). The held-jump fixture reaches it; a failed tap lands safely on the existing floor. The shelf is an optional lesson, not an additional progression gate.
- Moved existing `soulforge-drone-8` to the supported cistern bank at (8040,815), with bank-local patrol bounds. The opening's exposed jumps no longer contain that drone.
- Extended `soulforge-aqueduct-span-42` 30 pixels left while preserving its right edge. A fixture proves the original combined gap/rise fails a 40-pixel-early launch and the revised geometry succeeds.
- Added loose shield 30 at (1270,1232), boost 8 seconds at (6320,832), rapid fire 8 seconds at (11200,1052), and fuel 60 at (14330,852). Positions are supported, do not overlap required pickups, and precede the encounters/traversal where the reward is useful. Contact, expiration, one-time claims and retry behavior are tested.
- Added local chamber guidance through existing zone subtitles and disabled global missile pressure for Hollow Sanctuary only. Existing sanctuary combat-style flags remain intact.
- Preserved all old object IDs and every checkpoint coordinate/index. New objects use explicit `soulforge-hollow-*` IDs after the original serial generation. A saved checkpoint fixture confirms old claimed items, defeated guardian and opened seal survive save/load. The duplicate Stasis reward, optional loops and checkpoint placement remain unchanged.

Validation: `node --test tests/hollow-level.test.js tests/level.test.js tests/worlds.test.js tests/progress.test.js` passed **34/34**. The first pickup fixture incorrectly supplied an empty boss list to a world factory that requires a final boss; the fixture was corrected to retain inactive authored bosses, then all checks passed.

`node scripts/combat-route.mjs forge soulforge` completed through legal inputs in **86.56 seconds**, with **one death** and a legitimate checkpoint retry. All three guardians were defeated, both conversations completed, all three stones collected and all seals opened. The death occurred at the Bell Stair caster encounter, x=3686.4, targeting `soulforge-tower-step-23`, before the first guardian. It was not at the revised aqueduct crossing. Exact campaign report and inputs are in `artifacts/combat-route-soulforge-forge-report.json` and `artifacts/combat-route-soulforge-forge-inputs.json`.

The six new tests are isolated fixtures plus save compatibility checks; they are not browser or device evidence. Final difficulty sweeps, visual/mobile input inspection, optional-vault legal traversal and physical-device comfort testing remain with integration QA. Recommendations below describe the original audit, including optional follow-ups that were deliberately not implemented.

## Findings and evidence

The current chapter is traversable in its authored order. The main weakness is how it teaches and rewards the player, with one tight combined jump and a long recovery interval. Rebuilding every platform would discard working geometry without addressing those problems.

- The chapter spans 18,770 pixels across 11 rooms, with three required stones, three guardians, two optional return portals and seven checkpoints. Required relics precede their seals. Portal destinations are supported by existing ground.
- The actual fixed-step running jump, starting at full run speed, rises **121.92 px**, travels **237.33 px** on equal-height ground and lasts **0.742 s**. Releasing jump after the initial tick rises only **21.79 px**, travels **96 px** and lasts **0.300 s**. These are isolated movement measurements, not human comfort measurements.
- All **35 transitions between route surfaces** landed with one held jump when started with the entire player on the last 28 pixels of the source platform, and when started 20 pixels earlier. The harness used only source/target surfaces, no enemies, no additional air jump, dash or thrust. It is a geometry fixture, not legal campaign evidence.
- Starting 40 pixels earlier failed only `soulforge-aqueduct-span-40` to `soulforge-aqueduct-span-42`: **130 px gap plus 100 px rise**. This combination is too close to the single-jump envelope for a comfortable mandatory mobile crossing. Existing tests separately bound rise and gap, so they do not identify this weakness.
- The opening Roots crossing has a 140 px gap and 85 px rise over spikes, with a drone on the first landing. No earlier space asks the player to distinguish a tap from a held jump. The geometry passes; its teaching sequence does not.
- Tower steps have 100 px rises but only 30–35 px horizontal gaps and 185 px landing widths. They passed the early-launch fixture. They need support/readability art and a safe demonstration, rather than wholesale movement retuning.
- Pickup rewards contain no loose `boost`, `fuel`, `rapid`, or `shield` pickups. Shield is hidden in the refuge cache or chosen from Orren; health mostly sits at room exits or boss entrances. The simulation already supports all four types.
- Checkpoints are at x=100, 2820, 4695, 6100, 12295, 13670 and 17445. The aqueduct-to-hex interval is **6,195 px**, containing the aqueduct, Tideglass Vault and crypt. A death can repeat several different lessons.
- Temporary pickup claims persist on retry while temporary boost/rapid/shield values reset. Retrying restores health and fuel, but does not restore a collected temporary buff. Therefore traversal and mandatory combat must remain possible without the buff; adding mandatory boost gates would create a retry problem.
- `world.guides` is empty. Zone subtitles after the opening repeat the same three-stone objective rather than identifying the next action.
- Existing `tests/level.test.js` and `tests/worlds.test.js` passed **21/21** during this audit. The first attempt was blocked by sandbox worker spawning (`EPERM`); the authorized rerun passed.

Existing legal campaign reports were inspected, not rerun: Ember 78.45 s / 0 deaths, Forge 91.72 s / 1 death, Inferno 88.78 s / 0 deaths, Extinction 93.47 s / 0 deaths, all reporting victory. These are automation results from the existing reports, not evidence for changes proposed below or for target-device comfort.

## Bounded Stage 5 changes

Implement in this order, then rerun the affected evidence.

| Priority | Place | Concrete change | Acceptance |
| --- | --- | --- | --- |
| 1 | Last Lantern, x=800–950 | Add a low, 50 px high one-way practice ledge above the existing safe floor, wide enough to land and recover. Introduce “Hold jump to rise; release to land sooner” where it becomes relevant. Keep Mira and her choices unchanged. | Both a failed tap and a missed landing return to the safe floor. The main route remains usable. |
| 1 | Roots, first landing | Move the drone encounter to a later safe bank, preserving its existing enemy ID and recalculating its base position/leash. Let the first guard demonstrate approach, warning, lunge and recovery on the entry bank; the first exposed jump should not also introduce aerial fire. | First gap can be practiced without a ranged attack. Enemy remains supported and cannot patrol into a pit. |
| 1 | Aqueduct third span | Extend `soulforge-aqueduct-span-42` **30 px left**, increasing width from 200 to 230 and keeping its right edge fixed. This reduces its incoming gap from 130 to 100 without changing the next jump or IDs. | The isolated jump passes at 40 px early; full-world input run also lands without mandatory jet recovery. |
| 1 | Rewards between encounters | Add explicitly named loose pickups: shield 30 around x=1270/y=1232 after the first melee; boost 8 around x=6320/y=832 before the aqueduct; rapid 8 around x=11200/y=1052 before the crypt encounters; fuel 60 on a reachable Stormwell ascent landing around x=14330/y=852. | All have clear silhouettes/labels; effects activate through overlap; retry behavior is documented and the route succeeds without collecting them. |
| 2 | Optional Roots vault | Keep the katana/mana reward and supported return portal. Use a warm light trail to distinguish the rising optional loop from the main path. Avoid introducing another required item there. | Enter, open cache, return through portal, then continue the chapter through legal inputs. |
| 2 | Tideglass Vault | Keep the required stone on the main upper platform and the optional eclipse fragment in the side vault. Replace the duplicate Stasis unlock at the vault with a visible resource reward only if its existing pickup identity and prior claims are intentionally preserved. | Players can identify the required stone independently of the optional chest; declining the branch never blocks a gate. |
| 2 | Recovery interval | Retain checkpoint indices in this pass. Consider moving checkpoint 3 from aqueduct entry x=6100 to the supported cistern bank around x=7980: this changes the adjacent intervals to 3285 and 4315 px while preserving the count/order and relic topology. Treat this as a separate measured pacing choice, not an automatic improvement. | Validate an existing checkpoint 3 save on the new support and legal traversal from checkpoint 2. Human tests decide whether the loss of the pre-aqueduct relay is worthwhile. |
| 2 | Story progression | Give each chamber a short local objective: reach Orren, read the Keeper’s recovery, cross the choir, recover Tideglass, break the coven, ascend for Storm, open the pressure valve, unbind the heart. Connect the end to Mira/Orren’s opening promise. | Objective changes match actual progress and do not claim a character was rescued before the relevant story encounter. |
| 2 | Terrain presentation | Render one-way tower walkways as narrow supported timber/stone shelves; retain deep masonry for solid collision. Frame mandatory landing edges in warm light and quiet the backdrop behind them. | At 740×360 and 844×390, each next mandatory landing is visible before launch, with no decorative root mistaken for collision. |

The suggested pickup positions are grounded in current room geometry. The fuel pickup sits on the second Stormwell step; the player can refill after spending thrust but it is not needed to clear that climb. The boost belongs before an open crossing, where the player can safely notice stronger thrust. The rapid pickup precedes encounters rather than expiring during a conversation.

## Save compatibility implementation contract

`tag()` uses one global incrementing serial inside `createRealm`. Adding a new call early in construction renumbers every later platform, enemy, pickup, prop and gate, invalidating saved claims and gate states. **Do not insert new tagged objects into the existing sequence.** Apply Hollow Sanctuary adjustments after the current generation completes, modifying existing IDs in place. Give additions explicit names such as `soulforge-hollow-practice-ledge` and `soulforge-hollow-root-shield`.

Checkpoint saves store an array index, and checkpoint advancement is monotonic by that index. Inserting a checkpoint mid-array shifts old saves; appending a mid-level checkpoint gives it a larger index than later checkpoints and prevents normal advancement. Additional checkpoints need an explicit save migration or a stable checkpoint-ID design. This bounded pass should preserve the seven existing entries and their order.

Keep realm `soulforge`, existing boss IDs, relic IDs, NPC IDs, choice IDs, gate IDs and return-portal destinations. Room coordinates and total length can remain unchanged for the changes above. Capture the old ID sets in a focused regression test before making additions.

## Required follow-up checks

1. Add a combined rise-and-gap movement fixture for the aqueduct jump and the safe opening lesson. Keep this labeled as isolated physics evidence.
2. Verify pickup effect, one-time claim, expiration and retry behavior through `stepWorld` and `retryWorld`, including an old save whose existing items are already claimed.
3. Replay the complete chapter through legal inputs with live enemies on each supported difficulty after combat integration. Record death locations, checkpoint reached, elapsed time and collected stones. Also run the optional vault return loop explicitly; the main route script does not visit it.
4. Inspect mobile screenshots and motion for landing visibility, portal return position, support art, pickup readability and story/menu transitions.
5. Use actual players on an Android device before making claims about thumb comfort, challenge, performance or commercial readiness.
