# Codeweald — Curriculum Map

> **Status:** Phase 0 draft for review. Nothing here is built yet. Quest titles, outcomes, and timings are proposals.

This map lists every region, quest, boss, side quest, and knowledge check in the course. It also shows the learning outcome and the CSTA standards for each one.

---

## How to read this map

**Learning outcomes.** Each quest and each boss phase has **one** measurable learning outcome. Read every outcome as if it starts with *"Students will be able to …"*. For example, "Use if/else to choose between two actions" means *"Students will be able to use if/else to choose between two actions."*

**Pacing model (self-paced).** Codeweald is a self-paced course: students work through it on their own (owner decision Q13). Times below are estimates for a typical 11–14-year-old who is new to coding.

- A **session** is about 45 minutes of play.
- Regions 1–10 take about **2 sessions** each. Region 11 (the capstone) takes about **3 sessions**. That is about **23 sessions** in all (≈ 12 hours of core play).
- Each region has a concept scene (3–5 min), 6 core quests (5–12 min each), a boss (10–20 min, or 40 min in Region 11), and a knowledge check (~5 min).
- Side quests are optional extras for students who want more. They are not counted in the region totals.

**Course length options** (set in `content/course.yaml`):

| Option | Sessions | How |
|---|---|---|
| Compact | 20 | Turn off side quests. Turn off Region 10 q4–q6 and Region 11 q2 and q4. |
| **Standard** | **23** | As mapped below. |
| Extended | 25+ | Everything, including all side quests. |

**"Watch for" lists.** Each region ends with the misconceptions students most often hit. They help instructors get ready for students' questions, together with the generated answer key (`docs/solutions.md`).

**ID convention.**

| Kind | Pattern | Example |
|---|---|---|
| Core quest | `r{N}-q{M}-{slug}` | `r4-q3-gatekeeper` |
| Boss | `r{N}-boss-{slug}` | `r4-boss-riddle-gate` |
| Side quest | `r{N}-side{K}-{slug}` | `r4-side1-leap-year-lanterns` |
| Knowledge check | `r{N}-check` | `r4-check` |

**Quest types** (PRIMM order: Predict → Run → Investigate → Modify → Make).

| Type | What the student does |
|---|---|
| `predict` | Reads code, chooses or types what it will do, then runs it to check. |
| `investigate` | Runs given code, changes it a little, and answers questions about it. |
| `fix` | Finds and fixes one or more bugs in broken code. |
| `fill` | Completes the missing lines in a program. |
| `parsons` | Puts shuffled lines in order with the right indentation. It works with the keyboard and may include a "distractor" line that does not belong. |
| `modify` | Changes working code to meet a new requirement. |
| `make` | Writes code from scratch (or from a near-empty starter). |
| `boss` | A multi-phase mini-project. Each phase is checked and saved on its own. |

**Symbols used in the Notes column.**

| Symbol | Meaning |
|---|---|
| 🔁 R*n* | **Spaced retrieval.** The quest revisits a concept from Region *n*. |
| ⭐ | Optional **side quest** for fast finishers. |
| 🗺️ | The student's code **drives the hero** on a small quest map (grid). |
| 📥 | Uses `input()`. Values come from the NPC's **input queue**, and students can also try their own values in a popup. |
| 🧪 | **Hidden test cases**: the checker re-runs the code with other values, inputs, or quest maps. |
| AST | A **code-structure check** (for example, "uses a `for` loop" or "doesn't hard-code the answer"). |

**Bosses.** Every boss is a **Bug Boss**: a cartoon glitch creature. When the student "defeats" it (by fixing or building the code), it turns into a friendly glowing firefly. Each boss gives back one **Script Fragment** of the Great Script. The Region 11 finale restores the whole Great Script.

**Concept items.** Items go into the inventory. Each item's description is also a one-sentence summary of the concept, so the inventory works as a reference notebook.

---

## Course at a glance

| # | Region | Core concepts | Sessions | Core quests | Est. min (core + boss) | Main item(s) | Boss |
|---|---|---|---|---|---|---|---|
| 1 | Hearthvale Village | programs as ordered steps; `print()`; strings; comments; reading an error | 2 | 6 | 54 | Quill of Printing | The Village Crier Bug |
| 2 | Whispering Library | variables; assignment; naming rules; reassignment; `+` joining; f-strings | 2 | 6 | 60 | Jar of Labels | The Mislabeled Archive |
| 3 | Merchant's Crossing | `int`, `float`; `+ - * / // %`; order of operations; `input()`; `int()`, `str()` | 2 | 6 | 64 | Abacus of Reckoning; Scales of Conversion | The Haggling Bug |
| 4 | Forked Road Forest | booleans; comparisons; `if`/`elif`/`else`; `and`/`or`/`not`; indentation | 2 | 6 | 63 | Compass of Conditions | The Riddle Gate |
| 5 | The Endless Mines | `while`; counters; loop conditions; infinite loops; `break` | 2 | 6 | 64 | Miner's Lantern | The Cave-In |
| 6 | Clocktower Peaks | `for`; `range(start, stop, step)`; accumulators; nested loops | 2 | 6 | 62 | Boots of Looping | The Broken Clock |
| 7 | Dragon's Hoard Caverns | lists; indexes (incl. negative); `len()`; `append`/`remove`; looping over lists; max/min/total; `in` | 2 | 6 | 64 | Satchel of Lists | Sort the Hoard |
| 8 | Guild of Spellcrafters | `def`; parameters; `return` vs `print`; calling; scope; reuse | 2 | 6 | 62 | Tome of Functions | Spell Duel |
| 9 | Archive of Maps | dictionaries; keys/values; lookup, add, update; `.items()`; lists + dicts | 2 | 6 | 65 | Key Ring of Dictionaries | The Lost Cartographer |
| 10 | The Bugmire Swamp | tracebacks; syntax vs runtime vs logic errors; print tracing; rubber-duck debugging; edge cases | 2 | 6 | 65 | Rubber Duck of Debugging | The Swamp King |
| 11 | The Shattered Citadel | capstone: everything + `random` | 3 | 6 | 89 | Dice of Chance; The Great Script | Rebuild the Great Script |
| | **Total** | | **23** | **66** | **712 (≈ 11.9 h)** | | **11 bosses** |

---

## CSTA K-12 CS Standards (2017), Level 2 (grades 6–8) — reference

> Paraphrased; verify verbatim text at csteachers.org before publishing. CSTA standards are CC BY-NC-SA 4.0.

| Code | Short description (paraphrased) |
|---|---|
| 2-AP-10 | Use flowcharts and/or pseudocode to plan complex problems as algorithms. |
| 2-AP-11 | Create clearly named variables that hold different data types, and do operations on their values. |
| 2-AP-12 | Design and develop programs step by step, combining control structures, including nested loops and compound conditionals. |
| 2-AP-13 | Break problems into smaller parts to make programs easier to design, build, and review. |
| 2-AP-14 | Create procedures with parameters to organize code and make it easier to reuse. |
| 2-AP-15 | Seek and use feedback from teammates and users to improve a solution. |
| 2-AP-16 | Use existing code, media, and libraries in original programs, and give credit. |
| 2-AP-17 | Test and refine programs in a systematic way, using a range of test cases. |
| 2-AP-18 | Share out tasks and keep to a project timeline when building something together. |
| 2-AP-19 | Document programs so they are easier to follow, test, and debug. |
| 2-DA-07 | Represent data using more than one encoding scheme. |

---

## Region 1 — Hearthvale Village

Hearthvale is a cozy village with crooked chimneys and very loud chickens. When the Great Script shattered, all the village's words got scrambled. Even the town crier shouts nonsense now. Byte the owl swoops down and names you a Scriptwright apprentice. "Congratulations," says Byte. "You are now in charge of fixing everything. No pressure."

**Concept scene.** *Analogy:* A program is like a recipe. The computer is a very literal cook. It does each step in order, top to bottom, exactly as written, even if you write "add 100 eggs."

