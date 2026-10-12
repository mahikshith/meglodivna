# Retained project knowledge

Reviewed 12 October 2026. This file preserves project decisions; it is not a claim of global model memory.

## Sources

- https://github.com/phaserjs/examples — official examples and rendering/input patterns. Used for reference only; no source or franchise assets copied.
- https://docs.phaser.io/phaser/concepts/game — renderer configuration, pixel art and scale conventions.
- https://github.com/gamedev-skills/awesome-gamedev-agent-skills — requested open game-development guidance. Downloaded four skills through Codex Skill Installer to `C:/Users/mahik/.codex/skills`: `platformer`, `physics-tuning`, `level-design`, `game-feel`. Each includes its own referenced documentation.
- Installed Game Studio skills: Phaser renderer and pure simulation, DOM HUD, screenshot QA.
- Installed Atlas roles: systems programmer, level designer, asset pipeline, QA. Roles were delegated with disjoint file ownership.

## Decisions carried into the game

1. Use one coherent fantasy rather than stacking unrelated franchise features. Courier blade, rifle, dash and finite jetpack are the core verbs. The listed games inform traversal, tempo, combat responsiveness, and atmosphere. Names, visuals, story, code, and layout are original.
2. Derive mandatory geometry from movement. Run320px/s, jump670px/s with gravity1800px/s², approximately123px apex, one air jump. Fixed120Hz. Buffer120ms, coyote100ms, immediate jump cut, swept thin-solid collision.
3. Teach before testing: grounded outskirts, exposed bridge gaps, foundry climb, pulsed laser/EMP gauntlet, boss arena. Relays create recovery points.
4. Readability first: snow and edge highlights identify collision tops, muted parallax structures establish depth, blade/eyes read cyan, upgrades amber, enemy shot trails red. Separate sprite silhouette and small hurt box keep combat fair.
5. Feedback is transient: small impact freeze, particle bursts, camera shake decays, layered synthetic sound. Reduced FX respects the OS preference and player toggle. Effects do not move collision bodies.
6. No heavy-engine installation is needed for this slice. Blender5.2 is present locally, but its 3D rigid-body solver does not validate this game's custom platformer model. Unity and Unreal are unnecessary here. The requested Game Development Studio CLI was not found; no receipts or GPU claims are fabricated.

## Check evidence

Read `artifacts/browser-report.json`, `tests/`, and `LEVEL.md`. Continuous movement proof excludes combat; isolated combat and browser checks are separate evidence. Target-hardware performance and human difficulty tuning remain separate from headless diagnostics.
