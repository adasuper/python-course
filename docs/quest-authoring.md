# Writing quests for Codeweald

This guide is for anyone who adds or changes course content: quests, bosses, regions, items,
glossary words and badges. You don't need to know the game's code. You write YAML files in
`content/`, and `npm run validate-content` tells you, with a file and a line, what to fix.

The examples marked as complete quests below are real: a test (`tests/content/authoring.test.ts`)
drops each one into a copy of the course and runs the same checks as `validate-content`, so they
always work.

- [1. The short version](#1-the-short-version)
- [2. Where things live](#2-where-things-live)
- [3. A complete quest, line by line](#3-a-complete-quest-line-by-line)
- [4. The quest types](#4-the-quest-types)
- [5. Stages: the map, the cast or the scroll](#5-stages-the-map-the-cast-or-the-scroll)
- [6. Validators: how a quest decides "passed"](#6-validators-how-a-quest-decides-passed)
- [7. Hidden tests and `from_solution`](#7-hidden-tests-and-from_solution)
- [8. Common mistakes and feedback](#8-common-mistakes-and-feedback)
- [9. Wrong solutions: proving the feedback](#9-wrong-solutions-proving-the-feedback)
- [10. Hints](#10-hints)
- [11. Text, glossary links and reading level](#11-text-glossary-links-and-reading-level)
- [12. Input, randomness and seeds](#12-input-randomness-and-seeds)
- [13. Extras: bonus challenges, the duck, starters, sample solutions](#13-extras-bonus-challenges-the-duck-starters-sample-solutions)
- [14. Bosses](#14-bosses)
- [15. Regions, the course, items, glossary and badges](#15-regions-the-course-items-glossary-and-badges)
- [16. Checking your work](#16-checking-your-work)
- [17. Editing on github.com, with CI as the checker](#17-editing-on-githubcom-with-ci-as-the-checker)
- [18. Checklist](#18-checklist)

---

## 1. The short version

```bash
npm run new-quest -- --region 4 --type make --slug river-ferry   # a valid file full of TODOs
# 1. list the new id in content/regions/04-…/region.yaml (quests:, side_quests: or boss:)
# 2. replace every TODO
npm run validate-content     # runs your solution and your wrong solutions in real Python
npm run dev                  # then open /?dev#/dev/quest/r4-q7-river-ferry to play it
```

Add `--side` for a side quest. `npm run solutions` updates the instructor answer key
(`docs/solutions.md`); CI fails if you forget.

## 2. Where things live

```text
content/
  course.yaml                 the regions in order, the opening and finale story
  glossary.yaml               words students can click ([[variable]])
  items.yaml                  concept items (reference cards in the Notebook)
  badges.yaml                 badges and what earns them
  errors.yaml                 the friendly text for every Python error
  workshop.yaml               the Workshop's maps and API reference
  regions/
    01-hearthvale-village/
      region.yaml             the map, characters, concept scene, quest list, knowledge check
      quests/
        r1-q1-first-steps.yaml
        …
src/art/regions/rN.ts         the region's characters, Bug, tiles and item icons
schema/*.schema.json          generated from src/content/schema.ts (`npm run schema`)
```

Every content file starts with a `# yaml-language-server: $schema=…` line. In VS Code (with the
YAML extension) that gives you autocomplete and red squiggles for typos.

**Quest ids** look like `r4-q3-gatekeeper` (core quest), `r4-boss-riddle-gate` (boss) or
`r4-side1-lost-hat` (side quest). The file name is the id plus `.yaml`. Never rename an id
that has shipped: save codes store progress by quest.

## 3. A complete quest, line by line

This is a complete `make` quest. Everything that isn't marked optional is required.

````yaml quest
# yaml-language-server: $schema=../../../../schema/quest.schema.json
id: r1-side90-bakery-sign
region: hearthvale-village
title: The Bakery Sign
side_quest: true
type: make
learning_outcome: Use two print() calls to show a two-line sign exactly as written.
csta: [2-AP-11]
estimated_minutes: 5
vocabulary: [print]

story_intro: |
  Baker Bun needs a sign for the window. It has to say exactly this:
  ```text
  Fresh bread!
  Hot buns!
  ```
goal: Print the two lines of the sign, one print() for each line.
concept_card: |
  Each `print()` shows one line on the Scroll of Output, in order, top to bottom.

starter_code: |
  # One print() for each line of the sign.

solution: |
  # One print() for each line of the sign.
  print("Fresh bread!")
  print("Hot buns!")

validators:
  - id: sign
    type: output
    expect: |
      Fresh bread!
      Hot buns!
    fail_hint: Compare your Scroll with the sign, one line at a time.
  - id: two-prints
    type: ast
    min_count: { print: 2 }
    fail_hint: Use one `print()` for each line of the sign.

common_mistakes:
  - id: one-print
    detect: { kind: validator_failed, id: two-prints }
    feedback: The sign looks right, but Baker Bun wants one `print()` for each line.
  - id: wrong-words
    detect: { kind: validator_failed, id: sign }
    feedback: So close! Check each word, the capital letters and the `!` at the end.

wrong_solutions:
  - expect_mistake: wrong-words
    code: |
      print("fresh bread")
      print("Hot buns!")
  - expect_mistake: one-print
    code: |
      print("Fresh bread!\nHot buns!")

hints:
  - The sign has two lines. How many `print()` calls do you need?
  - Each line of the sign goes inside its own `print("…")`, in quotes.
  - |
    Fill in the second line:
    ```python
    print("Fresh bread!")
    print(____)
    ```
story_outro: Baker Bun hangs the sign. A queue forms at once. Smells like success!
````

| Field | What it is |
|---|---|
| `id`, `region`, `title` | The quest id, the region's id (from region.yaml), and a title of at most 60 characters. |
| `side_quest` | Optional. `true` for side quests: they appear on the Quest Board after the core quests and never block progress. |
| `npc` | Optional. The map character who offers the quest (that character's map object must have `quest: <this id>`). Without one, the quest is on the region's Quest Board. |
| `prerequisites` | Optional. Quests that must be done first. |
| `type` | `predict`, `investigate`, `fix`, `fill`, `parsons`, `modify`, `make` or `boss` (§4). |
| `learning_outcome` | What the student can do afterwards. Start with a measurable verb (Use, Predict, Explain, Fix…), never "Understand". |
| `csta` | CSTA 2017 Level 2 codes like `2-AP-11` (see docs/curriculum-map.md). |
| `estimated_minutes` | 5–15 for a quest; a boss phase takes 5–10. The pacing summary adds them up. |
| `vocabulary` | Optional. Glossary terms this quest uses; each must exist in glossary.yaml. |
| `retrieval` | Optional. Earlier regions this quest revisits, like `[r2, r4]`. From Region 3 on, every region needs at least one. |
| `story_intro`, `goal`, `story_outro` | The story before, the one-sentence goal, and the story after. Rich text (§11). |
| `concept_card` | The idea in two or three sentences, with a small example. Shown after passing and in the Spellbook. Required for every quest except bosses. |
| `stage` | Optional. What the run shows: a grid map, a cast of characters, or just the scroll (§5). |
| `starter_code` | What is in the editor at the start. It must not pass already. |
| `solution` | The reference solution. It never ships in the game; it must pass every check. |
| `validators` | The checks that decide "passed" (§6). |
| `common_mistakes` | Recognized mistakes, each with kind, specific feedback (§8). |
| `wrong_solutions` | Typical wrong attempts, each with the feedback it must get (§9). At least 2 for code-checked quests. |
| `hints` | Exactly 3, from a nudge to a near-complete example (§10). |
| `rewards` | Optional. `xp` (a default comes from the type), `item` (an id from items.yaml) and `badge`. |

## 4. The quest types

Every region uses the PRIMM order: predict → investigate → modify → make, with fix and fill in
between. Every region needs at least one `fix` quest.

| Type | The student… | Checked by |
|---|---|---|
| `predict` | reads code, locks in a prediction, then runs it | `prompts` (the real output proves them) |
| `investigate` | runs code, changes it, answers questions | `questions` |
| `fix` | fixes buggy code | validators; the story says how many bugs ("This spell has **2 bugs**") |
| `fill` | fills `____` gaps | validators; `locked: true` makes only the gap lines editable |
| `parsons` | puts scrambled lines in order | validators on the assembled program, or `check: order` |
| `modify` | changes a working program to do something new | validators |
| `make` | writes a program from scratch | validators |
| `boss` | 2–4 phases, each like a quest | each phase's validators (§14) |

### Predict

The student reads `starter_code` (read only), answers each prompt, locks in, then runs it.
`validate-content` runs the code and checks every answer against the real output. A `twin` is a
second, similar program offered after a wrong prediction.

````yaml quest
# yaml-language-server: $schema=../../../../schema/quest.schema.json
id: r1-side91-order-of-steps
region: hearthvale-village
title: Order of Steps
side_quest: true
type: predict
learning_outcome: Predict the output of a program by reading its print() lines from top to bottom.
csta: [2-AP-13]
estimated_minutes: 5
story_intro: Old Tamsin wrote down her morning. What does her program print?
goal: Predict the output, then run the code to check.
concept_card: Python runs lines in order, from the top line down.
starter_code: |
  print("Wake up")
  print("Feed the chickens")
  print("Eat breakfast")
prompts:
  - kind: mcq
    question: What does the program print first?
    options: [Wake up, Feed the chickens, Eat breakfast]
    answer: 0
    explain: The first line runs first. Top to bottom, every time.
    verify: { kind: none }
  - kind: text
    question: Type the whole output.
    answer: |
      Wake up
      Feed the chickens
      Eat breakfast
    explain: Each print() shows one line, in the order the lines are written.
    twin:
      kind: text
      code: |
        print("Boots on")
        print("Out the door")
      question: Now this one. What does it print?
      answer: |
        Boots on
        Out the door
      explain: Same rule. The top line runs first.
hints:
  - Read the program from the top line down.
  - Each print() shows one line. Three print() lines make three lines of output.
  - The first line of output is ____.
story_outro: Tamsin nods. "In my day, we predicted by candlelight."
````

An mcq prompt's `verify` says how to prove it: `{ kind: output }` (the default: the marked
option is the whole output), `{ kind: hero_at, at: [3, 1] }` (where the hero ends up), or
`{ kind: none }` (a question about part of the output; check it yourself).

### Investigate

The student runs `starter_code`, then answers `questions` (`mcq`, `number` or `text` with
`accept: [...]`), each with a `hint` for a wrong answer. Prove answers with `verify`:
`{ kind: output_lines }` (a number question: how many lines are printed) or
`{ kind: try, code, outcome: ok | error, output? }` (the change the question asks the student
to make, and what really happens).

```yaml
questions:
  - kind: number
    question: How many lines does the program print?
    answer: 3
    hint: Count the lines on the Scroll.
    verify: { kind: output_lines }
  - kind: mcq
    question: Delete the closing quote on line 2 and run it. What happens?
    options: [An error, It prints the same thing, It prints nothing]
    answer: 0
    hint: Quotes come in pairs.
    verify:
      kind: try
      code: |
        print("Wake up")
        print("Feed the chickens)
      outcome: error
```

### Fix

Start from buggy code; the story says how many bugs there are. `validate-content` checks that
the starter does not pass.

````yaml quest
# yaml-language-server: $schema=../../../../schema/quest.schema.json
id: r1-side92-crooked-greeting
region: hearthvale-village
title: The Crooked Greeting
side_quest: true
type: fix
learning_outcome: Fix a missing quote and a missing bracket so a print() line runs.
csta: [2-AP-17]
estimated_minutes: 5
story_intro: Pip's greeting spell is broken. This spell has **2 bugs**.
goal: Fix both bugs so the program prints `Hello, Pip!`
concept_card: Text needs a quote at each end, and `print` needs its round brackets.
starter_code: |
  print("Hello, Pip!
solution: |
  print("Hello, Pip!")
validators:
  - { id: greeting, type: output, expect: "Hello, Pip!" }
common_mistakes:
  - id: open-string
    detect: { kind: error, key: syntax.unclosed_string }
    feedback: The text on line 1 has no closing quote. Add `"` after the `!`.
wrong_solutions:
  - expect_mistake: open-string
    code: |
      print("Hello, Pip!)
  - expect_feedback_contains: syntax.unclosed_bracket
    code: |
      print("Hello, Pip!"
hints:
  - Look at the end of line 1. What is missing?
  - Text starts and ends with a quote, and print needs `(` and `)`.
  - 'The line should end with `!____`.'
story_outro: Pip beams. "Hello to you too!"
````

### Fill

Put `____` where the student types. With `locked: true`, only lines with a gap can be edited
(the "Next gap" button jumps between them). Every gap line of the starter must match the
solution's line apart from the gap.

````yaml quest
# yaml-language-server: $schema=../../../../schema/quest.schema.json
id: r1-side93-fill-the-crier
region: hearthvale-village
title: Fill the Crier's Lines
side_quest: true
type: fill
locked: true
learning_outcome: Complete print() lines so a program shows two announcements.
csta: [2-AP-11]
estimated_minutes: 5
story_intro: The crier lost two words. Can you put them back?
goal: Fill both gaps so the crier shouts `Hear ye!` and then `Market today!`
concept_card: The words to show go inside the quotes in `print("…")`.
starter_code: |
  print("____ ye!")
  print("Market ____!")
solution: |
  print("Hear ye!")
  print("Market today!")
validators:
  - id: shout
    type: output
    expect: |
      Hear ye!
      Market today!
    fail_hint: The crier shouts `Hear ye!` and then `Market today!`
common_mistakes:
  - id: gap-left
    detect: { kind: code_regex, pattern: "____" }
    feedback: There's still a gap. Use "Next gap" to jump to it.
wrong_solutions:
  - expect_mistake: gap-left
    code: |
      print("Hear ye!")
      print("Market ____!")
  - expect_feedback_contains: The crier shouts
    code: |
      print("Hear me!")
      print("Market today!")
hints:
  - Read the goal. Which words are missing?
  - The first gap is `Hear`, the second is `today`.
  - 'Line 2 should be `print("Market ____!")` with `today` in the gap.'
story_outro: HEAR YE! The whole square hears.
````

### Parsons

```yaml
parsons:
  lines: # the solution, in order; indent with 4 spaces where needed
    - "for step in range(3):"
    - '    hero.move("right")'
  distractors: ['    hero.move("left")'] # wrong lines that look right (optional)
  fixed_top: ["from codeweald import hero"] # lines already placed (optional)
  indent: true # the student also sets indentation
  check: run # run the assembled program (default), or `order` for a plan of comments
  alternatives: [] # other right orders for check: order, as line numbers
```

A `check: run` Parsons quest has validators like any code quest. Its `wrong_solutions` use
`order: [1, 0]` (indexes into `lines`, then `distractors`) instead of `code`.

### Modify and make

Modify starts from a working program the student changes; make starts nearly empty. Both use
validators, and often hidden tests (§7), so a hard-coded answer doesn't pass.

## 5. Stages: the map, the cast or the scroll

```yaml
stage: { kind: none }                        # just the Scroll of Output (the default)
stage: { kind: none, view: tapestry }        # printed patterns woven on a loom (Region 6)
stage:
  kind: npc                                  # characters on a stage
  cast:
    - { sprite: npc_baker, name: Baker Bun } # the first one "hands over" input() answers
stage:
  kind: grid                                 # a map the hero walks on
  facing: right
  grid: |
    #######
    #H..g.E
    #######
```

**Grid legend** (one character is one tile):

| Char | Means | Char | Means |
|---|---|---|---|
| `#` | wall (solid) | `H` | the hero's start |
| `.` or space | floor | `E` | exit |
| `~` | water (solid) | `D` | door |
| `C` | chest | `N` | a character |
| `g` `k` `$` `*` | a gem, key, coin, star to pick up | | |

Add your own symbols with `legend:`, for example
`legend: { b: { tile: floor, item: boots, name: old boots } }`. Chests can need a code:
`chests: { C: { code: "1234", loot: [gem] } }`. Characters on a grid: `npcs: { N: { name: Ember, sprite: npc_dragon } }`.

Students control the hero with `from codeweald import hero, world`: `hero.move("right", 2)`,
`hero.face("up")`, `hero.say("Hi")`, `hero.pick_up()`, `hero.open_chest("1234")`,
`hero.position()`, `hero.facing`, `hero.inventory()`, `world.look()`, `world.items_here()`.
A bad map is caught by `validate-content` (`grid symbol "Z"…`).

## 6. Validators: how a quest decides "passed"

A run passes when it finishes without an error and every validator passes. Give each validator
an `id` and a `fail_hint` (shown when it fails and no mistake matched).

| Type | Fields | Checks |
|---|---|---|
| `output` | `expect`, `match: normalized` (default) · `exact` · `contains` · `regex` (`expect_regex`) · `fuzzy` (`threshold`), `normalize: [trim, case, spaces, punctuation]` | What was printed. `normalized` ignores trailing spaces and blank lines at the end. |
| `state` | `hero_at: [x, y]`, `hero_on`, `facing`, `has_items`, `items_count`, `chests_opened`, `max_bonks`, `said_contains`, `said_exact`, `visited` | The world after the run. |
| `variable` | `name`, `equals`, `value_type` (int, float, str, bool, list, dict, tuple, NoneType), `matches` | A variable's final value. |
| `ast` | `require: [For, If, Loop, FunctionDef…]`, `forbid`, `require_calls: [print, random.*]`, `min_count: { print: 3 }`, `require_else`, `function: { name, params, returns }`, `no_literal`, `uses_names`, `max_lines` | The code's structure. `Loop` is any `for` or `while`; `random.*` is any call into a module. |
| `style` | `min_comments`, `comment_above`, `max_line_length` | Comments and layout. |
| `hidden_tests` | §7 | The program with other values. |
| `custom` | `python` | Your own check (below). Use it rarely. |
| `branch_coverage` | `min: all` or a number | Session: every `if`/`elif`/`else` body has run in one of the student's runs ("light every lamp"). |
| `runs_ok` | `min_runs: 3`, `distinct_inputs` | Session: the same program finished without a crash in that many runs. `distinct_inputs` needs typed input. |

The two **session** validators look across all the student's runs in the quest, not only the
last one. The quest shows lamps and a run count while the student works.

A `custom` validator is Python that defines `check(ctx)` and returns `True`/`False` or
`Pass()`/`Fail("hint")`. `ctx` has `source`, `output`, `lines`, `tree` (the `ast`), `vars`,
`world`, `error`, and `run(source=…, vars=…, inputs=…, seed=…, stage=…)` to run a variant.

```yaml
- id: shouts
  type: custom
  python: |
    def check(ctx):
        if all(line.isupper() for line in ctx.lines):
            return Pass()
        return Fail("The crier SHOUTS. Use capital letters on every line.")
```

## 7. Hidden tests and `from_solution`

Hidden tests run the student's program again with other values, so `print(12)` can't pass a
quest that asks for `print(gold * 2)`. You don't write the expected answers: the build runs
your `solution` with each case and records what it did (`expect: from_solution`, the default).

| `mode` | Each case has | Runs the program… |
|---|---|---|
| `vars` | `vars: { gold: 3 }` | with the first top-level `gold = …` replaced |
| `inputs` | `inputs: ["4", "yes"]` | with that input queue |
| `call` | `args: [2, 3]` (and `function:` on the validator) | then calls the student's function with those arguments |
| `seed` | `seed: 7` | with that random seed |
| `stages` | `stage: { kind: grid, … }` | on another map |

`compare` says what must match: `output` (default), `returns`, `said`, `state`, `vars:<name>`.

````yaml quest
# yaml-language-server: $schema=../../../../schema/quest.schema.json
id: r1-side94-double-the-gold
region: hearthvale-village
title: Double the Gold
side_quest: true
type: make
learning_outcome: Use a variable in a calculation so the program works for any amount of gold.
csta: [2-AP-11]
estimated_minutes: 5
story_intro: The miller doubles every coin you bring. Today you have 6 coins, but tomorrow? Who knows!
goal: Print double the value of `gold`. Use the variable, so it works for any amount.
concept_card: A calculation with a variable, like `gold * 2`, works for any value of `gold`.
starter_code: |
  gold = 6
solution: |
  gold = 6
  print(gold * 2)
validators:
  - { id: today, type: output, expect: "12" }
  - id: any-day
    type: hidden_tests
    mode: vars
    cases:
      - vars: { gold: 1 }
      - vars: { gold: 25 }
    fail_hint: It works for 6 coins. Does it work for 25? Use `gold`, not the number.
common_mistakes:
  - id: typed-number
    detect: { kind: detector, name: hardcoded_output, text: "12" }
    feedback: You typed the answer in! Use `gold * 2`, so it works on any day.
wrong_solutions:
  - expect_mistake: typed-number
    code: |
      gold = 6
      print(12)
  - expect_feedback_contains: It works for 6 coins
    code: |
      gold = 6
      print(gold + 6)
hints:
  - Which variable holds the coins?
  - The `*` sign multiplies. `gold * 2` is double the gold.
  - 'Print it: `print(gold ____ 2)`'
story_outro: Twelve coins! The miller sneezes flour on all of them.
````

A mistake can point at one case that failed: `detect: { kind: hidden_case_fails, validator: any-day, case: 1 }`.

## 8. Common mistakes and feedback

When a run doesn't pass, the game picks the feedback in this order:

1. the first **common mistake** whose `detect` matches;
2. the Python **error**, translated (content/errors.yaml), when the program crashed;
3. the first failing validator's **`fail_hint`**;
4. a general nudge.

So list the most specific mistakes first. Ways to detect a mistake:

| `kind` | Fields | Matches when… |
|---|---|---|
| `error` | `key` (like `syntax.missing_colon`), `type` (like `NameError`), `message_regex` | the program crashed with that error |
| `code_regex` | `pattern`, `ignore_comments` | the code matches |
| `output_regex` | `pattern`, `expect: present` (default) or `absent` | the output matches, or doesn't |
| `validator_failed` | `id` | that validator failed |
| `hidden_case_fails` | `validator`, `case` | that hidden case failed (0-based) |
| `state` | `min_bonks`, `hero_at` | the hero bumped into walls, or ended there |
| `detector` | `name` and its options (below) | a named, ready-made detector fires |
| `custom` | `python` defining `detect(ctx)` | your function returns True |

**Named detectors:** `missing_call_parens` (`names`), `printed_not_stored` (`var`),
`stored_not_printed` (`var`), `number_as_string` (`var`), `missing_fstring_prefix`,
`assign_in_condition`, `loop_var_not_updated`, `function_not_called` (`function`),
`hardcoded_output` (`text`), `range_off_by_one` (`first`, `last`),
`infinite_while_true_without_break`, `function_prints_not_returns` (`function`),
`return_inside_loop_too_early` (`function`), `unused_variable` (`var`), `shadowed_builtin`
(`names`).

**Writing feedback.** Say what happened, kindly, and what to look at. Name the line or the
idea, not the student ("This loop never stops", not "You made an infinite loop"). Don't give
the whole answer: that's what hint 3 is for. Keep it short; it is read aloud on request.

## 9. Wrong solutions: proving the feedback

Every code-checked quest (and every boss phase) lists at least 2 `wrong_solutions`: typical
wrong attempts with the feedback each must get. `validate-content` runs each one and fails if
it passes, or if it gets other feedback.

```yaml
wrong_solutions:
  - expect_mistake: one-print # the id of a common mistake
    code: |
      print("Fresh bread!\nHot buns!")
  - expect_feedback_contains: Compare your Scroll # words in the feedback, or an error key
    code: |
      print("fresh bread")
    note: lower case # optional, for other authors
```

`validate-content` also checks that the starter code doesn't pass, that the solution passes,
and that every hint, bonus check and hidden test works.

## 10. Hints

Exactly three, always free (no penalty):

1. a **nudge**: where to look ("Which line runs first?");
2. the **idea** explained, with the vocabulary;
3. a **near-complete example**, often a code block with one `____` gap. The student can copy
   it into the editor (except in a locked fill quest).

## 11. Text, glossary links and reading level

Story text, goals, hints, feedback and concept cards are **rich text**, a safe Markdown subset:
`**bold**`, `*italic*`, `` `code` ``, code blocks (```` ```python ````, ```` ```text ````), lists,
and `{placeholders}` in error templates. HTML is never rendered.

`[[variable]]` links a glossary word (it becomes a button with the definition);
`[[instructions|instruction]]` shows "instructions" and opens "instruction". Every link must
exist in glossary.yaml.

**Reading level.** Students are 11–14. Write short sentences with everyday words. `npm run
reading-level` lists every text above grade 7 (it fails above grade 9). Code, names and
glossary words don't count against you. If a hard word is the point (like "concatenate"), link
it to the glossary.

## 12. Input, randomness and seeds

- `inputs: ["4", "yes"]` is the queue of answers `input()` gets, in order (Mode A). On an `npc`
  stage, the first cast member "hands over" each answer in the replay.
- `interactive_input: true` lets the student type the answers when the program asks (Mode B).
  With `inputs` too, they can choose; checks and hidden tests always use the queue.
- Every run gets a random seed. `seed: 7` fixes it, so `random` gives the same result every run.
  A quest whose code imports `random` needs `seed:`, or `hidden_tests` with `mode: seed`, or a
  `runs_ok` check (then `validate-content` tries seeds 1–5). An investigate quest may show
  chance at work without a seed, as long as no answer counts output lines.

## 13. Extras: bonus challenges, the duck, starters, sample solutions

**Bonus challenges** are optional and checked on a passing run, for extra XP:

```yaml
bonus:
  - id: three-lines
    description: Add a third line to the sign.
    check: { type: ast, min_count: { print: 3 } }
    xp: 10
```

**The rubber duck** (Region 10): `duck: { intro: …, closing: Did you spot anything odd? }` on a
fix, fill, modify or make quest adds a "Talk to the Duck" panel. It asks "What should this line
do?" for each line of the student's code. Answers are not graded and never leave the computer.

**Starters**: `starters:` offers 2–4 programs to start from (`id`, `title`, `description`,
`code`); leave `starter_code` out. The capstone uses it for its three game ideas.

**Sample solutions**: `sample_solutions: [{ name, code }]` are more programs that must pass,
for open quests with many right answers. `validate-content` runs each one (with several seeds
when there is no `seed:`), and the answer key lists them.

## 14. Bosses

A boss quest has 2–4 `phases`, each written like a quest body (type, outcome, story, starter,
solution, validators, mistakes, wrong solutions, hints, 5–10 minutes). `carry_code: true` starts
a phase from the student's code of the phase before.

```yaml
type: boss
boss: { name: The Village Crier Bug, bug: Clangle, sprite: bug_clangle }
learning_outcome: Use print(), strings and comments to fix and finish an announcement.
csta: [2-AP-17]
estimated_minutes: 25
story_intro: Clangle crawled into the bell!
goal: Fix the announcement in three phases.
phases:
  - id: unscramble
    title: Unscramble the order
    type: fix
    # … like a quest body …
  - id: finish
    title: Add the last line
    type: make
    carry_code: true
    # …
story_outro: Clangle turns into a firefly.
rewards: { item: quill-of-printing }
```

The boss of the last region in course.yaml ends the course: its feedback offers "Restore the
Great Script", which plays the `finale` story.

## 15. Regions, the course, items, glossary and badges

**region.yaml** holds:

- `id`, `number`, `name`, `concepts`, `intro` (dialogue lines `{ speaker, text }`);
- `overworld`: `grid` (about 30×20; `.` grass, `=` path, `T` tree, `~` water, `W`/`R`/`d`/`w`
  houses, `#` stone wall, `M` market stall…, plus your own `legend:`), and `objects`: one
  `spawn`, an `npc` for every character (`quest:` binds it), a `board` (the Quest Board, on
  every map), `sign`s with `text`, `poi`s (secret corners for the Explorer badge, listed in
  `pois:`), and an `exit`;
- `npcs`: `{ id: { name, sprite, greeting } }`, drawn in `src/art/regions/rN.ts`;
- `concept_scene`: `title`, `analogy`, `lines`, and a `worked_example` (`code`, `stage`,
  `explain` notes per line);
- `quests`, `boss`, `side_quests` (ids), `knowledge_check` (3–5 `mcq` or `predict` items; predict
  answers are proven), and `fragment` (the Script Fragment the boss gives back).

**course.yaml** lists the regions in order (`enabled: false` leaves one out; `lessons` sets
the pacing), the `opening` and `finale` stories, and `side_quests: true/false`.
`npm run content` prints the pacing summary.

**items.yaml**: `{ id, name, icon, region, description, example }`. **glossary.yaml**: `{ term,
definition (≤ 2 sentences), example, related }`. **badges.yaml**: `{ id, name, emoji,
description, trigger }`, where `trigger.kind` is `quest_type_completed`,
`completed_without_hints`, `distinct_attempts`, `passed_after_failures`, `counter`,
`boss_defeated`, `pois_visited`, `side_quests`, `checks_completed` or `quest_completed`. Add new
badges at the end of the file (save codes store them in order). Every region needs a
"Region Restorer" badge (`boss_defeated`), and an "Explorer" badge (`pois_visited`) when it has
secret corners.

## 16. Checking your work

| Command | What it does |
|---|---|
| `npm run validate-content` | The schema, every cross-reference (ids, npcs, glossary links, items, badges, maps), the course rules (a fix quest per region, retrieval from Region 3, 3–5 check items…), then runs every solution, wrong solution, starter, predict answer, investigate answer, hidden test and worked example in real Python. |
| `npm run reading-level` | Every student-facing text with its grade; flags anything above grade 7. |
| `npm run solutions` | Rewrites the answer key `docs/solutions.md`. |
| `npm run new-quest` | Starts a quest file (§1). |
| `npm run schema` | Rewrites `schema/*.schema.json` after a change to `src/content/schema.ts`. |
| `npm test` | Unit, Python and content tests (the content tests run `validate-content`'s checks too). |
| `npm run dev` | Play it: `/?dev#/dev/quest/<id>`, `/?dev#/dev/check/<region>`, `/?dev#/dev/concept/<region>`, `/?dev#/dev/region/<region>`. |

Problems are reported with a file and a line, like
`content/regions/04-…/quests/r4-q3-….yaml:27  r4-q3-…: wrong solution 2 passes, but it should fail`.

## 17. Editing on github.com, with CI as the checker

You can do all of this in the browser, without installing anything:

1. On github.com, open the repository and switch to the `dev` branch.
2. Open a quest file and press the pencil (✏️) to edit, or **Add file → Create new file** in a
   region's `quests/` folder (name it after the id, like `r4-side3-lost-hat.yaml`; copy an
   existing quest as a start). Don't forget to list the id in the region's `region.yaml`.
3. **Commit changes** to a new branch and open a pull request into `dev`.
4. The **CI** checks run on the pull request: lint, `validate-content`, the tests, the answer
   key, the build and the browser tests. A red ✖ means something to fix: open **Details**, find
   the step that failed and read its message. `validate-content` names the file and line.
5. If only the answer key is out of date, run `npm run solutions` locally, or ask a maintainer.
6. When everything is green, a maintainer reviews and merges. Merging `dev` into `main`
   deploys the live site.

## 18. Checklist

- [ ] The id is `rN-qN-slug`, `rN-sideN-slug` or `rN-boss-slug`, matches the file name, and is
      listed in region.yaml.
- [ ] The learning outcome starts with a measurable verb; CSTA codes and minutes are set.
- [ ] The goal is one sentence; a fix quest says how many bugs.
- [ ] The starter doesn't pass; the solution passes; hidden tests stop hard-coded answers.
- [ ] Common mistakes have kind, specific feedback; at least 2 wrong solutions prove it.
- [ ] Three hints: nudge, idea, near-complete example.
- [ ] Glossary links exist; the reading level is grade 7 or below.
- [ ] `npm run validate-content` and `npm run solutions` are done; you played it once.