```python
# A comment starts with #. Python skips it.
print("Hello, Hearthvale!")
print("I am Byte. I am an owl.")
print("Owls are always right.")
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Quill of Printing | `r1-q2-hello-hearthvale` | `print()` writes words on the Scroll of Output. Put the words inside quotes. |
| Feather of Comments | `r1-q4-notes-for-the-baker` | A line that starts with `#` is a note for humans, and Python skips it. |
| Spyglass of Errors | `r1-q5-criers-crooked-announcement` | An error message tells you what went wrong and which line to check first. |
| Script Fragment: Words | `r1-boss-village-crier-bug` | The first piece of the Great Script: words that speak. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r1-q1-first-steps` | Byte's First Steps | predict | Predict where the hero ends up when move instructions run in order, top to bottom. | 2-AP-10 | 6 | 🗺️ Four `hero.move` lines. Multiple choice: which landmark does the hero stop next to? Teaches "a program is steps in order." |
| `r1-q2-hello-hearthvale` | Hello, Hearthvale! | investigate | Explain what `print()` shows on the Scroll of Output by running a program and answering questions about it. | 2-AP-11 | 6 | Questions include: What happens if you swap two lines? What if you remove the quotes? |
| `r1-q3-path-to-the-well` | The Path to the Well | parsons | Arrange move and say instructions in order so the hero reaches the well and greets the miller. | 2-AP-10 | 7 | 🗺️ Five shuffled lines plus one distractor (`hero.move("up")`). |
| `r1-q4-notes-for-the-baker` | Notes for the Baker | modify | Use `#` comments to explain what each part of a program does. | 2-AP-19 | 7 | The baker's order prints one extra wrong line. The student comments it out and labels each part. |
| `r1-q5-criers-crooked-announcement` | The Crier's Crooked Announcement | fix | Use the line number in an error message to find and fix a missing quote and a missing closing parenthesis. | 2-AP-17 | 8 | Bugs: `print("Hear ye!)` and `print("Market at noon!"`. Introduces the "Show the real Python error" toggle. |
| `r1-q6-welcome-sign` | Paint the Welcome Sign | make | Write a program with several `print()` calls that prints a three-line welcome sign exactly as shown. | 2-AP-11 | 8 | Output check (whitespace normalized). Line 2 has an apostrophe ("Byte's Bakery"), so it needs double quotes. |

**Boss: The Village Crier Bug** (Bug: *Clangle*, a tiny bell-shaped Bug). Clangle crawled into the crier's bell and scrambled the big announcement. Fix it before the whole village goes to the wrong place!

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. Unjam the bell | Fix a missing quote and a `Print(` with a capital P (NameError) so the program runs. | Use error messages to find and fix errors that stop a program from running. | 2-AP-17 |
| 2. Words in order | Reorder the `print` lines so the output matches the crier's script. | Arrange print statements so the output matches a required order. | 2-AP-17 |
| 3. Ring it out | Add a comment above each part. Then walk the hero to the square and `hero.say("Hear ye!")`. | Document a program with comments that explain each part. | 2-AP-19 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r1-side1-banner-painter` | Banner Painter | make | Use `print()` with symbols to draw a picture banner, one row at a time. | 2-AP-13 | 8 | Text-art banner for the village notice board. Light check: at least 4 lines and 1 comment. |

**Knowledge check (`r1-check`)**

1. MCQ: What does `print()` do?
2. Predict: The output of three `print` lines (order matters).
3. MCQ: Which line will Python skip? (a comment)
4. MCQ: An error message says "line 3". Where do you look first?

**Watch for**

- Quotes matter. `print("hello")` shows text, but `print(hello)` looks for a variable called `hello` and gives a NameError.
- Capital letters matter. `Print` and `PRINT` are not `print`.
- Mixed quotes (`'…"`) mean the text never ends, or ends too soon.

---

## Region 2 — Whispering Library

The books in the Whispering Library talk in hushed voices. But the shattering knocked every label off the shelves. Now nobody can find anything, and the books are very grumpy about it. Head Librarian Madame Quill needs an apprentice who knows how to name things.

**Concept scene.** *Analogy:* A variable is a labeled jar. The label is the name, and what's inside is the value. You can pour out the old value and put in a new one, but the jar holds only one thing at a time.

```python
book = "The Owl Who Coded"
shelf = "Mysteries"
print(book)
print("Find " + book + " on the " + shelf + " shelf.")
print(f"{book} lives on the {shelf} shelf.")
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Jar of Labels | `r2-q2-the-shelf-swap` | A variable is a name for a value. `=` puts a value in the jar, and a new value replaces the old one. |
| Ink of Formatting | `r2-q5-the-magic-ink` | An f-string, like `f"Hi {name}"`, puts a variable's value inside text. |
| Script Fragment: Names | `r2-boss-mislabeled-archive` | The piece of the Great Script that remembers things by name. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r2-q1-labeled-jars` | The Labeled Jars | predict | Predict what a program prints when it stores text in a variable and then prints the variable. | 2-AP-11 | 6 | Includes `print(book)` next to `print("book")`. |
| `r2-q2-the-shelf-swap` | The Shelf Swap | investigate | Trace a variable's value line by line as it is reassigned. | 2-AP-11 | 7 | Questions like "What does `shelf` hold after line 3?" |
| `r2-q3-rules-for-names` | Rules for Names | fix | Identify and fix variable names that break Python's naming rules. | 2-AP-11, 2-AP-17 | 7 | Bugs: `book title`, `2nd_shelf`, `book-count`, and `Book` vs `book` (NameError). |
| `r2-q4-catalog-card` | Glue the Catalog Card | fill | Use `+` to join strings and variables into one sentence, with spaces in the right places. | 2-AP-11 | 7 | Common mistake: "Findthe Owl" (missing spaces), which gets a targeted hint. |
| `r2-q5-the-magic-ink` | The Magic Ink | modify | Use an f-string to place variable values inside a sentence. | 2-AP-11 | 8 | Rewrite a `+` version as an f-string. Mistake to catch: a missing `f`, which prints `{book}` as-is. |
| `r2-q6-library-card` | Make a Library Card | make | Write a program that stores three facts in clearly named variables and prints them as a library card. | 2-AP-11 | 10 | 🗺️ The hero walks to Madame Quill and `hero.say(...)` the card. AST: at least 3 assignments, and the values are not typed straight into the print. |

**Boss: The Mislabeled Archive** (Bug: *Swapsy the Label Moth*). Swapsy swapped every label in the archive. The title jar holds the author. The author jar holds the shelf. Put things right!

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. Unswap the jars | Fix the assignments so `title`, `author`, and `shelf` each hold the right value. | Identify and fix variables that hold the wrong values. | 2-AP-11, 2-AP-17 |
| 2. Found it! | Change `status` from `"missing"` to `"found"` and print it before and after. | Use reassignment to update a stored value. | 2-AP-11 |
| 3. The display card | Print the book's card with one f-string that matches the format exactly. | Use an f-string to display stored values in a required format. | 2-AP-11 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r2-side1-the-swap-trick` | The Swap Trick | fill | Use a third variable to swap the values of two variables. | 2-AP-11 | 7 | Two books are on the wrong shelves. `a = b` then `b = a` loses a book, which gets a targeted hint. |

**Knowledge check (`r2-check`)**

1. MCQ: Which is a valid variable name? (`gold_coins`, `2coins`, `gold coins`, `gold-coins`)
2. Predict: `pet = "owl"`, then `pet = "bat"`, then `print(pet)`.
3. Predict: The output of an f-string with two variables.
4. MCQ: What is the difference between `print(name)` and `print("name")`?

**Watch for**

- Reading `=` as "equals" instead of "store in". Try saying "gets": `x = 5` means "x gets 5".
- Thinking a variable keeps its old value after reassignment, or holds both values.
- Forgetting the `f` in an f-string, so the braces print as-is.

---

