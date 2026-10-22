# Progress

## Current phase: 3 — Regions 2–6 (in progress)

Phase 2 (core loop polish) is done: see "Phase 2 — Core loop polish ✅" below.

### Phase 3 milestones

| Milestone | Status |
|---|---|
| M3.0 Groundwork: world map, travel, Phase 3 mechanics | ✅ Done |
| M3.1 Region 2: Whispering Library | ✅ Done |
| M3.2 Region 3: Merchant's Crossing | ✅ Done |
| M3.3 Region 4: Forked Road Forest | ✅ Done |
| M3.4 Region 5: The Endless Mines | ✅ Done |
| M3.5 Region 6: Clocktower Peaks | ✅ Done |
| M3.6 World map polish, badges, reading-level pass, final check | Started (world map shows quests done per region) |

**Paused here at the owner's request** (2026-10-22). Regions 7–11 (Phase 4) were being
written in separate worktrees (`.claude/worktrees/region-7` … `region-11`, branches `region-7`
… `region-11`, uncommitted drafts); they resume when work resumes, then merge into `dev`.
Next after that: M3.6 (the Phase 3 final check), the Phase 4 merges and checks, Phase 5.

### Done in Phase 3

#### M3.0 Groundwork

- **World map** (F-WLD-08): every region, Restored, Open or Locked in words and icons, with a
  road picture. **Travel** opens the next region (its intro and concept scene the first time).
  Reach it from the HUD, a map exit, or the "boss defeated" feedback.
- **Course length** (F-AUT-11): regions left out with `enabled: false` are skipped in gating,
  and `npm run content` prints a pacing summary (regions, lessons, quests, side quests,
  minutes).
- **NPCs hand over answers** (F-EXE-12): an `input()` answer from the quest's queue appears in
  a speech bubble over the first named character on stage, and the narration says "The
  merchant says: 5".
- **Runaway `while` loops** (Region 5): the message names the variable the condition reads
  that nothing in the loop changes.
- **The tapestry** (Region 6): `stage: { kind: none, view: tapestry }` shows printed patterns
  on a loom.
- **Explorer badges:** content checks require a Region Restorer badge for every region and an
  Explorer badge for every region with secret corners. Hearthvale's Explorer badge is new.
- **For region authors:** each region's art lives in its own file (`src/art/regions/rN.ts`),
  dev routes open any region's concept scene or map (`/?dev#/dev/concept/<id>`,
  `/?dev#/dev/region/<id>`), and `CODEWEALD_PORT` lets several checkouts run E2E tests at once.

#### M3.1 Region 2: Whispering Library

- The library map (wood floors, bookshelves, a reading rug), 8 characters including Madame
  Quill, and Swapsy the Label Moth.
- Concept scene "What is a variable?" (the labeled jar), 6 quests (predict, investigate,
  fix, fill, modify, make), the 3-phase boss "The Mislabeled Archive", the side quest "The
  Swap Trick", and a 4-item knowledge check, all following the curriculum map.
- Items: Jar of Labels and Ink of Formatting. 6 new glossary words (variable, value,
  assignment, reassign, concatenate, f-string). Restorer and Explorer badges.
- Hidden tests make sure students use their variables, not typed-in words; targeted feedback
  for the classic slips ("Findthe" spaces, `print("book")` vs `print(book)`, a missing `f`,
  swapping without a spare jar).
- E2E: the concept scene, the map, every quest with its reference solution, the boss, the
  knowledge check, and the road from Hearthvale on the world map, with axe on the map, a
  quest and the world map.

#### M3.2–M3.5 Regions 3–6

Written in parallel (one worktree per region) and merged into `dev`, each with its map,
characters and Bug drawn in `src/art/regions/rN.ts`, concept scene, 6 quests, boss, side
quests, knowledge check, items, glossary words, Restorer and Explorer badges, and an E2E smoke
test (`tests/e2e/region-N.spec.ts`: concept scene, map, every quest with its reference
solution, the boss, the check, axe).

