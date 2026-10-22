# Progress

## Current phase: 1 — Vertical slice ✅ (ready for review)

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

### Next: Phase 2 — Core loop polish

- the `fill` quest type and the remaining validators (session checks, hidden maps)
- the full error table and named detectors
- XP/levels/badges with celebrations; inventory notebook and Spellbook pages
- the Workshop sandbox with interactive `input()`
- the settings screen (text size, fonts, high contrast, reduced motion, text-to-speech)
- import Merge; PWA/offline

### Known issues

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
