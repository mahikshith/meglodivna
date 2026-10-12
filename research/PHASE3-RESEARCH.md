# Fractured Realms — reference research and original mechanic proposals

Reviewed 13 October 2026. This is design research, not evidence that a proposal has shipped. Implementation observations refer to the current `src/worlds.js`, `src/combat.js`, `src/catalog.js`, and `src/input.js`; final playable verification belongs in `VALIDATION.md`.

Final documentation audit: Borrowed Spark, Break the Ward, environmental properties, temporary clone/wolf/dragon summons, disclosed bargain/ambush and four world-specific boss powers are implemented. Stationary-clone flanking, portal beam redirection, spared-enemy story flags and optional rescue time refunds remain future proposals. The latter must not appear in shipped-feature claims.

The final touch layout is a 112 px reserved bottom gutter with a 112 px round joystick, four icon actions—Jump 56 px, Attack 52 px, Dash 48 px, Power 48 px—and a separate 44 px Pause icon. Attack tap/hold means slash/fire; Jump hold engages jet thrust; Power tap casts or contextually interacts, while a long hold opens the paused loadout. This replaces the earlier dense button grid. Independent-pointer and browser macro checks support functionality; physical thumb comfort remains unverified.

## The identity to build around

**A living soul can turn industrial violence into ancient magic.** The courier carries something machinery cannot manufacture. Firearms give reliable reach, swords make dangerous close engagement worthwhile, and resonance buys short-lived supernatural advantages. Enemy weapon anatomy must explain where damage comes from; the environment should give the player ways to interrupt that machinery. This connects the technology, sorcery and story instead of presenting an unrelated list of powers.

The five worlds should ask different physical questions: Soulforge teaches commitment and weapon origins; Tide asks how to land against a current; Pyre asks when to risk unstable terrain to disrupt a shield; Neon asks when to cross moving security geometry; Veil asks whether a visible portal or a tempting bargain is safe. Changing palette alone does not create a new level.

## Verified reference lessons