- **Region 3 — Merchant's Crossing:** numbers, operators, `input()` with answers handed over
  by merchants (typed answers optional), `int()`/`str()`, rounding; the Haggling Bug.
- **Region 4 — Forked Road Forest:** booleans, comparisons, `if`/`elif`/`else`, `and`/`or`/
  `not`, gates and doors on grid maps; the Riddle Gate.
- **Region 5 — The Endless Mines:** `while`, counters, `break`, runaway loops, `world.look()`
  in dark tunnels; the Cave-In.
- **Region 6 — Clocktower Peaks:** `for`, `range` with steps, accumulators, nested loops and
  patterns on the tapestry; the Broken Clock.

Fixes found while writing them:

- Runaway `while` loops name the right variable (the one written first; never `len` or
  `world`; a list changed with `.pop()` counts as changed), also when the loop wears out the
  hero or the scroll first (`limits.busy_while_unchanged`).
- The Spellbook's code colours are our own, each at least 4.5:1 on every code background
  (CodeMirror's default f-string colour was 3.2:1); a unit test checks them.
- The code area is always in the tab order, so long lines that scroll sideways pass axe
  (`scrollable-region-focusable`), read-only code too.
- Dev routes to a quest or check of a later region move the dev profile there, so "Back to the
  map" works; region tests play typed-input quests with their own answers.

### Phase 4 groundwork (started early, while Regions 3–6 are written)

#### M4.0 Phase 4 mechanics

- **Talk to the Duck** (§9.8a, Region 10): a quest with a `duck:` block gets a panel where the
  duck asks "What should this line do?" about each line of the student's code (blank and
  comment lines are skipped, the line is highlighted in the editor). At the end the student
  sees their notes next to each line and the duck's closing question. Answers are not graded,
  stay on this computer (never in a save file or save code) and the first finished talk in a
  quest counts toward Duck Whisperer.
- **Pick a starter** (the capstone): `starters:` offers 2–4 programs to start from; Reset goes
  back to the list.
- **Light rules for the free part:** `ast` checks accept `Loop` (any `for` or `while`) and
  `random.*` (any call into `random`, also after `from random import …`), with `runs_ok` for
  "runs 3 times without a crash".
- **Open quests are proven:** `sample_solutions` must pass too, and a quest that uses
  `random` without `seed:` is checked with seeds 1–5 (each solution must pass every time, and
  `runs_ok` must be reachable). The answer key lists starters and sample solutions.
- **The finale** (M4.6 early): when every region is restored, "Restore the Great Script"
  plays the `finale` story from `course.yaml`, then a screen with the fragments, the student's
  journey and the credits (the student, Byte, the people of each region, the Bugs). It can be
  seen again from the world map; `/?dev#/dev/finale` opens it.
- E2E: the duck talk (with axe), a starter quest with the light rules over 3 runs, and the
  finale with its credits (with axe).
- A failed `assert` gets its own friendly message (`assert.failed`, for Region 10's truth
  spells).

#### M5.2 The quest-authoring guide (Phase 5, early)

- `docs/quest-authoring.md`: the quest file line by line, every quest type, stages and grids,
  every validator and mistake detector, hidden tests and `from_solution`, wrong solutions,
  hints, rich text and reading level, input and seeds, the duck, starters and sample
  solutions, bosses, regions and the other content files, the commands, and editing on
  github.com with CI as the checker.
- Its five complete example quests are tested: `tests/content/authoring.test.ts` puts them in a
  copy of the course and runs the same checks as `validate-content`.

**Live site:** <https://adasuper.github.io/python-course/> (deployed from `main`).

### How to try the demo

You need Node.js 22 or newer.

```bash
npm install
npm run build
npm run preview          # then open http://localhost:4173 in Chrome or Edge
```

