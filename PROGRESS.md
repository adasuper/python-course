# Progress

## Current phase: 2 — Core loop polish (in progress)

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

### Phase 2 milestones

| Milestone | Status |
|---|---|
| M2.1 All quest types | ✅ Done |
| M2.2 Accessible Parsons (complete) | ✅ Done (manual screen-reader check pending) |
| M2.3 Full error translation | ✅ Done |
| M2.4 Feedback engine | ✅ Done |
| M2.5 Progression | ✅ Done |
| M2.6 Spellbook reference | ✅ Done |
| M2.7 Workshop | Next |
| M2.8 Save polish | — |
| M2.9 Settings and a11y features | — |
| M2.10 PWA basics | — |

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
- **Narrow screens:** the quest screen stacks its panels vertically below 1100 px wide.
  Tabs are planned for Phase 2.
- **Settings:** there is no settings screen yet. Reduced motion follows the system setting.
- **First load downloads Pyodide twice:** once for the progress bar, then again from the
  browser cache. The service worker in Phase 2 removes this.
- **Main script size:** it is 556 KB gzipped (mostly Phaser and CodeMirror). Splitting it
  could speed up the first screen.
- **CSTA wording:** the descriptions are paraphrased. Verify them verbatim against
  csteachers.org (unreachable from the build environment).
- **Public answers:** the repository is now public, so anyone can read the solutions in
  `content/` and `docs/solutions.md`. The deployed game itself contains no solution code.