## Region 3 — Merchant's Crossing

Four roads meet at Merchant's Crossing. Traders sell everything from turnip pies to slightly used dragon scales. But since the shattering, prices have gone wild. Today one turnip costs 4,000 gold! A sneaky Bug is "helping" with the math.

**Concept scene.** *Analogy:* `"5"` in quotes is a price tag: just a picture of a number. `5` without quotes is real coins you can count. `int()` turns a tag into coins, and `str()` turns coins back into a tag. `//` and `%` are like sharing apples: `//` is how many each friend gets, and `%` is what's left over.

```python
apples = 17
friends = 5
print(apples // friends)   # 3 apples each
print(apples % friends)    # 2 left over
price = int("4")           # price tag -> coins
print(price * 3)           # 12
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Abacus of Reckoning | `r3-q2-sharing-apples` | Python does math with `+ - * /`, plus `//` for whole shares and `%` for leftovers. |
| Ear Trumpet of Asking | `r3-q4-asking-the-customer` | `input()` asks a question and always hands back text. |
| Scales of Conversion | `r3-q5-price-tag-trouble` | `int()` turns text like `"7"` into the number 7, and `str()` turns a number back into text. |
| Script Fragment: Numbers | `r3-boss-haggling-bug` | The piece of the Great Script that counts and measures. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r3-q1-coins-or-tags` | Coins or Price Tags? | predict | Predict the result of `+` and `*` when the values are ints, floats, or strings. | 2-AP-11, 2-DA-07 | 6 | For example `2 + 3`, `"2" + "3"`, `7 / 2`, `"ha" * 3`. |
| `r3-q2-sharing-apples` | Sharing the Apple Cart | investigate | Explain what `//` and `%` calculate by running examples and changing the numbers. | 2-AP-11 | 8 | Callout: `%` is *not* percent. |
| `r3-q3-the-merchants-formula` | The Merchant's Formula | modify | Use parentheses to control the order of operations in a price calculation. | 2-AP-11 | 7 | Change `price + fee * pies` to `(price + fee) * pies` so the wrapping fee is paid on each pie. 🧪 Hidden prices. |
| `r3-q4-asking-the-customer` | Asking the Customer | parsons | Arrange the input, convert, calculate, and print lines into a working program. | 2-AP-13 | 7 | 📥 The customer hands over `"4"`. Distractor: the same line without `int()`. |
| `r3-q5-price-tag-trouble` | Price Tag Trouble | fix | Fix a TypeError by converting between text and numbers with `int()` and `str()`. | 2-AP-11, 2-AP-17 | 8 | Bugs: `"Total: " + total` (TypeError) and `input() * 2` giving `"44"`. Kid-friendly TypeError message. |
| `r3-q6-receipt-writer` | The Receipt Writer | make | Write a program that reads a quantity with `input()`, works out the cost, and prints a receipt. | 2-AP-11, 2-AP-13 | 10 | 📥 🧪 🔁 R2 f-strings for the receipt line. |

**Boss: The Haggling Bug** (Bug: *Hagglebug*). Hagglebug sits on the merchant's scale and changes every price. Build a price calculator the merchants can trust.

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. Fix the price list | Fix two arithmetic mistakes (a wrong operator and missing parentheses). | Identify and fix errors in a calculation. | 2-AP-17 |
| 2. Ask and convert | 📥 Read the number of items and the coins paid with `input()` and `int()`. | Use `input()` and `int()` to read numbers from a customer. | 2-AP-11 |
| 3. Make change | Work out the change, then split it into gold (1 gold = 10 silver) and silver with `//` and `%`. | Use `//` and `%` to split an amount into gold and silver coins. | 2-AP-11 |
| 4. Every customer | Predict the change for 3 customers (one pays the exact amount), then run each to check. 🧪 Hidden customers must pass too. | Test a program with several inputs, including an edge case. | 2-AP-17 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r3-side1-penny-puzzle` | The Penny Puzzle | investigate | Explain why `0.1 + 0.2` shows `0.30000000000000004`, and use `round()` to show money neatly. | 2-DA-07 | 8 | Floats are stored as very close guesses. |
| ⭐ `r3-side2-caravan-clock` | The Caravan Clock | make | Use `//` and `%` to turn a number of minutes into hours and minutes. | 2-AP-11 | 8 | 📥 🧪 For example, 135 gives "2 hours 15 minutes". |

**Knowledge check (`r3-check`)**

1. Predict: `print(17 // 5)` and `print(17 % 5)`.
2. MCQ: What type of value does `input()` give back?
3. Predict: `print(2 + 3 * 4)`.
4. MCQ: Which line fixes `"Total: " + 5`?
5. Predict: `print("3" + "4")`.

**Watch for**

- Thinking `input()` gives a number. `"3" + "4"` gives `"34"`.
- Thinking `%` means "percent". It means "remainder".
- Expecting `/` to give a whole number. `6 / 2` gives `3.0`.

---

## Region 4 — Forked Road Forest

In Forked Road Forest, every path splits in two, and then splits again. The signposts used to give directions, but now they just shrug. To get through, you must teach them to make decisions. Then you must get past the Riddle Gate.

**Concept scene.** *Analogy:* An `if` statement is a signpost at a fork in the road. It asks a yes-or-no question. If the answer is True, you take one path. If it's False, you take the other. Only one path gets walked.

```python
gold = 12
if gold >= 10:
    print("The gatekeeper waves you through.")
else:
    print("Come back with more gold!")
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Tuning Fork of Truth | `r4-q2-true-or-false` | A comparison like `gold >= 10` rings out `True` or `False`. |
| Compass of Conditions | `r4-q3-gatekeeper` | An `if` runs its indented lines only when its condition is True, and `else` covers every other case. |
| Twin Keys of And & Or | `r4-q6-picky-bridge-keeper` | `and` needs both sides True, `or` needs at least one, and `not` flips True and False. |
| Script Fragment: Choices | `r4-boss-riddle-gate` | The piece of the Great Script that chooses a path. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r4-q1-talking-signpost` | The Talking Signpost | investigate | Explain which lines of an if/else run for different values. | 2-AP-12 | 7 | 📥 The traveler reports `"rain"` or `"sun"`. The student predicts, then runs with each value. |
| `r4-q2-true-or-false` | True or False, Traveler? | predict | Predict whether comparisons with `==`, `!=`, `<`, `>`, `<=`, `>=` are True or False. | 2-AP-11 | 6 | Includes `"10" == 10` (False). |
| `r4-q3-gatekeeper` | Gold for the Gatekeeper | make | Use if/else to choose between two actions based on a comparison. | 2-AP-12 | 8 | 🗺️ 🧪 Cases `gold = 10` and `gold = 3`. Common mistake: `=` instead of `==`. Same quest as the schema example in the brief. |
| `r4-q4-crooked-branches` | The Crooked Branches | fix | Identify and fix syntax and indentation errors in an if/else statement. | 2-AP-17 | 8 | Bugs: a missing colon, `=` in place of `==`, and a body that isn't indented. |
| `r4-q5-three-paths` | Three Paths at the Fork | parsons | Arrange if/elif/else lines with correct indentation so the hero takes the right path for each weather report. | 2-AP-12 | 8 | 🗺️ 📥 🧪 Indentation is part of the puzzle, and the order of the `elif` lines matters. |
| `r4-q6-picky-bridge-keeper` | The Picky Bridge Keeper | modify | Use `and`, `or`, and `not` to combine conditions in a working program. | 2-AP-12 | 8 | 📥 🔁 R3 `int(input())`: the keeper's age and gold questions return text. |

