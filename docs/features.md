# Codeweald — Feature List (User Stories)

> **Status:** Phase 0 draft, for review. Nothing here is built yet.
> **Source of truth for design:** [specs.md](specs.md). Every story below agrees with it; the
> `Spec:` tag on each story points to the section that describes *how* it works.
> **Related:** [curriculum-map.md](curriculum-map.md) · [build-plan.md](build-plan.md) ·
> [open-questions.md](open-questions.md)

This document lists everything Codeweald must do, written as user stories with testable
acceptance criteria. A reviewer can use it to check scope; the build uses it as a checklist
for each phase.

## How to read this document

**Roles**

| Role | Who |
|---|---|
| **Student** | A grade 6–8 learner (ages 11–14) with no coding experience |
| **Instructor** | Supports students taking the self-paced course; reads the answer key to prepare for questions |
| **Content author** | An instructor (or helper) who edits quest YAML files; moderate technical skill |
| **School IT admin** | Deploys the static site and manages Chromebooks and lab PCs |
| **Maintainer** | A developer who works on the engine |

**Story format.** `### F-XXX-NN — Title`, then "As a … I want … so that …", then acceptance
criteria, then one metadata line:
`Priority · Phase · Spec: §x.y (specs.md) · Brief: §n (the original project brief)`.

**Priority (MoSCoW)**

- **Must** — required by the brief, or needed to meet a brief requirement.
- **Should** — a design addition from the spec that clearly helps learners or instructors.
- **Could** — nice to have; may slip without harming the course.

**Phases**

| Phase | Scope |
|---|---|
| 1 | Vertical slice: scaffolding, Pyodide worker + timeout, game API + action log + replay, CodeMirror editor, one tilemap, Byte dialogue, all of Region 1 incl. boss, save/load, content tests + CI |
| 2 | Core loop polish: all quest types incl. accessible Parsons, hints, error translation, XP/items/badges, inventory and Spellbook reference, Workshop |
| 3 | Regions 2–6 |
| 4 | Regions 7–11, incl. the capstone |
| 5 | Instructor answer key and authoring guide (no in-app teacher features — owner decision Q13) |
| 6 | Hardening: accessibility audit, offline verification, low-end performance, reading level, content review, deployment docs |

**Split stories.** When a feature starts small and grows, it is split into two stories (for
example F-FBK-07 "basic friendly errors" in Phase 1 and F-FBK-08 "full error translation" in
Phase 2).

**Quest-type rule.** Quest-type stories marked Phase 2 move their *minimum* version into
Phase 1 if [curriculum-map.md](curriculum-map.md) uses that type in Region 1, because Phase 1
must deliver all of Region 1. `fix`, `make` and `boss` are Phase 1 in any case.

## Epic index

