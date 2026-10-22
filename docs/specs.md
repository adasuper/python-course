# Codeweald — Architecture and Design Specification

> **Status:** Phase 0 draft, for review. Nothing here is built yet.
> **Related documents:** [features.md](features.md) (user stories) ·
> [curriculum-map.md](curriculum-map.md) (regions → quests → outcomes) ·
> [build-plan.md](build-plan.md) (phases and exit criteria) ·
> [open-questions.md](open-questions.md) (questions and assumptions)

This document describes how Codeweald works and why it is built this way. Section 2
lists the big decisions. Sections 5–17 give the detailed design for each feature area.
Feature IDs such as `F-EXE-03` refer to user stories in `features.md`.

---

## Contents

1. [Goals, non-goals, constraints](#1-goals-non-goals-constraints)
2. [Key decisions](#2-key-decisions)
3. [System overview](#3-system-overview)
4. [Repository layout](#4-repository-layout)
5. [Application shell, screens and state](#5-application-shell-screens-and-state)
6. [Python execution subsystem](#6-python-execution-subsystem)
7. [Game API (`codeweald` Python package)](#7-game-api-codeweald-python-package)
8. [Replay engine](#8-replay-engine)
9. [Quest system](#9-quest-system)
10. [Content data model and schema](#10-content-data-model-and-schema)
11. [Game systems](#11-game-systems)
12. [Persistence, save codes and export](#12-persistence-save-codes-and-export)
13. [Instructor answer key (no in-app teacher features)](#13-instructor-answer-key-no-in-app-teacher-features)
14. [Accessibility design](#14-accessibility-design)
15. [Privacy and security](#15-privacy-and-security)
16. [Offline and PWA](#16-offline-and-pwa)
17. [Performance](#17-performance)
18. [Testing strategy](#18-testing-strategy)
19. [CI and deployment](#19-ci-and-deployment)
20. [Configuration reference](#20-configuration-reference)
21. [Risks and mitigations](#21-risks-and-mitigations)

---

## 1. Goals, non-goals, constraints

### 1.1 Goals

- Teach introductory Python to grades 6–8 through a 2D top-down pixel-art RPG.
- Students write **real Python** (CPython via Pyodide). Their code visibly drives the game.
- Every quest has **one measurable learning outcome** and an automated check.
- Course authors (for example, instructors) can add and edit quests by editing **YAML files**.
  They never touch engine code.
- Runs in a modern browser on school Chromebooks and lab PCs. It needs no install, no
  plugins and no accounts, and it works offline after the first load.

### 1.2 Non-goals (v1)

- No server, accounts, cloud sync, multiplayer or chat.
- No teacher features in the app: no teacher mode, class settings, dashboard, CSV export or
  LMS integration. The course is **self-paced**; students work through it on their own
  (owner decision Q13, §13). Instructors get a generated answer key instead.
- No support for touch-only phones. Tablets with keyboards should work, but they are not
  a test target.
- No localization in v1. All UI strings live in one file so translation can come later.
- No general Python packages beyond the standard library modules on the allowlist.

### 1.3 Constraint → design response

| Constraint (from brief) | Design response | Section |
|---|---|---|
| No install, no local Python | Pyodide (CPython → WebAssembly) in a Web Worker | §6 |
| Student code must never freeze the UI | Worker + three-layer timeout (loop budget, action budget, hard terminate) | §6.3 |
| Code visibly drives the game | Action log recorded in the worker, replayed as animation | §7, §8 |
| `input()` must be robust on school networks | Input queue + "replay-on-input". No SharedArrayBuffer, so no COOP/COEP headers | §6.5 |
| Course authors edit content without code | YAML content + Zod schema + JSON Schema for editor autocomplete + `validate-content` | §10 |
| COPPA/FERPA-friendly | No PII, no network after load, local storage only, user-initiated export | §15 |
| Offline | Installable PWA; Workbox precache and a Pyodide runtime cache | §16 |
| WCAG 2.1 AA | DOM UI over canvas, live-region narration, full keyboard, settings | §14 |
| Content correctness | Every reference solution and ≥ 2 wrong solutions run in CI | §18.3 |
| Initial load < 15 MB excl. Pyodide | Budget ≤ 4 MB gzip for the app shell; content lazy-loaded per region | §17 |

---

## 2. Key decisions

Each row is a short architecture decision record. "Alternatives" lists what was
considered and rejected.

| # | Decision | Why | Alternatives considered |
|---|---|---|---|
| D1 | **Vite + TypeScript (strict)** | As specified. Fast dev server, simple static build. | — |
| D2 | **Phaser 4 (4.2.x, pinned)**, all Phaser code behind a thin `WorldView` adapter | The project owner's choice (Q5). Phaser 3.90.0 was the final 3.x release, while Phaser 4 is maintained, keeps most of the v3 API, offers WebGL and Canvas rendering and is ≈ 355 KB gzip. The adapter keeps engine details out of the rest of the app. | Phaser 3.90 (frozen, no more fixes). |
| D3 | **Pyodide 314.x (Python 3.14)**, pinned, bundled from the `pyodide` npm package | As specified. Python 3.14 gives the clearest built-in error messages ("Did you mean…?"). | Skulpt/Brython (not real CPython; error messages and semantics differ). |
| D4 | **Pyodide runs in a dedicated Web Worker** | Student code can never block the UI thread. The worker can be killed. | Main-thread Pyodide (freezes the UI). |
| D5 | **Timeouts in three layers:** loop-iteration budget via `sys.monitoring` (no restart needed) → action/output budget → wall-clock hard `terminate()` + worker restart | Catches 99% of infinite loops instantly, *with the line number*, and without paying for a restart. The hard kill is the backstop for C-level work (e.g. `10**10**8`). | Hard kill only (2–5 s restart every time on a Chromebook); Pyodide interrupt buffer (needs SharedArrayBuffer). |
| D6 | **`input()` = quest input queue + replay-on-input.** No SharedArrayBuffer. | SharedArrayBuffer needs COOP/COEP headers, which GitHub Pages cannot set and which `coi-serviceworker` makes fragile (extra reload, breaks behind some filtering proxies). Replay-on-input gives a real interactive feel with zero header requirements. | SAB + `Atomics.wait` modal (rejected for v1; documented as a future option). |
| D7 | **Game world simulated in Python** (inside the worker); Phaser only replays | One source of truth. `world.look()` gives answers synchronously. Validators read game state directly. | World in JS, called from Python through the `js` bridge (sync coupling; opens the sandbox). |
| D8 | **DOM UI with Preact + Signals**; Phaser draws only the world | Real HTML for screen readers, focus and text scaling. Preact is tiny (~4 KB) and familiar to React developers. | Phaser-drawn UI (inaccessible); React (heavier); vanilla DOM (harder to maintain). |
| D9 | **CodeMirror 6** with `@codemirror/lang-python` | As specified. Accessible, keyboard friendly, read-only ranges for "fill" quests. | Monaco (too heavy for Chromebooks). |
| D10 | **YAML content, validated by Zod 4 at build time, compiled to JSON** | YAML is friendlier than JSON for multi-line code. No YAML parser ships to the browser. Zod 4 also emits JSON Schema, so VS Code can autocomplete quest files. | JSON (noisy for code blocks); JSON Schema only (worse TS typing). |
| D11 | **Expected answers for hidden tests are computed at build time** from the reference solution (`expect: from_solution`) | Course authors do not hand-compute expected values. The runtime never needs the solution. | Shipping solutions to the worker at runtime. |
| D12 | **IndexedDB (via `idb-keyval`) with a localStorage fallback** | Enough space for code drafts; asynchronous; works offline. | localStorage only (5 MB cap, synchronous). |
| D13 | **Vitest for all unit tests, including Python** (Pyodide in Node) | One test runner. Tests use the exact runtime that ships. | pytest on CPython (faster, but a different interpreter build). |
| D14 | **Original pixel art first; CC0 packs (e.g. Kenney) where available** | The build container cannot reach kenney.nl. Original art authored as code-defined pixel grids → PNG is license-clean. Kenney CC0 packs can replace it later. | — |
| D15 | **No teacher features; a generated instructor answer key instead** (owner decision Q13) | The course is self-paced. Reference solutions never ship in the app, so students can't find them in the bundle. Instructors read `docs/solutions.md`, generated from the content by `npm run solutions`. | Teacher mode, class codes and a dashboard (dropped with the requirement). |

---

## 3. System overview

```
┌───────────────────────────── Browser tab (main thread) ─────────────────────────────┐
│                                                                                      │
│  Preact UI (DOM)                         Phaser 4 (canvas)                           │
│  ├─ Screens: title, creator, overworld   ├─ BootScene (loads art)                    │
│  │  HUD, quest, spellbook, inventory,    ├─ OverworldScene (ASCII maps, NPCs)        │
│  │  workshop, settings                   └─ StageScene (quest grids, NPC stages)     │
│  ├─ CodeMirror 6 editor ("Spellbook")            ▲                                   │
│  ├─ Scroll of Output, hints, feedback            │ WorldView adapter (typed API)     │
│  └─ Live-region narrator, TTS                    │                                   │
│            │                              ReplayEngine (ActionPlayer)                │
│            ▼                                     ▲                                   │
│  Store (Preact Signals) ◄── QuestController ─────┤                                   │
│     │      ▲                    │                │ actions[], validation             │
│     ▼      │                    ▼                │                                   │
│  Persistence (IndexedDB)    PyRunner (worker client: timeouts, restart, protocol)    │
│  ContentRepo (lazy JSON)            │ postMessage                                    │
└─────────────────────────────────────┼────────────────────────────────────────────────┘
                                      ▼
┌──────────────────────────── Web Worker: python.worker.ts ───────────────────────────┐
│  Pyodide 314 (CPython 3.14 / WASM)                                                   │
│  codeweald package: hero, world (simulation + action log), _sandbox, _errors,       │
│  _runner (exec + budgets), _check (validators, mistake detectors, hidden tests)     │
│  Network APIs (fetch, XHR, WebSocket, importScripts) neutered after boot             │
└──────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────── Service Worker (Workbox) ───────────────────────────────┐
│  Precache: app shell, art, audio, fonts, content JSON                                │
│  Runtime cache (CacheFirst): Pyodide core files, keyed by Pyodide version            │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**One run, end to end:**

1. The student presses **Run** (`Ctrl+Enter`). `QuestController` builds a `RunRequest`
   (code, stage, input queue, seed, validators, mistake detectors).
2. `PyRunner` posts it to the worker and starts the wall-clock timer.
3. The worker resets the simulated world, executes the code in a sandboxed namespace,
   records actions and output, then runs validators and mistake detectors.
4. The worker returns a `RunResult` (actions, error info, validation report, final state).
5. `ReplayEngine` animates the actions in Phaser, fills the Scroll of Output in sync, and
   highlights the source line that caused each action.
6. When the replay ends (or the student skips), feedback shows. On success the store
   records completion and awards XP and items, and persistence saves.

---

## 4. Repository layout

```
python-course/
├─ index.html                      # app entry; CSP meta; no external URLs
├─ package.json
├─ vite.config.ts                  # PWA plugin, worker bundling, base path
├─ tsconfig.json                   # strict
├─ content/                        # ← course authors edit here
│  ├─ course.yaml                  # which regions/quests are in the course, in order
│  ├─ glossary.yaml
│  ├─ items.yaml
│  ├─ badges.yaml
│  ├─ errors.yaml                  # kid-friendly error message templates
│  ├─ workshop.yaml                # sandbox maps
│  └─ regions/
│     └─ 01-hearthvale-village/
│        ├─ region.yaml            # map, NPCs, concept scene, knowledge check, fragment
│        └─ quests/
│           ├─ r1-q1-hello-hearthvale.yaml
│           └─ r1-boss-village-crier.yaml
├─ schema/                         # generated JSON Schema for YAML autocomplete
├─ public/
│  ├─ codeweald.config.json        # deploy-time settings (editable after build)
│  ├─ assets/{tiles,sprites,ui,audio,fonts}/
│  └─ pyodide/                     # copied from node_modules/pyodide at build
├─ src/
│  ├─ main.tsx                     # bootstraps store, SW, worker, UI
│  ├─ ui/                          # Preact screens and components
│  ├─ game/                        # Phaser scenes, WorldView adapter, ReplayEngine
│  ├─ runtime/                     # PyRunner, protocol types, timeouts
│  ├─ worker/python.worker.ts      # Pyodide host
│  ├─ python/codeweald/            # Python package (loaded into Pyodide's FS)
│  ├─ quests/                      # QuestController, per-type controllers
│  ├─ content/                     # Zod schemas, loader, glossary linker
│  ├─ state/                       # store, XP, badges, persistence, save codes
│  ├─ a11y/                        # narrator, TTS, focus utilities, settings
│  └─ i18n/en.ts                   # every UI string
├─ scripts/
│  ├─ build-content.ts             # YAML → validated JSON (+ baked expectations)
│  ├─ validate-content.ts          # schema + cross-refs + run all solutions
│  ├─ reading-level.ts             # Flesch–Kincaid report
│  ├─ new-quest.ts                 # scaffolder for course authors
│  ├─ solutions.ts                 # writes docs/solutions.md (instructor answer key)
│  ├─ make-art.ts                  # renders original pixel art grids → PNG
│  └─ size-budget.ts
├─ tests/
│  ├─ unit/                        # Vitest (TS)
│  ├─ python/                      # Vitest + Pyodide-in-Node (codeweald package)
│  ├─ content/                     # generated per-quest tests
│  └─ e2e/                         # Playwright (+ axe, offline, throttled)
├─ docs/                           # this doc, features, curriculum, guides
├─ .github/workflows/ci-cd.yml
├─ README.md · PROGRESS.md · ASSETS_LICENSES.md
```

---

## 5. Application shell, screens and state

### 5.1 Boot sequence

1. `index.html` loads the main bundle and shows the **title screen** right away.
2. The service worker registers (§16).
3. `PyRunner` starts the worker **in the background**. Pyodide download and compile run
   while the student picks a profile or creates a character, which hides most of the wait.
4. If the student reaches a code screen before Pyodide is ready, a themed loading panel
   shows Byte "warming up the spellbook" with a real progress bar (bytes downloaded, then
   the stages "compiling" → "loading Python library" → "ready").

### 5.2 Screens

| Screen | Purpose | Notes |
|---|---|---|
| Title / profile picker | Choose or create a local profile, or **Continue from a save** (code or file) | Multiple profiles for shared lab PCs; §12.5 |
| Character creator | Avatar, nickname, color theme | §11.8 |
| Overworld | Walk the region map; talk to NPCs; quest board | Phaser + DOM HUD |
| World map | Travel between unlocked regions | DOM list + illustration |
| Concept scene | Byte's analogy + worked example | Skippable; replayable from the Spellbook |
| Quest | Story, editor, stage, output, hints, feedback | Layout in §9.10 |
| Knowledge check | 3–5 question review | Retakeable |
| Inventory / Notebook | Concept items as reference cards | §11.4 |
| Spellbook pages | Concept cards, worked examples, "My Spells" | §11.5 |
| Workshop | Free sandbox | §11.7 |
| Settings | Accessibility, audio, save/export | §14 |
| Credits | Asset licenses, about | Reads `ASSETS_LICENSES.md` |
| System check | Tests this device: service worker, IndexedDB, WebAssembly, storage quota, offline readiness, local TTS voices | Linked from Settings and the README; plain pass/fail list with fixes (§21) |

Navigation is a small state machine in `state/router.ts` with hash URLs (`#/quest/r4-q3-gatekeeper`).
Hash URLs survive reloads and need no server rewrites.

### 5.3 State

- `@preact/signals` holds the **game state**: the active profile, settings, the current
  screen, and the active quest session.
- Derived values (level, unlocked regions, available quests) are `computed` signals.
- Phaser does not read the store directly. A typed `EventBus` sends world-relevant changes
  (e.g. `quest-completed` → update NPC marker) to `WorldView`.
- All mutations go through `state/actions.ts` functions so persistence and badge checks
  run in one place.

---

## 6. Python execution subsystem

### 6.1 Worker protocol

```ts
// src/runtime/protocol.ts (draft)
type ToWorker =
  | { kind: 'init'; indexURL: string; limits: Limits; pythonFiles: Record<string, string> }
  | { kind: 'run'; runId: string; request: RunRequest };

interface RunRequest {
  mode: 'quest' | 'workshop' | 'example';
  code: string;
  stage: StageSpec | null;          // grid world, NPC stage, or none
  inputs: string[];                 // input queue (§6.5)
  interactiveInput: boolean;        // ask the player when the queue runs out
  seed: number;                     // random + virtual clock determinism
  validators: ValidatorSpec[];      // compiled from YAML (expectations baked in)
  mistakes: MistakeSpec[];
  bonus: BonusSpec[];
  limits?: Partial<Limits>;
}

interface Limits {
  loopBudget: number;      // max backward jumps (loop iterations), default 100_000
  maxActions: number;      // default 2_000
  maxOutputChars: number;  // default 100_000
  recursionLimit: number;  // default 200
  timeoutMs: number;       // wall clock, default 3_000 (enforced on main thread)
}

type FromWorker =
  | { kind: 'progress'; stage: 'download' | 'compile' | 'stdlib' | 'ready'; loaded?: number; total?: number }
  | { kind: 'ready'; pyodideVersion: string; pythonVersion: string }
  | { kind: 'result'; runId: string; result: RunResult };

interface RunResult {
  status: 'ok' | 'error' | 'needs-input' | 'loop-budget' | 'action-budget' | 'output-budget';
  actions: Action[];                 // §7.4, includes printed output in order
  error?: PyErrorInfo;               // §6.8
  needsInput?: { prompt: string };   // when status = 'needs-input'
  validation?: ValidationReport;     // §9.3
  world?: WorldSnapshot;             // final hero position, inventory, chests...
  vars?: VarSnapshot[];              // top-level variables for the "Jar Shelf" panel
  stats: { durationMs: number; loopIterations: number; lines: number };
}
```

### 6.2 Run pipeline (inside the worker)

1. **Reset:** build a fresh `World` from `stage`, a fresh action log, a seeded `random`,
   and a virtual clock.
2. **Compile:** `compile(code, "<spellbook>", "exec")`. A `SyntaxError` goes straight to
   error translation (§6.8). Nothing runs.
3. **Sandbox namespace:** `{"__name__": "__main__", "__builtins__": SAFE_BUILTINS}` (§6.4).
4. **Execute** with budgets active (§6.3). Every `print()` and API call appends to the action
   log with the student line number (`ln`) that caused it.
5. **Snapshot:** final world state; JSON-safe repr of top-level user variables (truncated).
6. **Validate:** run validators, hidden tests (each in a *fresh* namespace and world),
   mistake detectors and bonus checks. Results feed the validation report.
7. **Return** the `RunResult`. Hidden-test runs never add to the replayed action log.

### 6.3 Timeouts and runaway code (three layers)

| Layer | Where | Catches | Cost | Student sees |
|---|---|---|---|---|
| 1. Loop budget | Python, `sys.monitoring` `JUMP` events (backward jumps = loop iterations); fallback `sys.settrace` line counting | `while True:`, a counter never updated, huge `range()` loops | None: the program stops with a special exception; no restart | "Your loop on **line 4** ran 100,000 times! Check that your loop condition eventually becomes `False`." Line highlighted. |
| 2. Action / output budget | Python, in `codeweald` | A hero walking forever into a wall; a print flood | None | "Your hero is exhausted after 2,000 moves!" / "That's a LOT of printing…" |
| 3. Wall clock | Main thread, `PyRunner` timer (default 3 s, configurable) | Long C-level work (`10**10**8`, `"a" * 10**9`), anything layer 1 misses | `worker.terminate()`, then a new worker re-inits Pyodide from cache (~1–4 s) | "Your code took too long, so Byte stopped it. Your loop might be running forever! Check that your loop condition eventually becomes False." Byte re-warms the spellbook. |

- The timer pauses while the program waits for the player to type input (§6.5).
- `RecursionError` (limit 200, to stay well under the WASM stack) and `MemoryError` get
  friendly messages. A WASM stack overflow crashes the worker, which is treated like layer 3.
- The loop budget is per mode: quests 100,000, Workshop 1,000,000. Phase 1 calibrates
  these on a 4×-throttled CPU so that layer 1 trips in under 1 s.

### 6.4 Sandbox

Student code is not trusted. We assume curious kids, not attackers with exploit chains, but
we contain the worst case anyway. The layers are:

1. **Builtins allowlist.** `SAFE_BUILTINS` is a copy of `builtins` minus `open`, `eval`,
   `exec`, `compile`, `breakpoint`, `help`, `memoryview`, `__loader__`. It replaces
   `__import__`, `input`, `exit` and `quit` with safe versions.
2. **Import allowlist.** `__import__` permits only `random`, `math`, `time` and
   `codeweald`, exactly as the brief specifies. Anything else raises
   `ImportError` with the message "That spellbook isn't in Codeweald's library."
3. **Wrapped modules.** `time.sleep(s)` records a `wait` action instead of blocking (capped at
   3 s per call and 15 s per run). `time.time()` and `time.monotonic()` return the virtual clock.
   `random` is a per-run `random.Random(seed)` instance exposed with the module's API.
4. **No JS bridge.** After boot, `js`, `pyodide`, `pyodide_js` and `_pyodide` are removed from
   `sys.modules` and blocked in the import hook.
5. **Worker containment (the real boundary).** After Pyodide and our package load, the worker
   replaces `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`,
   `indexedDB`, `caches` and `Worker` on `self` with functions that throw. Even a sandbox
   escape inside Python cannot reach the network or storage. The worker has no DOM.
6. **Virtual FS only.** Pyodide's in-memory FS; nothing persists; `open` is not exposed.
7. **Validator integrity.** Validators run from a module copy loaded *after* the student
   run (re-imported from a frozen source string). Monkeypatching `codeweald` during the run
   cannot fake a pass. A determined student can still read solutions from the bundle. That
   is acceptable for low-stakes, formative practice (§15.4).

### 6.5 `input()` design (decision D6)

**Mode A — quest input queue (default for quests).** A quest declares
`inputs: ["5", "Ada"]`. Each `input(prompt)` call:

- pops the next value,
- echoes `prompt + value` to the Scroll of Output, as a real console would,
- logs an `input` action, so the replay shows the NPC "handing over" the value
  ("The merchant says: *5*").

Hidden tests reuse this with other queues (`mode: inputs`), so input quests are fully
auto-checkable and deterministic.

**Mode B — replay-on-input (Workshop, capstone free part, and "Try my own input" in input
quests).** When the queue is empty and `interactiveInput` is true:

1. The worker raises an internal `NeedInput(prompt)` and returns `status: 'needs-input'`.
2. The main thread opens an accessible modal dialog (labelled with the prompt, focus moved
   into the text box, Enter submits, Esc cancels the run).
3. The main thread re-sends the run with `inputs + [value]` and the **same seed**.
4. The program re-runs from the top. Because `random` and the clock are seeded or virtual, it
   reaches the same point and continues. Only the final run's actions are replayed.

The cost is that a program with N inputs runs N+1 times. Student programs are tiny, so this
is milliseconds. There is a cap of 20 interactive inputs per run.

**Rejected for v1: SharedArrayBuffer + `Atomics.wait`.** It needs cross-origin isolation
(COOP/COEP headers). GitHub Pages cannot set headers. The `coi-serviceworker` workaround
forces an extra reload and can break behind school filtering proxies, and some managed
Chromebook policies interfere with it. Mode B gives students the same experience with no
header requirements. If a school later controls its headers, SAB could become a
progressive enhancement.

### 6.6 Output capture

`sys.stdout` and `sys.stderr` are replaced with writers that append `out` actions (with `ln`)
to the action log. Output then appears in the Scroll of Output **in sync with the replay**.
A "show all output now" button skips ahead. Output is capped by `maxOutputChars`.

### 6.7 Determinism

Each run gets a seed (random per run, or fixed per quest via `seed:`). The same seed, code
and inputs always give the same result. This is required for replay-on-input and for stable
hidden tests. Quests that use `random` (Region 11) test with several fixed seeds.

### 6.8 Error translation

**Where:** in Python (`codeweald/_errors.py`), where the exception object is available
(`e.lineno`, `e.offset`, `e.name`, `e.msg`). Only traceback frames from `<spellbook>` count.
The innermost student frame gives the line to highlight.

**Output:**

```ts
interface PyErrorInfo {
  type: string;              // 'NameError'
  key: string;               // 'name.missing_quotes' → template in content/errors.yaml
  params: Record<string, string>; // { name: 'hello', suggestion: 'help', line: '3' }
  line: number | null; col: number | null; endCol: number | null;
  raw: string;               // filtered traceback: student frames only, file = "spellbook"
}
```

**Classifier table (initial; unit-tested against Python 3.14 messages):**

| Exception / message pattern | Key | Friendly gist |
|---|---|---|
| `SyntaxError: expected ':'` | `syntax.missing_colon` | "Lines that start a block (`if`, `for`, `while`, `def`) end with a colon `:`." |
| `unterminated string literal` / `…triple-quoted…` | `syntax.unclosed_string` | "A quote opened on line 3 never closed." |
| `'(' was never closed` (also `[`, `{`) | `syntax.unclosed_bracket` | "Every `(` needs a matching `)`." |
| `unmatched ')'` | `syntax.extra_bracket` | |
| `Perhaps you forgot a comma?` | `syntax.missing_comma` | |
| `Maybe you meant '==' or ':=' instead of '='?` | `syntax.assign_in_condition` | "`=` stores. `==` compares." |
| `Missing parentheses in call to 'print'` | `syntax.print_no_parens` | |
| `invalid character '“' (U+201C)` | `syntax.smart_quotes` | "Curly quotes sneaked in (from copying?). Use straight quotes." |
| `invalid decimal literal` | `syntax.name_starts_with_digit` | "Names can't start with a number." |
| `cannot assign to expression here` where the target has a `-`, or `invalid syntax` on a line shaped `word word = …` | `syntax.bad_variable_name` | "Variable names can't have spaces or dashes. Try `book_count`." Checked **before** `assign_in_condition`, because Python 3.14 adds "Maybe you meant '=='" to this message too. |
| `cannot assign to literal` / `to expression` | `syntax.assign_to_value` | |
| other `SyntaxError` | `syntax.generic` | |
| `IndentationError: expected an indented block after 'if'…` | `indent.expected` | "The line after `if …:` must be pushed in (indented)." |
| `unexpected indent` | `indent.unexpected` | |
| `unindent does not match any outer indentation level` | `indent.mismatch` | |
| `TabError` | `indent.tabs` | |
| `NameError` where the name appears in a `print` and is never assigned | `name.missing_quotes` | "Did you mean the *word* `hello`? Words need quotes: `"hello"`." |
| `NameError` with a close match (difflib) | `name.typo` | "Python doesn't know `scroe`. Did you mean `score`?" |
| `NameError` whose name is assigned *later* in the code | `name.before_assignment` | |
| `NameError` for `true`/`false`/`Print` | `name.wrong_case` | "Python is picky about capitals: `True`." |
| `UnboundLocalError` | `name.unbound_local` | (Region 8, scope) |
| `can only concatenate str (not "int") to str` | `type.str_plus_number` | "You can't glue a number onto words. Try `str(…)` or an f-string." |
| `unsupported operand type(s) for +: 'int' and 'str'` | `type.number_plus_str` | "Did you forget `int(…)` around `input()`?" |
| `'str' object cannot be interpreted as an integer` | `type.str_as_int` | |
| `takes N positional arguments but M were given` / `missing … required positional argument` | `type.arg_count` | |
| `'NoneType' object …` | `type.none_value` | (Region 8: did the function `return`?) |
| `IndexError: list index out of range` | `index.out_of_range` | "The list has 3 items (positions 0–2). You asked for position 3." |
| `KeyError` | `key.missing` | "No key `'gold'`. Keys here: `'gems'`, `'coins'`." |
| `ZeroDivisionError` | `zero_division` | |
| `ValueError: invalid literal for int() with base 10: 'abc'` | `value.int_conversion` | "`int()` can only turn digit-words like `'42'` into numbers." |
| `could not convert string to float` | `value.float_conversion` | |
| `list.remove(x): x not in list` | `value.remove_missing` | |
| `AttributeError` on `hero`/`world` | `api.unknown_action` | "The hero doesn't know `mvoe`. Did you mean `move`?" |
| `CodewealdError` subclasses | `api.*` (e.g. `api.bad_direction`) | "`'upp'` isn't a direction. Try `'up'`, `'down'`, `'left'` or `'right'`." |
| Loop budget / action budget / wall clock | `limits.*` | (§6.3) |
| `RecursionError` / `MemoryError` | `limits.recursion` / `limits.memory` | |
| `ImportError` (sandbox) | `import.not_allowed` | |
| anything else | `generic` | "Python found a problem: `TypeError`. Let's read the real error together." |

**Presentation:**

- Byte's friendly explanation appears in the feedback panel.
- The editor gets a CodeMirror diagnostic: an underline, a gutter marker *with an icon*
  (not color only) and a line highlight. Focus does not jump, but a polite live region
  announces "Error on line 3: …".
- A **"Show the real Python error"** toggle shows the filtered traceback. From Region 10 on,
  Byte annotates the parts of the real traceback (file, line, error type, message).
- Templates live in `content/errors.yaml`, so course authors can change the wording without code.

---

## 7. Game API (`codeweald` Python package)

### 7.1 Student-facing API

Starter code begins with `from codeweald import hero, world` wherever the stage is a grid.

| Call | Returns | Behavior |
|---|---|---|
| `hero.move(direction, steps=1)` | `True` if every step succeeded | `direction` ∈ `"up" "down" "left" "right"`. Each step turns the hero to face that way, then moves one tile. A solid tile or the map edge causes a harmless **bonk**; the remaining steps are skipped and the program continues. |
| `hero.face(direction)` | `None` | Turns without moving (useful before `world.look()`). |
| `hero.say(text)` | `None` | Speech bubble. `text` is converted with `str()` and capped at 200 characters. |
| `hero.pick_up()` | item name or `None` | Picks up the first item on the hero's tile. With nothing there, a "shrug" plays. |
| `hero.open_chest(code)` | `True`/`False` | Opens the chest in front of the hero if `str(code)` matches. A wrong code makes the chest rattle. With no chest, the hero shrugs. Loot goes to the inventory. |
| `hero.position()` | `(column, row)` | `(0, 0)` is the top-left corner. Moving up decreases the row. |
| `hero.facing` | `"up"`… | Read-only. |
| `hero.inventory()` | list of item names | A copy (Region 7+). |
| `world.look()` | a word | What is on the tile in front: an object (`"chest"`, `"npc"`, `"door"`), else an item (`"gem"`, `"key"`, `"coin"`), else terrain (`"floor"`, `"wall"`, `"water"`, `"exit"`); `"edge"` past the map. |
| `world.items_here()` | list of item names | Items on the hero's tile. |

Every API error is a `CodewealdError` with a friendly message and an `api.*` key. Misspelled
attributes (`hero.mvoe`) produce "Did you mean `move`?". Quests may expose a few extra,
documented helpers via `stage.api_extras` (e.g. a quest NPC's `world.ask_merchant()`), but
the core API above stays stable.

### 7.2 Stage specification (in quest YAML)

```yaml
stage:
  kind: grid            # grid | npc | none
  grid: |               # ASCII map, one character per tile
    #########
    #H..#..C#
    #.#...#.#
    #...#..E#
    #########
  facing: right
  legend:               # optional; extends/overrides the default legend
    T: { tile: tree, solid: true }
  chests:
    C: { code: "1234", loot: [crown] }
  npcs: []              # for kind: npc — who stands on stage and reacts to output
```

**Default legend:** `#` wall · `.` floor · `H` hero start · `C` chest · `E` exit · `~` water
(solid) · `D` door (solid until opened by quest logic) · `N` NPC (solid) · `g` gem · `k` key ·
`$` coin · `*` star. Course authors draw a map by typing it. The same grid feeds the Python
simulation and the Phaser renderer, so they cannot drift apart.

`kind: npc` stages show the hero and one or more NPCs. NPCs react to the program's output
through quest outcome text (e.g. the Village Crier reads the printed announcement aloud).
`kind: none` is for pure-output quests and shows the Scroll of Output enlarged.

### 7.3 Simulation rules

- The grid is immutable except for items, chests and doors.
- Bonks never raise exceptions. "Failure is safe": the hero bonks, a "bonk!" appears, and the
  program goes on.
- The world tracks `visited` tiles, `bonks`, `said` (a list), `picked`, `chests_opened` and the
  final position. Validators read these.

### 7.4 Action log

```ts
type Dir = 'up' | 'down' | 'left' | 'right';
type XY = [number, number];
type Action = { ln: number | null } & (
  | { t: 'move'; dir: Dir; from: XY; to: XY }
  | { t: 'bonk'; dir: Dir; at: XY; into: string }
  | { t: 'face'; dir: Dir }
  | { t: 'say'; text: string }
  | { t: 'out'; stream: 'stdout' | 'stderr'; text: string }
  | { t: 'pickup'; at: XY; item: string | null }
  | { t: 'chest'; at: XY; ok: boolean; code: string; loot: string[] }
  | { t: 'look'; at: XY; saw: string }
  | { t: 'wait'; seconds: number }
  | { t: 'input'; prompt: string; value: string; source: 'queue' | 'player' }
);
```

`ln` comes from walking the Python stack to the innermost `<spellbook>` frame. The replay uses
it to highlight the line that caused each action. Unit tests cover the log for every API
call, edge case and budget.

---

## 8. Replay engine

`ReplayEngine` turns `Action[]` into animation through the `WorldView` adapter.

- **Durations at 1×:** move 180 ms/tile · bonk 350 ms · say 800 ms + 30 ms/char (max 3 s) ·
  out 100 ms · pickup 250 ms · chest 600 ms · look 150 ms · wait = seconds (capped) ·
  input 600 ms.
- **Controls** (buttons + shortcuts; all labelled):
  - Play / Pause (`Space`, when the replay toolbar has focus)
  - **Step** (one action; `.` key)
  - Speed 0.5× · 1× · 2× · 4× · Instant
  - Restart replay
  - Skip to end
- **Line highlight:** the editor highlights `ln` for the current action. Stepping through a loop
  shows the loop body lines lighting up in turn, which makes "tracing" visible.
- **Output sync:** `out` actions append to the Scroll of Output when they play.
- **Narration:** a polite live region gets short sentences. Consecutive moves merge ("Moved
  right 3 steps."), as do bonks ("Bumped into a wall."), pickups and speech ("Hero says:
  …"). At Instant speed only a summary is announced.
- **Reduced motion:** tweens become instant position changes, there is no camera shake or
  bounce, and "bonk" is a static icon plus text.
- **Running again** cancels the current replay. Editing code during a replay is allowed.
- **Feedback timing:** the validation result shows when the replay ends (or on Skip). The
  student sees what their code did before being told whether it passed.

---

## 9. Quest system

### 9.1 Quest lifecycle

```
locked ──(prerequisites met)──► available ──(opened)──► in_progress ──(all validators pass)──► completed
                                                     ▲                                │
                                                     └──────── replay any time ◄──────┘
```

- **Attempt** = one Run that reaches validation, or one locked-in prediction.
- **Distinct attempts** = the number of unique code hashes run (for the "Tried 5 different
  solutions" badge).
- **Time on task** = active seconds while the quest screen is visible, the tab is focused and
  there was input in the last 120 s.
- **Drafts** autosave (debounced 1 s) per quest, and "Reset code" restores the starter code
  (with confirmation; the old draft stays available through undo).

### 9.2 Quest types

| Type | What the student does | UI specifics | Completes when |
|---|---|---|---|
| `predict` | Reads code; predicts output by choosing (MCQ) or typing | Read-only editor; prediction box; "Lock in prediction" → Run | Every prompt is answered and the code has run. Correctness is recorded for mastery data. When a prediction is wrong, Byte shows a side-by-side "predicted vs. actual" view with the YAML `explain` text. An optional "twin" prompt lets them try again. |
| `investigate` | Runs given code, answers questions | Questions: MCQ, number, short text (accepted-answers list), or "change X and run, what happens?" | All questions answered correctly (unlimited retries, per-question hints). |
| `fix` | Repairs buggy code | Story says how many bugs ("This spell has 2 glitches") | All validators pass. |
| `fill` | Completes gaps | Gaps marked `____` render as highlighted widgets. Optional `locked: true` makes non-gap lines read-only (CodeMirror read-only ranges). | All validators pass. |
| `parsons` | Orders and indents shuffled lines | Two lists, "Spell scraps" and "Your spell", plus optional distractors. Keyboard model in §14.3. | `check: run` (default): the assembled program passes validators, and any correct order is accepted. `check: order`: the order matches the solution or a listed alternative; used for comment-only plans (Region 11 blueprint). |
| `modify` | Changes working code to meet a new requirement | Starter is a working program | All validators pass (usually behavior + "still uses a loop"-type AST checks). |
| `make` | Writes code from (near) scratch | Minimal starter | All validators pass. |
| `boss` | Multi-phase mini-project | Bug Boss health bar = phases left; phase tabs | Each phase completes independently and is saved. The boss is defeated when all phases pass. |

### 9.3 Validators

Validators are declarative YAML entries that run in Python after the student's code. Each
returns `{ id, passed, hint }`. All validators run; feedback picks the most specific
message (§9.4).

| `type` | Fields | Checks |
|---|---|---|
| `output` | `match: exact \| normalized \| contains \| regex \| fuzzy`, `expect` or `expect_regex`, `normalize: [trim, case, spaces, punctuation]`, `threshold` (fuzzy, 0–1) | Printed output. `normalized` trims line ends, unifies newlines and collapses blank trailing lines. `fuzzy` uses a difflib ratio after normalization. |
| `state` | `hero_at: [c, r]`, `hero_on: exit`, `has_items: [gem]`, `items_count: {gem: 3}`, `chests_opened: [C]`, `max_bonks: 0`, `said_contains: "…"` | World state after the run. |
| `variable` | `name`, `equals`, `value_type: int\|float\|str\|bool\|list\|dict`, `matches` (regex for strings) | Top-level variables in the student namespace. |
| `ast` | `require: [For, If, …]`, `forbid: [While]`, `require_calls: [print]`, `min_count: {print: 3}`, `require_else: true`, `function: {name: heal, params: 1, returns: true}`, `no_literal: [42]`, `uses_names: [gold]`, `max_lines` | Code structure via Python's `ast` module. `no_literal` catches hard-coded answers. |
| `hidden_tests` | `mode: vars \| inputs \| call \| seed`, `cases: [...]`, `compare: [output, returns, said, state, vars:<name>]`, `expect: from_solution` or explicit per case | Re-runs the program (each case gets a fresh namespace and world). `vars` rewrites the first top-level assignment of each named variable to the case value. `inputs` runs with that input queue. `call` calls the student's function with `args` and compares the return value and/or output. `seed` runs with fixed random seeds. |
| `style` | `min_comments`, `comment_above: [lines matching a regex]`, `max_line_length` | Uses `tokenize` (the `ast` module drops comments). Used for the "document your code" quests (2-AP-19). |
| `custom` | `python: \|` a `check(ctx)` function | Escape hatch. `ctx` has `.source .tree .output .lines .vars .world .run(vars=, inputs=, seed=, stage=) .call(name, *args)`. Returns `Pass()` or `Fail("hint")`. |

`hidden_tests` also supports `mode: stages`, which re-runs the program on **hidden maps**
(`cases: [{ grid: | … }]`). Use it, for example, to check that a `world.look()` loop solves
any cave, not just the visible one.

**Session validators** (`scope: session`) look across *all of the student's runs* in this quest
or phase, not just the last one. The main thread keeps a small run history per quest session
(line coverage, status, inputs used) and saves it with the draft.

| `type` | Fields | Checks |
|---|---|---|
| `branch_coverage` | `min: all` or a number | Every `if`/`elif`/`else` body has run in at least one of the student's runs ("light a lamp for every door"). Line coverage comes from `sys.monitoring` `LINE` events, recorded only when a quest asks for it. |
| `runs_ok` | `min_runs: 3`, `distinct_inputs: true` | The program finished without an error in N of the student's own runs (e.g. "play your game 3 times without a crash"). |

Every validator may set `id` (so mistakes can reference it) and `fail_hint`.

**Baked expectations (D11):** at build time, `build-content` runs the reference solution on
every hidden case and stores the results. The compiled JSON holds concrete expected values.
The solution itself never ships in the app; instructors read it in the generated answer key (§13).

### 9.4 Common mistakes and feedback selection

`common_mistakes` turn a failure into a **targeted** hint. Each has an `id`, a `detect` and
`feedback`.

| `detect.kind` | Example |
|---|---|
| `error` | `{ kind: error, key: name.missing_quotes }` or `{ kind: error, type: TypeError }` |
| `code_regex` | `{ kind: code_regex, pattern: 'print\(\s*gold\s*\)', ignore_comments: true }` |
| `detector` (named, AST-based, from a library) | `{ kind: detector, name: printed_not_stored, var: gold }` |
| `validator_failed` | `{ kind: validator_failed, id: boundary }` |
| `hidden_case_fails` | `{ kind: hidden_case_fails, validator: cases, case: 0 }` |
| `output_regex` | `{ kind: output_regex, pattern: '^Gold: \d+$', expect: absent }` |
| `state` | `{ kind: state, min_bonks: 1 }` |
| `custom` | `{ kind: custom, python: "def detect(ctx): ..." }` |

**Named detector library (initial):**

- `assign_in_condition`
- `printed_not_stored(var)` — "You printed the answer, but the quest needs you to *store* it in a variable called `gold` first."
- `stored_not_printed(var)`
- `number_as_string(value)`
- `hardcoded_output`
- `missing_call_parens` (e.g. `hero.say` without `()`)
- `range_off_by_one`
- `loop_var_not_updated`
- `infinite_while_true_without_break`
- `function_not_called`
- `function_prints_not_returns`
- `return_inside_loop_too_early`
- `unused_variable`
- `shadowed_builtin` (e.g. `list = [...]`)
- `missing_fstring_prefix` (`"{name}"` without the `f`)

**Selection order:**

1. A run error → the first mistake whose detector fires on it; else the translated error (§6.8).
2. Validators failed → the first matching mistake in YAML order; else the first failing
   validator's `fail_hint`; else a generic "Not quite yet — try a hint?"
3. All pass → success text (`story_outro`), rewards, and any earned bonus.

### 9.5 Hints

- Three tiers per quest: **nudge → targeted explanation → near-complete example with a gap**.
- Tiers unlock in order. They are always free and never cost XP. The UI says so.
- Usage is recorded (`hintsUsed: 0–3`) only for the student's own progress and badges (e.g. *Clean
  Cast*), never as a penalty.
- Tier 3 is shown in a read-only code block with a "Copy into Spellbook" button, so students
  still type or adapt the gap.

### 9.6 Bosses

```yaml
type: boss
boss: { name: "The Village Crier Bug", sprite: bug_crier }
phases:
  - id: p1
    title: "Unscramble the announcement"
    type: fix              # any non-boss type
    learning_outcome: "..."
    starter_code: | ...
    validators: [...]
    hints: [...]
  - id: p2
    starter_code: carry    # start from the student's passing phase-1 code
```

- 2–4 phases, each saved separately. A student can leave and come back.
- The boss "health" bar shows phases left (with text: "2 of 3 glitches fixed").
- When defeated, the Bug turns into a friendly glowing firefly, and the region's Script
  Fragment is awarded.

### 9.7 Knowledge checks

- 3–5 items per region, mixing `mcq` and `predict` (typed output), each with an `explain`.
- Low-stakes: it does not gate the next region (course authors can turn gating on with
  `features.knowledgeCheckGates`). It is
  retakeable; the best and latest scores are stored. XP is awarded once, for the first
  completion, regardless of score.
- Options are shuffled per attempt. Results show what was right with text and icons, never
  color alone.

### 9.8 Dialogue, concept scenes and glossary

- **Dialogue** is a list of `{ speaker, text }` lines in YAML. Text is a safe Markdown subset
  (bold, italic, inline code, code blocks, lists) plus glossary links `[[variable]]` or
  `[[jars|variable]]`.
- The build compiles text to a small JSON AST that Preact renders. There is no `innerHTML`
  anywhere.
- **Glossary terms** render as buttons (toggletip pattern): focusable, Enter/Space toggles the
  definition, Esc closes it, and it is announced to screen readers. Each glossary entry has a
  term, a ≤ 2-sentence definition, an example and related terms.
- **Concept scene** per region: Byte's analogy, a few dialogue lines, and one worked example
  (runnable in a mini stage, with step-by-step replay). It is skippable (`Skip scene` button,
  plus Esc) and replayable from the Spellbook.
- Dialogue never auto-advances (no timing pressure). There is a "Read aloud" button per line,
  plus an optional auto-read setting (§14.5).

### 9.8a Rubber-duck dialog (Region 10)

A quest may add a `duck:` block. Before (or while) editing, a "Talk to the Duck" panel walks
through the program one line at a time and asks "What should this line do?". The student
types a short free-text answer for each line.

- Answers are **not graded**, and they are stored only in the local draft.
- They are **excluded from exports** by default, because they are free text.
- Finishing the walk-through unlocks the duck's closing question ("Did you spot anything
  odd?") and counts toward the *Duck Whisperer* badge.

### 9.9 Side quests

These are regular quests with `side_quest: true`. They are optional, never block progress, and
award bonus XP plus the "Side Questor" badge track. They appear on the region's **Quest Board**
once the region's core quests are done.

### 9.10 Quest screen layout

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ◀ Back to map   r4 · The Gatekeeper's Question        XP ▓▓▓▓░ Lv 5  ⚙  ?      │
├──────────────────────┬────────────────────────────────┬───────────────────────┤
│ QUEST                │ SPELLBOOK (CodeMirror)         │ STAGE (Phaser canvas) │
│ Story intro          │  1 gold = 7                    │  ##########           │
│ Goal (1 sentence)    │  2 if gold >= 10:              │  #H....D..#           │
│ Concept card ▸       │  3     hero.say("…")           │  ##########           │
│ Hints: [1] [2] [3]   │                                │ ▶ ⏸ ⏭ Step  1× ▾       │
│                      │ [▶ Run  Ctrl+Enter] [Reset]    ├───────────────────────┤
│ Feedback / Byte      │ [Jar Shelf ▸] (variables)      │ SCROLL OF OUTPUT      │
└──────────────────────┴────────────────────────────────┴───────────────────────┘
```

- At ≤ 1100 px wide the panels become tabs (Quest · Spellbook · Stage/Output), with a
  persistent Run button.
- The target screen is 1366×768, the most common school Chromebook resolution.
- Skip links: "Skip to editor", "Skip to output".

---

## 10. Content data model and schema

### 10.1 Files

| File | Holds |
|---|---|
| `content/course.yaml` | Course id, title, ordered region list, `enabled` flags, lessons per region (pacing), side quests on/off |
| `content/regions/NN-slug/region.yaml` | Region metadata, overworld map (ASCII grid + objects), NPCs, concept scene, quest order, boss id, side quests, knowledge check, Script Fragment |
| `content/regions/NN-slug/quests/*.yaml` | One quest per file |
| `content/glossary.yaml` | Terms |
| `content/items.yaml` | Concept items (name, icon, description = concept summary, linked concept card) |
| `content/badges.yaml` | Badges (name, icon, description, trigger) |
| `content/errors.yaml` | Friendly error templates by key |
| `content/workshop.yaml` | Sandbox maps |

### 10.2 Quest file (full example)

```yaml
# yaml-language-server: $schema=../../../../schema/quest.schema.json
id: r4-q3-gatekeeper
region: forked-road-forest
title: "The Gatekeeper's Question"
type: make                      # predict | investigate | fix | fill | parsons | modify | make | boss
learning_outcome: "Use if/else to choose between two actions based on a comparison."
csta: [2-AP-12]
prerequisites: [r4-q2-true-or-false]
estimated_minutes: 10
side_quest: false
npc: gatekeeper                 # overworld NPC that offers it (optional; else Quest Board)
vocabulary: [condition, comparison, else]

story_intro: |
  The [[gatekeeper]] only lets travelers through if they carry **at least 10 gold**.
  Your purse has 7. Make the hero say the right thing either way!
goal: "Use if/else so the hero asks to pass with 10+ gold, and turns back otherwise."
concept_card: |
  An `if` statement runs code only when its [[condition]] is `True`.
  `else` runs when it is `False`.
story_outro: |
  The gatekeeper nods. "Clever. Your code knows what to do either way."

stage:
  kind: grid
  grid: |
    #########
    #H....D.#
    #########
  facing: right

starter_code: |
  from codeweald import hero
  gold = 7
  # Write your if/else here

solution: |
  from codeweald import hero
  gold = 7
  if gold >= 10:
      hero.say("May I pass?")
  else:
      hero.say("I'll come back with more gold.")

validators:
  - id: uses-if-else
    type: ast
    require: [If]
    require_else: true
    fail_hint: "Use `if` and `else` so the hero can handle both cases."
  - id: cases
    type: hidden_tests
    mode: vars
    compare: [said]
    expect: from_solution        # baked at build time
    cases:
      - { vars: { gold: 10 } }   # exactly 10 must pass
      - { vars: { gold: 3 } }
      - { vars: { gold: 25 } }
  - id: no-hardcode
    type: ast
    uses_names: [gold]
    fail_hint: "Your `if` should look at the `gold` variable."

common_mistakes:
  - id: assign-not-compare
    detect: { kind: error, key: syntax.assign_in_condition }
    feedback: "In Python, `=` stores a value. To *compare*, use `==` or `>=`."
  - id: boundary
    detect: { kind: hidden_case_fails, validator: cases, case: 0 }
    feedback: "What happens when gold is exactly 10? 'At least 10' includes 10. Try `>=`."

wrong_solutions:                  # ≥ 2 required; CI checks each fails as declared
  - expect_mistake: boundary
    code: |
      from codeweald import hero
      gold = 7
      if gold > 10:
          hero.say("May I pass?")
      else:
          hero.say("I'll come back with more gold.")
  - expect_mistake: assign-not-compare
    code: |
      from codeweald import hero
      gold = 7
      if gold = 10:
          hero.say("May I pass?")

hints:
  - "What should happen when gold is 10 or more? And when it isn't?"
  - "`if gold >= 10:` checks the purse. Put an indented `hero.say(...)` under it, then add `else:`."
  - |
    if gold >= 10:
        hero.say("May I pass?")
    else:
        ____

rewards: { xp: 50, item: null, badge: null }
bonus:
  - id: elif-polite
    description: "Add an elif so the hero also says something special with exactly 9 gold."
    check: { type: custom, python: "def check(ctx): ..." }
    xp: 15
```

### 10.3 Field reference (quest)

| Field | Req. | Notes |
|---|---|---|
| `id` | ✔ | Unique. `r{N}-q{M}-slug` · `r{N}-boss-slug` · `r{N}-side{K}-slug` |
| `region` | ✔ | Region id |
| `title` | ✔ | ≤ 60 characters |
| `type` | ✔ | One of the 8 types |
| `learning_outcome` | ✔ | Starts with an action verb. CI rejects vague verbs ("understand", "know", "learn about"). |
| `csta` | ✔ | ≥ 1 code matching `^2-(AP\|CS\|DA\|IC\|NI)-\d{2}$` |
| `prerequisites` | — | Quest ids; must exist; no cycles |
| `estimated_minutes` | ✔ | 5–15 (boss phases 5–10 each) |
| `story_intro`, `goal` | ✔ | Reading-level checked |
| `concept_card` | ✔ (non-boss) | Shown in the Spellbook after completion |
| `stage` | ✔ | §7.2 |
| `starter_code` | ✔ | (`predict`/`investigate`: the code shown) |
| `solution` | ✔ | Must pass all validators |
| `validators` | ✔ | ≥ 1 (not for `predict`/`investigate`, which use `prompts`/`questions`) |
| `common_mistakes` | — | §9.4 |
| `wrong_solutions` | ✔ (code-checked types) | ≥ 2 for `fix`, `fill`, `modify`, `make` and side quests, and ≥ 2 **per boss phase**. Each has `code` plus `expect_mistake` (a mistake id) or `expect_feedback_contains`. For `parsons`, a wrong solution is a line order (`order: [3, 1, 2, …]`) instead of code. `predict`/`investigate` have no code to get wrong. Instead, every MCQ needs ≥ 2 distractors, and the content tests check that the declared answers match the real output and that the distractors don't. |
| `hints` | ✔ | Exactly 3 |
| `rewards` | — | `xp` defaults by type (§11.2), `item`, `badge` |
| `bonus` | — | Optional challenges, extra XP |
| `inputs`, `interactive_input` | — | §6.5 |
| `seed` | — | Fixed seed for `random` |
| `prompts` | `predict` | `[{ kind: mcq\|text, question, options?, answer, explain }]` |
| `questions` | `investigate` | `[{ kind: mcq\|number\|text, question, answer \| accept: [...], hint }]` |
| `parsons` | `parsons` | `{ lines: [...], distractors: [...], indent: true }` (indent levels are written into `lines`) |
| `phases` | `boss` | §9.6 |
| `side_quest` | — | Default `false` |
| `api_extras` | — | Extra API helpers for this quest |
| `vocabulary` | — | Glossary terms (must exist) |
| `retrieval` | — | Earlier regions this quest revisits, e.g. `[r2, r6]` (spaced retrieval; checked per region by §10.4) |
| `duck` | — | Rubber-duck dialog (§9.8a) |
| `track_coverage` | — | `true` turns on line-coverage recording for session validators (§9.3) |

### 10.4 Schema implementation

- `src/content/schema.ts` defines Zod 4 schemas. Types are inferred (`z.infer`), so engine code
  and content share one definition.
- `npm run schema` runs `z.toJSONSchema()` → `schema/*.schema.json`. The
  `# yaml-language-server` line at the top of each file gives course authors autocomplete and inline
  errors in VS Code.
- **Cross-reference checks** (beyond the shape):
  - ids are unique and match their file name
  - prerequisites exist and have no cycles
  - glossary links and `vocabulary` exist
  - items and badges exist
  - every region has ≥ 1 `fix` quest
  - regions ≥ 3 have ≥ 1 quest whose `retrieval` names an earlier region
  - every boss has 2–4 phases
  - knowledge checks have 3–5 items
  - `____` gaps appear only in `fill` starters and tier-3 hints

### 10.5 Region file and other content files

```yaml
# content/regions/04-forked-road-forest/region.yaml
id: forked-road-forest
number: 4
name: "Forked Road Forest"
concepts: [booleans, comparisons, if/elif/else, and/or/not, indentation]
overworld:                                # ASCII map, same idea as quest stages (§11.1)
  grid: |
    TTTTTTTTTTTTTTTTTTTT
    T......~~~.........T
    T..==========......T
    …
  objects:
    - { kind: npc, id: gatekeeper, at: [12, 4], quest: r4-q3-gatekeeper }
    - { kind: board, at: [3, 2] }                   # Quest Board
    - { kind: poi, id: old-oak, at: [17, 1] }
    - { kind: spawn, at: [2, 6] }
music: null
npcs:
  gatekeeper: { name: "Gatekeeper Moss", sprite: npc_gatekeeper, greeting: "Halt! …" }
concept_scene:
  analogy: "An if statement is a signpost at a fork in the road…"
  lines:
    - { speaker: byte, text: "Every path here splits in two. Let's teach the signposts to choose." }
  worked_example:
    stage: { kind: none }
    code: |
      gold = 12
      if gold >= 10:
          print("The gatekeeper waves you through.")
      else:
          print("Come back with more gold!")
    explain:                                 # shown step by step during the replay
      - { line: 2, text: "Python checks the [[condition]]: is 12 >= 10? True!" }
quests: [r4-q1-talking-signpost, r4-q2-true-or-false, r4-q3-gatekeeper, …]   # core order
boss: r4-boss-riddle-gate
side_quests: [r4-side1-leap-year-lanterns, r4-side2-rock-paper-mushroom]
knowledge_check:
  items:
    - { kind: predict, code: "print(5 > 3 and 2 > 4)", answer: "False", explain: "…" }
    - { kind: mcq, question: "What is the difference between = and ==?",
        options: ["…", "…", "…"], answer: 1, explain: "…" }
fragment: { id: fragment-choices, name: "Script Fragment: Choices", description: "…" }
pois: [old-oak, mossy-well, hidden-glade]    # secret corners for the Explorer badge
```

| File | Shape (one entry) |
|---|---|
| `items.yaml` | `{ id, name, icon, description, concept_card, region, example?: code }` |
| `badges.yaml` | `{ id, name, icon, description, trigger: { kind: first_fix \| no_hints \| distinct_attempts \| failed_then_passed \| all_pois \| real_error_views \| duck_used \| boss_defeated \| all_checks \| side_quests \| workshop_runs \| capstone, n?: number, region?: id } }` |
| `glossary.yaml` | `{ term, definition (≤ 2 sentences), example?, related?: [term] }` |
| `errors.yaml` | `{ key: { title, message, tip?, glossary?: [term] } }` with `{line}`, `{name}`, `{suggestion}` placeholders |
| `workshop.yaml` | `{ id, name, description, stage }` (same stage format as quests) |

### 10.6 Content pipeline

```
content/**/*.yaml ──► build-content.ts ──► Zod validate ──► cross-ref checks
                                       ──► text → safe AST (glossary links resolved)
                                       ──► run solutions in Pyodide (Node) → bake hidden-test expectations
                                       ──► drop reference solutions (they never ship in the game)
                                       ──► src/generated/content/{course.json, region-01.json, …}
```

- `npm run validate-content` = the same pipeline in check mode, plus every `wrong_solution`,
  plus the reading-level report. It prints author-friendly errors with file and line
  (`content/regions/04…/r4-q3-gatekeeper.yaml:27 — hint 3 must contain a ____ gap`).
- `npm run new-quest -- --region 4 --type make --slug river-ferry` scaffolds a valid file with
  TODO markers.
- In dev, run `npm run content` after editing YAML; the dev server reloads the compiled JSON.
  `/?dev#/dev/quest/<quest-id>` (or `/?dev#/dev/check/<region-id>`) opens any quest or
  knowledge check directly, with a throwaway "Dev Tester" profile. It only works with the
  `?dev` flag, so it never appears in normal play.

---

## 11. Game systems

### 11.1 Overworld and regions

- Each region's overworld is an **ASCII grid in `region.yaml`**, the same idea as quest stages:
  one character per 16×16 px tile, a default legend (grass, path, water, trees, houses,
  fences, flowers…) and optional per-region legend entries. Maps are about 30×20 tiles,
  shown with integer scaling and `pixelArt: true`. This replaces the Tiled maps in the first
  draft. Course authors can edit a map in any text editor, no extra tool is needed, and the same
  grid code serves quests and the overworld.
- An `objects` list places NPCs, signs, the region's **Quest Board**, POIs ("secret corners"),
  the spawn point and region exits. An NPC's `quest` property binds it to content.
- **Movement:** grid-based, using arrow keys or WASD while the world has focus, an on-screen
  D-pad for pointer/touch, and click-to-walk to adjacent tiles. **Interact:** Enter / Space /
  E on the facing NPC or sign.
- **Quest markers** combine shape and text, never color alone: `!` available · `…` in progress
  · `✓` done. They are mirrored in the DOM **Quest Log**.
- **Quest Log** (DOM panel, `Q`) lists all region quests with their status and a "Go" button. It
  is the keyboard and screen-reader fast path: any available quest can start without walking.
- **Gating:** a region unlocks when the previous region's boss is defeated. Quests inside a
  region follow their `prerequisites`.
- **Author-added quests** without a map NPC appear on the Quest Board, so adding a quest
  never needs a map edit.

### 11.2 XP and levels

- **XP defaults by type** (overridable in YAML): predict 20 · investigate 25 · fill 30 ·
  parsons 30 · fix 35 · modify 40 · make 50 · boss phase 40 (+ 50 on defeat) · side quest
  40 · knowledge check 20 (first completion).
- Bonus challenges award +10–20 XP.
- XP is granted once per quest. **XP never decreases.**
- **Level curve:** the cumulative XP for level *n* is `25·n·(n−1)`, so L2 = 50, L3 = 150,
  L5 = 500 and L10 = 2,250. With the curriculum map's 66 core quests, 39 boss phases, 18
  side quests and 11 checks, the full course is ≈ 5,000–5,500 XP, which reaches about
  level 15. Core content alone reaches about level 13.
- **Titles:** Apprentice (1–2) · Scribe (3–4) · Spellwright (5–7) · Scriptwright (8–10) ·
  Master Scriptwright (11+).

### 11.3 Concept items

- Defined in `items.yaml` and granted by `rewards.item`.
- Each item has an icon, a name and a description that *is* the concept summary (e.g. *Boots
  of Looping: "A `for` loop repeats code once for each item in a sequence. `range(5)` gives
  0, 1, 2, 3, 4."*), plus a link to the full concept card, a worked example and glossary
  terms.

### 11.4 Inventory / Notebook

- A grid of item cards, each a focusable button. Enter opens a detail page with the concept
  summary, worked example (runnable), related quests and glossary.
- Searchable. Script Fragments appear on a separate shelf.

### 11.5 Spellbook (editor + reference)

- **The editor:** CodeMirror 6 with Python highlighting, line numbers, auto-indent,
  bracket matching, adjustable font size (12–28 px), a high-contrast theme, and lint
  diagnostics for errors.
- **Spell Pages:** concept cards of completed quests, worked examples from concept scenes,
  and "My Spells", the student's own passing solution for each quest (viewable, copyable).
- **Keyboard:** Tab indents. **Esc, then Tab** leaves the editor (CodeMirror's escape
  convention, explained in a visible hint under the editor), which satisfies "no keyboard
  trap". `Ctrl+Enter` runs.

### 11.5a Jar Shelf (variables panel)

From Region 2 on, a **Jar Shelf** panel under the editor shows the program's top-level
variables after each run. Each one is a labelled jar with its name, value and type ("`gold`
→ `7` (whole number)"), using the `vars` snapshot from §6.1.

- Long values are truncated, and lists and dictionaries are shown one level deep.
- During a stepped replay, jars show the value *at the end of the run* and say so ("after the
  program finished"). Live per-step values are out of scope for v1.
- It is a real `<table>`, so screen readers can read it. It can be collapsed, and it is
  hidden in quests that set `jar_shelf: false` (for example, predict quests where it would
  give away the answer).

### 11.6 Badges

Badges are defined in `badges.yaml` with a trigger. Triggers are evaluated in
`state/badges.ts` after every state change.

| Badge | Trigger |
|---|---|
| First Bug Squashed | First `fix` quest completed |
| Clean Cast | A quest completed without any hint |
| Tinkerer | 5 distinct attempts on one quest |
| Never Give Up | A quest completed after ≥ 4 failed attempts |
| Explorer of *Region* | Every POI in a region visited |
| Error Reader | Opened "Show the real Python error" 5 times |
| Duck Whisperer | Used Byte's rubber-duck debugging (Region 10) |
| Region Restorer ×11 | Each boss defeated |
| Review Riddler | All 11 knowledge checks completed |
| Side Questor (I/II/III) | 3 / 8 / all side quests |
| Workshop Inventor | 10 Workshop programs run |
| Great Scriptwright | Capstone complete |

No badge rewards speed, so there is no time pressure.

### 11.7 Workshop (sandbox)

- Unlocked after the Region 1 boss.
- Pick a sandbox map from `workshop.yaml` (meadow, maze, treasure vault, an empty large grid).
- The full API, interactive `input()` (Mode B) and the larger loop budget are available. There
  are no validators.
- Students save up to 20 named programs locally, or export a program as a `.py` download.
- An API reference panel lists only the calls learned so far, plus "more" for the rest.

### 11.8 Character creator and nicknames

- 8 pre-made avatars with varied skin tones, hair styles, glasses, a head covering and a
  wheelchair user. Every avatar has full walk/bonk/celebrate animations.
- 6 color themes (cloak + UI accent), each verified for contrast in light and dark UI.
- **Nickname:** 2–16 characters (letters, digits, spaces, hyphens). A "Make one for me" button
  generates "Adjective Creature" names (e.g. *Clever Newt*). Byte says: "Pick a nickname — not
  your real name!"
- **Filter (local):**
  1. Normalize: lowercase, strip accents, map leetspeak (`0→o 1→i 3→e 4→a 5→s 7→t @→a $→s`),
     collapse repeated letters and remove separators.
  2. Check substrings against a bundled blocklist, with an allowlist for innocent words that
     contain blocked substrings (the "Scunthorpe problem").
  3. Reject email-, URL- and phone-like patterns (≥ 5 digits).
  4. The rejection message is gentle and gives no detail about why.

  Unit tests cover the filter.

---

## 12. Persistence, save codes and export

### 12.1 Data model

```ts
interface Profile {
  id: string;                    // random UUID, local only
  nickname: string; avatarId: string; themeId: string;
  createdOn: string;             // date only (YYYY-MM-DD)
  xp: number;
  quests: Record<QuestId, QuestRecord>;
  bossPhases: Record<QuestId, string[]>;     // completed phase ids
  checks: Record<RegionId, { best: number; latest: number; total: number; attempts: number }>;
  items: string[]; badges: string[]; fragments: string[];
  poisVisited: Record<RegionId, string[]>;
  workshop: { name: string; code: string; mapId: string }[];
  counters: { realErrorViews: number; workshopRuns: number };
  settings: Settings;
}
interface QuestRecord {
  status: 'available' | 'in_progress' | 'completed';
  attempts: number; distinctAttempts: number; failedBeforePass: number;
  hintsUsed: 0 | 1 | 2 | 3;
  activeSeconds: number;
  completedOn?: string;          // date only
  predictionsCorrectFirstTry?: number; predictionsTotal?: number;
  bonus?: string[];
  solution?: string;             // passing code ("My Spells")
}
```

Drafts are stored separately (`drafts/<profileId>/<questId>`), so keystrokes don't rewrite
the profile.

### 12.2 Storage

- **IndexedDB** database `codeweald` with stores `profiles` and `drafts`, accessed
  via `idb-keyval` (custom stores).
- Saves are debounced (500 ms) and flushed on `visibilitychange` and `pagehide`.
- `navigator.storage.persist()` is requested to reduce eviction.
- **Fallbacks:** localStorage, then memory-only. In memory-only mode a banner says "This
  browser can't save. Use **Save code** before you leave."
- **Migrations:** each record has `schemaVersion`. `state/migrations.ts` chains upgrade
  functions. Unit tests cover every migration.

### 12.3 Progress file (export / import)

- File name `codeweald-<nickname>-<YYYY-MM-DD>.codeweald.json`: a JSON envelope
  `{ format: "codeweald-progress", version, courseId, contentVersion, exportedOn, profile, drafts }`.
- It holds everything, including the student's code.
- **Import:** user-picked file only, ≤ 5 MB, Zod-validated, never rendered as HTML.
  - Unknown quest ids (from other content versions) are kept but ignored.
  - The student chooses **Replace this profile** or **Add as new profile**. A third option,
    **Merge**, keeps the best of both: union of completions, items and badges; max of XP,
    hints, attempts and time.

### 12.4 Save code

This is a text code for moving progress between devices, or handing it in by pasting it into
an LMS text box. It needs no file handling.

- **Format:** `CW1-` + Crockford Base32 in groups of 5, ending in a CRC-16 check group.
- **Payload** (bit-packed, varints):
  - content version hash (16 bits)
  - a short profile id (32 random bits, so a restore can recognise the same adventurer on
    another device)
  - export date (days since 2026-01-01, 16 bits)
  - avatar and theme
  - nickname (UTF-8)
  - XP
  - per quest, in course manifest order: status (2 bits), hint tier (2), attempts bucket
    (3: 0, 1, 2, 3, 4–5, 6–9, 10–19, 20+) and time bucket (3: <2, 2–5, 5–10, 10–15, 15–20,
    20–30, 30–45, 45+ min)
  - knowledge-check best scores
  - a special-badge bitset

  Items and most badges are re-derived from completions.
- **Size:** about 95 quests × 10 bits + header ≈ 155 bytes ≈ **250 characters**. That is fine
  to copy and paste, too long to type by hand. Code drafts are not included (use the file
  for those).
- Typos are caught by the check group: "That code has a typo — check the characters again."
- The trade-off with "short" was open question Q4; the owner chose this format.

### 12.5 Saving out (devices may wipe data)

**Decision Q3:** assume a student's device may forget everything at sign-out. Local storage is
only a convenience; the save code or progress file is the real copy.

- **Save menu** (HUD button, `S` shortcut while the HUD has focus) with two equal options:
  - **Copy save code**: copies the code and shows it as selectable text, for pasting into a
    Google Classroom private comment, a doc or any text box.
  - **Save progress file**: where `window.showSaveFilePicker` exists (Chrome on ChromeOS and
    desktop), the system "Save as" dialog opens, so students can pick Google Drive in the
    Files app. Otherwise it is a normal download. The game makes no network request either
    way; Drive syncing is done by the operating system.
- **Continue from a save** on the title screen: paste a code or open a file
  (`showOpenFilePicker`, or `<input type="file">` as the fallback). The restored profile
  resumes at its last region and open quest.
- **Unsaved-progress tracking:** the profile stores `lastSavedOutHash`. When the current
  progress hash differs, the HUD shows an "Unsaved progress" marker (icon + text) and the
  `beforeunload` leave-page warning is armed.
- **Save points:** after each completed quest or boss phase, a non-blocking toast ("Save
  point! Keep your progress safe.") offers both save options. It never steals focus; it is
  announced politely and closes with Esc.
- **Same profile on a new device:** profile ids travel inside codes and files. If a restore
  matches an existing local profile, the student chooses Replace or Keep both.

---

## 13. Instructor answer key (no in-app teacher features)

**Owner decision (Q13):** Codeweald is a **self-paced** course that students do on their own.
The app has no teacher features: no teacher mode, passphrase, class codes, dashboard, CSV export
or in-app teacher guide. Instructors still need the solutions to be ready for questions.

- `npm run solutions` generates **`docs/solutions.md`** from the content files. For every region
  it lists:
  - the concepts and the concept-scene analogy
  - per quest (and boss phase): type, learning outcome, CSTA codes, the reference solution,
    predict/investigate answers, the common mistakes with the feedback students see, and the
    three hints
  - knowledge-check answers with their explanations
- The generated file is committed, so it stays in step with the content (CI checks that it is
  up to date).
- **Solutions never ship in the game.** The build drops them from the compiled content. A
  student can't find them in the app bundle.
- **Caveat:** the YAML in `content/` and `docs/solutions.md` both contain solutions. If the
  repository is public, students could find them there. A private repository (or keeping the
  answer key elsewhere) avoids that.
- `docs/quest-authoring.md` remains for anyone who edits or adds quests (§10).

## 14. Accessibility design

### 14.1 Principles

- Every interactive element is real HTML (buttons, inputs, lists, dialogs). Phaser draws only
  the world.
- The canvas container is `role="img"` with a live text description of the current scene
  ("Hearthvale square. The Crier is 2 tiles to your right."). A **Describe surroundings**
  button (`L`) reads what is around the hero.

### 14.2 WCAG 2.1 AA mapping (key criteria)

| SC | How Codeweald meets it |
|---|---|
| 1.1.1 Non-text content | Alt text for item icons, avatars and badges; canvas description; decorative art `aria-hidden` |
| 1.3.1 Info & relationships | Semantic headings, lists and tables; labelled form fields; the Jar Shelf uses a real `<table>` |
| 1.4.1 Use of color | Status always has icon + text (✓ ◐ ○, "Passed", "Not yet"); diagnostics have gutter icons; Parsons indentation has guides + text |
| 1.4.3 / 1.4.11 Contrast | Tokens verified ≥ 4.5:1 text, ≥ 3:1 UI and focus; checked by axe in CI and a token unit test |
| 1.4.4 Resize text | Text scale 100–200% (rem-based); editor font separate |
| 1.4.10 Reflow | DOM panels reflow to a single column; the canvas is a 2D game area (allowed exception) |
| 1.4.12 Text spacing | No fixed-height text boxes |
| 1.4.13 Content on hover/focus | Glossary toggletips are dismissible (Esc), hoverable and persistent |
| 2.1.1 Keyboard | Everything, including movement, Parsons and the editor |
| 2.1.2 No keyboard trap | Editor: Esc then Tab; modals trap focus *intentionally* and close with Esc |
| 2.1.4 Character key shortcuts | Single-key shortcuts (WASD and arrows, `E`, `L`, `Q`, and the replay keys `Space` and `.`) are active only when the world, HUD or replay toolbar has focus, and can be turned off in Settings |
| 2.2.1 / 2.2.2 Timing; pause | No timed tasks. Dialogue never auto-advances. Replay can be paused. Ambient animation stops with reduced motion. The code timeout is a safety stop, not a user time limit. |
| 2.3.1 Flashes | No flashing > 3/s; bonk and celebration effects audited |
| 2.4.1 Bypass blocks | Skip links on quest and overworld screens |
| 2.4.3 / 2.4.7 Focus order & visible | Logical DOM order; 3 px focus ring with ≥ 3:1 contrast on every theme |
| 2.5.1 / 2.5.3 Pointer gestures; label in name | Parsons drag has button and keyboard equivalents; visible labels match accessible names |
| 3.1.1 Language | `lang="en"` on the document; code blocks marked so TTS skips or spells them (§14.5) |
| 3.3.1 Error identification | Code errors described in text with line number |
| 4.1.2 Name, role, value | ARIA only where needed (tabs, toggletips, live regions, listbox for Parsons) |
| 4.1.3 Status messages | Polite live region for replay narration, run status and saves; assertive only for blocking errors |

### 14.3 Accessible Parsons puzzle

- Two `listbox`-style lists: "Spell scraps" and "Your spell".
- **Keyboard:**
  - ↑/↓ moves focus between lines.
  - **Space** picks up a line (announced: "Picked up `print(x)`, position 2 of 5, indent 0").
  - ↑/↓ moves the held line.
  - ←/→ (or Shift+Tab/Tab) changes the indent.
  - **Space** drops it; **Esc** cancels.
  - **M** moves a line between the two lists.
- Each line also has visible buttons ▲ ▼ ◀ ▶ ⇄ for mouse users who cannot drag.
- Indentation shows as guide bars **and** a text label ("indent 1").

### 14.4 Settings

- Text size: 100 / 125 / 150 / 200%.
- Font: Atkinson Hyperlegible Next (default), OpenDyslexic, or system.
- Code font: Atkinson Hyperlegible Mono or system mono.
- Reduced motion: system / on / off.
- High-contrast theme.
- Audio: master, music and effects sliders; sound effects off by default in class.
- Text-to-speech on/off, voice and rate.
- Shortcut keys on/off.
- Replay default speed.

Settings are stored per profile. The title screen has its own quick text-size and contrast
toggle, before any profile exists.

### 14.5 Text-to-speech

- Uses the Web Speech API (`speechSynthesis`).
- Prefers voices with `localService === true`, so speech works offline. If no local voice
  exists, the TTS controls say "Read-aloud needs an installed voice", not a silent failure.
- Each dialogue line has a "Read aloud" button. Auto-read is optional. Speech stops on
  navigation.
- Code blocks are skipped by default, or read with symbols named ("print, open parenthesis…").

### 14.6 Palette

- Status colors follow the Okabe–Ito colorblind-safe set (blue, orange, bluish-green,
  vermillion) and are always paired with icons and words.
- Design tokens live in `src/ui/tokens.css`, with a unit test that checks contrast ratios
  for every theme.

---

## 15. Privacy and security

### 15.1 COPPA / FERPA posture

- **No personal information is collected.**
  - nicknames only, with real-name discouragement and filtering
  - no email, accounts or device identifiers
  - dates only, no timestamps of day
- **No data leaves the device** except through a student-initiated file download/upload,
  or a save code the student copies.
- **No analytics, trackers, external fonts or CDNs.** Every asset is bundled.
- The README includes a short "Handling exported files" note: a progress file contains
  the student's nickname and code, so keep it somewhere private.

### 15.2 Network

- **CSP** (meta tag):
  `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self'; font-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'none'`.
  Phase 1 verifies Pyodide's exact needs; `'unsafe-eval'` is added only if required.
- After the first load, the service worker serves everything from cache. The only remaining
  request is the browser's own same-origin service-worker update check.
- The worker neuters network APIs (§6.4).
- An E2E test fails if the page requests any non-same-origin URL, and checks that the
  app runs with the network turned off.

### 15.3 Untrusted inputs

| Input | Treatment |
|---|---|
| Student code | Sandboxed worker (§6.4) |
| Imported progress files / save codes | Size limit, Zod validation, checksum; values only ever rendered as text |
| Nicknames | Filtered, length-limited, escaped |
| Content YAML | Trusted (written by course authors) but still rendered through the safe text AST, never as HTML |

### 15.4 Known limits (accepted)

- A student with dev tools can edit their IndexedDB progress. Solutions are not in the bundle.
- This is low-stakes, self-paced practice, so that is acceptable.

---

## 16. Offline and PWA

- `vite-plugin-pwa` (Workbox) generates the service worker and the web app manifest
  (original icons, `display: standalone`, theme color).
- **Precache:** the app shell, JS/CSS chunks, fonts, art, audio and content JSON.
- **Pyodide** (≈ 14 MB unpacked: `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide.asm.js`,
  `pyodide.mjs`, `pyodide-lock.json`) is **runtime-cached** (CacheFirst, cache name
  `pyodide-<version>`), not precached. This avoids a double download on the first visit:
  1. The SW installs with the small precache, then `skipWaiting` + `clientsClaim`.
  2. The worker starts after the SW controls the page (with a 3 s fallback).
  3. Its fetches go through the SW and land in the cache.
  4. The worker streams the downloads and reports byte progress to the loading screen.
- **"Ready to play offline ✓"** shows in Settings and on the title screen once the precache
  and the Pyodide cache are both complete.
- **Updates:** a new version shows "A new version of Codeweald is ready — reload when you're
  done with this quest". It never auto-reloads mid-quest. Save data survives updates.
  Content-version changes run migrations.
- `.wasm` must be served as `application/wasm` (deployment docs).
- No COOP/COEP headers are required (§6.5).

---

## 17. Performance

| Budget | Target | How it is checked |
|---|---|---|
| App download excl. Pyodide | ≤ 4 MB gzip (brief: < 15 MB) | `scripts/size-budget.ts` in CI |
| Main JS chunk | ≤ 700 KB gzip (Phaser ≈ 350 KB, CodeMirror ≈ 150 KB) | size-budget |
| Content JSON per region | ≤ 80 KB gzip, lazy-loaded | size-budget |
| Cold start → title screen | ≤ 2 s on 4× CPU throttle | Playwright + CDP `Emulation.setCPUThrottlingRate` |
| Cached Pyodide → ready | ≤ 8 s on 4× throttle | Playwright |
| Typical quest run → result | ≤ 300 ms on 4× throttle | Playwright timing |
| Replay | ≥ 30 fps on 4× throttle | Phaser FPS sample in E2E |
| Memory | ≤ 350 MB tab total | Manual check on a 4 GB Chromebook in Phase 6 |

**Tactics:**

- Pyodide loads in the background during the title and creator screens.
- Phaser runs with `powerPreference: 'low-power'`, a 30 fps cap when idle and the loop
  sleeping on non-world screens.
- Texture atlases; audio as OGG; region content and maps lazy-loaded.
- No standby worker by default (`features.standbyWorker: "off"`). `"auto"` keeps a second,
  warm worker on devices reporting `deviceMemory ≥ 8`, and `"on"` always does. Either makes
  layer-3 restarts instant. Phase 6 decides the default from measurements.

---

## 18. Testing strategy

### 18.1 Unit (Vitest, TypeScript)

- Save/load: `fake-indexeddb`, migrations, the fallback chain.
- Progress files and save codes: round-trip, typo detection, fuzzing.
- Schema: good and bad fixtures for every schema.
- XP/levels, badge triggers, nickname filter, glossary linker,
  reading-level calculator.
- Parsons keyboard reducer, replay scheduling and narration merging.

### 18.2 Python (Vitest + Pyodide in Node)

- Pyodide loads once per worker thread (global setup) and runs the `codeweald` package
  directly.
- **Game API action log:** every call, bonks, edges, chest codes, budgets and `ln` line
  attribution.
- **Sandbox:** blocked imports, `open`, `js` access, `time.sleep` virtualization,
  determinism.
- **Error translation:** a fixture per classifier row (§6.8), pinned to Python 3.14 messages.
- **Validators:** every type, plus each named mistake detector.

### 18.3 Content tests (critical)

`tests/content/quests.test.ts` generates one `describe` block per quest:

- the reference solution passes **all** validators (each boss phase separately)
- each `wrong_solution` fails **and** produces its declared `expect_mistake` or feedback
- the starter code does **not** pass (except `predict`/`investigate`)
- predict answers and investigate answers match the code's real output
- cross-reference rules hold (§10.4)

CI fails if any quest lacks a passing solution or has fewer than 2 wrong solutions.

### 18.4 End-to-end (Playwright, Chromium)

1. **Golden path:** new player → character creation → complete all of Region 1 (solutions
   typed into the editor) → Quill of Printing appears in the inventory → reload → progress
   persists.
2. **Infinite loop:** `while True: pass` → the loop-budget message with a line number. A
   C-level runaway → hard timeout → worker restart → the next run works.
3. **Keyboard-only:** one full quest using only the keyboard (no `click()`), including
   leaving the editor with Esc+Tab.
4. **Parsons keyboard flow.**
5. **Offline:** load, wait for "ready offline", `context.setOffline(true)`, reload, play a
   quest.
6. **No third-party requests:** a request listener asserts same-origin only.
7. **axe-core** (`@axe-core/playwright`) on every main screen: title, creator, overworld HUD,
   quest (each type), inventory, spellbook, workshop, settings, knowledge check. Zero
   serious/critical violations.
8. **Throttled smoke:** 4× CPU and slow-network profile; asserts the §17 budgets.

### 18.5 Reading level

- `npm run reading-level` reports Flesch–Kincaid grade for every dialogue line, story text,
  concept card, hint, item description and glossary definition. Code is excluded.
- It flags text above grade 7, reporting the raw score and the score with glossary terms
  excluded (technical words inflate syllable counts).
- CI posts the report as an artifact and a job summary. Warnings do not fail the build;
  grade > 9 fails (configurable).

---

## 19. CI and deployment

### 19.1 GitHub Actions CI/CD (`.github/workflows/ci-cd.yml`)

One pipeline in three stages. The site is built once. The tests and the deploy use that same
build, so what was tested is exactly what gets published.

| Stage | Job | Steps |
|---|---|---|
| Build | `build` | `npm ci` → `npm run build` (Pyodide copy, art, content, `tsc --noEmit`, Vite, size budget) → upload the `site` artifact (`dist/`) |
| Test | `checks` | ESLint → Prettier check |
| Test | `unit` | `validate-content` (schema, cross-refs, all solutions, wrong solutions) → answer key up to date → Vitest (TS + Python suites) |
| Test | `e2e` | download `site` → serve it under its real base path → Playwright Chromium; axe. Offline and throttled smoke tests join in Phases 2 and 6. |
| Test | `reading-level` *(Phase 2)* | report artifact + job summary |
| Deploy | `deploy` | `main` only (push or manual run), after every test job passes → publish `site` to GitHub Pages |

- Every push and pull request runs Build and Test. The npm cache is keyed on the lockfile
  (Pyodide comes from npm, so it is cached too).
- The site is built with `CODEWEALD_BASE` set to `/<repo>/` (a GitHub Pages project site), or
  to the repository variable `SITE_BASE_PATH` (for example `/` for a custom domain). The E2E
  tests use relative URLs and run under that same base path, so sub-path hosting is checked
  on every change.
- Deploy uses the `github-pages` environment, where a required reviewer can be added. Until
  GitHub Pages is turned on (Settings → Pages → Source: GitHub Actions), the deploy job is
  skipped with a warning instead of failing.

### 19.2 Static deployment

- `npm run build` → `dist/` contains only static files.
- `CODEWEALD_BASE=/codeweald/ npm run build` builds for a sub-path (e.g. a GitHub Pages
  project site).
- **Requirements:** HTTPS (or localhost) for the service worker and SubtleCrypto; `.wasm` as
  `application/wasm`; `sw.js` and `codeweald.config.json` served with `Cache-Control:
  no-cache`; hashed assets `immutable`.
- **No COOP/COEP headers are needed.** The README has ready snippets for Apache, Nginx, IIS
  and GitHub Pages. It also explains which headers to add if a future SharedArrayBuffer
  feature is turned on.

---

## 20. Configuration reference

**`public/codeweald.config.json`** (deploy-time; editable without rebuilding):

```json
{
  "courseId": "codeweald-intro-python",
  "execution": { "timeoutSeconds": 3, "loopBudget": 100000, "workshopLoopBudget": 1000000,
                 "maxActions": 2000, "maxOutputChars": 100000 },
  "defaults": { "hints": "all", "textScale": 1, "reducedMotion": "system", "tts": false,
                "replaySpeed": 1, "soundEffects": false },
  "features": { "workshop": true, "sideQuests": true, "knowledgeCheckGates": false,
                "standbyWorker": "off" }
}
```

**`content/course.yaml`** (course composition, i.e. the configurable course length):

```yaml
id: codeweald-intro-python
title: "Codeweald: Intro to Python"
regions:
  - { id: hearthvale-village, enabled: true, lessons: 2 }
  - { id: whispering-library, enabled: true, lessons: 2 }
  # … 11 regions; disable regions or side quests to shorten the course
side_quests: true
```

The build prints a pacing summary from `course.yaml`: total lessons, minutes and quests.

---

## 21. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Managed Chromebooks may wipe local data at sign-out** (decided Q3: students must save progress) | Lost progress | §12.5: save code and progress file are Phase 1 features; "Continue from a save" on the title screen; unsaved-progress marker; save-point toasts; leave-page warning; lesson plans end with a save step |
| First Pyodide download (~14 MB) on a busy school network | Slow first day | Background loading during onboarding; the README suggests opening the game once on each device before first use; the SW keeps it cached |
| School web filters block `.wasm` or service workers | Game can't run Python | Deployment checklist and a built-in **System check** page (SW, IndexedDB, WASM, storage quota, local TTS voices) |
| Worker restart (layer-3 timeout) takes 2–5 s on weak devices | Frustration | Layer 1 catches almost all loops without a restart; optional standby worker |
| Phaser 4 is young (4.0 shipped April 2026) and most online examples are still v3 | Renderer bugs on weak GPUs; v3 snippets that don't work | Pinned version; `WorldView` adapter; Canvas fallback if WebGL fails; test on a throttled, low-end profile from Phase 1 |
| Python sandbox escape | Network/storage access from student code | Worker-level API neutering is the real boundary; no DOM in the worker; CSP |
| Pyodide/Python upgrade changes error messages | Wrong friendly messages | Pinned version; classifier fixtures fail loudly on upgrade |
| ~90 quests is a lot of authored content | Schedule | Scaffolder, baked expectations, content tests; regions delivered in batches (Phases 3–4) |
| Technical words push reading level up | Text harder than grade 6–7 | Glossary for every term; the report excludes glossary terms; manual reading pass in Phase 6 |
| Art assets not reachable from the build environment (kenney.nl blocked) | Placeholder look | Original pixel art via `make-art.ts`; swap in CC0 packs when available (Q6) |
| Web Speech voices missing offline | No TTS | Prefer local voices; clear message; TTS is optional |
