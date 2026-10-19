# Progress

## Current phase: 0 — Plan (awaiting approval)

### Done

- Architecture and detailed design: [docs/specs.md](docs/specs.md)
- Feature list as user stories: [docs/features.md](docs/features.md)
- Curriculum map (11 regions → quests → learning outcomes → CSTA codes):
  [docs/curriculum-map.md](docs/curriculum-map.md)
- Phased build plan with exit criteria: [docs/build-plan.md](docs/build-plan.md)
- Open questions and assumptions: [docs/open-questions.md](docs/open-questions.md)

### Decisions worth flagging for review

- **`input()`:** a quest input queue, plus "replay-on-input" for interactive play. There is no
  SharedArrayBuffer, so **no COOP/COEP headers** are needed (works on GitHub Pages and any
  static server). See specs §6.5.
- **Infinite loops:** three layers.
  1. An in-Python loop budget stops the program instantly and names the line, with no
     restart.
  2. Action and output budgets.
  3. A hard wall-clock kill + worker restart as the backstop.

  See specs §6.3.
- **Phaser 3.90.0 is the final 3.x release.** It stays as specified, behind an adapter so a
  move to Phaser 4 stays cheap. See open question Q5.
- **Pyodide 314.x = Python 3.14.**
- **Art:** kenney.nl and OpenGameArt are unreachable from the build environment, so the plan
  is original pixel art generated from code (Q6).

### Next

- **Phase 1 — Vertical slice** (after approval): scaffolding, Pyodide worker with timeouts,
  game API + action log + replay, CodeMirror editor, Hearthvale Village map, Byte dialogue,
  all of Region 1, save/load, content tests and CI.

### Known issues

- CSTA standard descriptions are paraphrased. Verify them verbatim against csteachers.org
  (unreachable from the build environment) before the teacher guide.
- The course-length numbers in the brief conflict (11 regions × 30–60 min vs "20–25 units").
  The current assumption is that a unit = a 45-minute lesson, ~23 lessons in total (Q1).