| Epic | Name | Stories | Phases |
|---|---|---|---|
| [F-ONB](#f-onb--onboarding-profiles-and-character) | Onboarding, profiles and character | 8 | 1–2 |
| [F-WLD](#f-wld--overworld-and-navigation) | Overworld and navigation | 9 | 1–3 |
| [F-DLG](#f-dlg--dialogue-concept-scenes-and-glossary) | Dialogue, concept scenes and glossary | 7 | 1–2 |
| [F-EDT](#f-edt--spellbook-editor) | Spellbook editor | 6 | 1–3 |
| [F-EXE](#f-exe--code-execution-sandbox-and-timeouts) | Code execution, sandbox and timeouts | 15 | 1–3, 6 |
| [F-API](#f-api--game-api-and-replay) | Game API and replay | 14 | 1–3 |
| [F-QST](#f-qst--quest-types-and-lifecycle) | Quest types and lifecycle | 14 | 1–2, 4 |
| [F-FBK](#f-fbk--validation-feedback-error-translation-and-hints) | Validation feedback, error translation and hints | 15 | 1–2, 4 |
| [F-PRG](#f-prg--xp-levels-items-notebook-and-badges) | XP, levels, items, notebook and badges | 8 | 1–4 |
| [F-BOS](#f-bos--bosses-knowledge-checks-and-side-quests) | Bosses, knowledge checks and side quests | 6 | 1–2, 4 |
| [F-WSH](#f-wsh--workshop-sandbox) | Workshop (sandbox) | 4 | 2 |
| [F-SAV](#f-sav--save-load-exportimport-and-save-codes) | Save, load, export/import and save codes | 10 | 1–2 |
| [F-A11](#f-a11--accessibility-and-settings) | Accessibility and settings | 15 | 1–2, 6 |
| [F-OFF](#f-off--offlinepwa-and-privacy) | Offline/PWA and privacy | 9 | 1–2, 5–6 |
| [F-INS](#f-ins--instructor-answer-key) | Instructor answer key | 2 | 5 |
| [F-AUT](#f-aut--content-authoring-and-validation-tooling) | Content authoring and validation tooling | 11 | 1–3, 5 |
| [F-CUR](#f-cur--curriculum-content) | Curriculum content | 11 | 1–4 |
| [F-QA](#f-qa--testing-ci-performance-and-reading-level) | Testing, CI, performance and reading level | 19 | 1–2, 5–6 |
| [F-DEP](#f-dep--deployment-and-documentation) | Deployment and documentation | 10 | 0–1, 5–6 |
| | **Total** | **193** | |

---

## F-ONB — Onboarding, profiles and character

### F-ONB-01 — Pick my profile on a shared computer
As a Student, I want to pick my own profile from a list on the title screen, so that I can keep my progress on a lab PC that other kids also use.
**Acceptance criteria**
- The title screen appears right away and lists every local profile by nickname and avatar.
- "New adventurer" starts the character creator; choosing a profile continues where it left off.
- No password, email or account is ever asked for.
- The list is fully keyboard-usable and each entry has an accessible name ("Clever Newt, level 4").

Priority: Must · Phase: 1 · Spec: §5.2, §12.1 · Brief: §1, §3.1

### F-ONB-02 — Create my character (minimum)
As a Student, I want to choose an avatar and a nickname, so that the hero feels like mine.
**Acceptance criteria**
- The creator offers at least 2 avatars (placeholder art allowed) and a nickname field.
- Every control is labelled and reachable by keyboard; the chosen avatar is announced.
- Finishing the creator saves a new profile and starts the Region 1 opening.

Priority: Must · Phase: 1 · Spec: §11.8 · Brief: §3.1

### F-ONB-03 — Choose from a diverse avatar set
As a Student, I want several different-looking characters to choose from, so that I can pick one that feels like me.
**Acceptance criteria**
- 8 pre-made avatars with varied skin tones and hair styles, plus glasses, a head covering and a wheelchair user.
- Every avatar has walk, bonk and celebrate animations (the wheelchair avatar rolls).
- Each avatar has alt text describing it.
- All art is original or CC0 and listed in `ASSETS_LICENSES.md`.

Priority: Must · Phase: 2 · Spec: §11.8, D14 · Brief: §3.1, §2

### F-ONB-04 — Pick a color theme
As a Student, I want to pick a color theme for my cloak and the menus, so that the game looks the way I like.
**Acceptance criteria**
- 6 themes are offered, each shown with a name (not color only).
- Every theme passes the contrast checks (≥ 4.5:1 text, ≥ 3:1 UI and focus) in a unit test.
- The theme can be changed later in Settings.

Priority: Must · Phase: 2 · Spec: §11.8, §14.6 · Brief: §3.1, §1

### F-ONB-05 — Use a nickname, not my real name
As a Student, I want a nickname box with a "Make one for me" button, so that I never have to type my real name.
**Acceptance criteria**
- Byte says "Pick a nickname — not your real name!" next to the field.
- Nicknames are 2–16 characters: letters, digits, spaces and hyphens.
- "Make one for me" fills in an "Adjective Creature" name (e.g. *Clever Newt*).

Priority: Must · Phase: 1 · Spec: §11.8, §15.1 · Brief: §3.1, §1

### F-ONB-06 — Block rude or personal nicknames
As an Instructor, I want nicknames filtered for profanity and personal details, so that names on screen and in reports are safe for class.
**Acceptance criteria**
- The filter runs locally: it lowercases, strips accents, maps leetspeak (`0→o 1→i 3→e 4→a 5→s 7→t @→a $→s`), collapses repeats and removes separators before checking a bundled blocklist.
- An allowlist prevents false hits on innocent words (the "Scunthorpe problem").
- Email-, URL- and phone-like input (≥ 5 digits) is rejected.
- The rejection message is gentle and does not say which word was blocked.
- Unit tests cover normalization, blocklist, allowlist and pattern cases.

Priority: Must · Phase: 1 · Spec: §11.8, §15.3 · Brief: §3.1

### F-ONB-07 — Meet Byte and the story
As a Student, I want a short opening where Byte the owl explains the shattered Great Script, so that I know why I'm on this quest.
**Acceptance criteria**
- The opening scene introduces the realm, the Scriptwright apprentice and Byte in ≤ 8 dialogue lines.
- It can be skipped (button and Esc) and replayed later.
- Text meets the reading-level rule (F-QA-15).

Priority: Must · Phase: 1 · Spec: §9.8 · Brief: §3.1

### F-ONB-08 — Load Python while I get started
As a Student, I want Python to load in the background while I make my character, so that I don't sit and wait.
**Acceptance criteria**
- The worker starts loading Pyodide when the title screen appears.
- If I reach a code screen before it is ready, Byte appears "warming up the spellbook" with a real progress bar (bytes downloaded, then "compiling" → "loading Python library" → "ready").
- Progress is announced politely to screen readers and the bar has a text percentage.

Priority: Must · Phase: 1 · Spec: §5.1, §6.1 · Brief: §7

---

## F-WLD — Overworld and navigation

### F-WLD-01 — Walk around Hearthvale with the keyboard
As a Student, I want to walk the village with arrow keys or WASD, so that I can explore and find quests.
**Acceptance criteria**
- Hearthvale Village is an ASCII map in `region.yaml` (16×16 px tiles, about 30×20 tiles) drawn with integer scaling and `pixelArt: true`.
- Movement is one tile per key press (hold to repeat) while the world has focus.
- Walls and water block movement.

Priority: Must · Phase: 1 · Spec: §11.1 · Brief: §1, §2

### F-WLD-02 — Talk to people and read signs
As a Student, I want to talk to villagers and read signs, so that I can hear the story and pick up quests.
**Acceptance criteria**
- Enter, Space or E on the facing NPC or sign opens their dialogue.
- An NPC's `questId` property in the map links them to the quest they offer.

Priority: Must · Phase: 1 · Spec: §11.1, §9.8 · Brief: §2, §3.1

### F-WLD-03 — See which quests are ready
As a Student, I want markers over quest givers, so that I know where to go next.
**Acceptance criteria**
- Markers combine shape and text: `!` available · `…` in progress · `✓` done. They never rely on color.
- A marker updates as soon as the quest state changes.

Priority: Must · Phase: 1 · Spec: §11.1, §14.2 (1.4.1) · Brief: §1

### F-WLD-04 — Jump to a quest from the Quest Log
As a Student who uses a keyboard or screen reader, I want a Quest Log list, so that I can start any available quest without walking there.
**Acceptance criteria**
- `Q` (or the HUD button) opens a DOM panel listing every quest in the region with status text and a "Go" button.
- Locked quests show what is needed first (e.g. "Finish *The Crier's Crooked Announcement*").
- The panel is a labelled dialog that closes with Esc and returns focus.

Priority: Must · Phase: 1 · Spec: §11.1 · Brief: §1

### F-WLD-05 — Move with a mouse or touchscreen
As a Student on a touchscreen Chromebook, I want an on-screen D-pad and click-to-walk, so that I can move without a keyboard.
**Acceptance criteria**
- An on-screen D-pad with labelled buttons moves the hero.
- Clicking an adjacent tile walks there.

Priority: Should · Phase: 2 · Spec: §11.1 · Brief: §1

### F-WLD-06 — Hear what is around me
As a Student using a screen reader, I want a text description of the scene, so that I know where things are.
**Acceptance criteria**
- The canvas container is `role="img"` with a live description ("Hearthvale square. The Crier is 2 tiles to your right.").
- "Describe surroundings" (button and `L`) reads nearby NPCs, signs and exits with directions.

Priority: Must · Phase: 2 · Spec: §14.1 · Brief: §1

### F-WLD-07 — Find extra quests on the Quest Board
As a Content author, I want quests without a map NPC to appear on a region's Quest Board, so that adding a quest never needs a map edit.
**Acceptance criteria**
- Each region map has a Quest Board object; it lists side quests and any quest without an `npc`.
- Side quests appear once the region's core quests are done.

Priority: Must · Phase: 2 · Spec: §11.1, §9.9 · Brief: §2, §4

### F-WLD-08 — Travel between regions
As a Student, I want a world map that shows which regions I have unlocked, so that I can travel to the next one.
**Acceptance criteria**
- The world map is a DOM list plus an illustration; each region shows locked/unlocked/restored with text and an icon.
- A region unlocks when the previous region's boss is defeated.
- Quests inside a region follow their `prerequisites`.

Priority: Must · Phase: 3 · Spec: §11.1 · Brief: §3.2, §4

### F-WLD-09 — Discover secret corners
As a Student, I want hidden spots to find in each region, so that exploring is fun and earns a badge.
**Acceptance criteria**
- Each region map has POIs in its object layer; visiting one records it in `poisVisited`.
- Visiting all POIs in a region awards that region's Explorer badge (F-PRG-07).

Priority: Should · Phase: 3 · Spec: §11.1, §11.6 · Brief: §3.2

---

## F-DLG — Dialogue, concept scenes and glossary

### F-DLG-01 — Read dialogue at my own pace
As a Student, I want dialogue boxes that wait for me, so that I can read without being rushed.
**Acceptance criteria**
- A dialogue box shows the speaker's name and portrait (with alt text) and one line at a time.
- Lines never auto-advance; Enter, Space or a "Next" button advances, and "Back" re-reads.
- Dialogue lines come from YAML as `{ speaker, text }`.

Priority: Must · Phase: 1 · Spec: §9.8 · Brief: §1, §3.1

### F-DLG-02 — Formatted text without risk
As a Maintainer, I want all content text compiled to a safe text tree, so that no content can inject HTML.
**Acceptance criteria**
- Supported: bold, italic, inline code, code blocks, lists and `[[glossary]]` links.
- The build compiles text to a JSON AST that Preact renders; there is no `innerHTML` anywhere (lint rule).

Priority: Must · Phase: 1 · Spec: §9.8, §15.3 · Brief: §5

### F-DLG-03 — Tap a word to see what it means
As a Student, I want highlighted vocabulary words I can open, so that I understand new terms right where I meet them.
**Acceptance criteria**
- `[[variable]]` and `[[jars|variable]]` render as buttons using the toggletip pattern.
- Enter/Space toggles the definition; Esc closes it; it stays open on hover and is announced to screen readers.
- Each definition is ≤ 2 sentences with an example, from `content/glossary.yaml`.
- The build fails if a link names a term that is not in the glossary.

Priority: Must · Phase: 1 · Spec: §9.8, §14.2 (1.4.13) · Brief: §5, §1

### F-DLG-04 — Browse the whole glossary
As a Student, I want a glossary page with every term I've met, so that I can look words up later.
**Acceptance criteria**
- The glossary page lists terms alphabetically with search; terms not yet met are marked "not met yet" or hidden (setting).
- Each entry shows definition, example and related terms.

Priority: Should · Phase: 2 · Spec: §9.8 · Brief: §5

### F-DLG-05 — Learn the idea before I start
As a Student, I want Byte to explain each region's big idea with a real-life comparison and a worked example, so that I know what I'm about to practice.
**Acceptance criteria**
- Each region starts with a concept scene: Byte's analogy, a few dialogue lines and one worked example.
- The worked example runs on a mini stage with step-by-step replay.
- "Skip scene" (button and Esc) skips it.

Priority: Must · Phase: 1 · Spec: §9.8 · Brief: §4

### F-DLG-06 — Rewatch a concept scene
As a Student, I want to replay a concept scene from the Spellbook, so that I can review when I'm stuck.
**Acceptance criteria**
- Every concept scene seen so far is listed in the Spellbook and can be replayed in full.

Priority: Should · Phase: 2 · Spec: §9.8, §11.5 · Brief: §4

### F-DLG-07 — Have dialogue read aloud
As a Student who finds reading hard, I want a "Read aloud" button on dialogue, so that I can listen instead.
**Acceptance criteria**
- Each dialogue line has a "Read aloud" button; Settings has optional auto-read, voice and rate.
- Uses the Web Speech API and prefers voices with `localService === true`, so it works offline.
- With no local voice, the controls say "Read-aloud needs an installed voice" (no silent failure).
- Speech stops on navigation; code blocks are skipped by default or read with symbols named.

Priority: Must · Phase: 2 · Spec: §14.5 · Brief: §1

---

## F-EDT — Spellbook editor

### F-EDT-01 — Write Python in a real editor
As a Student, I want a code editor with colors, line numbers and auto-indent, so that my code is easy to read and write.
**Acceptance criteria**
- CodeMirror 6 with `@codemirror/lang-python`: syntax highlighting, line numbers, auto-indent after `:` and bracket matching.
- The editor has an accessible label ("Spellbook: your code").

Priority: Must · Phase: 1 · Spec: §11.5, D9 · Brief: §2

### F-EDT-02 — Make the code bigger
As a Student, I want to change the editor's font size, so that I can read my code comfortably.
**Acceptance criteria**
- Editor font size is adjustable from 12 to 28 px, separately from the UI text size.
- The size is saved per profile.

Priority: Must · Phase: 1 · Spec: §11.5, §14.4 · Brief: §2

### F-EDT-03 — Use the keyboard in and out of the editor
As a Student who uses only a keyboard, I want Tab to indent and an easy way out, so that I never get stuck in the editor.
**Acceptance criteria**
- Tab indents; **Esc then Tab** moves focus out (a visible hint under the editor says so).
- `Ctrl+Enter` runs the code from inside the editor.
- An E2E test leaves the editor with Esc+Tab (F-QA-08).

Priority: Must · Phase: 1 · Spec: §11.5, §14.2 (2.1.2) · Brief: §1

### F-EDT-04 — Never lose my work
As a Student, I want my code saved as I type and a safe "Reset code" button, so that I don't lose work or get stuck with a broken mess.
**Acceptance criteria**
- Drafts autosave per quest (debounced 1 s) into the `drafts` store.
- "Reset code" asks for confirmation, restores the starter code, and the old draft can be brought back with undo.
- Re-opening a quest restores its last draft.

Priority: Must · Phase: 1 · Spec: §9.1, §12.1 · Brief: §3.2

### F-EDT-05 — See errors on the right line
As a Student, I want the line with the problem marked in the editor, so that I know where to look.
**Acceptance criteria**
- A run error adds a CodeMirror diagnostic: underline, gutter marker with an icon (not color only) and a line highlight.
- Focus does not jump; a polite live region announces "Error on line 3: …".

Priority: Must · Phase: 1 · Spec: §6.8 · Brief: §2.1, §1

### F-EDT-06 — See my variables on the Jar Shelf
As a Student learning variables, I want a "Jar Shelf" panel that shows each variable and its value after a run, so that I can see what my code stored.
**Acceptance criteria**
- After a run, the panel lists top-level user variables with name, type and a truncated value (from `RunResult.vars`).
- Functions and modules are shown as such, not as values.
- The panel is a labelled table and is available from Region 2 onward.

Priority: Should · Phase: 3 · Spec: §6.1, §6.2, §9.10 · Brief: §3.2

---

## F-EXE — Code execution, sandbox and timeouts

### F-EXE-01 — Real Python with nothing to install
As a School IT admin, I want Python to run inside the browser from files we host, so that students need no install, plugin or local Python.
**Acceptance criteria**
- Pyodide 314.x (Python 3.14) is pinned and copied from the `pyodide` npm package into `public/pyodide/` at build.
- Pyodide runs in a dedicated Web Worker (`python.worker.ts`); the UI stays responsive during any run.
- The worker reports `pyodideVersion` and `pythonVersion` when ready.

Priority: Must · Phase: 1 · Spec: §6.1, D3, D4 · Brief: §1, §2

### F-EXE-02 — Run my code
As a Student, I want a Run button, so that I can see what my code does.
**Acceptance criteria**
- Run (button and `Ctrl+Enter`) sends a `RunRequest` to the worker and shows a "casting…" status.
- The worker returns a `RunResult` with status, actions, error info, validation, world snapshot and stats.
- Running again cancels any replay in progress.

Priority: Must · Phase: 1 · Spec: §3, §6.1, §6.2 · Brief: §2.1

### F-EXE-03 — Stop endless loops without a restart
As a Student, I want Byte to stop a loop that never ends and tell me which line it was on, so that I can fix it right away.
**Acceptance criteria**
- Given `while True: pass` on line 4, the run stops with "Your loop on **line 4** ran 100,000 times! Check that your loop condition eventually becomes `False`." and line 4 is highlighted.
- The worker is not restarted; the next run starts immediately.
- Loop iterations are counted with `sys.monitoring` `JUMP` events (fallback `sys.settrace`).
- Budgets come from `codeweald.config.json` (quests 100,000; Workshop 1,000,000) and are calibrated so the stop happens in < 1 s on a 4× CPU throttle.

Priority: Must · Phase: 1 · Spec: §6.3 (layer 1) · Brief: §2.1

### F-EXE-04 — Stop a hero who never stops
As a Student, I want a friendly stop when my hero moves or prints far too much, so that runaway programs end gently.
**Acceptance criteria**
- More than 2,000 actions ends the run with "Your hero is exhausted after 2,000 moves!".
- More than 100,000 output characters ends it with "That's a LOT of printing…".
- Limits are configurable (`maxActions`, `maxOutputChars`).

Priority: Must · Phase: 1 · Spec: §6.3 (layer 2) · Brief: §2.1

### F-EXE-05 — Hard stop for anything else
As a Student, I want the game to stay usable even if my code gets stuck deep inside Python, so that I can keep going.
**Acceptance criteria**
- A wall-clock timer (default 3 s, `timeoutSeconds` in config) terminates the worker and starts a new one.
- The student sees: "Your code took too long, so Byte stopped it. Your loop might be running forever! Check that your loop condition eventually becomes False." while Byte re-warms the spellbook.
- Run is disabled with a visible "re-warming" state until the new worker is ready; the next run works.
- The timer pauses while the program waits for player input (F-EXE-13).
- A crashed worker (e.g. WASM stack overflow) is handled the same way.

Priority: Must · Phase: 1 · Spec: §6.3 (layer 3) · Brief: §2.1

### F-EXE-06 — Friendly stop for too-deep recursion or memory
As a Student, I want a clear message when my program calls itself forever or uses too much memory, so that I understand what happened.
**Acceptance criteria**
- The recursion limit is 200; `RecursionError` shows the `limits.recursion` message.
- `MemoryError` shows the `limits.memory` message.

Priority: Should · Phase: 2 · Spec: §6.3 · Brief: §2.1

### F-EXE-07 — Only safe parts of Python
As a Maintainer, I want student code limited to safe builtins and an import allowlist, so that it can't touch files or other modules.
**Acceptance criteria**
- `SAFE_BUILTINS` removes `open`, `eval`, `exec`, `compile`, `breakpoint`, `help`, `memoryview`, `__loader__` and replaces `__import__`, `input`, `exit`, `quit`.
- Imports allowed: `random`, `math`, `time` (wrapped) and `codeweald`, and nothing else.
- Any other import raises "That spellbook isn't in Codeweald's library."
- Only Pyodide's in-memory file system exists; nothing persists.

Priority: Must · Phase: 1 · Spec: §6.4 (1, 2, 6) · Brief: §2.1

### F-EXE-08 — Student code can't reach the network
As a School IT admin, I want the Python worker cut off from the network and the page, so that even a clever escape can't send data anywhere.
**Acceptance criteria**
- After boot, `js`, `pyodide`, `pyodide_js` and `_pyodide` are removed from `sys.modules` and blocked in the import hook.
- The worker replaces `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `indexedDB`, `caches` and `Worker` on `self` with functions that throw.
- Python unit tests prove each blocked path fails.

Priority: Must · Phase: 1 · Spec: §6.4 (4, 5) · Brief: §2.1

### F-EXE-09 — `time.sleep` becomes a pause in the replay
As a Student, I want `time.sleep()` to make my hero wait in the animation, so that sleep works without freezing anything.
**Acceptance criteria**
- `time.sleep(s)` records a `wait` action (capped at 3 s per call and 15 s per run) instead of blocking.
- `time.time()` and `time.monotonic()` return a virtual clock that advances with sleeps.

Priority: Must · Phase: 2 · Spec: §6.4 (3) · Brief: §2.1

### F-EXE-10 — Same code, same result
As a Maintainer, I want every run seeded, so that replay-on-input and hidden tests are repeatable.
**Acceptance criteria**
- Each run uses a seed (random per run, or fixed via the quest's `seed:`) for a per-run `random.Random` and the virtual clock.
- The same code, seed and inputs always produce an identical action log (unit-tested).

Priority: Must · Phase: 2 · Spec: §6.7 · Brief: §2.1

### F-EXE-11 — Read my output in the Scroll of Output
As a Student, I want my printed output shown in a "Scroll of Output" panel, so that I can see what my program said.
**Acceptance criteria**
- `sys.stdout`/`sys.stderr` writes become `out` actions with their line number, appended to the scroll as the replay plays them.
- "Show all output now" skips ahead.
- The scroll is a labelled log region; stderr text is marked with an icon and label, not color only.

Priority: Must · Phase: 1 · Spec: §6.6 · Brief: §2.1

### F-EXE-12 — NPCs hand me values for `input()`
As a Student, I want `input()` to receive values from the quest's characters, so that my input programs can be checked and replayed.
**Acceptance criteria**
- A quest's `inputs: [...]` queue feeds each `input(prompt)` call in order.
- The prompt and value are echoed to the scroll like a real console, and an `input` action shows the NPC handing over the value ("The merchant says: *5*").
- Running out of queued values without interactive input gives a friendly message.

Priority: Must · Phase: 3 · Spec: §6.5 (Mode A) · Brief: §2.1

### F-EXE-13 — Type my own answers when my program asks
As a Student, I want a box to pop up when my program calls `input()` in the Workshop, the capstone free part or "Try my own input", so that my programs feel interactive.
**Acceptance criteria**
- When the queue is empty and `interactiveInput` is true, the worker returns `needs-input`; an accessible modal opens with the prompt as its label and focus in the text box.
- Enter submits, Esc cancels the run; the program re-runs from the top with the same seed and the new value appended.
- Only the final run's actions are replayed; the cap is 20 interactive inputs per run.
- No SharedArrayBuffer is used and no COOP/COEP headers are required.
- "Try my own input" in input quests arrives with F-EXE-12 (Phase 3).

Priority: Must · Phase: 2 · Spec: §6.5 (Mode B), D6 · Brief: §2.1

### F-EXE-14 — Checks can't be tricked from student code
As an Instructor, I want quest checks protected from student code, so that a pass means the code really worked.
**Acceptance criteria**
- Validators run from a module copy re-imported from a frozen source string *after* the student run.
- A test shows monkeypatching `codeweald` during a run cannot fake a pass.

Priority: Should · Phase: 1 · Spec: §6.4 (7) · Brief: §2.2

### F-EXE-15 — Instant recovery on powerful devices
As a Student on a newer laptop, I want a spare Python worker kept ready, so that a hard stop doesn't make me wait.
**Acceptance criteria**
- `features.standbyWorker` is `"off"` by default; `"auto"` keeps a warm spare worker only on devices reporting `deviceMemory ≥ 8`, and `"on"` always does.
- With the standby on, a layer-3 stop swaps workers in < 0.5 s.

Priority: Could · Phase: 6 · Spec: §17 · Brief: §7

---

## F-API — Game API and replay

### F-API-01 — Move my hero with code
As a Student, I want `hero.move("right", 3)`, so that my code walks the hero around.
**Acceptance criteria**
- `hero.move(direction, steps=1)` accepts `"up"`, `"down"`, `"left"`, `"right"`; each step turns then moves one tile; returns `True` if every step succeeded.
- A wall, water, NPC or the edge causes a harmless **bonk**: the remaining steps are skipped, no exception is raised and the program continues.
- `hero.face(direction)`, `hero.facing` and `hero.position()` (returns `(column, row)`, `(0, 0)` top-left) behave as in the spec.

Priority: Must · Phase: 1 · Spec: §7.1, §7.3 · Brief: §2.1

### F-API-02 — Talk, pick things up and open chests
As a Student, I want `hero.say()`, `hero.pick_up()` and `hero.open_chest(code)`, so that my code can interact with the world.
**Acceptance criteria**
- `hero.say(text)` shows a speech bubble; text goes through `str()` and is capped at 200 characters.
- `hero.pick_up()` takes the first item on the tile and returns its name, or `None` with a shrug.
- `hero.open_chest(code)` opens the chest in front if `str(code)` matches; a wrong code rattles the chest and returns `False`; loot goes to the inventory.
- `hero.inventory()` returns a copy of the inventory list.

Priority: Must · Phase: 1 · Spec: §7.1 · Brief: §2.1

### F-API-03 — Look around with code
As a Student, I want `world.look()` and `world.items_here()`, so that my program can decide what to do based on what's there.
**Acceptance criteria**
- `world.look()` returns the word for the tile in front: an object (`"chest"`, `"npc"`, `"door"`), else an item (`"gem"`, `"key"`, `"coin"`), else terrain (`"floor"`, `"wall"`, `"water"`, `"exit"`), or `"edge"`.
- `world.items_here()` returns a list of item names on the hero's tile.

Priority: Must · Phase: 1 · Spec: §7.1 · Brief: §2.1

### F-API-04 — Friendly game-API mistakes
As a Student, I want clear messages when I misuse the hero, so that I can fix typos fast.
**Acceptance criteria**
- `hero.move("upp")` raises a `CodewealdError` with key `api.bad_direction`: "`'upp'` isn't a direction. Try `'up'`, `'down'`, `'left'` or `'right'`."
- `hero.mvoe(...)` gives `api.unknown_action`: "The hero doesn't know `mvoe`. Did you mean `move`?"

Priority: Must · Phase: 1 · Spec: §7.1, §6.8 · Brief: §2.1

### F-API-05 — Draw quest maps as text
As a Content author, I want to draw a quest's grid by typing characters, so that I can make puzzle maps without a map editor.
**Acceptance criteria**
- `stage.kind: grid` takes an ASCII `grid` with the default legend (`#` wall, `.` floor, `H` hero, `C` chest, `E` exit, `~` water, `D` door, `N` NPC, `g` gem, `k` key, `$` coin, `*` star), plus an optional `legend`, `facing` and `chests` (code, loot).
- The same grid feeds the Python simulation and the Phaser renderer.
- Invalid grids (no `H`, ragged rows, unknown symbol) fail `validate-content` with file and line.

Priority: Must · Phase: 1 · Spec: §7.2 · Brief: §5, §2

### F-API-06 — Quests about talking and printing
As a Student, I want print-only quests to show characters reacting, so that even text programs feel like part of the story.
**Acceptance criteria**
- `stage.kind: npc` shows the hero and NPCs who react to the program's output via the quest's outcome text (e.g. the Village Crier reads the printed announcement).
- `stage.kind: none` enlarges the Scroll of Output.

Priority: Must · Phase: 1 · Spec: §7.2 · Brief: §2.1, §4

### F-API-07 — An action log I can replay
As a Maintainer, I want every API call and print recorded as an action with the line that caused it, so that the main thread can replay it.
**Acceptance criteria**
- Actions follow the §7.4 union (`move`, `bonk`, `face`, `say`, `out`, `pickup`, `chest`, `look`, `wait`, `input`), each with `ln`.
- `ln` is the innermost `<spellbook>` frame's line.
- Unit tests cover every call, edge, chest code and budget.

Priority: Must · Phase: 1 · Spec: §7.4, D7 · Brief: §2.1, §7

### F-API-08 — Watch my code come alive
As a Student, I want my program's actions played back as animation, so that I can see exactly what my code did.
**Acceptance criteria**
- `ReplayEngine` animates actions through the `WorldView` adapter using the §8 durations at 1×.
- `out` actions fill the Scroll of Output when they play.
- All Phaser code sits behind `WorldView` (Phaser 4.2.x, pinned), so engine upgrades stay contained.

Priority: Must · Phase: 1 · Spec: §8, D2 · Brief: §2, §2.1

### F-API-09 — Control the replay
As a Student, I want play/pause, step, speed and skip controls, so that I can watch my code as slowly as I need.
**Acceptance criteria**
- Labelled buttons with shortcuts: Play/Pause (`Space` when the toolbar has focus), **Step** one action (`.`), speed 0.5× · 1× · 2× · 4× · Instant, Restart replay, Skip to end.
- The default speed is a setting.

Priority: Must · Phase: 1 · Spec: §8 · Brief: §2.1

### F-API-10 — See which line is running
As a Student, I want the editor to highlight the line that caused each action, so that I can trace my code step by step.
**Acceptance criteria**
- During replay the editor highlights each action's `ln`; stepping through a loop lights up its body lines in turn.
- The highlight uses a background plus a gutter arrow (not color only).

Priority: Should · Phase: 1 · Spec: §8 · Brief: §3.3

### F-API-11 — See what happened before I'm told if I passed
As a Student, I want feedback after the replay, so that I watch my code first.
**Acceptance criteria**
- The validation result shows when the replay ends, or immediately on Skip.

Priority: Must · Phase: 1 · Spec: §8 · Brief: §2.1

### F-API-12 — Hear the replay
As a Student using a screen reader, I want short spoken descriptions of what the hero does, so that I can follow the replay.
**Acceptance criteria**
- A polite live region gets short sentences; consecutive moves merge ("Moved right 3 steps."), as do bonks ("Bumped into a wall."), pickups and speech ("Hero says: …").
- At Instant speed only a summary is announced.
- Merging logic is unit-tested.

Priority: Must · Phase: 2 · Spec: §8, §14.2 (4.1.3) · Brief: §1

### F-API-13 — Calm replay with reduced motion
As a Student who is bothered by motion, I want replays without bouncing or shaking, so that the game is comfortable.
**Acceptance criteria**
- With reduced motion on (system or setting), tweens become instant position changes, there is no camera shake or bounce, and "bonk" is a static icon plus text.

Priority: Must · Phase: 2 · Spec: §8, §14.4 · Brief: §1

### F-API-14 — Quest-specific helpers
As a Content author, I want to give one quest an extra documented helper (e.g. `world.ask_merchant()`), so that special puzzles are possible without changing the core API.
**Acceptance criteria**
- `stage.api_extras` names helpers from a documented list; unknown names fail validation.
- The core API in §7.1 is unchanged.

Priority: Could · Phase: 3 · Spec: §7.1, §10.3 · Brief: §2.1

---

## F-QST — Quest types and lifecycle

### F-QST-01 — Quests unlock in order
As a Student, I want quests to open when I'm ready for them, so that I learn things in a sensible order.
**Acceptance criteria**
- States: locked → available (prerequisites met) → in_progress (opened) → completed (all validators pass).
- Completed quests can be replayed any time without losing completion.

Priority: Must · Phase: 1 · Spec: §9.1 · Brief: §3.2, §5

### F-QST-02 — Everything I need on one quest screen
As a Student, I want the story, editor, stage, output and hints side by side, so that I don't have to hunt for things.
**Acceptance criteria**
- Three panels as in §9.10 (Quest · Spellbook · Stage + Scroll of Output), designed for 1366×768.
- The quest panel shows the story intro, a one-sentence goal, the concept card and hint buttons.
- Skip links "Skip to editor" and "Skip to output" exist.

Priority: Must · Phase: 1 · Spec: §9.10 · Brief: §3.2

### F-QST-03 — Quest screen on small windows
As a Student on a small or zoomed screen, I want the panels to become tabs, so that nothing is squashed.
**Acceptance criteria**
- At ≤ 1100 px wide (or at 200% text), panels become tabs (Quest · Spellbook · Stage/Output) with a persistent Run button.

Priority: Should · Phase: 2 · Spec: §9.10, §14.2 (1.4.10) · Brief: §1

### F-QST-04 — Predict quests
As a Student, I want to guess what code will print before running it, so that I learn to read code carefully.
**Acceptance criteria**
- The code is read-only; I answer each prompt (multiple choice or typed output) and press "Lock in prediction" before Run is enabled.
- After the run, a wrong prediction shows a side-by-side "predicted vs. actual" view with the YAML `explain` text.
- The quest completes when every prompt is answered and the code has run; first-try correctness is recorded in the student's progress.

Priority: Must · Phase: 2 · Spec: §9.2 · Brief: §3.3

### F-QST-05 — Try a twin prediction
As a Student who predicted wrong, I want a similar "twin" question, so that I can show I've got it now.
**Acceptance criteria**
- If a prompt has a twin in YAML, it is offered after a wrong prediction; it is optional and never blocks completion.

Priority: Should · Phase: 2 · Spec: §9.2 · Brief: §3.3

### F-QST-06 — Investigate quests
As a Student, I want to run given code and answer questions about it, so that I learn how it works.
**Acceptance criteria**
- Question kinds: multiple choice, number, short text (accepted-answers list) and "change X and run, what happens?".
- Retries are unlimited with a per-question hint; the quest completes when all answers are correct.

Priority: Must · Phase: 2 · Spec: §9.2 · Brief: §3.3

### F-QST-07 — Fix-the-bug quests
As a Student, I want broken spells to repair, so that I practice finding and fixing mistakes.
**Acceptance criteria**
- The story states how many bugs there are ("This spell has 2 glitches").
- The quest completes when all validators pass.

Priority: Must · Phase: 1 · Spec: §9.2 · Brief: §3.3, §4

### F-QST-08 — Fill-the-gap quests
As a Student, I want to fill in missing pieces of a spell, so that I can focus on the new idea.
**Acceptance criteria**
- `____` gaps render as highlighted, labelled widgets in the editor.
- With `locked: true`, non-gap lines are read-only (CodeMirror read-only ranges) and say so to screen readers.
- The quest completes when all validators pass.

Priority: Must · Phase: 2 · Spec: §9.2 · Brief: §3.3

### F-QST-09 — Parsons puzzles
As a Student, I want to put shuffled code lines in the right order and indentation, so that I learn program structure without typing.
**Acceptance criteria**
- Two lists, "Spell scraps" and "Your spell", plus optional distractor lines.
- The assembled program is run against the validators, so any correct order passes (`check: run`).
- `check: order` compares the order with the solution or listed alternatives instead, for puzzles made only of comments (the Region 11 blueprint).
- Wrong solutions for Parsons quests are line orders, and the content tests check them too.
- Indentation shows as guide bars **and** a text label ("indent 1").

Priority: Must · Phase: 2 · Spec: §9.2, §14.3 · Brief: §3.3

### F-QST-10 — Parsons puzzles with only a keyboard
As a Student who can't drag with a mouse, I want keys and buttons to move and indent lines, so that I can solve Parsons puzzles too.
**Acceptance criteria**
- ↑/↓ moves focus; Space picks up ("Picked up `print(x)`, position 2 of 5, indent 0"); ↑/↓ moves the held line; ←/→ (or Shift+Tab/Tab) changes indent; Space drops; Esc cancels; M moves between lists.
- Each line also has visible ▲ ▼ ◀ ▶ ⇄ buttons.
- Covered by an E2E test (F-QA-09).

Priority: Must · Phase: 2 · Spec: §14.3 · Brief: §3.3, §1

### F-QST-11 — Modify quests
As a Student, I want to change working code to do something new, so that I practice adapting code.
**Acceptance criteria**
- The starter is a working program; validators check the new behavior and that required structure remains (e.g. "still uses a loop").

Priority: Must · Phase: 2 · Spec: §9.2 · Brief: §3.3

### F-QST-12 — Make quests
As a Student, I want to write a program from almost nothing, so that I can show I really understand.
**Acceptance criteria**
- A minimal starter; the quest completes when all validators pass.

Priority: Must · Phase: 1 · Spec: §9.2 · Brief: §3.3

### F-QST-13 — Track attempts and time fairly
As a Student, I want my attempts, distinct tries and active time recorded per quest, so that badges like *Tinkerer* and *Never Give Up* can celebrate my persistence.
**Acceptance criteria**
- An attempt is one Run that reaches validation, or one locked-in prediction.
- Distinct attempts count unique code hashes.
- Active time counts only while the quest screen is visible, the tab is focused and there was input in the last 120 s.
- None of these are shown to students as a score or penalty.

Priority: Must · Phase: 1 · Spec: §9.1, §12.1 · Brief: §3.2, §6

### F-QST-14 — Talk to the Duck
As a Student in the Bugmire Swamp, I want to explain my code to a rubber duck one line at a time, so that I can hear the bug myself.
**Acceptance criteria**
- A quest with a `duck:` block shows a "Talk to the Duck" panel that steps through the program line by line and asks "What should this line do?".
- Answers are free text, never graded, stored only in the local draft and left out of exports by default.
- Finishing the walk-through shows the duck's closing question and counts toward the Duck Whisperer badge.
- Fully keyboard-operable; each prompt names the line number and its code.

Priority: Must · Phase: 4 · Spec: §9.8a · Brief: §4 (Region 10)

---

## F-FBK — Validation feedback, error translation and hints

### F-FBK-01 — Core quest checks
As a Content author, I want declarative checks for output, world state, variables and code structure, so that I can say what "done" means without writing code.
**Acceptance criteria**
- `output`: `exact | normalized | contains | regex | fuzzy`, with `normalize` options and a fuzzy `threshold`.
- `state`: `hero_at`, `hero_on`, `has_items`, `items_count`, `chests_opened`, `max_bonks`, `said_contains`.
- `variable`: `name`, `equals`, `value_type`, `matches`.
- `ast`: `require`, `forbid`, `require_calls`, `min_count`, `require_else`, `function`, `no_literal`, `uses_names`, `max_lines`.
- `style`: `min_comments`, `comment_above`, `max_line_length` (uses `tokenize`, because `ast` drops comments; needed by Region 1's comment quests).
- Each returns `{ id, passed, hint }`; all validators run on every attempt.

Priority: Must · Phase: 1 · Spec: §9.3 · Brief: §2.2

### F-FBK-02 — Hidden tests
As a Content author, I want to re-run the student's program with other values, so that hard-coded answers don't pass.
**Acceptance criteria**
- Modes: `vars` (rewrites the first top-level assignment of each named variable), `inputs` (another input queue; usable from Phase 3), `call` (calls a student function with `args`), `seed` (fixed random seeds), `stages` (hidden maps, so a `world.look()` loop must solve any cave, not just the visible one).
- `compare` can include `output`, `returns`, `said`, `state` and `vars:<name>`.
- Each case runs in a fresh namespace and world and never adds to the replayed action log.

Priority: Must · Phase: 2 · Spec: §9.3, §6.2 · Brief: §2.2

### F-FBK-03 — Expected answers computed for me
As a Content author, I want `expect: from_solution`, so that I don't have to work out expected answers by hand.
**Acceptance criteria**
- `build-content` runs the reference solution on every hidden case and bakes the results into the compiled JSON.
- The runtime never needs the solution to check answers.

Priority: Must · Phase: 2 · Spec: §9.3, D11 · Brief: §2.2, §5

### F-FBK-04 — Custom checks for unusual quests
As a Content author, I want a Python `check(ctx)` escape hatch, so that unusual quests can still be checked.
**Acceptance criteria**
- `custom` validators get `ctx` with `.source .tree .output .lines .vars .world .run() .call()` and return `Pass()` or `Fail("hint")`.

Priority: Should · Phase: 2 · Spec: §9.3 · Brief: §2.2

### F-FBK-05 — A hint about *my* mistake
As a Student, I want feedback that names the mistake I actually made, so that I know what to change.
**Acceptance criteria**
- `common_mistakes` support `detect.kind` = `error`, `code_regex`, `validator_failed`, `output_regex` and `state`.
- Selection order: run error → first matching mistake, else the translated error; failed validators → first matching mistake in YAML order, else the first failing validator's `fail_hint`, else "Not quite yet — try a hint?".
- Content tests check that each wrong solution produces its declared mistake (F-QA-04).

Priority: Must · Phase: 1 · Spec: §9.4 · Brief: §2.2, §5

### F-FBK-06 — Ready-made mistake detectors
As a Content author, I want a library of named detectors, so that common mistakes are caught without writing regexes.
**Acceptance criteria**
- Adds `detect.kind` = `detector`, `hidden_case_fails` and `custom`.
- Ships `assign_in_condition`, `printed_not_stored(var)`, `stored_not_printed(var)`, `number_as_string(value)`, `hardcoded_output`, `missing_call_parens`, `range_off_by_one`, `loop_var_not_updated`, `infinite_while_true_without_break`, `function_not_called`, `function_prints_not_returns`, `return_inside_loop_too_early`, `unused_variable`, `shadowed_builtin`, `missing_fstring_prefix`.
- Each detector has positive and negative unit tests.

Priority: Must · Phase: 2 · Spec: §9.4 · Brief: §2.2

### F-FBK-07 — Basic friendly error messages
As a Student in Region 1, I want plain-language explanations of the errors beginners hit first, so that an error doesn't scare me.
**Acceptance criteria**
- Covers at least `syntax.missing_colon`, `syntax.unclosed_string`, `syntax.unclosed_bracket`, `syntax.print_no_parens`, `syntax.smart_quotes`, `indent.unexpected`, `name.missing_quotes`, `name.typo`, `name.wrong_case`, `import.not_allowed` and `generic`.
- Each message shows with the line highlighted (F-EDT-05).
- Only `<spellbook>` frames are used; the line comes from the innermost student frame.

Priority: Must · Phase: 1 · Spec: §6.8 · Brief: §2.1

### F-FBK-08 — Full error translation
As a Student, I want every common Python error explained in plain words, so that I can fix problems on my own.
**Acceptance criteria**
- Every classifier row in spec §6.8 is implemented, including `SyntaxError` (missing colon, unclosed quote or bracket), `IndentationError`, `NameError` (typo, used before assignment), `TypeError` (string + int), `IndexError`, `KeyError`, `ZeroDivisionError` and `ValueError` from `int()`.
- Message templates live in `content/errors.yaml` so wording can change without code.
- Each row has a unit-test fixture pinned to Python 3.14 messages.

Priority: Must · Phase: 2 · Spec: §6.8 · Brief: §2.1

### F-FBK-09 — Show the real Python error
As a Student, I want a "Show the real Python error" toggle, so that I learn to read real error messages.
**Acceptance criteria**
- The toggle shows the filtered traceback (student frames only, file named "spellbook").
- Opening it counts toward the Error Reader badge.

Priority: Must · Phase: 1 · Spec: §6.8, §11.6 · Brief: §2.1

### F-FBK-10 — Read a traceback with Byte
As a Student in Region 10, I want Byte to label the parts of a real traceback, so that I can read any error myself.
**Acceptance criteria**
- From Region 10 on, the real-error view annotates the file, line, error type and message.

Priority: Should · Phase: 4 · Spec: §6.8 · Brief: §4

### F-FBK-11 — Three hints when I'm stuck
As a Student, I want up to three hints that get more helpful, so that I can get unstuck without being given the answer.
**Acceptance criteria**
- Exactly 3 tiers per quest: nudge → targeted explanation → near-complete example with a gap. They unlock in order.
- `hintsUsed` (0–3) is recorded only for the student's own progress and badges, never as a penalty.

Priority: Must · Phase: 1 · Spec: §9.5 · Brief: §3.2

### F-FBK-12 — Hints feel safe to use
As a Student, I want to know hints are free and to reuse the example easily, so that asking for help feels okay.
**Acceptance criteria**
- The hint panel says hints are free and never cost XP; nothing in the UI shows hint use as a penalty.
- Tier 3 appears in a read-only code block with "Copy into Spellbook".

Priority: Must · Phase: 2 · Spec: §9.5 · Brief: §3.2

### F-FBK-13 — Bonus challenges
As a fast-finishing Student, I want optional bonus goals in a quest, so that I can push myself for extra XP.
**Acceptance criteria**
- `bonus` entries show their description after the quest passes; each earned bonus grants its XP once and is recorded.
- Bonuses never block completion.

Priority: Should · Phase: 2 · Spec: §10.2, §11.2 · Brief: §3.2

### F-FBK-14 — Clear pass and "not yet"
As a Student, I want pass and fail shown with words and icons, so that I can tell what happened even without color.
**Acceptance criteria**
- Results always pair an icon with text ("Passed", "Not yet").
- On success, the `story_outro` and rewards appear and are announced politely.
- On failure, the selected feedback (F-FBK-05) appears and nothing is taken away.

Priority: Must · Phase: 1 · Spec: §9.4, §14.2 (1.4.1) · Brief: §3.2, §1

### F-FBK-15 — Checks across all my runs
As a Content author, I want some checks to look across all of a student's runs in a quest, so that "test every branch" and "play your game 3 times" can be checked automatically.
**Acceptance criteria**
- `scope: session` validators read a run history kept per quest session (status, inputs, line coverage) and saved with the draft.
- `branch_coverage` passes when every `if`/`elif`/`else` body has run in at least one run, and the UI lights a lamp per branch (icon + text).
- `runs_ok` passes when N runs finished without an error (optionally with different inputs).
- Line coverage is recorded only for quests that set `track_coverage: true`.

Priority: Must · Phase: 2 · Spec: §9.3 · Brief: §2.2, §4 (Region 4 and 11 bosses)

---

## F-PRG — XP, levels, items, notebook and badges

### F-PRG-01 — Earn my first concept item
As a Student, I want an item in my inventory when I master an idea, so that I can see my progress.
**Acceptance criteria**
- Completing the quest named in `rewards.item` adds the item (e.g. *Quill of Printing*) to the profile.
- A minimal inventory screen lists items with name, icon (alt text) and description.
- The item is still there after a reload (covered by F-QA-06).

Priority: Must · Phase: 1 · Spec: §11.3 · Brief: §3.2, §7

### F-PRG-02 — XP that only goes up
As a Student, I want XP for every quest, so that I feel rewarded for my effort.
**Acceptance criteria**
- Default XP by type: predict 20 · investigate 25 · fill 30 · parsons 30 · fix 35 · modify 40 · make 50 · boss phase 40 (+ 50 on defeat) · side quest 40 · knowledge check 20 (first completion, any score); YAML can override.
- XP is granted once per quest or check and **never decreases**.

Priority: Must · Phase: 2 · Spec: §11.2, §9.7 · Brief: §3.2

### F-PRG-03 — Level up
As a Student, I want levels and titles, so that I can see how far I've come.
**Acceptance criteria**
- Level *n* needs `25·n·(n−1)` cumulative XP; titles: Apprentice (1–2), Scribe (3–4), Spellwright (5–7), Scriptwright (8–10), Master Scriptwright (11+).
- The HUD shows an XP bar with text ("Lv 5 — 120 / 250 XP") and announces level-ups.

Priority: Must · Phase: 2 · Spec: §11.2 · Brief: §3.2

### F-PRG-04 — My inventory is my notebook
As a Student, I want to open each item as a reference card, so that I can review what I learned.
**Acceptance criteria**
- Items show as a grid of focusable cards; Enter opens a detail page with the concept summary, a runnable worked example, related quests and glossary links.
- The inventory is searchable; Script Fragments are on a separate shelf.

Priority: Must · Phase: 2 · Spec: §11.3, §11.4 · Brief: §3.2

### F-PRG-05 — My Spellbook pages
As a Student, I want my past spells and worked examples saved in the Spellbook, so that I can reuse patterns I've learned.
**Acceptance criteria**
- Spell Pages list concept cards of completed quests, worked examples from concept scenes, and "My Spells" (my own passing solution for each quest).
- Each can be viewed and copied.

Priority: Must · Phase: 2 · Spec: §11.5 · Brief: §3.2

### F-PRG-06 — Earn badges
As a Student, I want badges for good habits, so that trying hard and exploring feel rewarding.
**Acceptance criteria**
- Badges are defined in `badges.yaml` and checked in `state/badges.ts` after every state change.
- Phase 2 set: First Bug Squashed, Clean Cast, Tinkerer (5 distinct attempts), Never Give Up (pass after ≥ 4 failed attempts), Error Reader, Region Restorer (per boss), Workshop Inventor, Side Questor I.
- No badge rewards speed.

Priority: Must · Phase: 2 · Spec: §11.6 · Brief: §3.2

### F-PRG-07 — Badges for later content
As a Student, I want badges for exploring and finishing the big goals, so that I have long-term things to aim for.
**Acceptance criteria**
- Explorer of *Region* (all POIs) — Phase 3.
- Duck Whisperer (Byte's rubber-duck debugging) and Great Scriptwright (capstone) — Phase 4.
- Review Riddler (all 11 knowledge checks) and Side Questor II/III — Phase 4.

Priority: Must · Phase: 3–4 · Spec: §11.6 · Brief: §3.2

### F-PRG-08 — Celebrate without overwhelming
As a Student, I want a short celebration when I earn something, so that wins feel good.
**Acceptance criteria**
- XP, items, badges and level-ups show a dismissible toast announced in a polite live region.
- With reduced motion, celebrations are static; nothing flashes more than 3 times per second.

Priority: Should · Phase: 2 · Spec: §11.6, §14.2 (2.3.1) · Brief: §3.2, §1

---

## F-BOS — Bosses, knowledge checks and side quests

### F-BOS-01 — Battle a Bug Boss in phases
As a Student, I want each region's boss split into steps I can save, so that a big challenge feels doable.
**Acceptance criteria**
- A boss has 2–4 phases, each its own quest type with starter code, validators and hints, shown as phase tabs.
- Each passed phase is saved immediately; I can leave and come back.
- The health bar shows phases left with text ("2 of 3 glitches fixed").

Priority: Must · Phase: 1 · Spec: §9.6 · Brief: §3.2, §4

### F-BOS-02 — Keep my code between boss phases
As a Student, I want the next boss phase to start from my last working code, so that I build up one program.
**Acceptance criteria**
- `starter_code: carry` starts a phase from my passing code for the previous phase.

Priority: Should · Phase: 1 · Spec: §9.6 · Brief: §3.2

### F-BOS-03 — Turn the Bug into a firefly
As a Student, I want a fun ending when I beat a boss, so that I feel I restored the region.
**Acceptance criteria**
- When all phases pass, the Bug turns into a friendly glowing firefly (static with reduced motion).
- The region's Script Fragment is awarded and the next region unlocks.

Priority: Must · Phase: 1 · Spec: §9.6, §11.1 · Brief: §3.1, §3.2

### F-BOS-04 — Low-stakes knowledge check
As a Student, I want a short review quiz at the end of each region that I can retake, so that I can check what I remember without pressure.
**Acceptance criteria**
- 3–5 items mixing multiple choice and predict-the-output, each with an `explain`.
- Options are shuffled per attempt; results use icons and text; best and latest scores are stored.
- It does not gate the next region (course authors can change this with `features.knowledgeCheckGates`).

Priority: Must · Phase: 1 · Spec: §9.7 · Brief: §4

### F-BOS-05 — Side quests for fast finishers
As an Instructor, I want optional side quests, so that fast finishers stay busy and challenged.
**Acceptance criteria**
- Quests with `side_quest: true` never block progress and appear on the Quest Board (F-WLD-07).
- They award bonus XP and count toward Side Questor badges.
- Region 1's side quests ship in this phase; later regions' with their content.

Priority: Must · Phase: 2 · Spec: §9.9 · Brief: §4

### F-BOS-06 — My own game in the capstone
As a Student, I want to build my own small game at the end, so that I can be creative with everything I learned.
**Acceptance criteria**
- The capstone's guided phases end in a free part checked only by light rules (e.g. uses at least one loop, one `if`, one function and `random`), not exact output.
- Interactive `input()` works there (F-EXE-13).

Priority: Must · Phase: 4 · Spec: §9.6, §6.5 · Brief: §4

---

## F-WSH — Workshop (sandbox)

### F-WSH-01 — Unlock the Workshop
As a Student, I want a Workshop that opens after the Region 1 boss, so that I can play with code freely.
**Acceptance criteria**
- The Workshop unlocks when the Region 1 boss is defeated.
- I can pick a sandbox map from `workshop.yaml` (meadow, maze, treasure vault, empty large grid).

Priority: Must · Phase: 2 · Spec: §11.7 · Brief: §3.2

### F-WSH-02 — Code anything
As a Student, I want to run any code with the game API and no checks, so that I can experiment.
**Acceptance criteria**
- The full API and interactive `input()` (F-EXE-13) are available; there are no validators.
- The larger Workshop loop budget (1,000,000) applies.

Priority: Must · Phase: 2 · Spec: §11.7, §6.3 · Brief: §3.2

### F-WSH-03 — Keep my inventions
As a Student, I want to save my Workshop programs and download them, so that I can come back to them or share them.
**Acceptance criteria**
- Up to 20 named programs are saved locally per profile.
- "Download .py" exports a program as a file (a local download; no network).

Priority: Must · Phase: 2 · Spec: §11.7, §12.1 · Brief: §3.2

### F-WSH-04 — Look up the spells I know
As a Student, I want an API reference panel in the Workshop, so that I can remember what the hero can do.
**Acceptance criteria**
- The panel lists only the calls learned so far, with "more" to reveal the rest.

Priority: Should · Phase: 2 · Spec: §11.7 · Brief: §3.2

---

## F-SAV — Save, load, export/import and save codes

### F-SAV-01 — Progress saves itself
As a Student, I want my progress saved automatically, so that I can close the tab and come back later.
**Acceptance criteria**
- Profiles are stored in IndexedDB (`codeweald` database: `profiles` and `drafts` via `idb-keyval`).
- Saves are debounced 500 ms and flushed on `visibilitychange` and `pagehide`; `navigator.storage.persist()` is requested.
- Reloading the page restores everything (F-QA-06).

Priority: Must · Phase: 1 · Spec: §12.2 · Brief: §1, §8

### F-SAV-02 — Warn me if saving can't work
As a Student in a locked-down browser, I want to be told if my progress can't be saved, so that I use a save code instead.
**Acceptance criteria**
- Falls back to localStorage, then memory-only.
- In memory-only mode, a banner says "This browser can't save. Use **Save code** before you leave."

Priority: Should · Phase: 1 · Spec: §12.2 · Brief: §1

### F-SAV-03 — Old saves still work after updates
As a Maintainer, I want versioned save records with migrations, so that updates never break a student's progress.
**Acceptance criteria**
- Every record has `schemaVersion`; `state/migrations.ts` chains upgrades.
- Each migration has a unit test.

Priority: Must · Phase: 1 · Spec: §12.2, §16 · Brief: §7

### F-SAV-04 — Download my progress
As a Student, I want to download my progress as a file, so that I can move it or hand it in.
**Acceptance criteria**
- "Save progress file" writes `codeweald-<nickname>-<YYYY-MM-DD>.codeweald.json` with `{ format: "codeweald-progress", version, courseId, contentVersion, exportedOn, profile, drafts }`.
- Where the browser supports it (Chrome/ChromeOS), it opens the system "Save as" dialog so I can pick a folder that survives sign-out, such as Google Drive in the Files app. Elsewhere it falls back to a normal download. The game itself makes no network request.
- It includes my code; dates only, no time of day.

Priority: Must · Phase: 1 · Spec: §12.3 · Brief: §1, §6

### F-SAV-05 — Load my progress file
As a Student, I want to load my progress file on another computer, so that I can pick up where I left off.
**Acceptance criteria**
- Import accepts only a user-picked file ≤ 5 MB, validated with Zod; values are only ever rendered as text.
- I choose **Replace this profile** or **Add as new profile** (Phase 1). **Merge** (union of completions, items and badges; max of XP, hints, attempts and time) arrives in Phase 2.
- Unknown quest ids from other content versions are kept but ignored.

Priority: Must · Phase: 1 · Spec: §12.3, §15.3 · Brief: §1

### F-SAV-06 — Get a save code
As a Student, I want a text code for my progress, so that I can move it without a file or paste it into an assignment box.
**Acceptance criteria**
- Format `CW1-` + Crockford Base32 in groups of 5 with a final CRC-16 check group; about 250 characters for the full course, including a short random profile id and the export date.
- It encodes content version, avatar, theme, nickname, XP, per-quest status, hint tier, attempts bucket, time bucket, knowledge-check best scores and special badges.
- A "Copy" button copies it; the code is selectable text with an accessible label.

Priority: Must · Phase: 1 · Spec: §12.4 · Brief: §1, §6

### F-SAV-07 — Restore from a save code
As a Student, I want to paste a save code to get my progress back, so that switching computers is easy.
**Acceptance criteria**
- Pasting a valid code restores progress (items and most badges re-derived from completions).
- A typo shows "That code has a typo — check the characters again."
- Round-trip and fuzz tests pass (F-QA-02).

Priority: Must · Phase: 1 · Spec: §12.4 · Brief: §1

### F-SAV-08 — Reminder to save before I leave
As a Student on a school Chromebook that wipes data at sign-out, I want a reminder to save my code at the end of class, so that I don't lose progress.
**Acceptance criteria**
- The HUD shows an "Unsaved progress" marker (icon + text) whenever progress changed since my last save code or file.
- After each completed quest and boss phase, a non-blocking "Save point" toast offers **Copy save code** and **Save file**.
- Closing the tab with unsaved progress triggers the browser's leave-page warning.
- The title screen reminds students that school computers may forget progress, so they should save at the end of every session.

Priority: Must · Phase: 1 · Spec: §12.5 · Brief: §1

### F-SAV-09 — Remove a profile
As a Student, I want to delete my profile on a shared computer, so that my progress doesn't stay on a machine I won't use again.
**Acceptance criteria**
- "Delete profile" needs an explicit confirmation that names the profile and offers "Export first".

Priority: Should · Phase: 2 · Spec: §5.2, §12.2 · Brief: §1

### F-SAV-10 — Continue from a save on any computer
As a Student whose Chromebook forgot everything overnight, I want a "Continue from a save" button on the title screen, so that I'm back in the game in seconds.
**Acceptance criteria**
- The title screen offers **Continue from a save**: paste a save code, or open a progress file (system file picker, so Google Drive works on ChromeOS).
- A restored profile drops me where I left off (region, open quest), and its drafts come back from a file.
- If this browser already has the same profile (same profile id), I'm asked whether to replace it or keep both.

Priority: Must · Phase: 1 · Spec: §12.5 · Brief: §1

---

## F-A11 — Accessibility and settings

### F-A11-01 — Play everything with a keyboard
As a Student who uses only a keyboard, I want every part of the game to work from the keyboard, so that I'm never blocked.
**Acceptance criteria**
- Movement, menus, dialogue, editor, replay controls, quests and inventory all work without a mouse, in a logical focus order.
- Modals trap focus on purpose and close with Esc, returning focus.

Priority: Must · Phase: 1 · Spec: §14.2 (2.1.1, 2.1.2, 2.4.3) · Brief: §1

### F-A11-02 — Always see where I am
As a Student, I want a clear focus outline, so that I always know what's selected.
**Acceptance criteria**
- A 3 px focus ring with ≥ 3:1 contrast on every theme, on every focusable element, including the canvas container.

Priority: Must · Phase: 1 · Spec: §14.2 (2.4.7) · Brief: §1

### F-A11-03 — Labels for screen readers
As a Student using a screen reader, I want every control named, so that I know what each one does.
**Acceptance criteria**
- All UI is semantic DOM (Preact); every control has an accessible name that matches its visible label.
- Item icons, avatars and badges have alt text; decorative art is `aria-hidden`.
- ARIA is used only where needed (tabs, toggletips, live regions, Parsons listbox).

Priority: Must · Phase: 1 · Spec: §14.1, §14.2 (1.1.1, 1.3.1, 2.5.3, 4.1.2) · Brief: §1

### F-A11-04 — Status updates I can hear
As a Student using a screen reader, I want run status, saves and results announced, so that I know what's happening.
**Acceptance criteria**
- A polite live region announces run status, saves and results; an assertive one is used only for blocking errors.

Priority: Must · Phase: 1 · Spec: §14.2 (4.1.3) · Brief: §1

### F-A11-05 — Never color alone
As a colorblind Student, I want icons and words with every color, so that I never miss information.
**Acceptance criteria**
- Status colors use the Okabe–Ito set and are always paired with icons and text.
- Design tokens live in `src/ui/tokens.css`; a unit test checks ≥ 4.5:1 text and ≥ 3:1 UI contrast for every theme.

Priority: Must · Phase: 1 · Spec: §14.6, §14.2 (1.4.1, 1.4.3, 1.4.11) · Brief: §1

### F-A11-06 — Skip to what matters
As a Student using a keyboard, I want skip links, so that I can jump straight to the editor or output.
**Acceptance criteria**
- Skip links on the quest and overworld screens ("Skip to editor", "Skip to output").

Priority: Must · Phase: 1 · Spec: §14.2 (2.4.1), §9.10 · Brief: §1

### F-A11-07 — No time pressure
As a Student, I want to take as long as I need, so that I'm never rushed.
**Acceptance criteria**
- No core task is timed; dialogue never auto-advances; no badge or score rewards speed.
- The code timeout is described to students as a safety stop, never a time limit.

Priority: Must · Phase: 1 · Spec: §14.2 (2.2.1, 2.2.2), §11.6 · Brief: §1

### F-A11-08 — Bigger text
As a Student, I want to make all text bigger, so that I can read it easily.
**Acceptance criteria**
- Text size 100 / 125 / 150 / 200% (rem-based); nothing is clipped at 200% (no fixed-height text boxes).

Priority: Must · Phase: 2 · Spec: §14.4, §14.2 (1.4.4, 1.4.12) · Brief: §1

### F-A11-09 — An easier-to-read font
As a Student with dyslexia, I want to switch fonts, so that text is easier for me to read.
**Acceptance criteria**
- UI font: Atkinson Hyperlegible Next (default), OpenDyslexic or system; code font: Atkinson Hyperlegible Mono or system mono.
- Fonts are bundled (no external font requests) and their open licenses are recorded in `ASSETS_LICENSES.md`.

Priority: Must · Phase: 2 · Spec: §14.4 · Brief: §1

### F-A11-10 — Turn down the motion
As a Student who gets dizzy from motion, I want a reduced-motion setting, so that the game is comfortable.
**Acceptance criteria**
- Options: system / on / off; "system" follows `prefers-reduced-motion`.
- With it on: no tweens, shake, bounce or parallax anywhere (overworld, replay, celebrations) and ambient animation stops.

Priority: Must · Phase: 2 · Spec: §14.4, §14.2 (2.2.2) · Brief: §1

### F-A11-11 — High-contrast mode
As a Student with low vision, I want a high-contrast theme for the whole UI and the editor, so that everything stands out.
**Acceptance criteria**
- A high-contrast theme applies to all DOM panels and the CodeMirror editor and passes the token contrast test.

Priority: Should · Phase: 2 · Spec: §14.4, §11.5 · Brief: §1

### F-A11-12 — Shortcut keys that don't get in the way
As a Student who uses speech input, I want single-key shortcuts that only work where expected and can be turned off, so that they don't fire by accident.
**Acceptance criteria**
- Single-key shortcuts (WASD, `L`, `Q`, `.`) work only when the world, HUD or replay toolbar has focus.
- Settings has "Shortcut keys on/off".

Priority: Must · Phase: 2 · Spec: §14.2 (2.1.4), §14.4 · Brief: §1

### F-A11-13 — One settings screen
As a Student, I want all my comfort settings in one place, saved to my profile, so that the game always fits me.
**Acceptance criteria**
- Settings includes text size, fonts, reduced motion, high contrast, audio (master, music, effects; effects off by default), TTS (on/off, voice, rate), shortcut keys, replay default speed, class code and save/export.
- Settings are stored per profile; the title screen has quick text-size and contrast toggles before any profile exists.

Priority: Must · Phase: 2 · Spec: §14.4 · Brief: §1

### F-A11-14 — Panels that reflow
As a Student using zoom, I want panels to stack in one column, so that I don't scroll sideways.
**Acceptance criteria**
- DOM panels reflow to a single column at narrow widths; only the game canvas (a 2D game area) keeps its layout.

Priority: Should · Phase: 2 · Spec: §14.2 (1.4.10) · Brief: §1

### F-A11-15 — WCAG 2.1 AA audit
As an Instructor, I want the game checked against WCAG 2.1 AA, so that every student in my class can use it.
**Acceptance criteria**
- A manual audit against the §14.2 criteria (keyboard, NVDA/ChromeVox screen readers, 200% zoom, reduced motion, colorblind simulation) is done and its findings are fixed or logged in `PROGRESS.md`.
- axe-core reports zero serious/critical violations on all main screens (F-QA-10).

Priority: Must · Phase: 6 · Spec: §14 · Brief: §1, §7, §8

---

## F-OFF — Offline/PWA and privacy

### F-OFF-01 — Install it and play offline
As a School IT admin, I want an installable app that works offline after the first load, so that flaky school Wi-Fi doesn't stop class.
**Acceptance criteria**
- `vite-plugin-pwa` (Workbox) generates the service worker and a manifest (original icons, `display: standalone`).
- The app shell, JS/CSS, fonts, art, audio and content JSON are precached.

Priority: Must · Phase: 2 · Spec: §16 · Brief: §1

### F-OFF-02 — Download Python only once
As a School IT admin, I want Pyodide downloaded once and cached, so that the school network isn't hit twice.
**Acceptance criteria**
- Pyodide core files are runtime-cached (CacheFirst, cache `pyodide-<version>`), not precached.
- The SW uses `skipWaiting` + `clientsClaim`; the worker starts after the SW controls the page (3 s fallback), so its fetches land in the cache.
- On a first visit, each Pyodide file is downloaded exactly once (E2E request count).

Priority: Must · Phase: 2 · Spec: §16 · Brief: §1, §7

### F-OFF-03 — Know when offline play is ready
As a Student, I want to see when the game is ready to work offline, so that I know it's safe to disconnect.
**Acceptance criteria**
- "Ready to play offline ✓" shows on the title screen and in Settings once the precache and the Pyodide cache are both complete.

Priority: Must · Phase: 2 · Spec: §16 · Brief: §1

### F-OFF-04 — Updates that wait for me
As a Student, I want updates to wait until I finish my quest, so that I never lose my place.
**Acceptance criteria**
- A new version shows "A new version of Codeweald is ready — reload when you're done with this quest"; it never auto-reloads mid-quest.
- Save data survives the update; content-version changes run migrations.

Priority: Must · Phase: 2 · Spec: §16 · Brief: §1

### F-OFF-05 — Nothing talks to the internet
As a School IT admin, I want no third-party requests and no network calls after load, so that the app meets our privacy rules.
**Acceptance criteria**
- A CSP meta tag as in §15.2 (`connect-src 'self'`, no external origins); `'unsafe-eval'` only if Phase 1 proves Pyodide needs it.
- All fonts, art, audio and Pyodide are bundled; no CDN, analytics, trackers or error-reporting services.
- After load, the only request is the browser's own same-origin SW update check (F-QA-12).

Priority: Must · Phase: 1 · Spec: §15.2 · Brief: §1

### F-OFF-06 — No personal information
As an Instructor, I want the game to collect no personal information, so that it is COPPA/FERPA-friendly.
**Acceptance criteria**
- Only a nickname is stored; no email, account or device identifier; dates only (no time of day).
- No data leaves the device except a file the student chooses to download, or a save code they copy.

Priority: Must · Phase: 1 · Spec: §15.1 · Brief: §1

### F-OFF-07 — Imported files can't cause harm
As an Instructor, I want imported files and codes treated as untrusted, so that a tampered file can't break or hijack the app.
**Acceptance criteria**
- Imports are size-limited, Zod-validated and checksummed; their values are only rendered as text.
- Malformed files show a friendly error and change nothing.

Priority: Must · Phase: 2 · Spec: §15.3 · Brief: §1

### F-OFF-08 — System check page
As a School IT admin, I want a built-in system check, so that I can see quickly whether a device or network will run the game.
**Acceptance criteria**
- A page reports: service worker active, IndexedDB available, WebAssembly works, `.wasm` served as `application/wasm`, storage quota, local TTS voices and offline readiness, each with pass/fail text and a fix tip.

Priority: Should · Phase: 6 · Spec: §21 · Brief: §1, §8

### F-OFF-09 — Honest about limits
As an Instructor, I want the dashboard and guide to say progress is self-reported, so that I use it for formative feedback, not grading.
**Acceptance criteria**
- The README explains §15.4's known limits (dev tools can alter local progress); solutions are not in the bundle.

Priority: Should · Phase: 5 · Spec: §15.4 · Brief: §6

---

## F-INS — Instructor answer key

The course is self-paced and the app has **no teacher features** (owner decision Q13). Instructors
still get every solution, outside the app.

### F-INS-01 — A generated answer key for instructors
As an Instructor, I want one document with every quest's solution, answers and common mistakes, so that I'm ready for students' questions.
**Acceptance criteria**
- `npm run solutions` writes `docs/solutions.md` from the content files.
- For each region it covers the concepts, and for each quest and boss phase: type, learning outcome, CSTA codes, reference solution, predict/investigate answers, common mistakes with the feedback students see, and the hints.
- It includes knowledge-check answers with explanations.
- CI fails if the committed file is out of date with the content.

Priority: Must · Phase: 1 (Region 1), 3–4 (grows with content) · Spec: §13 · Brief: §6

### F-INS-02 — Solutions never ship in the game
As an Instructor, I want reference solutions kept out of the app, so that students can't simply look them up in the browser.
**Acceptance criteria**
- The compiled content in the build contains no reference solutions.
- A unit test checks that the generated content JSON contains no `solution` fields.

Priority: Must · Phase: 1 · Spec: §13, §10.6 · Brief: §2.2

---

## F-AUT — Content authoring and validation tooling

### F-AUT-01 — Content in plain YAML files
As a Content author, I want quests, regions, glossary, items, badges, error messages and Workshop maps in YAML files, so that I can edit content without touching engine code.
**Acceptance criteria**
- Files follow the §10.1 layout; one quest per file under `content/regions/NN-slug/quests/`.
- Engine code contains no quest text.

Priority: Must · Phase: 1 · Spec: §10.1 · Brief: §2, §5

### F-AUT-02 — Clear errors when a file is wrong
As a Content author, I want schema errors that name the file, line and problem in plain words, so that I can fix my YAML myself.
**Acceptance criteria**
- Zod 4 schemas in `src/content/schema.ts` validate every file; types are inferred for engine code.
- Errors look like `content/regions/04…/r4-q3-gatekeeper.yaml:27 — hint 3 must contain a ____ gap`.

Priority: Must · Phase: 1 · Spec: §10.4, §10.6 · Brief: §2, §5

### F-AUT-03 — Rules that keep the course sound
As a Content author, I want automatic cross-checks between files, so that broken links and missing pieces are caught.
**Acceptance criteria**
- Checks: unique ids matching file names; prerequisites exist with no cycles; glossary links, `vocabulary`, items and badges exist; ≥ 1 `fix` quest per region; regions ≥ 3 have a quest tagged `retrieval: rN`; bosses have 2–4 phases; knowledge checks have 3–5 items; `____` only in `fill` starters and tier-3 hints.

Priority: Must · Phase: 1 · Spec: §10.4 · Brief: §4, §5

### F-AUT-04 — Outcomes and standards are well-formed
As a Content author, I want each quest's learning outcome and CSTA codes checked, so that every quest has one measurable outcome.
**Acceptance criteria**
- `learning_outcome` must start with an action verb; vague verbs ("understand", "know", "learn about") are rejected.
- `csta` needs ≥ 1 code matching `^2-(AP|CS|DA|IC|NI)-\d{2}$`.

Priority: Must · Phase: 1 · Spec: §10.3 · Brief: §4, §5

### F-AUT-05 — One command checks everything
As a Content author, I want `npm run validate-content`, so that I know my quest works before anyone plays it.
**Acceptance criteria**
- Runs schema and cross-ref checks, runs every reference solution through its validators, runs every `wrong_solution` and checks its expected mistake, and prints the reading-level report.
- Exits non-zero on any failure, with a summary authors can read.

Priority: Must · Phase: 1 · Spec: §10.6 · Brief: §6, §7

### F-AUT-06 — Content compiled for the browser
As a Maintainer, I want YAML compiled to small JSON files at build, so that the browser loads fast and needs no YAML parser.
**Acceptance criteria**
- `build-content.ts` emits `src/generated/content/{course.json, region-NN.json}`; regions load lazily.
- Text is compiled to the safe AST (F-DLG-02); reference solutions are dropped from the game bundle (they appear only in the instructor answer key).

Priority: Must · Phase: 1 · Spec: §10.6, D10 · Brief: §2

### F-AUT-07 — Autocomplete in my editor
As a Content author, I want my code editor to suggest fields and flag mistakes as I type, so that writing quests is easier.
**Acceptance criteria**
- `npm run schema` generates `schema/*.schema.json` via `z.toJSONSchema()`.
- Each content file starts with a `# yaml-language-server: $schema=…` line, so VS Code autocompletes and validates.

Priority: Should · Phase: 2 · Spec: §10.4 · Brief: §2, §6

### F-AUT-08 — See my changes instantly
As a Content author, I want the game to reload when I save a YAML file and a link straight to my quest, so that I can test quickly.
**Acceptance criteria**
- In `npm run dev`, changes under `content/` hot-reload.
- `/?dev#/dev/quest/<id>` (or `/?dev#/dev/check/<region>`) opens any quest or knowledge check directly, only with the `?dev` flag.

Priority: Should · Phase: 1 · Spec: §10.6 · Brief: §6

### F-AUT-09 — Start a new quest from a template
As a Content author, I want a command that creates a valid quest file, so that I don't start from a blank page.
**Acceptance criteria**
- `npm run new-quest -- --region 4 --type make --slug river-ferry` creates a schema-valid file with TODO markers for every required field.

Priority: Should · Phase: 5 · Spec: §10.6 · Brief: §6

### F-AUT-10 — A guide for writing quests
As a Content author, I want a step-by-step quest-writing guide, so that I can add quests on my own.
**Acceptance criteria**
- `docs/quest-authoring.md` covers the YAML schema, stages and grids, every validator and mistake-detector type, hidden tests and `from_solution`, wrong solutions, hints, the scaffolder, `validate-content` and the reading-level rule, with worked examples.

Priority: Must · Phase: 5 · Spec: §13.4, §10 · Brief: §6, §9

### F-AUT-11 — Make the course longer or shorter
As an Instructor, I want to choose which regions and side quests are in the course, so that it fits the time students have.
**Acceptance criteria**
- `content/course.yaml` lists regions in order with `enabled` and `lessons`, plus `side_quests` on/off.
- The build prints a pacing summary (total lessons, minutes and quests); disabled regions are skipped in gating.

Priority: Must · Phase: 3 · Spec: §20, §10.1 · Brief: §1

---

## F-CUR — Curriculum content

### F-CUR-01 — Region 1: Hearthvale Village
As a Student, I want a complete first region, so that I learn what a program is, `print()`, strings, comments and reading a simple error.
**Acceptance criteria**
- Concept scene, all core quests, the Village Crier Bug boss, side quests (Phase 2), knowledge check and concept items exactly as in [curriculum-map.md](curriculum-map.md).
- Every quest passes its content tests (F-QA-04).

Priority: Must · Phase: 1 · Spec: §9, §10 · Brief: §4, §8

### F-CUR-02 — Regions 2–6
As a Student, I want Whispering Library, Merchant's Crossing, Forked Road Forest, the Endless Mines and Clocktower Peaks, so that I learn variables, numbers and `input()`, conditions, `while` loops and `for` loops.
**Acceptance criteria**
- Each region ships with its overworld map, concept scene, 4–7 quests plus boss, side quests and knowledge check, as in the curriculum map.

Priority: Must · Phase: 3 · Spec: §9, §11.1 · Brief: §4, §8

### F-CUR-03 — Regions 7–10
As a Student, I want Dragon's Hoard Caverns, the Guild of Spellcrafters, the Archive of Maps and the Bugmire Swamp, so that I learn lists, functions, dictionaries and debugging.
**Acceptance criteria**
- Each region ships complete as in F-CUR-02.

Priority: Must · Phase: 4 · Spec: §9, §11.1 · Brief: §4, §8

### F-CUR-04 — Region 11: the Shattered Citadel capstone
As a Student, I want a final region where I rebuild the Great Script by making my own mini-game, so that I combine everything I learned.
**Acceptance criteria**
- Guided phases using `random` plus earlier concepts, ending in the free creative part (F-BOS-06).
- Completing it restores the Great Script and awards Great Scriptwright.

Priority: Must · Phase: 4 · Spec: §9.6 · Brief: §4, §3.1

### F-CUR-05 — One measurable outcome per quest
As an Instructor, I want every quest to state one measurable learning outcome with CSTA codes, so that I know exactly what each quest teaches.
**Acceptance criteria**
- Every quest and boss phase has one `learning_outcome` (action verb first) and ≥ 1 CSTA code (enforced by F-AUT-04).

Priority: Must · Phase: 1–4 · Spec: §10.3 · Brief: §4, §5

### F-CUR-06 — A healthy mix of quest types
As an Instructor, I want each region to mix PRIMM quest types, with at least one fix-the-bug quest, so that students predict, run, investigate, modify and make.
**Acceptance criteria**
- Each region mixes types as in the curriculum map's coverage matrix; ≥ 1 `fix` quest per region (enforced by F-AUT-03).

Priority: Must · Phase: 1–4 · Spec: §9.2, §10.4 · Brief: §3.3, §4

### F-CUR-07 — Revisit earlier ideas
As an Instructor, I want each region from Region 3 on to revisit an earlier concept, so that students remember what they learned.
**Acceptance criteria**
- Each region ≥ 3 has ≥ 1 quest tagged `retrieval: rN` (enforced by F-AUT-03).

Priority: Must · Phase: 3–4 · Spec: §10.4 · Brief: §4

### F-CUR-08 — Side quests in every region
As an Instructor, I want 1–2 side quests per region, so that fast finishers always have something meaningful to do.
**Acceptance criteria**
- Each region has the side quests listed in the curriculum map, using the F-BOS-05 mechanism.

Priority: Must · Phase: 2–4 · Spec: §9.9 · Brief: §4

### F-CUR-09 — Debugging all the way through
As an Instructor, I want debugging taught from Region 1 and consolidated in Region 10, so that students see errors as normal and fixable.
**Acceptance criteria**
- Region 10 covers reading tracebacks, syntax vs. runtime vs. logic errors, tracing with `print`, rubber-duck debugging with Byte and testing edge cases.
- Rubber-duck debugging is an interaction where the student explains their code line by line to Byte (and earns Duck Whisperer).
- The Swamp King boss contains 5 interleaved bugs.

Priority: Must · Phase: 4 · Spec: §6.8, §11.6 · Brief: §4

### F-CUR-10 — An original, kind story
As an Instructor, I want an original story with a warm, funny tone and only cartoonish "defeats", so that it suits ages 11–14 and avoids copyright problems.
**Acceptance criteria**
- No copyrighted characters, franchises or recognizable game IP; Bugs are glitches that turn into fireflies.
- Student-facing text targets grade 6 and is checked by F-QA-15.

Priority: Must · Phase: 1–4 · Spec: §9.6, §18.5 · Brief: §3.1, §2

### F-CUR-11 — Quests and regions fit a class period
As an Instructor, I want quests of 5–15 minutes and regions of about 30–60 minutes of core play, so that the course fits short self-paced study sessions.
**Acceptance criteria**
- `estimated_minutes` is 5–15 per quest (5–10 per boss phase), enforced by the schema.
- The pacing summary (F-AUT-11) reports per-region minutes; regions outside 30–60 core minutes are flagged.

Priority: Must · Phase: 1–4 · Spec: §10.3, §20 · Brief: §1

---

## F-QA — Testing, CI, performance and reading level

### F-QA-01 — Strict, consistent code
As a Maintainer, I want strict TypeScript, lint and formatting checks, so that the codebase stays simple and maintainable.
**Acceptance criteria**
- `tsconfig` strict mode; ESLint (including a no-`innerHTML` rule) and a Prettier check run in CI.

Priority: Must · Phase: 1 · Spec: §19.1, D1 · Brief: §2, General rules

### F-QA-02 — TypeScript unit tests
As a Maintainer, I want Vitest unit tests for the core logic, so that changes don't break saves, schemas or scoring.
**Acceptance criteria**
- Covers save/load (`fake-indexeddb`, fallbacks, migrations), export/import, save-code round-trip/typo/fuzz, schema fixtures, XP/levels, badge triggers, nickname filter, glossary linker, reading-level calculator, Parsons keyboard reducer and replay scheduling/narration.

Priority: Must · Phase: 1 (grows each phase) · Spec: §18.1 · Brief: §7

### F-QA-03 — Python unit tests on the real runtime
As a Maintainer, I want the `codeweald` package tested in Pyodide under Node, so that tests match what ships.
**Acceptance criteria**
- Vitest loads Pyodide once per worker thread and covers the action log, sandbox, error translation (one fixture per §6.8 row) and every validator and detector.

Priority: Must · Phase: 1 (grows each phase) · Spec: §18.2, D13 · Brief: §7

### F-QA-04 — Every quest is proven solvable
As an Instructor, I want every quest tested automatically, so that no student meets a quest that can't be passed.
**Acceptance criteria**
- Per quest: the reference solution passes all validators (each boss phase separately); each of ≥ 2 `wrong_solutions` fails with its declared mistake or feedback; the starter code does not pass (except predict/investigate); predict and investigate answers match the real output.
- CI fails if any quest lacks a passing solution or has fewer than 2 wrong solutions.

Priority: Must · Phase: 1 · Spec: §18.3 · Brief: §7

### F-QA-05 — CI on every push
As a Maintainer, I want a GitHub Actions workflow, so that every change is checked automatically.
**Acceptance criteria**
- `.github/workflows/ci.yml` runs jobs `checks`, `unit`, `content`, `build` (+ size budget, `dist/` artifact), `e2e` and `reading-level`, with npm and Pyodide caches.
- A phase is done only when CI is green (General rules).

Priority: Must · Phase: 1 · Spec: §19.1 · Brief: §7, §9

### F-QA-06 — E2E: the golden path
As a Maintainer, I want an end-to-end test of a new player finishing Region 1, so that the core journey always works.
**Acceptance criteria**
- New player → character creation → complete all of Region 1 (solutions typed into the editor) → Quill of Printing in the inventory → reload → progress persists.

Priority: Must · Phase: 1 · Spec: §18.4 (1) · Brief: §7

### F-QA-07 — E2E: runaway code
As a Maintainer, I want end-to-end tests for infinite loops and hard timeouts, so that the safety net always works.
**Acceptance criteria**
- `while True: pass` shows the loop-budget message with the line number.
- A C-level runaway triggers the hard timeout, the worker restarts and the next run works.

Priority: Must · Phase: 1 · Spec: §18.4 (2) · Brief: §7

### F-QA-08 — E2E: keyboard only
As a Maintainer, I want one full quest played with only the keyboard in a test, so that keyboard access can't regress.
**Acceptance criteria**
- The test uses no `click()`; it includes leaving the editor with Esc+Tab.

Priority: Must · Phase: 1 · Spec: §18.4 (3) · Brief: §7

### F-QA-09 — E2E: Parsons by keyboard
As a Maintainer, I want the keyboard Parsons flow tested end to end, so that the accessible puzzle keeps working.
**Acceptance criteria**
- A test solves a Parsons quest using only the §14.3 keys.

Priority: Must · Phase: 2 · Spec: §18.4 (4) · Brief: §7

### F-QA-10 — Automated accessibility checks
As a Maintainer, I want axe-core run on every main screen in CI, so that accessibility bugs are caught early.
**Acceptance criteria**
- `@axe-core/playwright` scans title, creator, overworld HUD, quest (each type), inventory, Spellbook, Workshop, settings, and knowledge check as each exists; zero serious/critical violations.

Priority: Must · Phase: 1 (grows each phase) · Spec: §18.4 (7) · Brief: §7

### F-QA-11 — E2E: offline play
As a Maintainer, I want an offline test, so that the PWA promise holds.
**Acceptance criteria**
- Load, wait for "ready offline", `context.setOffline(true)`, reload, then play a quest including a Python run.

Priority: Must · Phase: 2 · Spec: §18.4 (5) · Brief: §7, §1

### F-QA-12 — E2E: no third-party requests
As a School IT admin, I want a test proving the app only talks to its own server, so that privacy can't silently regress.
**Acceptance criteria**
- A request listener fails the test on any non-same-origin URL during a full session.

Priority: Must · Phase: 1 · Spec: §18.4 (6), §15.2 · Brief: §1, §7

### F-QA-13 — Size budget
As a Maintainer, I want CI to enforce download sizes, so that the game stays fast on school networks.
**Acceptance criteria**
- `scripts/size-budget.ts` fails CI if the app excluding Pyodide exceeds 4 MB gzip, the main JS chunk 700 KB gzip, or any region's content JSON 80 KB gzip.

Priority: Must · Phase: 1 · Spec: §17 · Brief: §7

### F-QA-14 — Works on a slow Chromebook
As an Instructor, I want the game tested under a Chromebook-class slowdown, so that it runs well on our devices.
**Acceptance criteria**
- Playwright with CDP `Emulation.setCPUThrottlingRate` 4× and a slow-network profile asserts: cold start → title ≤ 2 s; cached Pyodide → ready ≤ 8 s; typical run → result ≤ 300 ms; replay ≥ 30 fps.

Priority: Must · Phase: 6 · Spec: §17, §18.4 (8) · Brief: §7

### F-QA-15 — Reading-level report
As a Content author, I want a reading-level report on all student text, so that I can keep it at about a grade-6 level.
**Acceptance criteria**
- `npm run reading-level` reports the Flesch–Kincaid grade for dialogue, story text, concept cards, hints, item descriptions and glossary definitions (code excluded).
- It flags text above grade 7, showing both the raw score and the score with glossary terms excluded.
- In CI, warnings don't fail; grade > 9 fails (configurable).

Priority: Must · Phase: 1 · Spec: §18.5 · Brief: §7, §1

### F-QA-16 — Reading-level pass
As an Instructor, I want all student text revised to the target level, so that every student can read it.
**Acceptance criteria**
- No text above grade 7 remains unless listed with a reason in `PROGRESS.md`; a manual read-through of technical terms is done.

Priority: Must · Phase: 6 · Spec: §18.5, §21 · Brief: §8, §1

### F-QA-17 — E2E: restore progress on a fresh device
As a Maintainer, I want saving out and restoring tested end to end, so that students never lose progress when a Chromebook forgets everything.
**Acceptance criteria**
- Make progress → copy the save code → open a fresh browser profile → Continue from a save → the same quests, XP and items are back.

Priority: Must · Phase: 1 · Spec: §12.5 · Brief: §1

### F-QA-18 — Final content review
As an Instructor, I want every quest reviewed by a person before release, so that the content is accurate, kind and fun.
**Acceptance criteria**
- Each region is play-tested end to end; tone, accuracy, timing estimates and CSTA mapping are checked; findings are fixed or logged in `PROGRESS.md`.

Priority: Must · Phase: 6 · Spec: §21 · Brief: §8

### F-QA-19 — Low-end device check
As a School IT admin, I want the game checked on a real low-end device, so that we know it will run in class.
**Acceptance criteria**
- A manual run on a 4 GB Chromebook stays ≤ 350 MB for the tab; results are logged.
- Phaser 4 rendering is verified on a low-end Chromebook profile (WebGL and the Canvas fallback).

Priority: Should · Phase: 6 · Spec: §17, §21, D2 · Brief: §8

---

## F-DEP — Deployment and documentation

### F-DEP-01 — Build a static site
As a School IT admin, I want `npm run build` to produce plain static files, so that I can host them anywhere.
**Acceptance criteria**
- `npm run build` → `dist/` with only static files.
- `CODEWEALD_BASE=/codeweald/ npm run build` builds for a sub-path; hash URLs need no server rewrites.

Priority: Must · Phase: 1 · Spec: §19.2, §5.2 · Brief: §9

### F-DEP-02 — Change settings without rebuilding
As a School IT admin, I want a config file I can edit after building, so that I can adjust timeouts and defaults on my own.
**Acceptance criteria**
- `public/codeweald.config.json` holds the §20 settings and is read at startup; it is served with `Cache-Control: no-cache`.

Priority: Must · Phase: 1 · Spec: §20 · Brief: §2.1, §6

### F-DEP-03 — Deployment guide
As a School IT admin, I want step-by-step hosting instructions, so that I can put the game on GitHub Pages or our school server.
**Acceptance criteria**
- Covers GitHub Pages and Apache, Nginx and IIS snippets; HTTPS requirement; `.wasm` as `application/wasm`; `sw.js` and config `no-cache`; hashed assets `immutable`.
- States that no COOP/COEP headers are needed and which to add if a SharedArrayBuffer feature is enabled later.
- Includes a pre-class checklist (open the game once per device; run the System check).

Priority: Must · Phase: 6 · Spec: §19.2, §16 · Brief: §8, §9

### F-DEP-04 — README
As a Maintainer, I want a README covering setup, development, build, deploy and architecture, so that a new developer can start quickly.
**Acceptance criteria**
- An initial README in Phase 1, completed in Phase 6 with every `npm run` script explained.

Priority: Must · Phase: 1, 6 · Spec: §4 · Brief: §9

### F-DEP-05 — Progress log
As a reviewer, I want `PROGRESS.md` updated at the end of each phase, so that I always know what is done, what is next and what is broken.
**Acceptance criteria**
- Each phase adds: done, next, known issues, and test status.

Priority: Must · Phase: 0–6 · Spec: — · Brief: Your role, §9

### F-DEP-06 — Asset licenses and credits
As a School IT admin, I want every asset's source and license recorded, so that we only use legal, open assets.
**Acceptance criteria**
- Only original or CC0 art and audio; fonts under open licenses (OFL).
- `ASSETS_LICENSES.md` lists every file or pack; the in-app Credits screen shows it.

Priority: Must · Phase: 1 · Spec: §5.2, D14 · Brief: §2, §9

### F-DEP-07 — Original pixel art pipeline
As a Maintainer, I want original pixel art defined as code and rendered to PNG, so that we have license-clean art even without access to asset sites.
**Acceptance criteria**
- `scripts/make-art.ts` renders pixel-grid definitions to PNG sprite sheets and tilesets; outputs are recorded as original in `ASSETS_LICENSES.md`.
- CC0 packs (e.g. Kenney) can replace them without code changes (same atlas keys).

Priority: Should · Phase: 1 · Spec: D14, §21 · Brief: §2

### F-DEP-08 — Phase 1 demo
As a reviewer, I want a demo build with run instructions at the end of Phase 1, so that I can try the vertical slice.
**Acceptance criteria**
- Instructions to install, run in dev, build and serve `dist/` locally, plus a short script of what to try (Region 1 path, infinite loop, keyboard play).

Priority: Must · Phase: 1 · Spec: §19 · Brief: §8

### F-DEP-09 — One-click GitHub Pages deploy
As a Maintainer using GitHub, I want an optional workflow that publishes the game to GitHub Pages, so that hosting is easy.
**Acceptance criteria**
- `deploy-pages.yml` (manual dispatch) builds with the right base path and publishes `dist/`.

Priority: Could · Phase: 6 · Spec: §19.1 · Brief: §8

### F-DEP-10 — Design and course documents
As a reviewer, I want the planning and teaching documents kept current, so that the project is understandable and maintainable.
**Acceptance criteria**
- Phase 0: `docs/features.md`, `docs/specs.md`, `docs/curriculum-map.md`, `docs/build-plan.md`, `docs/open-questions.md`.
- Phase 5: `docs/solutions.md` (generated instructor answer key) and `docs/quest-authoring.md`.

Priority: Must · Phase: 0, 5 · Spec: §13 · Brief: §9

---

## Traceability

Brief section → stories that implement it. "Your role" = the brief's opening instructions.

| Brief § | Topic | Stories |
|---|---|---|
| Your role / General rules | Plan first, PROGRESS.md, simple code, commit per milestone, phase gates | F-DEP-05, F-DEP-10, F-QA-01, F-QA-05 |
| 1 | Audience, devices, session length, course length, privacy, offline, accessibility | F-ONB-01, F-ONB-05, F-ONB-06, F-WLD-04–06, F-DLG-01, F-DLG-07, F-EDT-03, F-QST-03, F-SAV-01, F-SAV-02, F-SAV-04–09, F-A11-01–15, F-OFF-01–08, F-AUT-11, F-CUR-11, F-QA-12, F-QA-15, F-QA-16 |
| 2 | Stack: Vite + TS strict, Phaser 4 (owner's choice, Q5), Pyodide in worker, CodeMirror 6, YAML + schema, Vitest + Playwright, original/CC0 assets | F-EXE-01, F-API-08, F-EDT-01, F-EDT-02, F-AUT-01, F-AUT-02, F-AUT-06, F-AUT-07, F-API-05, F-ONB-03, F-QA-01–03, F-DEP-06, F-DEP-07, F-CUR-10 |
| 2.1 | Execution: timeout + restart, game API, action log + replay with speed and step, `input()`, Scroll of Output, kid-friendly errors + real-error toggle, sandbox | F-EXE-02–14, F-API-01–14, F-EDT-05, F-FBK-07, F-FBK-08, F-FBK-09, F-DEP-02 |
| 2.2 | Validation: output, state, variables, AST, hidden tests, structured targeted feedback | F-FBK-01–06, F-FBK-15, F-EXE-14 |
| 3.1 | Story, Byte, Bugs, character creator, nickname + filter | F-ONB-02–07, F-WLD-02, F-DLG-01, F-BOS-03, F-CUR-04, F-CUR-10 |
| 3.2 | XP, items, Spellbook, hints, badges, safe failure, Workshop, bosses | F-PRG-01–08, F-FBK-11–14, F-EDT-04, F-EDT-06, F-API-01, F-WSH-01–04, F-BOS-01–03, F-QST-01, F-QST-02, F-QST-13, F-WLD-08, F-WLD-09 |
| 3.3 | Quest types (PRIMM) incl. keyboard-accessible Parsons | F-QST-04–12, F-API-10, F-CUR-06 |
| 4 | 11 regions, one outcome per quest, fix per region, spaced retrieval, concept scenes, knowledge checks, side quests | F-CUR-01–11, F-QST-14, F-DLG-05, F-DLG-06, F-BOS-04–06, F-WLD-07, F-AUT-03, F-AUT-04, F-FBK-10, F-TCH-08 |
| 5 | Quest schema, glossary | F-AUT-01–07, F-API-05, F-DLG-02–04, F-FBK-03, F-FBK-05, F-CUR-05 |
| 6 | Teacher features — **removed by owner decision Q13** (self-paced course); instructors get a generated answer key; authoring guide, `validate-content` | F-INS-01–02, F-AUT-05, F-AUT-09, F-AUT-10, F-SAV-04, F-SAV-06, F-OFF-09, F-QA-17 |
| 7 | Content tests, unit tests, E2E, axe, performance, Pyodide loading screen, reading level | F-QA-02–17, F-ONB-08, F-SAV-03, F-EXE-15, F-AUT-05 |
| 8 | Phased delivery | Phase tags on every story; F-DEP-08 (Phase 1 demo), F-A11-15, F-OFF-08, F-QA-14, F-QA-16, F-QA-18, F-QA-19, F-DEP-03, F-DEP-09 (Phase 6) |
| 9 | Deliverables: static build, README, docs, ASSETS_LICENSES, PROGRESS, CI | F-DEP-01–10, F-QA-05, F-INS-01, F-AUT-10 |