1. **New adventurer** → pick a look, a nickname ("Make one for me" works) and colors.
2. Read Byte's opening (or **Skip scene**), then the concept scene, then you're in Hearthvale.
3. Walk with the arrow keys or WASD (click the map first), and press Enter next to an NPC with a
   **!**. Or press **Q** for the Quest Log and use **Go**.
4. Play the quests. Try breaking things: missing quotes, `Print(` with a capital P, or
   `while True: pass`.
5. Use **Save progress** (top right) to get a save code. On another browser, use
   **Continue from a save** on the title screen.

To jump straight to any quest: `http://localhost:4173/?dev#/dev/quest/r1-q3-path-to-the-well`.

## Phase 2 — Core loop polish ✅

### Phase 2 milestones

| Milestone | Status |
|---|---|
| M2.1 All quest types | ✅ Done |
| M2.2 Accessible Parsons (complete) | ✅ Done (manual screen-reader check pending) |
| M2.3 Full error translation | ✅ Done |
| M2.4 Feedback engine | ✅ Done |
| M2.5 Progression | ✅ Done |
| M2.6 Spellbook reference | ✅ Done |
| M2.7 Workshop | ✅ Done |
| M2.8 Save polish | ✅ Done |
| M2.9 Settings and a11y features | ✅ Done (manual screen-reader and voice checks pending) |
| M2.10 PWA basics | ✅ Done |

### Done in Phase 2

#### M2.1 All quest types

- **Fill quests:** `____` gaps are highlighted, and a **Next gap** button selects the next
  one. With `locked: true`, only the lines that had a gap can change (a gap line may grow into
  several lines); typing elsewhere shows "That line is locked". Running with a gap left gives a
  friendly "There's still a gap to fill" with its line, even where the gap isn't valid Python
  yet. Region 2 brings the first real fill quests.
- **Typed input in quests (Mode B):** with `interactive_input: true` the program asks the
  player in a dialog (focus in the text box, Enter sends, Esc stops), then runs again from the
  top with the answer. Up to 20 answers per run.
- **Session validators:** `branch_coverage` ("light a lamp for every door") and `runs_ok`
  ("finish 3 runs without a crash, with different answers") look across the student's runs.
  The newest 30 runs are saved with the draft. The quest screen shows the lamps and the run
  count.
- **Parsons `check: order`:** comment-only plans pass by their order (or a listed
  alternative), with a hint about how many lines are already right.
- **Predict:** a wrong multiple-choice prediction now shows "your prediction" beside "the right
  answer", and a prompt can offer an optional **twin** program to try again.
- **Hidden maps** (`hidden_tests` `mode: stages`) are tested, and their maps are checked like
  visible ones.
- **Bonus challenges:** listed once a quest is passed; each gives its XP once. Region 1's
  Banner Painter has the first one ("a framed banner", +15 XP).
- **Content checks:** fill starters need a gap; `locked` only in fill; Parsons alternatives use
  every line once; `runs_ok` with different answers needs typed input; every twin answer and
  bonus check is run against the real program.
- **Tests:** 328 Vitest tests in 22 files and 30 Playwright tests at the end of M2.1. New end-to-end tests play
  fill, typed input with lamps, order-checked Parsons, twins and bonus challenges by keyboard,
  using fixture quests (`tests/e2e/fixtures/`) that open through the `?dev` test hook, plus axe
  on each new screen.

#### M2.2 Accessible Parsons

- **Listbox semantics:** "Spell scraps" and "Your spell" are listboxes of options, each one Tab
  stop. Screen readers hear the line, its indent and "picked up".
- **Keyboard:** the whole §14.3 model is one pure function with unit tests. Esc now really puts
  a held line back. Focus follows a moved line right away, so quick key presses aren't lost.
- **Dragging** with a mouse or a finger (pointer events): a bar shows where the line lands, and
  in "Your spell" how far right you drop it sets the indent.
