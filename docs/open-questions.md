# Codeweald — Open Questions and Assumptions

> **Status:** Resolved on 2026-10-19. The plan is approved. The project owner accepted every
> default **except Q3 and Q5**, and later removed all teacher features (**Q13**). The original
> questions are kept underneath for the record.

## Decisions

| Q | Decision |
|---|---|
| Q1 | Self-paced (see Q13): about 23 sessions of ~45 minutes (≈ 12 hours of core play); Compact (20) and Extended (25+) options in `course.yaml`. |
| Q2 | Moot — no grading export or LMS integration (Q13). |
| **Q3** | **Students must save their progress.** Assume managed Chromebooks may wipe local data at sign-out, so the device is never the only copy. Saving out is a first-class, Phase 1 feature: a save code, plus a progress file saved with the system "Save as" dialog (which can target Google Drive in the ChromeOS Files app). There is also "Continue from a save" on the title screen, an "unsaved progress" indicator, and save reminders. See specs §12.5. |
| Q4 | The ~250-character copy/paste save code plus the full progress file. |
| **Q5** | **Phaser 4** (4.2.x, pinned), still behind the `WorldView` adapter. |
| Q6 | Original pixel art generated from code; cozy-adventurous mood; sound effects only, off by default. Mockup feedback at the Phase 1 demo. |
| Q7 | GitHub Pages workflow from this repo, plus school-server instructions. |
| Q8 | MIT for code, CC BY-SA 4.0 for course content, original art CC0. CSTA standards are cited by code and paraphrased unless the project is confirmed non-commercial. |
| Q9 | CSTA K-12 CS Standards (2017), Level 2; verify the text verbatim before the teacher guide. |
| Q10 | Knowledge checks don't gate; hints always on; side quests after core quests; free-text nickname with filter + generator. (No teacher passphrase — Q13.) |
| Q11 | English only in v1; all UI strings in one file. |
| Q12 | Build in `adasuper/python-course`; leave `AI-Engineering-Course-Prep` untouched. |
| **Q13** | **No teacher features.** It is a self-paced course students do on their own. Removed: teacher mode, passphrase, class codes, dashboard, CSV export and the in-app teacher guide. Instructors still have the solutions: `npm run solutions` generates `docs/solutions.md` from the content, and reference solutions no longer ship inside the game. |

## A. Questions for you

### Q1. Course length and sessions per week *(you asked to be consulted)*

The brief has two numbers that don't quite fit together:

- 11 regions at 30–60 minutes each = **5.5–11 hours**.
- "About 20–25 units" sounds like **20–25 class sessions**.

**My assumption:** a "unit" is one **45-minute lesson** (warm-up ~8, play ~30, discussion ~7).
Each region takes about **2 lessons** and the capstone 3, for **~23 lessons** in total. Each
region has about 55–65 minutes of core play (6 quests + boss; the capstone ~90), plus side
quests for fast finishers. Compact (20) and Extended (25) pacing options are in the
curriculum map.
Length stays configurable in `content/course.yaml` (enable/disable regions and side quests;
lessons per region).

**Please confirm:**

- (a) Is a unit a lesson?
- (b) How many lessons per week do you plan? This only affects the pacing guide in the teacher
  guide.
- (c) Is a typical lesson 45 minutes, or something else (e.g. 50–60)?

### Q2. Grading / LMS export *(you asked to be consulted)*

**Default:** plain CSV, in three files (long per quest, wide per student, outcome mastery),
UTF-8 with BOM so Excel opens it cleanly.

**Question:** do you need a specific layout for **Google Classroom** or **Canvas** grade
import? Each wants a particular column set, and a "points" mapping (e.g. % of quests
completed per region). I can add a template per LMS in Phase 5.

### Q3. Student devices *(you asked to be consulted)*

**Assumptions:**

- School-managed Chromebooks, Chrome ≥ 120, 4 GB RAM, 1366×768 screens
- plus Windows lab PCs with Chrome/Edge
- students may share devices (so the game supports multiple local profiles)

**Questions:**

- (a) Do the managed Chromebooks wipe local data at sign-out ("ephemeral mode")? If so,
  progress lives only in the **save code / export file**, and I'll make the end-of-lesson
  save reminder much more prominent.
- (b) Are service workers, IndexedDB or `.wasm` downloads blocked by policy or web filter? A
  built-in **System check** page will test this, but knowing early helps.
- (c) Any iPads? (Not a target today.)

### Q4. Save code length

A save code that holds per-quest progress (status, hints, attempts, time) for ~90 quests is
about **250 characters**. That is fine to copy and paste (e.g. into an LMS text box), but too
long to type. A truly short code (≈ 12–20 characters) is impossible without a server.

**Recommendation:** keep the 250-character copy/paste code plus the full progress file. The
alternative is a "lite" code (completion only, ~40 characters, typeable) that drops hint,
attempt and time data, so teacher reports from lite codes would be thinner. **Which do you
prefer, or both?**

### Q5. Phaser 3 vs Phaser 4

The brief says Phaser 3. **Phaser 3.90.0 (May 2025) is the final 3.x release.** Phaser 4
(4.0 in April 2026, now 4.2.1) keeps the same API with a new renderer.

