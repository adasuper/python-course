# Codeweald — Phased Build Plan

> **Status:** Phase 0 draft, for review. Phase 1 starts only after approval.
> Story IDs (`F-…`) refer to [features.md](features.md). Section numbers (§) refer to
> [specs.md](specs.md).

## Ground rules (every phase)

- **No phase starts until the previous phase's exit tests pass in CI.**
- Commit at each milestone (`M1.3` …) with a clear message. Update `PROGRESS.md` at the end of
  every phase: done, next, known issues.
- **Definition of Done for any feature:**
  - typed (strict TS)
  - unit-tested
  - keyboard-operable with visible focus and labelled controls
  - text in `src/i18n/en.ts` or content YAML
  - no new third-party network requests
- **Definition of Done for any quest:**
  - schema-valid
  - the reference solution passes
  - ≥ 2 wrong solutions fail with their expected feedback
  - three hints
  - the reading level is reported
  - it is playable from the Quest Log
- **Reading level** runs from Phase 1 on. Text above Flesch–Kincaid grade 7 is **flagged** as a
  CI warning (the brief's rule). CI **fails** only above grade 9 (configurable), so a single
  hard technical sentence can't block a build. Phase 6 clears all warnings or documents why
  each one stays.
- Every phase ends with a **demo build** (`npm run build && npm run preview`) and "how to try
  it" notes in `PROGRESS.md`.

---

## Phase 0 — Plan ✅ (this delivery)

**Deliverables:**

- `docs/specs.md`: architecture and detailed design
- `docs/features.md`: user stories with acceptance criteria
- `docs/curriculum-map.md`: 11 regions → quests → learning outcomes → CSTA codes
- `docs/build-plan.md`: this file
- `docs/open-questions.md`: questions and assumptions
- `PROGRESS.md`, `README.md`

**Exit:** your approval, plus answers (or "go with your assumption") for the open questions.

---

## Phase 1 — Vertical slice

**Goal:** one region, end to end, on the real architecture. A student can create a character,
walk Hearthvale Village, complete every Region 1 quest and the boss, reload, and keep their
progress. Everything later builds on these foundations.

| Milestone | Scope | Key stories |
|---|---|---|
| **M1.1 Scaffolding** | Vite + TS strict + Preact; ESLint/Prettier; Vitest; Playwright config; `ci.yml` skeleton (checks + unit); `ASSETS_LICENSES.md`; README dev section | F-DEP, F-QA |
| **M1.2 Python worker** | `pyodide` npm package copied to `public/pyodide/` at build; `python.worker.ts` with byte-progress init; typed protocol; `PyRunner` with wall-clock timeout → terminate → restart; network APIs neutered in the worker; Pyodide-in-Node test harness for Vitest | F-EXE |
| **M1.3 `codeweald` package v1** | ASCII-grid world simulation; full core API (§7.1); action log with `ln`; loop/action/output budgets via `sys.monitoring`; sandbox (builtins, import allowlist, `time`/`random` wrappers); **error translation for the Region 1 set** (unclosed string, missing/extra parenthesis, `print` without parentheses, missing quotes, name typo, wrong capitals such as `Print`, unexpected indent, smart quotes, generic) + "Show the real Python error"; validators `output`, `state`, `variable`, `ast`; mistakes `error`, `code_regex`, `validator_failed`, `detector` (the ones Region 1 needs) | F-API, F-EXE, F-FBK |
| **M1.4 Content pipeline v1** | Zod schemas (quest, region, glossary, items, errors, course); generated JSON Schema; `build-content` (safe text AST, glossary links, reference solutions dropped from the game); `validate-content` (schema, cross-refs, reference + wrong solutions in Pyodide/Node); generated per-quest content tests; `npm run new-quest`; `npm run solutions` → instructor answer key for Region 1 | F-AUT, F-QA, F-INS |
| **M1.5 World and replay** | `make-art.ts` (original pixel art: tiles, hero avatars ×8, Byte, Region 1 NPCs, Bug Boss); Phaser `BootScene`, `OverworldScene` (Hearthvale ASCII map from `region.yaml`, grid movement, NPC interaction, markers), `StageScene` (quest grids, NPC stages); `WorldView` adapter; `ReplayEngine` with speed, step, pause, skip, line highlight, live-region narration, reduced-motion path | F-WLD, F-API |
| **M1.6 Core UI** | Title/profile picker; character creator (avatars, nickname + filter + generator, theme); overworld HUD + Quest Log; quest screen layout (§9.10); CodeMirror 6 editor (highlighting, line numbers, auto-indent, font size, Esc+Tab, `Ctrl+Enter`); Scroll of Output; feedback panel; 3-tier hints; Byte dialogue with glossary toggletips; concept scene; loading screen with progress | F-ONB, F-EDT, F-DLG, F-FBK |
| **M1.7 Quest types for Region 1** | Every type Region 1 uses, fully functional and keyboard-operable. Per the curriculum map that is predict, investigate (including "change and observe" questions), parsons, modify, fix, make and boss (3 phases); only `fill` is unused. The `style` validator covers the comment quests. Parsons gets keyboard pick-up/move/indent in this phase; Phase 2 finishes its screen-reader polish. Knowledge check screen. | F-QST, F-BOS |
| **M1.8 Region 1 content** | All Region 1 quests, the boss (all phases), the side quests and the knowledge check, as YAML that passes `validate-content`. Quill of Printing and the other Region 1 items. Script Fragment. | F-PRG (minimal), content |
| **M1.9 Save/load and saving out** | IndexedDB persistence (profiles, drafts, debounce + flush), localStorage/memory fallbacks, schema version + migration scaffold, multiple profiles. **Because devices may wipe data (Q3), this phase also delivers:** save code encode/decode, progress file save/open (system file pickers with a download fallback), Continue from a save, the unsaved-progress marker, save-point toasts and the leave-page warning (specs §12.5) | F-SAV |
| **M1.10 Tests and CI** | CI jobs `checks`, `unit`, `content`, `build`, `e2e`; E2E: golden path (new player → creator → all of Region 1 → item in inventory → reload → persists), infinite loop (both loop budget and hard timeout + restart), keyboard-only quest; axe on the Phase 1 screens | F-QA |

**Exit criteria:**

- [ ] `npm run validate-content` passes for every Region 1 quest (solutions + ≥ 2 wrong solutions each).
- [ ] Unit suites pass: action log, sandbox, budgets, error translation (Region 1 set), validators, schema, save/load, nickname filter.
- [ ] E2E passes: golden path with reload persistence; infinite loop (both layers); keyboard-only quest; **save code → clear all site data → Continue from a save restores progress**.
- [ ] axe: no serious/critical violations on the title, creator, overworld HUD, quest and knowledge-check screens.
- [ ] Initial app download ≤ 4 MB gzip excluding Pyodide (size budget in CI).
- [ ] **Demo:** `npm install && npm run build && npm run preview`, then open the printed URL.
      Instructions in `README.md` and `PROGRESS.md`. **Stop for your review.**

**Not in Phase 1** (deliberately): XP/levels/badges beyond the minimum needed to show items, the
Workshop, the import Merge option, the full settings screen, PWA/offline, Regions 2–11.

---

## Phase 2 — Core loop polish

| Milestone | Scope | Key stories |
|---|---|---|
| M2.1 All quest types | `fill` (the one type Region 1 doesn't use), with gap widgets and locked ranges; predict "twin" prompts; Parsons `check: order`; `hidden_tests` `mode: stages`; session validators (`branch_coverage`, `runs_ok`); bonus challenges | F-QST |
| M2.2 Accessible Parsons (complete) | Listbox semantics, announcements, ▲▼◀▶⇄ buttons, drag with pointer, distractor tray, axe + screen-reader manual check (NVDA + ChromeVox) | F-QST, F-A11 |
| M2.3 Full error translation | Every row of §6.8, `content/errors.yaml` complete, Byte's annotated traceback (used from Region 10), editor diagnostics | F-FBK |
| M2.4 Feedback engine | Full mistake-detector library (§9.4); feedback selection order; hint usage tracking; class hint modes honored | F-FBK |
| M2.5 Progression | XP + levels + titles; concept items; Inventory/Notebook; badges engine + all triggers; celebration (reduced-motion aware) | F-PRG |
| M2.6 Spellbook reference | Spell Pages: concept cards, worked examples, My Spells; Jar Shelf variables panel | F-EDT |
| M2.7 Workshop | Sandbox maps; replay-on-input (Mode B); saved programs; `.py` export; API reference panel | F-WSH, F-EXE |
| M2.8 Save polish | Merge option on import; save-code fuzz tests across content versions; delete profile with "Save first" | F-SAV |
| M2.9 Settings and a11y features | Text scale, fonts (Atkinson Hyperlegible Next / OpenDyslexic), high contrast, reduced motion, TTS, shortcut toggle, audio; "Describe surroundings" | F-A11 |
| M2.10 PWA basics | Service worker, manifest, Pyodide runtime cache, "ready offline" indicator, update prompt; System check page | F-OFF |

**Exit criteria:**

- [ ] Unit: every validator type and named detector; every §6.8 classifier row; XP/levels; badges; save code round-trip + fuzz; import merge rules.
- [ ] E2E: every quest type played by keyboard; Workshop interactive `input()` flow; export → clear storage → import restores; offline smoke.
- [ ] axe on all Phase 2 screens.
- [ ] Region 1 still passes everything (regression).

---

## Phase 3 — Regions 2–6

Content plus the mechanics these regions introduce:

- **R2:** the Jar Shelf in quests; f-string mistake detectors.
- **R3:** input queue (Mode A); "Try my own input" (Mode B in quests); number formatting.
- **R4:** gates/doors; condition-driven NPC reactions.
- **R5:** `world.look()` loops; mine maps; loop-budget messaging tuned for `while`.
- **R6:** pattern-drawing output stage (monospace "tapestry" view).

| Milestone | Scope |
|---|---|
| M3.1 | Region 2: overworld map, NPCs, concept scene, quests, boss, side quests, knowledge check |
| M3.2 | Region 3 (+ input queue UX, NPC "hands over" values) |
| M3.3 | Region 4 |
| M3.4 | Region 5 |
| M3.5 | Region 6 |
| M3.6 | World map screen + region gating + Region Restorer badges; reading-level pass for Regions 1–6 |

**Exit criteria:**

- [ ] Content tests green for Regions 1–6.
- [ ] Cross-cutting checks pass: a fix quest in every region, retrieval quests in Regions 3–6, knowledge checks with 3–5 items.
- [ ] E2E smoke per region: open the concept scene, play one quest per type, defeat the boss using solutions.
- [ ] Reading-level report: no core text above grade 7 without a documented reason.

---

## Phase 4 — Regions 7–11 (including the capstone)

- **R7:** inventory-driven list quests (`hero.inventory()`).
- **R8:** function-call hidden tests (`mode: call`); scope errors (`UnboundLocalError`).
- **R9:** dictionary map lookups.
- **R10:** annotated real tracebacks; rubber-duck debugging dialogue with Byte; logic-error
  quests with hidden edge cases.
- **R11:** `random` with seeded tests; capstone phases; a creative free part with light
  rule-based checks; the Great Script finale.

| Milestone | Scope |
|---|---|
| M4.1–M4.5 | Regions 7, 8, 9, 10, 11 (one milestone each, same checklist as Phase 3) |
| M4.6 | Finale sequence, credits, all-badges audit, full-course reading-level pass |

**Exit criteria:** content tests green for all 11 regions; E2E smoke per region; capstone
validated with several seeds and two sample "free" projects; a full-course pacing report
from `course.yaml`.

---

## Phase 5 — Instructor answer key, authoring guide, self-paced extras

**Requirement change (owner decision Q13):** there are **no teacher features** in the app.
Codeweald is a self-paced course students do on their own. Teacher mode, class codes, the
dashboard, CSV export and the in-app teacher guide are dropped. Instructors get the solutions
in a generated answer key, which starts in Phase 1 and grows with each region.

| Milestone | Scope |
|---|---|
| M5.1 | Answer key complete for all 11 regions (`npm run solutions` → `docs/solutions.md`); CI check that it is up to date |
| M5.2 | `docs/quest-authoring.md`: schema, validators, mistakes, hidden tests, stages, scaffolder, `validate-content`, editing on github.com with CI as the checker |
| M5.3 *(proposed, optional)* | **My progress** page for self-paced learners: regions and quests done, "I can…" learning outcomes earned, knowledge-check scores, time spent. Local only. |
| M5.4 *(proposed, optional)* | Printable **course-complete certificate** (nickname only, no real name), shown after the capstone |

**Exit criteria:** the answer key lists every quest, boss phase and knowledge-check item; the
build bundle contains no reference solutions (unit test); the authoring guide's examples pass
`validate-content`; axe on any new screens.

---

## Phase 6 — Hardening

| Milestone | Scope |
|---|---|
| M6.1 Accessibility audit | Full WCAG 2.1 AA pass (automated + manual keyboard + NVDA/ChromeVox); fix list; contrast-token tests |
| M6.2 Offline verification | Fresh-profile install → offline → full quest; update flow; storage eviction behavior; managed-Chromebook test if available |
| M6.3 Low-end performance | 4× CPU / slow network profiles; Pyodide-ready and run-latency budgets; memory on a 4 GB device; calibrate loop budget; standby-worker decision |
| M6.4 Reading level | Full report; rewrite flagged text; glossary completeness |
| M6.5 Content review | Every quest played; hints sanity; misconceptions; tone; bias/inclusion review of art and names |
| M6.6 Deployment | GitHub Pages deploy (the pipeline's `deploy` stage already exists; verify the live site); Apache/Nginx/IIS snippets; system-check page; final README |

**Exit criteria:** every CI job green; zero serious/critical axe violations; all §17 budgets met
on the throttled profile; deployment verified on GitHub Pages and on one plain static server.

---

## Rough size

| Phase | Relative effort | Main risk |
|---|---|---|
| 1 | ██████ (largest: all foundations) | Pyodide-in-worker details, sandbox, art pipeline |
| 2 | █████ | Parsons accessibility; feedback engine breadth |
| 3 | ████ | Content volume (5 regions) |
| 4 | ████ | Capstone validation design |
| 5 | █ | Small now that teacher features are gone |
| 6 | ███ | Device testing access |