**Boss: The Riddle Gate** (Bug: *Riddlewig*). Riddlewig hides in the gate's lock. The gate asks riddles, but right now it says every answer is wrong.

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. The first riddle | 📥 Check a typed answer with if/else and `==`. | Use if/else with `==` to check an answer. | 2-AP-12 |
| 2. Two right answers | Accept `"owl"` or `"Owl"` with `or`. | Use `or` to accept more than one correct answer. | 2-AP-12 |
| 3. Three doors | 🗺️ Use if/elif/else to send the hero through the gold door, the silver door, or back to the start. | Use if/elif/else to choose one of several paths. | 2-AP-12 |
| 4. Every door tested | Run the gate with your own answers until a lamp lights for every door. | Test a program with inputs that reach every branch. | 2-AP-17 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r4-side1-leap-year-lanterns` | The Leap-Year Lantern Festival | make | Use `and`, `or`, and `%` to decide if a year is a leap year. | 2-AP-12 | 10 | 📥 🧪 🔁 R3 `%`. The years 1900 and 2000 are edge cases. |
| ⭐ `r4-side2-rock-paper-mushroom` | Rock, Paper, Mushroom | make | Use nested if statements to decide the winner of a two-player hand game. | 2-AP-12 | 10 | 📥 Both players' picks come from the queue (no `random` yet). |

**Knowledge check (`r4-check`)**

1. Predict: `print(5 > 3 and 2 > 4)`.
2. MCQ: What is the difference between `=` and `==`?
3. Predict: Which message prints when `temp = 15` in an if/elif/else chain?
4. MCQ: Why is this code wrong? (The body is not indented.)

**Watch for**

- Using `=` (store) when you mean `==` (compare).
- Thinking every true branch in an if/elif chain runs. Only the first true one runs.
- Comparing text from `input()` with a number. `"10" == 10` is False.

---

## Region 5 — The Endless Mines

Under the mountains lie the Endless Mines. Their tunnels go on, and on, and on. The miners need help with digging and counting gems. Most of all, they need help knowing when to stop. Byte refuses to go in. "Owls," Byte explains, "prefer the sky."

**Concept scene.** *Analogy:* A `while` loop is a miner who says, "While my lantern is lit, keep digging." Before each dig, the miner checks the lantern. If the lantern never runs out, the miner digs forever. That's an infinite loop.

```python
torches = 3
while torches > 0:
    print("Light a torch and dig!")
    torches = torches - 1
print("Out of torches. Time to rest.")
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Miner's Lantern | `r5-q2-lantern-down-the-tunnel` | A `while` loop repeats its indented lines as long as its condition stays True. |
| Tally Stones | `r5-q3-the-gem-tally` | A counter is a variable that goes up by 1 each time something happens: `count = count + 1`. |
| Escape Rope | `r5-q5-ride-the-cart-tracks` | `break` jumps out of a loop right away. |
| Script Fragment: Repeating | `r5-boss-cave-in` | The piece of the Great Script that keeps going until the job is done. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r5-q1-how-many-digs` | How Many Digs? | predict | Predict how many times a while loop runs and what it prints. | 2-AP-12 | 7 | Includes a loop that runs 0 times. |
| `r5-q2-lantern-down-the-tunnel` | Lantern Down the Tunnel | investigate | Explain how a while loop checks its condition before each repeat. | 2-AP-12 | 7 | 🗺️ `while world.look() == "floor": hero.move("right")`. The replay's step button shows each check. |
| `r5-q3-the-gem-tally` | The Gem Tally | fill | Use a counter variable in a while loop to count the gems the hero picks up. | 2-AP-11, 2-AP-12 | 8 | 🗺️ 🧪 Gems lie along a tunnel (`hero.pick_up()`). Hidden tunnels have other gem counts. |
| `r5-q4-the-endless-tunnel` | The Tunnel That Never Ends | fix | Fix an infinite loop by making sure its condition can become False. | 2-AP-17 | 8 | The bug: a missing `steps = steps + 1`. Shows the friendly "Your loop might be running forever!" timeout on purpose. |
| `r5-q5-ride-the-cart-tracks` | Ride the Cart Tracks | modify | Use `break` to stop a loop as soon as the hero reaches the exit. | 2-AP-12 | 8 | 🗺️ `while True:` plus `if world.look() == "exit": break`. |
| `r5-q6-the-depth-gauge` | The Depth Gauge | make | Write a while loop that keeps asking until the answer is right, counting the tries. | 2-AP-12 | 8 | 📥 🧪 🔁 R4 if/else and R3 `int(input())`. The queue holds wrong guesses, then the right one. |

**Boss: The Cave-In** (Bug: *Rumblebug*). Rumblebug shook the tunnel, and rocks fell everywhere. The way out is dark and twisty. Guide the hero out using only what `world.look()` can see.

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. Walk to the rocks | 🗺️ Move the hero with a while loop until `world.look()` is not `"floor"`. | Use a while loop with `world.look()` to move until something blocks the way. | 2-AP-12 |
| 2. Count the steps | Add a counter and print how many steps the hero took. | Use a counter to report how many times a loop ran. | 2-AP-11 |
| 3. Find the way out | 🗺️ 🧪 Inside the loop, choose a new direction when blocked, and `break` at the exit. It must work on 3 hidden cave maps. | Use if/elif and `break` inside a while loop to solve a path problem. | 2-AP-10, 2-AP-12 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r5-side1-crystal-bloom` | The Crystal Bloom | make | Use a while loop to find how many days it takes doubling crystals to fill a cave. | 2-AP-12 | 8 | 📥 🧪 The cave size comes from the queue. |

**Knowledge check (`r5-check`)**

1. Predict: The output of a counter loop that counts from 1 to 3.
2. MCQ: This loop never stops. Which line is missing?
3. MCQ: What does `break` do?
4. Predict: How many times does `while 5 < 3:` run? (0)

**Watch for**

- Forgetting to change the variable in the condition, which makes an infinite loop.
- Thinking the condition is checked all the time, even in the middle of the loop. It is checked once before each repeat.
- Off-by-one mistakes with `<` vs `<=`.

---

## Region 6 — Clocktower Peaks

High in the Clocktower Peaks, giant clocks keep time for all of Codeweald. But the gears have slipped. The bells ring 13 times at noon, and Tuesday happened twice last week. The clockmakers need loops that count exactly right.

**Concept scene.** *Analogy:* A `for` loop is like climbing stairs where every step has a number. You know how many steps there are before you start. `range(1, 10, 2)` is a staircase where you skip every other step, and you stop *before* step 10.

```python
for bell in range(1, 4):
    print(f"Bell {bell}: DONG!")
print("The clock is happy again.")
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Boots of Looping | `r6-q2-the-clockmakers-loop` | A `for` loop runs once for each value. `range(start, stop, step)` makes the values and stops before `stop`. |
| Bucket of Totals | `r6-q4-the-toll-bucket` | An accumulator starts at 0 and adds a little more each time the loop runs. |
| Weaver's Loom | `r6-q6-the-pattern-weaver` | A loop inside a loop runs the inner loop all the way through for every pass of the outer loop. |
| Script Fragment: Rhythm | `r6-boss-broken-clock` | The piece of the Great Script that keeps a steady beat. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r6-q1-counting-the-bells` | Counting the Bells | predict | Predict the numbers that `range()` makes for different start, stop, and step values. | 2-AP-12 | 6 | Includes `range(5)`, `range(2, 8)`, and `range(10, 0, -2)`. |
| `r6-q2-the-clockmakers-loop` | The Clockmaker's Loop | investigate | Explain how a for loop's variable changes on each pass. | 2-AP-12 | 7 | 🗺️ The hero climbs stairs with `for step in range(4)`. |
| `r6-q3-rewind-the-lift` | Rewind the Lift | modify | Use a for loop with `range()` to rewrite a while-loop counter program in fewer lines. | 2-AP-12 | 7 | 🔁 R5 while loops and counters. The output must stay the same. |
| `r6-q4-the-toll-bucket` | The Toll Bucket | fill | Use an accumulator inside a for loop to add up a range of numbers. | 2-AP-11, 2-AP-12 | 8 | Tolls of 5, 10, … 50. 🧪 Other ranges. AST: the total must not be typed in. |
| `r6-q5-the-skipping-clock` | The Skipping Clock | fix | Fix off-by-one errors in `range()` so a loop runs the right number of times. | 2-AP-17 | 8 | Bugs: `range(1, 12)` skips 12 o'clock, and `range(0, 60, 10)` should step by 15. |
| `r6-q6-the-pattern-weaver` | The Pattern Weaver | make | Use nested for loops to print a rectangle of symbols. | 2-AP-12 | 10 | The inner loop builds a row with `row = row + "*"` (🔁 R2 joining strings). 🧪 Other sizes. |

