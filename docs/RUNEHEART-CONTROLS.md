# Runeheart touch rebuild

The control rebuild gives the right thumb three main actions in a curved arrangement: **Dash 92px, Attack 100px, Jump 100px**. A separate **80px Power** sits to the left of this arc. Pause and equipment shortcuts are 48px. All sizes are measured CSS pixels; no claim about physical phone comfort is made.

Landscape controls occupy a reserved 164px bottom gutter plus the safe-area bottom inset. The rendered world remains above it. Portrait uses a 286px gutter to preserve the same action target sizes rather than squeezing them into a narrow row. Every button is an icon-only face. Short instructions and the selected spell's real cost sit beside the controls, outside the playfield. The HUD shows three compact resource meters and one objective/deadline; the long inventory string is hidden on touch screens and stays available in the armory. Three small, non-interactive Ember/Tide/Storm icons show recovered rune stones from `world.collections` (falling back to saved collections), with accessible individual names and a count. They share the existing deadline row rather than adding a new HUD panel.

## Player actions

| Control | Press/tap | Hold | Visible feedback |
| --- | --- | --- | --- |
| Clear part of the screen | Places a neutral floating joystick at the finger | Drag moves and aims relative to that fixed origin | Thumb displacement; translucent ring |
| Jump | Immediate jump; a second press can double jump | Jet thrust after 350ms | Progress ring; jump icon becomes a jetpack; JET THRUST status |
| Attack | Immediate sword attack | Gun fires after 120ms | Sword icon becomes a gun; FIRING status |
| Dash | Immediate dash | No alternate action | Pressed border; cooldown styling |
| Separate Power | Release casts the selected power, or interacts if the prompt showed INTERACT at press | Opens paused spell/equipment palette after 450ms | Named spell/cost, or hand icon and INTERACT; progress ring |
| Gear shortcut | Opens the paused spell/equipment palette directly | No alternate action | Native dialog, real unlock/equip states |
| Pause | Opens existing pause/settings flow | No alternate action | Gameplay input clears |

The input contract remains unchanged: movement/aim axes, jump edge/hold, dash edge, slash edge, held gun/jet, spell/interact edges, gear cycle edges and ultimate edge. Keyboard and gamepad bindings remain unchanged. The new gear shortcut uses the existing `open-loadout` event; it does not add a gameplay verb.

The paused armory includes a **Button opacity** slider from40% to100%, saved locally. It changes appearance without moving any hitboxes. Held buttons gain an additional20% opacity for feedback. The floating movement ring retains its own restrained transparency.

## Ownership and interruption rules

- One pointer owns the joystick. A second free touch cannot move its center. Buttons cannot claim it.
- Each button owns its captured pointers. Releasing Jump or Attack preserves the movement finger. If two fingers hold the same button, releasing one preserves its held action and feedback.
- The stick returns to neutral on release/cancel and remains visible for eight seconds. A new press establishes a fresh origin immediately and cancels the previous hide timer.
- Blur, hidden document, pause, a native dialog or explicit reset clears movement, keys, pending edges, hold modes, press contexts and joystick state. Late releases cannot create a spell edge.
- Power's short tap captures the context shown when pressed. Moving out of range before release cannot convert an interaction attempt into an unintended spell.
- Cooldown and insufficient-resource feedback changes appearance/ARIA state without disabling pointer release handlers. Game simulation remains responsible for ability availability.

## What changed from main/Revamp

The previous controls packed four 72–84px actions into a 110px-high arc with little distinction between main actions and magic. This rebuild has three 92–100px primary actions, an independent secondary Power, greater spacing, a dedicated gear shortcut and explicit held gun/jet icons. The floating stick and immediate 120ms held-fire contract already existed on Revamp; they were retained and tested. The original main branch had a fixed stick and a sword edge delayed until release.

Dialogue body text is 16px on touch screens; choice targets are at least 52px tall with 14px text. Portraits use the `story.portrait` field, independent of NPC IDs. Story and armory dialogs can scroll without activating the joystick.

On landscape phones the title/story sits beside the realm, difficulty and Start controls. An initial real-game smoke test found Start below the screen at740×360; the two-column layout repairs this. At844×480,740×360 and640×360 the actual game's launch controls now fit without scrolling, and all touch buttons remain below the actual Phaser canvas. A second live check found the old three-row resource block covering the spawn hero's head; a compact health row plus a shared fuel/magic row reduces this block to48px. Those live smoke captures use the current integration source; they do not replace the final asset/physics QA.

## Validation