- **Buttons:** ▲ ▼ ◀ ▶ ⇄ on every line for the mouse, and the same buttons for the selected
  line below the lists, so switch and voice-control users can solve puzzles too.
- **Tray:** the scraps list is styled as a tray and says that lines left there aren't used,
  and when some scraps don't belong at all.
- **Tests:** a keyboard-only end-to-end solve with indentation, Esc and moves (F-QA-09), a
  pointer-drag test, and axe on the puzzle with a line picked up. Now 338 Vitest tests in 23
  files and 33 Playwright tests.
- **Still to do by hand:** the screen-reader check with NVDA and ChromeVox (it can't run in
  this build environment). Please try a Parsons quest with each and tell me what you hear.

#### M2.3 Full error translation

- **Every row of the §6.8 table** has a key, a template and a pinned Python 3.14 fixture. A new
  test also checks the other way round: every key the Python code or the runner can produce has
  a template in `content/errors.yaml`.
- **Index and key errors say which list and what's in it:** "`shelf` has 3 items, so its
  positions go from 0 to 2. You asked for position 3." and "The dictionary `d` has no key
  `'gold'`. Its keys are `'gems'`". The values come from the student's variables at the moment
  of the error; none of their code runs again. Empty lists, `pop()` from an empty list and
  empty dictionaries get their own messages.
- **Byte's annotated traceback:** from Region 10 on, "Show the real Python error" lists each
  line of the real error with a note (where, which function, the code, the `^` marks, the error
  type and message). It's ready now; Region 10 will use it.
- **Editor diagnostics:** Ctrl+Shift+M lists the error under the code, and F8 jumps to it.

#### M2.4 Feedback engine

- **The whole §9.4 detector library** (15 named detectors). New: `range_off_by_one` (a range
  that stops one step short of the value the loop should reach), `infinite_while_true_without_break`,
  `function_prints_not_returns`, `return_inside_loop_too_early`, `unused_variable` and
  `shadowed_builtin`. Each has a test where it fires and one where it doesn't, and a test checks
  that every detector the schema allows has them.
- **Feedback selection order** (run error → first matching mistake → translated error; failed
  checks → first matching mistake → first failing hint → "Not quite yet") has its own test, as
  do `output_regex` and `state` mistakes.
- **Hint modes from the deploy config** (all three tiers, only the nudge, or none) are tested end
  to end.

#### M2.5 Progression

- **Badges:** `content/badges.yaml` (8 badges now) and a badge engine (`state/badges.ts`) checked
  after every change. Triggers: first quest of a type, no hints, 5 distinct attempts, a pass
  after 4 failed tries, counters (real-error views, Workshop runs, rubber-duck chats), boss
  defeated, all secret corners, side quests, knowledge checks, and a quest's `rewards.badge`.
  Explorer, Review Riddler, Side Questor II/III, Duck Whisperer and Great Scriptwright need later
  content; their triggers are ready.
- **Celebrations:** badges and level-ups pop up as toasts and are announced. With reduced motion
  nothing moves.
- **Notebook:** the inventory has searchable item cards that open a page with the runnable
  example, the quest it came from (and its concept card), and the glossary words it uses, plus
  shelves for Script Fragments and badges (earned or not yet).
- **Saving:** profiles are now schema 3 (badges, Workshop and duck counters), with a tested
  migration. Save codes are version 2 (`CW2-…`): they keep bonus challenges and earned badges,
  so restoring no longer lets bonus XP be earned twice. Phase 1 `CW1-` codes still restore, and
  a test decodes a real one.

#### M2.6 Spellbook reference

- **Spellbook screen** (📖 in the HUD), with keyboard tabs: **Spell Pages** (concept cards of
  finished quests), **My Spells** (your own passing code, with Copy), **Worked examples** (from
  concept scenes, with their notes), **Concept scenes** (watch any seen scene again) and the
  **Glossary** (A–Z, search, and "not met yet" words marked or hidden).
