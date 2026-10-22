# Progress

## Current phase: 1 — Vertical slice ✅ (ready for review)

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
  - 156 Vitest tests: Python runtime, error translation, validators, content, save codes,
    storage, progress rules, nickname filter, replay, rich text, schema.
  - 16 Playwright tests:
    - golden path (a new player completes all of Region 1 → items in inventory → reload →
      progress persists)
    - the map stays still and fills its frame after a quest
    - infinite loop (both safety layers)
    - keyboard-only quest from the map, and Esc+Tab leaving the editor
    - save code restoring in a fresh browser
    - axe scans of all main screens: no serious or critical violations
- **CI/CD:** `.github/workflows/ci-cd.yml` runs Build → Test → Deploy. It builds the site
  once (types and size budget included), then runs lint and format, content validation, the
  answer-key check, unit tests, and E2E plus axe against that same build. On the default
  branch it then publishes the tested build to GitHub Pages (see the README).
- **Size:** the app is 0.99 MB gzipped excluding Pyodide (budget 4 MB).

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

- **Deploys need GitHub Pages turned on:** Settings → Pages → Source: "GitHub Actions".
  Until then the deploy job is skipped with a warning. This repository is private, so Pages needs a paid GitHub plan, and the
  site it publishes is public. Deploys follow the default branch, which is
  `claude/new-session-aahe56` until a `main` branch is made the default.

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
- **Public answers:** if the repository is public, students can read the solutions in
  `content/` and `docs/solutions.md`.