**Boss: The Broken Clock** (Bug: *Tick-Tock-Tick*, a Bug with three hands). Tick-Tock-Tick is jamming the great clock. Rebuild its timetable so the town knows when the bells will ring.

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. Hours on the dial | Print the hours 1 to 12 with a for loop. | Use `range()` with a start and stop to print a sequence. | 2-AP-12 |
| 2. The timetable | Use nested loops to print each hour's chime minutes (0, 15, 30, 45), one row per hour. | Use nested loops and a range step to print a timetable pattern. | 2-AP-12 |
| 3. Count the chimes | At hour *h* the bell rings *h* times. Add up all the chimes from 1 to 12 o'clock. | Use an accumulator to total values across loop passes. | 2-AP-11 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r6-side1-staircase-of-stars` | Staircase of Stars | make | Use nested loops where the inner range depends on the outer loop's variable to draw a triangle. | 2-AP-12 | 8 | 🧪 Heights 1–6. |
| ⭐ `r6-side2-times-table-tower` | The Times-Table Tower | make | Use nested loops to print a multiplication grid. | 2-AP-12 | 10 | 🔁 R2 f-strings for each cell. |

**Knowledge check (`r6-check`)**

1. Predict: The numbers printed by `for i in range(2, 10, 3): print(i)`.
2. MCQ: How many times does `for i in range(5):` run, and what is the first value?
3. Predict: The total after an accumulator loop.
4. Predict: How many stars a 3-by-4 nested loop prints.

**Watch for**

- `range` stops *before* `stop`, so `range(1, 12)` never gives 12.
- Setting `total = 0` inside the loop, so the total resets on every pass.
- Adding 1 to the for-loop variable by hand. The loop does it for you.

---

## Region 7 — Dragon's Hoard Caverns

Deep in the Dragon's Hoard Caverns sleeps Ember, a very old and very sleepy dragon. Ember has a very messy pile of treasure, and it must be tidy before the yearly Dragon Inspection. Ember also snores fire, so work quickly.

**Concept scene.** *Analogy:* A list is a row of numbered treasure chests on a shelf. The first chest is number 0. You can also count from the end: -1 is the last chest, and -2 is the one before it. You can add chests to the end or take some away.

```python
hoard = ["gold cup", "ruby", "old boot"]
print(hoard[0])      # gold cup
print(hoard[-1])     # old boot
hoard.append("silver key")
print(len(hoard))    # 4
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Satchel of Lists | `r7-q2-pack-the-satchel` | A list holds many values in order, like `["ruby", "cup"]`, and positions start at 0. |
| Scale of Measures | `r7-q5-the-biggest-gem` | `len()` counts the items, and `max()`, `min()`, and `sum()` find the biggest, the smallest, and the total. |
| Treasure Finder Charm | `r7-q6-is-it-in-the-hoard` | `"ruby" in hoard` answers True or False: is it in the list? |
| Script Fragment: Gathering | `r7-boss-sort-the-hoard` | The piece of the Great Script that keeps many things together. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r7-q1-which-chest` | Which Chest? | predict | Predict which item a positive or negative index picks from a list. | 2-AP-11 | 7 | Multiple choice from the treasure on the shelf. |
| `r7-q2-pack-the-satchel` | Pack the Satchel | investigate | Explain how `append()` and `remove()` change a list and its length. | 2-AP-11 | 8 | 🗺️ Uses `world.items_here()` (which returns a list) and `hero.pick_up()`. |
| `r7-q3-the-missing-chest` | The Chest That Isn't There | fix | Fix an IndexError by using only indexes from 0 to `len - 1`. | 2-AP-17 | 7 | Bugs: `hoard[len(hoard)]` and `hoard[5]` on a 5-item list. |
| `r7-q4-count-every-coin` | Count Every Coin | parsons | Arrange a for loop that visits each item of a list and adds up the total. | 2-AP-12 | 7 | 🔁 R6 accumulators. Distractor: `total = 0` placed inside the loop. |
| `r7-q5-the-biggest-gem` | The Biggest Gem | modify | Use a loop and a "biggest so far" variable to find the largest value in a list. | 2-AP-12 | 9 | Change a total-finding loop, then check the answer with `max()`. 🧪 Hidden lists (biggest first, biggest last). |
| `r7-q6-is-it-in-the-hoard` | Is It in the Hoard? | make | Use `in` with if/else to check whether a requested item is in a list. | 2-AP-12 | 8 | 📥 Villagers ask for items. 🔁 R4 if/else. |

**Boss: Sort the Hoard** (Bug: *Clutterbug*). Clutterbug keeps sneaking old boots into Ember's treasure. Get the hoard in order before the Dragon Inspection.

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. Take stock | Print how many items there are, and the first and last item. | Use `len()` and indexes (including -1) to describe a list. | 2-AP-11 |
| 2. Gather the loot | 🗺️ Walk the hero through the cave, pick up items, and append them to a list. | Use `append()` inside a loop to build a list. | 2-AP-12 |
| 3. Toss the junk | Remove every `"old boot"` with `while "old boot" in hoard:`. | Use `in` and `remove()` together to take out unwanted items. | 2-AP-12 |
| 4. The dragon's report | 🧪 Print the total value and the most valuable treasure. Hidden hoards must pass too. | Use a loop to find the total and the largest value in a list. | 2-AP-12, 2-AP-17 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r7-side1-a-slice-of-hoard` | A Slice of the Hoard | investigate | Use slices like `hoard[1:3]` to take part of a list. | 2-AP-11 | 7 | Like `range`, a slice stops before the end index. |
| ⭐ `r7-side2-the-sorting-shelf` | The Dragon's Sorting Shelf | make | Use `sort()` or `sorted()` to put a list in order and print it. | 2-AP-11 | 8 | `sort()` changes the list, but `sorted()` makes a new one. |

**Knowledge check (`r7-check`)**

1. Predict: `hoard[-1]` for a 3-item list.
2. MCQ: A list has 4 items. What is the last valid index?
3. Predict: The list after one `append()` and one `remove()`.
4. MCQ: What does `"ruby" in hoard` give?

**Watch for**

- Indexes start at 0, so the last index is `len - 1`.
- `remove()` takes a *value*, not a position.
- Changing a list while a for loop is going over it skips items.

---

## Region 8 — Guild of Spellcrafters

The Guild of Spellcrafters is a tower full of wizards who hate repeating themselves. Their secret is simple: write a spell once, give it a name, and cast it whenever you need it. The Guildmaster says you can join, if you win the Spell Duel.

**Concept scene.** *Analogy:* A function is a spell you write once in your spellbook and then cast by name. Parameters are the blanks in the spell ("heal ___ points") that you fill in each time. `return` hands the result back to you, like a potion in a bottle. `print` just shouts it into the air.