- `content/errors.yaml` now names its JSON Schema too, and a test checks that every content file
  does (editor autocomplete for authors, F-AUT-07).

#### M2.7 Workshop

- **The Workshop** opens (🛠️ in the HUD) when the Hearthvale boss is defeated. Four sandbox maps
  from `content/workshop.yaml` (Sunny Meadow, Twisty Maze, Treasure Vault, Big Empty Field), the
  full API, typed `input()` answers and the larger loop budget (1,000,000). No checks.
- **My programs:** save up to 20 named programs, open, delete, and **Download .py** (a local
  download).
- **Spells you know:** the API reference lists the calls from the regions you've reached; the
  rest wait under "More spells".
- Typed input is now one shared helper for quests and the Workshop.
- Toasts no longer pile up: one save point at a time and at most three on screen.

#### M2.8 Save polish

- **Merge on import:** restoring an adventurer who is already here offers Replace, Keep both, or
  **Merge** (keep the best of both: all completions, items and badges; the most XP, hints,
  attempts and time).
- **Progress files version 2** include Workshop programs and a checksum. A changed or damaged
  file is refused kindly and nothing changes; so is a nickname that breaks the nickname rules.
- **Delete a profile** from the title screen, with "Save a progress file first".
- **Save codes across content versions:** a later course (new badges, new bonus challenges)
  still reads older codes, and a code for a course with other quests is refused, not misread.
  Fuzz tests cover save codes and damaged files.
- **E2E:** export → empty browser → import restores progress and unfinished code; Merge; delete
  with Save first; a damaged file.

#### M2.9 Settings and accessibility features

- **One Settings screen** (HUD → ⚙️ Settings), saved with the adventurer and applied at once:
  - text size 100–200%, font (Atkinson Hyperlegible Next, OpenDyslexic, system), code font,
    high contrast
  - reduced motion (follow the computer / on / off), replay speed
  - read aloud: auto-read, voice, speed, "read code with its symbols named", and a Try it button
  - sound sliders (all, music, effects; effects start off for quiet classrooms)
  - letter shortcut keys on or off, avatar and colors, and Save progress
- **Title-screen quick settings:** "Bigger text" and "High contrast" work before any adventurer
  exists. They are remembered in this browser and become a new adventurer's first settings.
- **Read aloud** on every dialogue line and on Byte's concept-scene lesson. It uses only voices
  installed on the computer, so it works offline. Without one it says "Read-aloud needs an
  installed voice." Code blocks are skipped unless "read code" is on. Speech stops when the
  screen changes.
- **Sound:** small effects (success, error, bump, pick-up, badge) and optional calm background
  music. They are generated in the browser, so there are no audio files to download.
- **Narrow screens** (≤ 1100 px, browser zoom, or 200% text): the quest panels become tabs
  (Quest · Spellbook · Stage and output), and the Run button stays at the bottom of the
  screen. Running shows the replay; Byte's feedback brings the Spellbook back. Skip links open
  the right tab.
- **Click or tap to walk:** clicking next to the hero steps there, and clicking a neighbour
  talks to them.
- **Shortcut keys** (W A S D, E, Q, L, and `.` in the replay) can be turned off; arrows, Enter
  and Space always work.
- Profile schema 4 (migration from 3) holds the new settings.
- **Tests:** unit tests for read-aloud text, offline voices and quick settings. E2E: settings
  apply and survive a reload; quick settings carry over; nothing scrolls sideways at 200%
  text; narrow-screen tabs by keyboard; click-to-walk; shortcuts off; read aloud with and
  without a voice; and a reduced-motion replay that starts no tweens. axe covers Settings
  (both contrasts) and the narrow quest screen.
- **Still to check by hand:** NVDA/ChromeVox on Settings and the quest tabs; real voices on a
  Chromebook.

#### M2.10 Offline play (PWA basics)