`node --test tests/input.test.js tests/runeheart-controls.test.js` — nine tests cover fixed-origin/deadzone/clamping, independent multitouch, eight-second timer/repress/cancellation, button exclusion, immediate slash/held gun/jet, press feedback, same-button ownership, context locking, gear interruption, blur and modal cleanup.

`node tests/runeheart-controls.browser.cjs` — requires a running Vite server (default port5173), Playwright and Chromium. Set `GAME_URL` for another server and `CHROMIUM_EXECUTABLE` when using the bundled browser. The fixture imports the actual input, UI, catalog and CSS. It does not import `main.js` or run a campaign simulation.

The browser harness sends real Chromium touch events at 844×480, 740×360, 640×360 and 390×844. It measures all button boxes/gaps, rejects canvas overlap, holds movement while jumping/firing, verifies icons and immediate press edges, observes the actual eight-second stick timer, opens gear/story dialogs, checks cancel/modal cleanup and keyboard/gamepad input. Chromium's CDP implementation uses changed points for touchStart/touchEnd; the harness releases only the intended pointer.

Evidence: [fixture report](../artifacts/runeheart/controls/report.json) and [screenshots](../artifacts/runeheart/controls/). These are **isolated control/UI fixtures**, not legal campaign wins, final-art claims or physical Android tests. The backdrop is synthetic and deliberately labeled. A physical phone pass remains necessary to assess thumb reach, hand fatigue, touch latency, safe areas, frame pacing and whether the hold gestures feel intuitive.

## Integrated game input smoke

`node scripts/runeheart-live-playtest.cjs` runs the integrated game at844×480 and740×360 with real keyboard/CDP touch input. It never injects a player position, world, invulnerability, unlocked gear or a rendered pose. It records the runtime source hashes and rejects a source change during the run.

The48 captures cover actual jump/double jump/jet ascent, alternating three-part sword attacks, gunfire, dash, floating-stick combinations, Mira's real dialogue/choice, the legitimately learned and equipped Soul Siphon, a real first-room encounter, paused loadout/story timing, pause/retry, browser portrait/landscape restoration and an actual fall death followed by touch RECONNECT. The recovered spell persists after the real death. [Live report](../artifacts/runeheart/live-play/report.json) records each state and camera position; [live screenshots](../artifacts/runeheart/live-play/) show the actual renderer. This is a short input/gameplay smoke pass, not a complete campaign win or Android hardware evidence.

Inspection on the recorded integration build found readable hero/floor silhouettes, opaque stone volume and visible ledge tops, filled backgrounds during jet ascent/combat zoom-out, readable dialogue and no action-button/canvas overlap. The lantern refuge can receive fire from enemies farther ahead; it should not be described as fully safe. Portrait browser rotation uses letterboxing and restores cleanly; the Android manifest requests sensorLandscape.

Harness corrections are documented separately: an instantly released double-jump correctly cuts upward velocity to250, so the test holds the second press through a frame; NPC equipment rewards equip immediately, so the armory assertion accepts EQUIPPED. These were test assumptions corrected to match observed valid mechanics. The latest live report supersedes those intermediate attempts and identifies its exact source hashes.

## Primary guidance used

- [Android Developers: touch targets](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views) recommends at least48dp interactive areas. Our main targets substantially exceed that browser-space minimum; physical units depend on device rendering.
- [Google Android accessibility: target size and spacing](https://support.google.com/accessibility/android/answer/7101858) recommends at least48dp targets with at least8dp gaps. The harness independently measures at least8 CSS px separation rather than assuming visual circles do not overlap.
- [Material spacing methods](https://m2.material.io/design/layout/spacing-methods.html) supports separating targets rather than filling every corner with small controls.
- [Chromium CDP touch issue](https://issues.chromium.org/issues/569778218) explains the changed-point behavior used by the multitouch harness.
- [Ubisoft: Prince of Persia mobile accessibility interview](https://news.ubisoft.com/de-de/article/7HvHq2SIDTcXg6ap0v4QgD/prince-of-persia-the-lost-crown-mobile-accessibility-spotlight) describes reducing mobile input complexity and letting players adjust virtual-control transparency, size and position. Runeheart applies that research through three prominent actions, explicit held-mode feedback, a distinct power control and a paused opacity preference. The tested spacing stays fixed for this delivery.

Applied installed skills: mobile-native, game-ui-frontend, game-playtest, Atlas QA-tester role and gamedev-conventions. No Unity/Unreal/Blender dependency was introduced for this DOM/input work.