```python
def heal(points):
    return points + 10

health = heal(25)
print(health)    # 35
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Tome of Functions | `r8-q2-the-walking-spell` | `def` makes a named block of code with parameters. Call it by name, like `walk_square(3)`, to run it. |
| Potion Bottle of Return | `r8-q3-the-silent-potion` | `return` hands a value back to the caller so it can be stored or used. `print` only shows it. |
| Spell Circle of Scope | `r8-q4-locked-in-the-circle` | A variable made inside a function only lives inside that function. |
| Script Fragment: Spells | `r8-boss-spell-duel` | The piece of the Great Script that lets you write once and use many times. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r8-q1-your-first-spell` | Your First Spell | predict | Predict the output of a program that defines a function and calls it several times. | 2-AP-14 | 6 | Includes a function that is defined but never called. |
| `r8-q2-the-walking-spell` | The Walking Spell | parsons | Arrange a function with a parameter so the hero can walk a square of any size. | 2-AP-14 | 7 | 🗺️ `def walk_square(size):` plus 4 moves, called with 2 and then 3. Indentation matters. |
| `r8-q3-the-silent-potion` | The Silent Potion | fix | Fix a function that prints its answer when the caller needs it returned. | 2-AP-14, 2-AP-17 | 8 | The caller gets `None`, and "None" shows on the Scroll. Targeted hint about print vs return. |
| `r8-q4-locked-in-the-circle` | Locked in the Spell Circle | investigate | Explain why a variable made inside a function can't be used outside it. | 2-AP-14 | 7 | Triggers a NameError on purpose. The fix is to return the value. |
| `r8-q5-spell-upgrade` | Spell Upgrade | modify | Turn repeated code into a function with a parameter and call it several times. | 2-AP-13, 2-AP-14 | 8 | 🔁 R6 for loops: three copy-pasted loops become one `draw_row(width)`. AST: a function is defined and called at least 3 times. |
| `r8-q6-potion-mixer` | The Potion Mixer | make | Write a function with two parameters that returns a calculated value. | 2-AP-14, 2-AP-17 | 10 | 🧪 Hidden calls. 🔁 R3 arithmetic: `mix(red, blue)` returns the potion's strength. |

**Boss: Spell Duel** (Bug: *Hexbug*). Hexbug challenges you to a duel. Its spells are copy-pasted and buggy. Yours will be reusable, and tested.

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. Spark | Write `spark(power)` that returns `power * 2`. | Define a function with a parameter that returns a value. | 2-AP-14 |
| 2. Shield | Write `shield(damage, armor)` that returns damage minus armor, but never less than 0. | Use `if` inside a function to return different values for different inputs. | 2-AP-12, 2-AP-14 |
| 3. Combo | Write `combo(power, armor)` that calls `spark` and `shield`. | Use the return value of one function as the input to another. | 2-AP-13, 2-AP-14 |
| 4. Duel-tested | Write 3 test calls that print the result next to the expected value, including 0 and armor bigger than damage. 🧪 Hidden tests must pass too. | Test functions with a range of inputs, including edge cases. | 2-AP-17 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r8-side1-spells-with-defaults` | Spells with Defaults | investigate | Use a default parameter value in your own function, like `steps=1` in `hero.move`. | 2-AP-14 | 7 | 🗺️ |
| ⭐ `r8-side2-borrowed-magic` | Borrowed Magic | modify | Use a function from Python's `math` module inside your own function, with a comment that says where it came from. | 2-AP-16 | 8 | `math.sqrt` and `math.floor`. Giving credit in a comment. |

**Knowledge check (`r8-check`)**

1. Predict: The output when a function is defined but never called.
2. MCQ: What is the difference between `return` and `print` inside a function?
3. Predict: A function with one parameter that is called twice.
4. MCQ: What happens if you print a variable outside the function that created it?

**Watch for**

- Defining a function and expecting it to run without calling it.
- Using `print` inside a function and then trying to store the "result". It is `None`.
- Thinking a parameter must have the same name as the variable passed in.

---

## Region 9 — Archive of Maps

The Archive of Maps holds a map of every corner of Codeweald. Or it did. A Bug ate the index, and now no one can find anything. Even the archive's own cartographer is lost in the stacks. (They have been in there for three days. They are fine. They packed snacks.)

**Concept scene.** *Analogy:* A dictionary is like the archive's card catalog. You look up a card by its label (the key) to find what's written on it (the value). You don't need to know where the card sits, only its label.

```python
distances = {"Hearthvale": 3, "Clocktower": 12}
print(distances["Clocktower"])    # 12
distances["Mines"] = 7            # add a new card
for place, miles in distances.items():
    print(f"{place}: {miles} miles")
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Key Ring of Dictionaries | `r9-q2-adding-new-places` | A dictionary stores `key: value` pairs. Look up a value with `d[key]`, and add or change one with `d[key] = value`. |
| Map Scroll of Items | `r9-q4-route-signposts` | `for key, value in d.items():` visits every pair in a dictionary. |
| Explorer's Atlas | `r9-q6-explorer-profiles` | Lists and dictionaries can hold each other, like a list of explorer dictionaries. |
| Script Fragment: Maps | `r9-boss-lost-cartographer` | The piece of the Great Script that finds anything by name. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r9-q1-the-catalog-cards` | The Catalog Cards | predict | Predict the value a dictionary gives back for a key. | 2-AP-11 | 6 | Includes a key that differs only by a capital letter. |
| `r9-q2-adding-new-places` | Adding New Places | investigate | Explain how assigning to a new key adds a pair and assigning to an existing key changes it. | 2-AP-11 | 7 | |
| `r9-q3-the-missing-key` | The Missing Key | fix | Fix a KeyError by checking the key's spelling or using `in` before the lookup. | 2-AP-17 | 8 | 📥 Travelers ask for places, and one isn't in the archive. 🔁 R7 `in`. |
| `r9-q4-route-signposts` | Route Signposts | parsons | Arrange a loop over `.items()` that prints every place and its distance. | 2-AP-12 | 7 | Distractor: `for place in distances.values():`. |
| `r9-q5-tally-the-treasures` | Tally the Treasures | fill | Use a dictionary as a counter that adds 1 each time an item appears in a list. | 2-AP-11, 2-AP-12 | 9 | 🔁 R7 looping over lists. 🧪 Hidden lists. |
| `r9-q6-explorer-profiles` | Explorer Profiles | make | Build a list of dictionaries and loop over it to print a report about each explorer. | 2-AP-11, 2-AP-13 | 10 | 🔁 R2 f-strings. AST: a list that contains dictionaries. |

**Boss: The Lost Cartographer** (Bug: *Inkmunch*). Inkmunch ate the archive's index. Build a new lookup system and guide the cartographer home.

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. Rebuild the index | Make a dictionary that maps each place name to `[column, row]` on the map (the same order as `hero.position()`). | Create a dictionary that maps names to values. | 2-AP-11 |
| 2. Ask the way | 📥 Look up a place a traveler asks for. Print its location, or a friendly "unknown place" message. | Use `in` and a dictionary lookup to answer questions without crashing. | 2-AP-12, 2-AP-17 |
| 3. Walk there | 🗺️ Write `go_to(place)`. It reads the coordinates and moves the hero there from the archive door (column 0, row 0). | Use values from a dictionary inside a function to move the hero to a location. | 2-AP-13, 2-AP-14 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r9-side1-cartographers-cipher` | The Cartographer's Cipher | make | Use a dictionary that maps letters to code letters to encode a secret message. | 2-DA-07 | 10 | A second encoding scheme for the same text. Stretch goal: decode with a second dictionary. |

**Knowledge check (`r9-check`)**

1. Predict: `print(pets["owl"])` for a small dictionary.
2. MCQ: What happens after `d["new"] = 5` when `"new"` isn't a key yet?
3. Predict: The output of a `.items()` loop over two pairs.
4. MCQ: Which line causes a KeyError?

**Watch for**

- Looking up by value instead of by key.
- Using positions like `d[0]`, the way you would with lists.
- Forgetting the quotes around string keys. `d[owl]` looks for a variable called `owl`.

---

## Region 10 — The Bugmire Swamp

The Bugmire Swamp is where Bugs come from. It's foggy and squelchy, and every program here is broken in a new and exciting way. Byte hands you an odd tool: a small yellow rubber duck. "This is the most powerful debugging tool ever made," says Byte. "I'm only half joking."

**Concept scene.** *Analogy:* Debugging is detective work. Gather clues (the error message and the line number), make a guess about the cause, test your guess, and repeat. When you're stuck, explain your code out loud to a rubber duck, one line at a time. Often you will hear the bug yourself.