| Primary reference | What its source establishes | Design inference for this game |
| --- | --- | --- |
| [Ori and the Blind Forest official quickstart manual](https://manuals.thqnordic.com/OriAndTheBlindForest/Ori_PC_QuickstartGuide_online.pdf) | Wall jumping, double jumping, dash and Bash are different actions. Bash uses a nearby lantern or projectile, launches Ori in an aimed direction and redirects the projectile the opposite way. | A projectile can become a physical opportunity rather than only damage. Use our existing parry/resonance rules for a different identity; do not reproduce Ori's artwork or movement package. |
| [Team Cherry's Silksong site](https://hollowknightsilksong.com/) | Acrobatic attacks, silken abilities, crafted tools, varied foes, allies and interconnected illustrated environments are part of its stated design. | Distinct silhouettes and physical attack commitments matter more than adding identical enemies with different health totals. This page does not establish exact invulnerability timings or hidden boss AI; none are asserted here. |
| [Motion Twin's Dead Cells site](https://deadcells.com/) | Pattern-based enemies and bosses, distinct weapons/spells, nonlinear progression and hidden routes are explicit features. | Each enemy needs a recognizable windup, attack and recovery. Side-route rewards should suit different builds. Keep our relay checkpoints; permadeath would not fix touch readability. |
| [Playdigious's Dead Cells Android listing](https://play.google.com/store/apps/details?id=com.playdigious.deadcells.mobile&hl=en_US) | The publisher describes a redesigned mobile interface, original/auto-hit modes, control position/size changes and swipe dodge. | Touch controls deserve a separate layout. Start with a fixed circular joystick, clear action icons and independent pointers; user customization is a later comfort improvement. The source does not prove any particular layout will be comfortable on this user's phone. |
| [Direlight's Grimvalor page](https://direlight.com/grimvalor/) | Its dark fantasy action is designed for touch and gamepads, with dashes, dodges, special attacks and pattern-learning bosses. | Fast combat can work on phones if movement and defensive actions remain easy to reach. Measure the thumb task, not only whether a button click fires. |
| [Touch Foo's Swordigo Android listing](https://play.google.com/store/apps/details?id=com.touchfoo.swordigo&hl=en_US) | Mobile-focused platforming, customizable controls, dungeons, towns, treasures, weapons and spells are publisher-described features. | Friendly spaces and treasure hunts can create breathers between intense encounters. Dialogue should communicate what is at stake and the actual cost of a bargain. |

These are feature comparisons, not claims that we have personally played the competitors or benchmarked their handling. The current Playdigious website game URL returned “Game Not Found,” so the verified publisher-owned Android listing is used instead.

## Relevant skill guidance

No new engine or dependency is required to apply these disciplines. The upstream guides were inspected as design sources; the installed game-feel and Game Studio UI guides also match this project.

| Guidance | Concrete instruction for this codebase |
| --- | --- |
| [game-ai](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-ai/SKILL.md) | Keep patrol/chase/retreat/aim/attack/recovery decisions separate from collision-resolved movement. A small state machine suits these enemies; adding a behavior-tree framework is unnecessary. |
| [input-systems](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/input-systems/SKILL.md) | Preserve named gameplay verbs across keyboard, pad and touch. Use radial deadzone with smooth scaling. Jump/interact are edges; movement/jet/fire are held inputs. Test simultaneous joystick and action pointers plus cancellation. |
| [camera-systems](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/camera-systems/SKILL.md) | Lead toward travel direction, retain level bounds, smooth using elapsed time and update after physics. A dramatic zoom must retain enough view to read the next damaging action. |
| [level-design](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/level-design/SKILL.md) | Derive geometry from measured movement, introduce mechanics safely, then develop and combine them. Place breathers before major tests. Shared room builders need deliberately different encounter arrangements to avoid repeated beats. |
| [Phaser input documentation](https://docs.phaser.io/phaser/concepts/input) | Phaser supports multiple pointers. Our DOM action layer already tracks pointer IDs, so preserve that ownership rather than mixing it with a competing canvas joystick. Do not treat one global active pointer as the entire touch controller. |

## Eight coherent ideas, with implementable acceptance checks

### 1. Borrowed Spark — implemented new addition

**Trigger:** a light enemy projectile intersects the sword during its existing 0.1-second parry window. **Decision:** dodge safely or step into the projectile to recover resonance. **Physical effect:** the current projectile reflection remains unchanged; additionally restore 5 resonance, capped at `maxMana`. **Counterplay:** the existing limit of two parries per swing prevents a barrage from filling the meter; heavy boss rockets and beams remain unreflectable and give nothing.

Implementation: the existing successful reflection branch of `updateProjectiles` restores 5 resonance, capped at `maxMana`, and emits the existing parry event. `tests/dynamic-systems.test.js` checks legal light parries, the two-per-swing bound, the meter cap and heavy-projectile exclusion. This gives guns-to-sorcery conversion without adding an Android button. Status at final source freeze: **implemented**.

### 2. Break the Ward — implemented new addition

**Trigger:** Skybreaker hits a shielded ordinary sentinel. **Decision:** spend 35 resonance to create a short melee opening, or preserve resonance and work around the shield. **Physical effect:** save its existing shield, clear it, and set `wardDisabled` and `weakened` to three seconds; the saved shield returns when suppression expires. **Counterplay:** boss wards require their authored conduit/valve or an earned Nova; routine thunder cannot erase a main villain's defense.

Implementation: the existing thunder branch applies suppression only to ordinary sentinels, and the simulation restores the saved shield at expiry. `tests/dynamic-systems.test.js` checks suppression, restoration and boss immunity. This differentiates normal armor from plot-critical boss protection. Status at final source freeze: **implemented**.

### 3. Undertow Route — present in Tide

**Trigger:** enter a current volume near moving rafts and a treasure loft. **Decision:** take the safe crossing or budget jet fuel against the drift to reach the reward. **Physical effect:** current velocity acts through collision-aware external movement; the raft carries a standing player. **Counterplay:** stand outside the volume, wait for the raft, or reserve booster fuel. **Check:** current pushes without penetrating walls, raft carries in both directions, no landing trap is required for the critical path.

The current code contains current volumes, raft movement and loft caches. A later refinement could alternate current direction after a clearly visible tide change; this refinement is **not present**.

### 4. Broken Furnace Oath — present in Pyre

**Trigger:** reach the pressure valve/conduit before the protected furnace boss. **Decision:** fight against resistance or risk unstable basalt and steam to disrupt the apparatus. **Physical effect:** the authored interaction clears its linked shield and creates a weakness interval; crumble plates warn before disappearing and return after a delay. **Counterplay:** route around steam, retreat while pressure is active, avoid waiting on cracked terrain. **Check:** opening the linked gate affects only its boss; restoration never appears inside the player; the boss is never silently invulnerable.

The current code contains the conduit link and eight-second weakness, steam and crumble. The valve's effect should be communicated visually and in the nearest dialogue, not hidden behind damage numbers.

### 5. Mirror Hunt — present in Veil and portal bosses

**Trigger:** a visible portal exit appears before a boss relocation or summoned enemy. **Decision:** move away from the exit, place a ranged shot across it, or exploit the boss's arrival recovery. **Physical effect:** relocation occurs only after the warning; the boss has an arrival grace interval. **Counterplay:** exits avoid overlap and leave escape space; summoning circles give a delayed arrival. **Check:** no contact damage on arrival and no attack before the grace interval expires.

Current code supports these warnings and delays. Redirecting lasers through player portals would be a new high-risk mechanic requiring authoritative transformed beam geometry; **defer that extension** rather than draw a fake portal beam.

World-specific boss powers now change the simulation as well as presentation. Tide's **undertow** marks a current zone for 0.7 seconds before it physically pushes the courier for 1.2 seconds. Pyre's **infernal** projectiles apply timed burn on impact. Neon's **overload** accelerates heavy rockets, adds a volley and shortens recovery. Veil's **mirror** announces an extra exit before queuing a delayed, bounded shade. These four effects have assertions in `tests/dynamic-systems.test.js`; they modify the shared boss families and are not four entirely separate AI implementations.

### 6. Echo Covenant — present summons, new formation proposal

**Trigger:** cast clone, wolf or dragon. **Decision:** spend resonance on ranged cover, ground pursuit or aerial fire for a brief encounter. **Physical effect:** a circle announces delayed arrival, each companion has target selection, motion, attack and expiry; the wolf collides with terrain. **Counterplay:** costs and duration cap the advantage; unsafe positions may waste the summon. **Check:** three-companion bound, no attack during arrival, expiration removes combat participation, no unearned unlock.

Those summon systems are present. A later **Hold the Echo** variant could make a clone stay where it was cast for eight seconds, letting the courier flank a shielded target while the clone draws aim. This would require enemy target arbitration and a visible stationary circle; it is **not shipped**.

### 7. Counterfeit Guide — present Veil bargain

**Trigger:** the witch offers a Dragon Pact with a stated 25-life cost and an ambush. **Decision:** take immediate power, refuse, or choose the safer alternative. **Physical effect:** validated dialogue applies the cost once and triggers its linked enemy portal; the discovery persists. **Counterplay:** the consequence is disclosed before choice and the encounter exit remains possible. **Check:** insufficient health rejects the bargain, retries/world switches cannot farm the reward, and the portal cannot activate from merely opening dialogue.

Current world data explicitly contains this choice and consequence. A future story branch could let spared enemies vouch for the courier in another world; this requires persistent story flags and is **not present**.

### 8. Signal Extraction — future urgency with a choice

**Trigger:** a side room holds trapped souls while the reactor clock runs. **Decision:** spend time rescuing them for a bounded time refund, or race straight to the boss. **Physical effect:** completing an optional physical release sequence adds 12 seconds once per room, up to the original world deadline. **Counterplay:** the rescue contains a different traversal/combat test; refunds do not provide endless time. **Check:** single claim persists through death and switching worlds; no refund above the deadline; every world remains completable without the rescue.

This is an original proposal, **not implemented**. It makes urgency an authored tradeoff instead of forcing continuous maximum-intensity combat. Build one hand-authored room before expanding it across all worlds.

## Practical next instruction sequence

1. The joystick, four icon actions and shared weapon-origin geometry are implemented. Prioritize the user's next device assessment of thumb comfort, platform visibility and emitter alignment; these directly address the failed Android test.
2. Borrowed Spark and Break the Ward have landed through their existing branches with acceptance tests. Preserve their bounds and boss exclusions during subsequent balancing; final source freeze has 99 passing tests as recorded by the integration lead.
3. Show one illustrated world card per world explaining its main physical property. Do not fill the playfield with descriptions.
4. For each room, verify **teach → develop → twist → test → relief**. Avoid consecutive rooms with the same geometry, enemy placement and solution even when built from the same module.
5. Capture each boss's launcher/core firing in both directions, one diagonal aimed shot, recoil, shield break, hurt/recovery and portal arrival. Compare the sprite emitter against the same `weaponOrigin` used for collision.
6. Completed legal-input Forge proofs are Soulforge 335.70 s, Tide 349.63 s, Pyre 336.77 s, Neon 336.08 s and Veil 336.59 s. Soulforge Ember/Inferno/Extinction complete in 326.29/357.59/382.49 s respectively; Extinction includes one retry. The 1800.002-second development harness ran 25 rounds with 17 transient failures while code changed; final rounds 24/25 passed. This is not 30 clean post-freeze minutes. Finite coordinates/pools prove stability, not enjoyment.
7. Ask the next human playtest to cover thumb reach, accidental actions, platform visibility and whether each boss can be read before it hits. Current automated touch checks cannot resolve these subjective/device-specific questions.

## Honest coverage boundaries

The current five worlds have distinct environment properties and named encounters, but reuse room builders and three boss behavioral families. Fifteen named bosses are not fifteen independently designed AI systems. Five-minute completion evidence is duration/reachability evidence; it does not establish non-repetition or addictiveness. Additional unique attack patterns should be authored after playtest findings rather than multiplying health pools and renaming bosses.

No competitor assets, code or proprietary dialogue were copied. Competitor handling on physical devices and player engagement were not independently measured.
