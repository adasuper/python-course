# Codeweald

**A self-paced, RPG-based introduction to Python for middle school (grades 6–8).**

In Codeweald, students are apprentice Scriptwrights restoring the shattered Great Script.
They explore a 2D pixel-art world, learn from Byte the (slightly sarcastic) owl, and write
**real Python** that runs in the browser and drives what happens in the game. Every quest
maps to one measurable learning outcome, aligned to the CSTA K-12 CS Standards for
grades 6–8.

- Runs in a modern browser on school Chromebooks and lab PCs: no install, no accounts.
- **Self-paced:** students work on their own. There are no teacher features in the app.
  Instructors get a generated [answer key](docs/solutions.md) to prepare for questions.
- Built for privacy (COPPA/FERPA-friendly): nicknames only, no analytics, no network calls
  after loading. Progress stays on the device, and students carry it between devices with a
  **save code** or a **progress file** (school computers may forget everything at sign-out).
- Accessible (WCAG 2.1 AA target): full keyboard play, screen-reader labels and narration,
  colorblind-safe status, text sizing, a dyslexia-friendly font option, reduced motion.

## Status

**Phase 1 — vertical slice.** Region 1 (Hearthvale Village) is playable end to end. See
[PROGRESS.md](PROGRESS.md) for what's done, what's next and known issues.

## Try the demo

You need [Node.js 22](https://nodejs.org/) or newer.

```bash
npm install
npm run build      # copies Python (Pyodide), draws the art, compiles content, builds dist/
npm run preview    # serves dist/ at http://localhost:4173
```

Open <http://localhost:4173> in Chrome or Edge. The first load downloads Python (about
14 MB); after that it is cached.

## Development

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload at <http://localhost:5173> |
| `npm run content` | Recompile `content/**/*.yaml` after editing (the dev server reloads) |
| `npm run validate-content` | Check every content file and run every reference and wrong solution |
| `npm run solutions` | Regenerate the instructor answer key `docs/solutions.md` |
| `npm run new-quest` | *(Phase 5)* Scaffold a new quest file |
| `npm test` | Unit, Python-runtime and content tests (Vitest; Python runs in Pyodide on Node) |
| `npm run test:e2e` | End-to-end, keyboard and accessibility tests (Playwright + axe) — run `npm run build` first |
| `npm run lint` · `npm run typecheck` · `npm run format` | Code quality |

**Open any quest directly:** `http://localhost:4173/?dev#/dev/quest/r1-q5-criers-crooked-announcement`
(or `/?dev#/dev/check/hearthvale-village` for a knowledge check). This uses a throwaway
"Dev Tester" profile.

### Editing content

Quests, regions, dialogue, the glossary and error messages are YAML files in
[`content/`](content). Each quest file starts with a `yaml-language-server` line, so VS Code
(with the YAML extension) autocompletes and checks fields as you type. After editing, run
`npm run validate-content`: it reports problems as `file:line — message` and runs every
reference solution and known-wrong solution through the real Python runtime. A full authoring
guide arrives in Phase 5.

## Architecture in one minute

```
Preact UI (DOM, accessible)  ──►  Phaser 4 (draws the world only, via one adapter)
        │                                   ▲ replays an action log, step by step
        ▼                                   │
PyRunner (timeout, restart)  ──►  Web Worker: Pyodide (CPython 3.14 in WebAssembly)
                                   └─ codeweald package: simulated world + hero/world API,
                                      sandbox, loop budget, kid-friendly errors, validators
```

Student code runs in a Web Worker, so it can never freeze the page. The `codeweald` Python
package simulates the quest map and records every action. The page then **replays** those
actions as animation, highlighting the line of code that caused each one. Infinite loops are
stopped by a loop budget inside Python, naming the line, and a hard wall-clock timeout
restarts the worker as a backstop. Details: [docs/specs.md](docs/specs.md).

## Deploying

`npm run build` produces a static site in `dist/` that works on any static host (GitHub
Pages, a school web server). Use `CODEWEALD_BASE=/repo-name/ npm run build` for a sub-path.
No special headers are needed, but serve `.wasm` as `application/wasm` and use HTTPS.
Full deployment notes arrive in Phase 6.

**Handling exported files:** a progress file contains the student's nickname and their code.
Keep it somewhere private, such as the student's own Google Drive.

## Documents

| Document | What it covers |
|---|---|
| [docs/specs.md](docs/specs.md) | Architecture and detailed design for every feature |
| [docs/features.md](docs/features.md) | Feature list as user stories with acceptance criteria |
| [docs/curriculum-map.md](docs/curriculum-map.md) | Regions → quests → learning outcomes → CSTA standards |
| [docs/build-plan.md](docs/build-plan.md) | Phases, milestones and exit criteria |
| [docs/open-questions.md](docs/open-questions.md) | Decisions and the assumptions in use |
| [docs/solutions.md](docs/solutions.md) | Instructor answer key (generated) |
| [ASSETS_LICENSES.md](ASSETS_LICENSES.md) | Every asset and its license |

## Stack

Vite + TypeScript (strict) · Phaser 4 · Preact + Signals · Pyodide 314 (CPython 3.14) in a
Web Worker · CodeMirror 6 · YAML content validated with Zod · Vitest + Playwright + axe-core
· GitHub Actions.

## License

Code: MIT. Course content: CC BY-SA 4.0. Original art: CC0 (see
[ASSETS_LICENSES.md](ASSETS_LICENSES.md)).