```python
gems = 12
bags = 0
print(f"Gems per bag: {gems / bags}")
# ZeroDivisionError: division by zero   <- WHAT went wrong
#   line 3                              <- WHERE to look
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Field Guide to Bugs | `r10-q2-three-kinds-of-bugs` | Syntax errors stop code before it runs. Runtime errors crash it partway. Logic errors run but give the wrong answer. |
| Swamp Lantern of Tracing | `r10-q3-light-up-the-trail` | Extra `print()` lines show what your variables hold at each step, so you can see where things go wrong. |
| Rubber Duck of Debugging | `r10-q4-talk-to-the-duck` | Explain your code to the duck one line at a time: what it *should* do, and what it *really* does. |
| Script Fragment: Mending | `r10-boss-swamp-king` | The piece of the Great Script that repairs itself. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r10-q1-reading-the-bug-tracks` | Reading the Bug Tracks | investigate | Use a traceback to find the error type, the line, and the message. | 2-AP-17 | 6 | 🔁 R8 functions: a two-level traceback (the error happens inside a function). |
| `r10-q2-three-kinds-of-bugs` | Three Kinds of Bugs | predict | Classify a bug as a syntax, runtime, or logic error by predicting what happens when the code runs. | 2-AP-17 | 7 | Six short programs. For each, choose syntax, runtime, or logic, then run it to check. |
| `r10-q3-light-up-the-trail` | Light Up the Trail | fix | Use `print()` tracing to find where a variable gets the wrong value, then fix the logic error. | 2-AP-17 | 8 | 🔁 R6 accumulators (the total resets inside the loop). The checker checks the fix, not the trace lines. |
| `r10-q4-talk-to-the-duck` | Talk to the Duck | fix | Explain a program line by line to the Rubber Duck, then fix the bug that the explanation uncovers. | 2-AP-17 | 9 | The duck asks "What should this line do?" for each line (free text, not graded). 🔁 R4: the `elif` lines are in the wrong order. |
| `r10-q5-edge-of-the-swamp` | Edge of the Swamp | modify | Test a function with edge cases (0, negative numbers, an empty list) and change it so every case works. | 2-AP-17 | 9 | 🔁 R7 lists and R8 functions. The average of an empty list gives a ZeroDivisionError. |
| `r10-q6-the-bug-report` | The Bug Report | make | Write test checks that compare expected and actual results to expose a bug. | 2-AP-17, 2-AP-19 | 8 | Then fix the bug and add a comment that explains the fix. |

**Boss: The Swamp King** (a very large and very proud Bug). The Swamp King hid 5 bugs in the swamp's bridge-building program. Fix them all to cross.

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. Clear the syntax mud | Fix 2 syntax errors (a missing colon and an unclosed parenthesis) so the program runs. | Use error messages to find and fix syntax errors. | 2-AP-17 |
| 2. Stop the crash | Fix 2 runtime errors (a NameError typo, and text added to a number) using the traceback. | Use a traceback to find and fix runtime errors. | 2-AP-17 |
| 3. The right answer | Use print tracing to find and fix the logic error: a `range` that stops one plank short. | Use print tracing and expected results to find and fix a logic error. | 2-AP-17 |
| 4. Prove it | Add 2 edge-case test calls and a comment next to each fix. 🧪 Hidden edge cases must pass. | Test a repaired program with edge cases and document the fixes. | 2-AP-17, 2-AP-19 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r10-side1-the-bug-zoo` | The Bug Zoo | make | Use test results as feedback to improve a program with a planted bug and its hint. | 2-AP-15, 2-AP-17 | 10 | Plant one bug in a working program and write a hint for it. Byte's checker reports whether the bug really breaks the program and whether the fixed version passes; use that feedback to improve the hint. Optional: ask a friend or family member to try it. |
| ⭐ `r10-side2-bytes-truth-spells` | Byte's Truth Spells | investigate | Use `assert` to check that a function returns what you expect. | 2-AP-17 | 7 | |

**Knowledge check (`r10-check`)**

1. MCQ: The program runs but prints the wrong total. What kind of bug is it?
2. Predict: Which line will the traceback point to?
3. MCQ: The output is wrong but there is no error. What is a good first step?
4. MCQ: Which test is an edge case for a function that averages a list?

**Watch for**

- The error's line isn't always the bug's line. An unclosed parenthesis is often reported on the *next* line.
- Changing code at random instead of making a guess and testing it.
- Thinking "no error message" means "no bug".

---

## Region 11 — The Shattered Citadel

The Shattered Citadel stands at the center of Codeweald. This is where the Great Script was first written. You carry ten Script Fragments, and now it's time to put them together. You will also add a piece that only you can write: your own game.

**Concept scene.** *Analogy:* `random` is like rolling dice. You know which numbers *could* come up, but not which one *will*. Good games mix surprise (random) with rules (ifs, loops, and functions).

```python
import random
roll = random.randint(1, 6)
print(f"You rolled a {roll}!")
if roll == 6:
    print("Sparkle bonus!")
```

**Concept items**

| Item | Granted by | Description |
|---|---|---|
| Dice of Chance | `r11-q1-roll-the-dice` | The `random` module picks by chance. `randint(1, 6)` gives a whole number from 1 to 6, and `choice(a_list)` picks one item. |
| Blueprint Scroll | `r11-q4-the-blueprint-table` | Plan a program in small steps, written as comments, before you write the code. |
| The Great Script | `r11-boss-rebuild-the-great-script` | Every idea you learned, working together. The Great Script is whole again, and you helped write it. |

**Quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| `r11-q1-roll-the-dice` | Roll the Dice of Chance | investigate | Explain how `random.randint()` and `random.choice()` can give different results on each run. | 2-AP-16 | 7 | Run it 5 times and compare the results. |
| `r11-q2-what-could-happen` | What Could Happen? | predict | Predict every possible output of a short program that uses `random`. | 2-AP-17 | 6 | |
| `r11-q3-the-loaded-dice` | The Loaded Dice | fix | Fix a random range so every outcome on the die can happen. | 2-AP-17 | 7 | 🔁 R6 `range`: `randint` includes both ends, but `range` stops before `stop`. Bug: `randint(1, 5)` for a 6-sided die. 🧪 Checked with many seeds. |
| `r11-q4-the-blueprint-table` | The Blueprint Table | parsons | Arrange pseudocode steps (written as comments) into a working plan for a guessing game. | 2-AP-10, 2-AP-13 | 7 | The finished plan becomes the starter code for q5. |
| `r11-q5-citadel-guessing-game` | The Citadel Guessing Game | fill | Combine `random`, a while loop, `input()`, and if/elif/else to finish a number-guessing game. | 2-AP-12 | 10 | 📥 🧪 A fixed random seed makes testing possible. 🔁 R3–R5. |
| `r11-q6-random-treasure-hunt` | Random Treasure Hunt | modify | Change a game so the treasure appears in a random spot and the hero searches for it using functions and loops. | 2-AP-13, 2-AP-14 | 12 | 🗺️ 🧪 Several seeds. 🔁 R7 lists and R8 functions. |

**Boss: Rebuild the Great Script** (Bug: *the Great Glitch*, made of every bug you have fixed). You don't fight the Great Glitch. You *build*. Make your own small game. When it runs, the Glitch turns into ten thousand fireflies, and the Great Script is whole again.

| Phase | What the student does | Learning outcome | CSTA |
|---|---|---|---|
| 1. Choose and plan | Pick a starter (number guessing, grid treasure hunt, or choose-your-path story). Write the plan as comments. | Plan a program by writing its steps as comments before coding. | 2-AP-10, 2-AP-19 |
| 2. Build the core | Write the main loop and at least one function. | Use a loop and a function to build the main part of a game. | 2-AP-13, 2-AP-14 |
| 3. Add chance and choices | Use `random` and if/elif/else so the game is different each time. | Use `random` and conditionals to make a program act differently on each run. | 2-AP-12, 2-AP-16 |
| 4. Playtest and polish (free part) | Make it your own. Only light rules are checked: it uses a loop, an `if`, a function, and `random`, and it runs without errors on 3 test runs. Optional: ask a friend or family member to playtest it, and change one thing. | Test a program and improve it based on test runs and playtest feedback. | 2-AP-15, 2-AP-17 |

**Side quests**

| ID | Title | Type | Learning outcome | CSTA | Min | Notes |
|---|---|---|---|---|---|---|
| ⭐ `r11-side1-a-thousand-rolls` | A Thousand Rolls | make | Use a loop and a dictionary to roll a die 1,000 times and count each result. | 2-AP-12 | 10 | 🔁 R9 dictionary counter. Prints a bar of `#` marks for each result. |
| ⭐ `r11-side2-the-credits-scroll` | The Credits Scroll | make | Add credits to your game that name the code, ideas, and art you borrowed, and who made them. | 2-AP-16 | 6 | Teaches how to give credit. |