**Recommendation:** build on **Phaser 3.90** as specified, since it is battle-tested on
low-end GPUs and has a Canvas fallback. All Phaser code goes behind a `WorldView` adapter,
and Phase 6 includes a Phaser 4 evaluation. **OK, or would you rather start on Phaser 4?**

### Q6. Art direction and asset source *(you asked to be consulted after a mockup)*

- **Mood:** I'll propose **cozy-adventurous**: warm, saturated 16×16 pixel art and a friendly
  palette, with Bugs that are cute glitch creatures rather than scary. You'll see an overworld
  mockup in the Phase 1 demo; please react then.
- **Source:** my build environment **cannot reach kenney.nl or OpenGameArt**. My plan is
  **original pixel art**, drawn as code-defined pixel grids and rendered to PNG by
  `scripts/make-art.ts`. It is license-clean and easy to tweak. **Alternatives:**
  - (a) you download specific Kenney CC0 packs (e.g. *Tiny Town*, *Tiny Dungeon*, *Interface
    Sounds*) into the repo, and I'll use them
  - (b) a mix of both

  **Which do you prefer?**
- **Audio:** Should there be background music at all? **Default:** sound effects only, and
  off by default in classrooms. Music optional, from CC0 sources only if you supply them.

### Q7. Hosting target

**Default:** a GitHub Pages workflow from this repo, plus instructions for a school web
server. **Question:** where will students actually load it from? This decides the base path
(`/python-course/` on Pages) and whether I should test any specific server (IIS?).

### Q8. Licensing of this project

**Recommendation:**

- **MIT** for the code
- **CC BY-SA 4.0** for course content (quests, dialogue, guides), so other teachers can remix
  it
- original art as **CC0** or **CC BY**

**Is this a non-commercial project?** That matters because the CSTA standards text is
**CC BY-NC-SA 4.0**. Quoting it verbatim in the teacher guide is fine for non-commercial use;
otherwise I'll paraphrase and cite codes only.

### Q9. CSTA alignment details

**Default:** align to the **CSTA K-12 CS Standards (2017), Level 2 (grades 6–8)**. Mostly
2-AP-10 … 2-AP-19, plus 2-DA-07 where data representation fits. I could not reach
csteachers.org from this environment, so the standard texts in the curriculum map are
**paraphrased from memory**. I'll verify them verbatim before the teacher guide (Phase 5).

**Question:** does your state or district use its own adapted version (e.g. a state
standards crosswalk) that I should cite too?

### Q10. Defaults that affect classroom feel

Please confirm or change these:

- (a) Knowledge checks do **not** gate the next region (teacher can turn gating on).
- (b) Hints are **on** by default (class code can set nudge-only or off).
- (c) Side quests unlock after the region's core quests (teacher can unlock earlier).
- (d) The nickname is free text with a filter, plus a "Make one for me" generator. Would you
  prefer **generator-only** nicknames (safest, no free text)?
- (e) The default teacher passphrase is documented in the teacher guide, with a banner until
  it's changed.

### Q11. Language

**Default:** English only in v1, with every UI string in one file so Spanish (or others) can be
added later. **Is Spanish (or another language) needed for v1?**

### Q12. Repository

I'm building in **`adasuper/python-course`**, branch `claude/new-session-aahe56`.
`AI-Engineering-Course-Prep` looks unrelated (just a README), so I'm leaving it untouched.
**Correct?**

---

## B. Assumptions I'm making (tell me if any is wrong)

| # | Assumption |
|---|---|
| A1 | Students type real Python. There is no block-based mode. Parsons puzzles are the scaffold for weaker typists. |
| A2 | Hosting is over **HTTPS** (needed for service workers and SubtleCrypto). Localhost is fine for development. |
| A3 | **Python 3.14 via Pyodide 314.x**, pinned. Students see Python 3.14 error messages under the "real error" toggle. |
| A4 | Each student has their own profile (nickname). Several profiles can live on one device. There are no passwords on profiles, which is acceptable for low-stakes practice. |
| A5 | Progress data is **self-reported** (client-side), so it is fine for formative feedback but not for high-stakes grading. The dashboard says so. |
| A6 | Content authors either have Node.js (to run `npm run validate-content` locally) **or** edit YAML on github.com and let CI validate their pull request. The authoring guide documents both. |
| A7 | **95 quest entries** in total, per the curriculum map: 66 core quests (6 per region), 11 bosses with 39 phases, and 18 side quests. There are also 11 knowledge checks with 46 items. |
| A8 | Narrative and dialogue target grade ≤ 7 on Flesch–Kincaid. Glossary-defined technical terms are reported separately, because words like "variable" inflate the score. |
| A9 | No `input()` blocking via SharedArrayBuffer. Quests use an input queue, and interactive input uses replay-on-input (spec §6.5). No special server headers are needed. |
| A10 | Loop iteration budget of 100,000 in quests and 1,000,000 in the Workshop, plus a 3 s wall clock; calibrated in Phase 1 on a throttled CPU. |
| A11 | Region order and concepts follow the brief's table exactly. Functions are not used before Region 8, lists not before Region 7 (apart from the game API's own calls). |
| A12 | "Plan mode" for Phase 0 means: produce the planning documents and no application code. I wrote them as repository files (`docs/`), so they're reviewable and versioned. |
