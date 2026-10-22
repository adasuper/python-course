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

**Phase 3 — Regions 1–6.** Six regions are playable end to end, from Hearthvale Village
(`print`) to Clocktower Peaks (`for` loops): about 7.5 hours of quests. Regions 7–11 are on the
way. The live site, <https://adasuper.github.io/python-course/>, shows the latest version
merged into `main`. See [PROGRESS.md](PROGRESS.md) for what's done, what's next and known
issues.

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
| `npm run reading-level` | Flesch–Kincaid grade of all student text; lists texts above grade 7 |
| `npm run new-quest -- --region 1 --type make --slug my-quest` | Start a new quest file with a TODO in every field (`--side` for a side quest) |
| `npm test` | Unit, Python-runtime and content tests (Vitest; Python runs in Pyodide on Node) |
| `npm run test:e2e` | End-to-end, keyboard and accessibility tests (Playwright + axe) — run `npm run build` first (with the same `CODEWEALD_BASE`, if you set one) |
| `npm run lint` · `npm run typecheck` · `npm run format` | Code quality |

**Open any quest directly:** `http://localhost:4173/?dev#/dev/quest/r1-q5-criers-crooked-announcement`
(or `/?dev#/dev/check/hearthvale-village` for a knowledge check, `/?dev#/dev/concept/…` for a
concept scene, `/?dev#/dev/region/…` for a region's map). This uses a throwaway "Dev Tester"
profile.

### Editing content

Quests, regions, dialogue, the glossary and error messages are YAML files in
[`content/`](content). Each quest file starts with a `yaml-language-server` line, so VS Code
(with the YAML extension) autocompletes and checks fields as you type. After editing, run
`npm run validate-content`: it reports problems as `file:line — message` and runs every
reference solution and known-wrong solution through the real Python runtime. The full guide
is [docs/quest-authoring.md](docs/quest-authoring.md).

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

## Branches and releases

- **`dev`:** all day-to-day work, including Claude Code's (see [CLAUDE.md](CLAUDE.md)).
  Every push runs the Build and Test stages below.
- **`main`:** the live site. To release, open a pull request from `dev` to `main`. The
  pipeline tests the pull request, and once you merge it, the pipeline runs on `main` and
  deploys to GitHub Pages automatically.

Recommended GitHub settings:

- **Settings → General → Default branch:** `main`.
- **Settings → Rules → Rulesets:** a branch ruleset for `main` that requires a pull request
  and the CI/CD status checks to pass, so nothing reaches `main` without review and tests.

## CI/CD

[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) runs on every push and pull
request, in three stages:

1. **Build:** `npm run build` runs once. That includes type-checking and the size budget.
   The result is saved as the `site` artifact.
2. **Test:** four jobs run in parallel: lint and format; unit, Python and content tests
   (every reference and wrong solution, and the answer key being up to date); end-to-end
   plus accessibility tests that play **that same build** in Chromium; and the reading
   level of all student text (fails above grade 9).
3. **Deploy:** only for the `main` branch, after every test passes, the same tested files
   are published to GitHub Pages. You can also deploy by hand: **Actions → CI/CD → Run
   workflow** with `main` selected. Other branches and pull requests never deploy.

**Turning deploys on:** in the repository, go to **Settings → Pages** and set **Source** to
**GitHub Actions**. Until then, the deploy job is skipped with a warning. Keep in mind:

- To have GitHub enforce this too, open **Settings → Environments → github-pages** and set
  **Deployment branches and tags** to allow only `main`.
- GitHub Pages for a **private** repository needs a paid GitHub plan, and the published
  site is always public.
- The site is built for `https://<owner>.github.io/<repo-name>/`. For a custom domain, set
  the repository variable `SITE_BASE_PATH` to `/` (Settings → Secrets and variables →
  Actions → Variables).
- To approve each deploy by hand, add a required reviewer to the `github-pages` environment
  (Settings → Environments).

## Deploying

`npm run build` produces a static site in `dist/` that works on any static host (GitHub
Pages, a school web server). Use `CODEWEALD_BASE=/repo-name/ npm run build` for a sub-path.
No special headers are needed, but serve `.wasm` as `application/wasm` and use HTTPS (the
offline service worker needs it). On GitHub, the CI/CD pipeline above does all of this for
you. Notes for other servers arrive in Phase 6.

**Offline play:** after one visit, the game works with no network. The title screen shows
"Ready to play offline ✓" once the game and Python (about 14 MB, downloaded once) are
stored. Before the first lesson, open the game once on each computer while online. A new
version waits until the student clicks **Reload now**.

**System check:** the title screen's **System check** button shows whether this computer
and network can run the game: the offline helper (service worker), saving, WebAssembly, the
`.wasm` file type, free space, Python, offline readiness and read-aloud voices. Each failure
comes with a tip for fixing it.

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
| [docs/quest-authoring.md](docs/quest-authoring.md) | How to write and check quests, regions and other content |
| [ASSETS_LICENSES.md](ASSETS_LICENSES.md) | Every asset and its license |

## Stack

Vite + TypeScript (strict) · Phaser 4 · Preact + Signals · Pyodide 314 (CPython 3.14) in a
Web Worker · CodeMirror 6 · YAML content validated with Zod · Vitest + Playwright + axe-core
· GitHub Actions CI/CD to GitHub Pages.

## License

Code: MIT. Course content: CC BY-SA 4.0. Original art: CC0 (see
[ASSETS_LICENSES.md](ASSETS_LICENSES.md)).