- **Installable and offline:** a service worker (vite-plugin-pwa / Workbox) precaches the game
  (about 95 files, 2.5 MB). Python is cached the first time it loads. The manifest uses
  Byte as the app icon.
- **Python downloads once.** The E2E test counts downloads on the server: each Python file
  is fetched exactly once on a first visit. This fixes the old "downloads Pyodide twice"
  issue. It also found and fixed a cache miss: the server's `Vary: Origin` header made the
  cache skip `pyodide.asm.mjs`.
- **"Ready to play offline ✓"** on the title screen and in Settings, and **📴 Offline** in the
  HUD with no network.
- **Updates wait:** "A new version of Codeweald is ready — reload when you're done with this
  quest" with a **Reload now** button. Nothing reloads by itself.
- **System check** page (title screen and Settings). This was planned for Phase 6
  (F-OFF-08) and came early because it is part of M2.10.
- **Tests:** E2E: first visit → offline → reload → a quest with a Python run, with no
  network; one download per Python file; a new version waits, then reloads when asked; the
  System check rows. Unit tests for the System check rules. axe on the System check page.

### Phase 2 final check

Every Phase 2 story in [features.md](docs/features.md) (58 stories) was checked against the code
and the tests, criterion by criterion. Fixed and added:

- **Bug fixed: reduced motion on the map.** The map never applied the setting, so NPCs bobbed,
  water moved and walking slid, whether reduced motion came from the computer or the game.
- **Words for the map (F-WLD-06):** the map picture names the place and the nearest person or
  thing, updated on every step. "Describe surroundings" is a button as well as `L`, and names
  the way out.
- **Quest Board (F-WLD-07):** it lists side quests and any quest without a map NPC. Side quests
  open once the region's core quests are done. New content checks: every map has a Quest
  Board, and a quest that names an NPC is offered by that NPC on the map.
- **Replay narration (F-API-12):** bumps, pickups and speech merge like moves do. A replay shown
  all at once (Instant or Skip to end) is announced as a one-sentence summary.
- **Avatars (F-ONB-03):** each has a bump frame (stars over the head; this is also the still
  "bonk" picture with reduced motion) and a celebration frame (arms up; the wheelchair stays).
  The hero cheers when a quest passes.
- **Custom checks** get `ctx.call(name, *args)` (F-FBK-04).
- **Seeds (F-EXE-10):** a quest without `seed:` gets a new random seed every run, and the
  content check asks a quest that uses `random` for one. A test shows the same code, seed and
  inputs give the identical action log.
- **Toasts (F-PRG-08):** XP and items get a toast too. Badges and level-ups outlast the other
  toasts when a pass brings several.
- **Read aloud** in the map's talk dialog (F-DLG-07).
- **Contrast fix:** the HUD's "Offline" marker failed axe's contrast check (found by the new
  scans).
- **Exit criteria, now all covered by tests:**
  - every quest type played with only the keyboard: predict, investigate, Parsons
    (including a plan checked by its order), fill, fix, modify, make, the boss with
    **Next phase**, and typed input
  - every validator field, not just every type
  - classifier fixtures for more message variants; runner tests for the hard timeout
  - axe on every Phase 2 screen, now also: the title with adventurers, the delete dialog,
    the restore chooser, the Quest Board, the Workshop with a saved program, the locked-line
    note, toasts, the offline marker and the update banner
- **Tests now:** 444 Vitest tests in 31 files and 74 Playwright tests, all passing.

## Phase 1 — Vertical slice ✅

### Done in Phase 1

- **Python in the browser:** Pyodide 314 (CPython 3.14) in a Web Worker, with a download
  progress bar.
  - Infinite loops stop instantly with the loop's line named (`sys.monitoring` loop budget).
  - Long C-level work hits a 3 s hard timeout and the worker restarts.
  - The network is blocked inside the worker.