**Knowledge check (`r11-check`)**

1. MCQ: Which numbers can `random.randint(1, 3)` give?
2. MCQ: Why should you test a game that uses `random` more than once?
3. Predict: The output of a short program that uses a function, a loop, and a list together.
4. MCQ: Which tool fits "repeat until the player quits"? (a while loop)
5. MCQ: Which credit line gives proper credit?

**Watch for**

- `randint` includes both ends, but `range` stops before the stop number.
- Building the whole game at once instead of in small, tested steps.
- Forgetting `import random`.

---

## Coverage checks

### Quest types by region

Counts include core quests, side quests, and the boss.

| Region | predict | investigate | fix | fill | parsons | modify | make | boss | Total |
|---|---|---|---|---|---|---|---|---|---|
| R1 Hearthvale Village | 1 | 1 | 1 | 0 | 1 | 1 | 2 | 1 | 8 |
| R2 Whispering Library | 1 | 1 | 1 | 2 | 0 | 1 | 1 | 1 | 8 |
| R3 Merchant's Crossing | 1 | 2 | 1 | 0 | 1 | 1 | 2 | 1 | 9 |
| R4 Forked Road Forest | 1 | 1 | 1 | 0 | 1 | 1 | 3 | 1 | 9 |
| R5 The Endless Mines | 1 | 1 | 1 | 1 | 0 | 1 | 2 | 1 | 8 |
| R6 Clocktower Peaks | 1 | 1 | 1 | 1 | 0 | 1 | 3 | 1 | 9 |
| R7 Dragon's Hoard Caverns | 1 | 2 | 1 | 0 | 1 | 1 | 2 | 1 | 9 |
| R8 Guild of Spellcrafters | 1 | 2 | 1 | 0 | 1 | 2 | 1 | 1 | 9 |
| R9 Archive of Maps | 1 | 1 | 1 | 1 | 1 | 0 | 2 | 1 | 8 |
| R10 The Bugmire Swamp | 1 | 2 | 2 | 0 | 0 | 1 | 2 | 1 | 9 |
| R11 The Shattered Citadel | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 1 | 9 |
| **All entries** | **11** | **15** | **12** | **6** | **7** | **11** | **22** | **11** | **95** |
| Core quests only | 11 | 11 | 12 | 5 | 7 | 10 | 10 | — | 66 |

### Cross-cutting requirements by region

| Region | Fix quest | 🔁 Spaced retrieval (R3+) | Concept scene | Check items | Side quests | Parsons |
|---|---|---|---|---|---|---|
| R1 | ✔ q5 (+ boss) | n/a | ✔ | 4 | 1 | ✔ |
| R2 | ✔ q3 | n/a | ✔ | 4 | 1 | — |
| R3 | ✔ q5 | ✔ q6 (R2) | ✔ | 5 | 2 | ✔ |
| R4 | ✔ q4 | ✔ q6 (R3) | ✔ | 4 | 2 | ✔ |
| R5 | ✔ q4 | ✔ q6 (R3, R4) | ✔ | 4 | 1 | — |
| R6 | ✔ q5 | ✔ q3 (R5), q6 (R2) | ✔ | 4 | 2 | — |
| R7 | ✔ q3 | ✔ q4 (R6), q6 (R4) | ✔ | 4 | 2 | ✔ |
| R8 | ✔ q3 | ✔ q5 (R6), q6 (R3) | ✔ | 4 | 2 | ✔ |
| R9 | ✔ q3 | ✔ q3 (R7), q5 (R7), q6 (R2) | ✔ | 4 | 1 | ✔ |
| R10 | ✔ q3, q4 (+ boss) | ✔ q1 (R8), q3 (R6), q4 (R4), q5 (R7, R8) | ✔ | 4 | 2 | — |
| R11 | ✔ q3 | ✔ q3 (R6), q5 (R3–R5), q6 (R7, R8) | ✔ | 5 | 2 | ✔ |

Parsons puzzles appear in **7 regions** (R1, R3, R4, R7, R8, R9, R11). The target was at least 5.

### Totals

| What | Count | Minutes |
|---|---|---|
| Core quests | 66 | 505 |
| Bosses (39 phases in all) | 11 | 207 |
| **Core + bosses** | **77** | **712 (≈ 11.9 h)** |
| Side quests (optional) | 18 | 150 |
| Knowledge checks | 11 (46 items) | ≈ 55 |
| Concept scenes | 11 | ≈ 44 |
| **All entries (core + boss + side)** | **95** | |

Boss phases per region: R1 3, R2 3, R3 4, R4 4, R5 3, R6 3, R7 4, R8 4, R9 3, R10 4, R11 4.

### CSTA code coverage

| Code | Regions |
|---|---|
| 2-AP-10 | R1 (q1, q3), R5 (boss), R11 (q4, boss) |
| 2-AP-11 | R1, R2, R3, R4, R5, R6, R7, R9 |
| 2-AP-12 | R4, R5, R6, R7, R8, R9, R11 |
| 2-AP-13 | R1 (side), R3, R8, R9, R11 |
| 2-AP-14 | R8, R9 (boss), R11 |
| 2-AP-15 | R10 (side), R11 (boss) |
| 2-AP-16 | R8 (side), R11 |
| 2-AP-17 | All 11 regions |
| 2-AP-18 | Not covered. Teamwork and project timelines don't fit a solo, self-paced course. |
| 2-AP-19 | R1, R10, R11 |
| 2-DA-07 | R3, R9 (side) |

---

## Notes for reviewers

- **Concept order is strict.** No quest uses a concept before its region, except the game API calls themselves. `world.items_here()` returns a list, so it first appears in Region 7. Before that, quests use `world.look()`.
- **Small extras only in side quests or predict items:** `"ha" * 3` (R3 predict), `round()` (R3 side), slices and `sort()`/`sorted()` (R7 side), default parameters and the `math` module (R8 side), and `assert` (R10 side).
- **Features these quests assume** (flagged for the specs):
  - multi-run checks: R4 boss phase 4 lights a lamp for each branch reached across the student's own runs
  - hidden *maps* as well as hidden values (R5, R7, R11)
  - a fixed random seed for checking `random` quests (R11)
  - a rubber-duck dialog with free-text answers that are not graded (R10 q4)
  - a "light rules" checker for the creative free part (R11 boss phase 4)

  All five are now specified in [specs.md](specs.md): `branch_coverage` and `runs_ok` session validators and `hidden_tests` `mode: stages` (§9.3), `mode: seed` (§9.3, §6.7), and the rubber-duck dialog (§9.8a). Comment-based quests (R1 q4, R1 boss phase 3, R10) use the `style` validator, and the R11 blueprint Parsons uses `check: order` (§9.2).
- **`r4-q3-gatekeeper`** matches the schema example in the brief: the same ID, outcome, and hidden cases.
- **2-AP-18** (teamwork and timelines) isn't covered: it doesn't fit a solo, self-paced course.
