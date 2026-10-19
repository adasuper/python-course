# Codeweald

**An RPG-based introduction to Python for middle school (grades 6–8).**

In Codeweald, students are apprentice Scriptwrights restoring the shattered Great Script.
They explore a 2D pixel-art world, learn from Byte the (slightly sarcastic) owl, and write
**real Python** that runs in the browser and drives what happens in the game. Every quest
maps to one measurable learning outcome, aligned to the CSTA K-12 CS Standards for
grades 6–8.

- Runs in a modern browser on school Chromebooks and lab PCs: no install, no accounts.
- Works offline once loaded (installable PWA).
- Built for privacy (COPPA/FERPA-friendly): progress stays on the device.
- Accessible (WCAG 2.1 AA target): full keyboard play, screen-reader labels, text sizing,
  dyslexia-friendly font option, reduced motion, read-aloud.

## Status

**Phase 0 — planning (awaiting review).** There is no application code yet. See
[PROGRESS.md](PROGRESS.md).

## Planning documents

| Document | What it covers |
|---|---|
| [docs/specs.md](docs/specs.md) | Architecture and detailed design for every feature |
| [docs/features.md](docs/features.md) | Feature list as user stories with acceptance criteria |
| [docs/curriculum-map.md](docs/curriculum-map.md) | Regions → quests → learning outcomes → CSTA standards |
| [docs/build-plan.md](docs/build-plan.md) | Phases, milestones and exit criteria |
| [docs/open-questions.md](docs/open-questions.md) | Questions for review and the assumptions in use |

## Planned stack

Vite + TypeScript (strict) · Phaser 4 (world rendering) · Preact (accessible DOM UI) ·
Pyodide / CPython 3.14 in a Web Worker · CodeMirror 6 · YAML content validated with Zod ·
Vitest + Playwright + axe-core · GitHub Actions.

Setup, development, build and deployment instructions will be added in Phase 1.