- **`codeweald` game API:** an ASCII-grid world simulation, and `hero`/`world` calls that
  record an action log with the student's line numbers.
  - Sandbox: import allowlist, blocked builtins, virtual `time.sleep`, seeded `random`, an
    `input()` queue.
  - Kid-friendly error translation for 40+ error patterns, plus a "Show the real Python error"
    toggle.
  - Validators (output, state, variable, AST, comments/style, hidden tests, custom), named
    mistake detectors, and targeted feedback.
- **Replay:** the world replays the log with play/pause, **step**, speed (0.5×–4×, instant),
  current-line highlighting in the editor, and screen-reader narration ("Moved right 3 steps.").
- **Game:** a Phaser 4 overworld of Hearthvale (an ASCII map in `region.yaml`) with NPCs,
  quest markers, secret corners, a Quest Log, an on-screen D-pad, and "describe surroundings".
- **UI:**
  - title screen and profiles, character creator (8 avatars × 6 themes, nickname filter and
    generator)
  - Byte's dialogue with glossary toggletips, and the concept scene with a runnable worked
    example
  - quest screen (CodeMirror editor, Scroll of Output, Jar Shelf, three free hints), boss
    phases with a health bar, knowledge check, inventory
- **Quest types used in Region 1:** predict, investigate (including "change and observe"),
  keyboard-accessible Parsons, fix, modify, make, and a 3-phase boss.
- **Region 1 content:** 6 quests, boss, side quest, knowledge check, concept scene, glossary,
  items and 63 friendly error templates.
- **Saving:**
  - IndexedDB (with localStorage/memory fallbacks), drafts, multiple local profiles.
  - Because devices may wipe data (decision Q3): a save code (~250 characters), a progress
    file through the system "Save as" dialog (Google Drive works on ChromeOS), and
    **Continue from a save**.
  - An "Unsaved progress" marker, save-point toasts, and the leave-page warning.
- **Content tooling:**
  - Zod schemas with JSON Schema for editor autocomplete
  - `npm run validate-content`, which runs every reference solution and every known-wrong
    solution and reports `file:line — message`
  - hidden-test expectations baked from the solutions
  - the instructor answer key (`npm run solutions` → [docs/solutions.md](docs/solutions.md))
- **Tests (all passing):**
  - 291 Vitest tests in 20 files: Python runtime and sandbox escapes, every error-message
    row, every mistake detector, validators, content rules (on a broken copy of the
    content), reading level, save codes (with fuzzing), migrations, storage fallbacks,
    progress rules, nickname filter, contrast tokens, credits, replay, rich text, schemas.
  - 24 Playwright tests:
    - golden path: a new player completes all of Region 1 and its knowledge check, then
      reloads and keeps everything
    - the map stays still and fills its frame after a quest
    - infinite loop (both safety layers); a run error marks its line without moving focus
    - keyboard only, from the title screen to a finished quest, and Esc+Tab out of the editor
    - a save code restores progress and items in a fresh browser
    - no request to any other site during a whole session
    - axe on every main screen and every quest type: no serious or critical violations
- **CI/CD:** `.github/workflows/ci-cd.yml` runs Build → Test → Deploy. It builds the site
  once (types and size budget included), then runs lint and format, content validation, the
  answer-key check, unit tests, and E2E plus axe against that same build. On `main` only,
  it then publishes the tested build to GitHub Pages (see the README).
- **Size:** the app is 0.99 MB gzipped excluding Pyodide (budget 4 MB).

### Phase 1 final check

Before starting Phase 2, every Phase 1 story in [features.md](docs/features.md) (107 stories)
was checked against the code by four independent reviews. They found 79 acceptance criteria
that were missing or only partly met, although the build plan's exit checklist passed. All
of them are now closed:

- **Missing tools:** the reading-level report (`npm run reading-level`, also a CI job) and
  the quest scaffolder (`npm run new-quest`); the editor's code size buttons.
- **Security:** student code could reach Python's internals (`__loader__`, `__globals__`,
  generator frames) and so fake a quest check. Python's own machinery is now locked, the
  JavaScript bridge modules are removed after boot, and a test proves patching the game
  can't fake a pass. A crashed Python worker now restarts like a timeout.
- **Accessibility:**
  - Two focus rings and one theme's speaker names were below the WCAG contrast minimum.
    A token test now checks every theme.
  - Run errors moved focus away from the editor.
  - The Quest Log wasn't a dialog.
  - Glossary tips weren't announced.
  - Skip links were missing.
- **Content checks:** quest maps, glossary links in all text, `____` gaps, the bug count in
  fix quests, minutes per quest, and investigate answers proven against the real program.
  Every problem now has file and line.
- **Saving:** a real migration chain (schema 2), versioned drafts flushed when the page is
  hidden, the open quest restored, Copy/Save buttons on save points, and save-code fuzzing.
- **Smaller fixes:**
  - NPC portraits, dialogue Back, replaying the opening.
  - A step-by-step concept-scene replay.
  - The Bug → firefly ending.
  - Crisp whole-number map zoom.
  - Nickname filter false positives ("Bob", "Buttons") and bypasses ("Sh-it").
  - The deploy config's defaults are now used.
  - A Credits screen.
  - Content hot reload.
  - An ESLint rule against `innerHTML`.
  - The specified size budgets.
- **Spec updated instead of the code** (the code was right):
  - The run button says "Running…", not "casting…".
  - Validators skip a program that errored.
  - Storage is one IndexedDB store with key prefixes.
  - The boss field is `carry_code`.
  - Icons whose name is printed beside them have empty alt text.
  - "Re-import validators from a frozen copy" was replaced by the stronger locked-machinery
    design (specs §6.4).
- **Moved to Phase 2:**
  - Special badges in the save code (with the badges, M2.5).
  - The Parsons keyboard reducer test (when M2.2 rebuilds Parsons).
- **Moved to Phase 3:** the per-region pacing summary (F-AUT-11).

### Fixed after the demo

- **The map jumped every half second after playing a quest.** Phaser's automatic canvas
  resizing kept reporting changes that weren't real, and each one re-centered the camera. The
  game now sizes the canvas itself, in whole pixels, and moves the camera only when the size
  really changes. This also fixes the map staying small after returning from a quest on large
  screens.

### Added after the demo

- **CI/CD pipeline** (requested): one workflow in three stages, Build → Test → Deploy to
  GitHub Pages. The site is built once, and the E2E tests play that exact build under its
  GitHub Pages path (`/python-course/`). The planned Phase 6 Pages workflow is now part of it.

- **Branches:** `main` is the live site and `dev` is where all work happens, including
  Claude Code's (see [CLAUDE.md](CLAUDE.md)). Releases are a pull request from `dev` to
  `main`, opened and merged by hand. Each merge deploys to GitHub Pages.

### Requirement changes during Phase 1

- **No teacher features (Q13).** The course is self-paced. Teacher mode, class codes, the
  dashboard, CSV export and the in-app teacher guide are removed from every document.
  Reference solutions no longer ship in the game; instructors use the generated
  [answer key](docs/solutions.md). Phase 5 is now the answer key, the authoring guide and two
  optional self-paced extras (a "My progress" page and a completion certificate) for you to
  confirm or cut.
- **Overworld maps** are ASCII grids in `region.yaml` instead of Tiled files.

## Known issues

- **Art direction:** this is the first look. Please react to the mood and palette (Q6).
- **Main script size:** it is 556 KB gzipped (mostly Phaser and CodeMirror). Splitting it
  could speed up the first screen.
- **CSTA wording:** the descriptions are paraphrased. Verify them verbatim against
  csteachers.org (unreachable from the build environment).
- **Public answers:** the repository is now public, so anyone can read the solutions in
  `content/` and `docs/solutions.md`. The deployed game itself contains no solution code.
