"""Quest validators, mistake detectors and feedback selection (docs/specs.md §9.3–§9.4).

Validators are declared in quest YAML and arrive here as plain dicts. Each returns
whether it passed plus a hint. Mistake detectors turn a failure into a *targeted*
hint ("You printed the answer, but the quest needs you to store it…").
"""

import ast
import hashlib
import io
import json
import re
import string
import tokenize
from difflib import SequenceMatcher

from . import _detectors
from ._runner import execute

# ----- context ----------------------------------------------------------------


class Ctx:
    """Everything a validator may look at, for one run of the student's program."""

    def __init__(self, request, outcome):
        self.request = request
        self.outcome = outcome
        self.source = outcome.source
        self.output = outcome.output
        self.lines = self.output.splitlines()
        self.error = outcome.error
        self.world = outcome.world.snapshot() if outcome.world else {}
        self.namespace = outcome.namespace
        # Earlier runs in this quest session plus this one, for session validators (§9.3).
        self.session = []
        self._tree = None
        self._parsed = False

    @property
    def tree(self):
        if not self._parsed:
            self._parsed = True
            try:
                self._tree = ast.parse(self.source)
            except SyntaxError:
                self._tree = None
        return self._tree

    @property
    def vars(self):
        return {k: v for k, v in self.namespace.items() if not k.startswith("__")}

    def run(self, source=None, vars=None, inputs=None, seed=None, stage=None):
        """Re-run the program (or a variant) in a fresh namespace and world."""
        req = self.request
        src = source if source is not None else self.source
        if vars:
            src = replace_assignments(src, vars)
        return Ctx(
            req,
            execute(
                src,
                stage if stage is not None else req.get("stage"),
                inputs if inputs is not None else req.get("inputs"),
                False,
                seed if seed is not None else req.get("seed", 0),
                req.get("limits"),
            ),
        )


    def call(self, name, *args):
        """Call one of the student's functions in a fresh run of the program.

        Returns {"returns", "output", "error"}: the return value (as JSON-friendly data), what
        the call printed, and a friendly-error key (or "missing_function") when it failed.
        """
        run = self.run()
        if run.error:
            return {"returns": None, "output": "", "error": run.error["key"]}
        if not callable(run.vars.get(name)):
            return {"returns": None, "output": "", "error": "missing_function"}
        return execute_call(run, name, list(args))


class MissingVariable(Exception):
    pass


def replace_assignments(source, values):
    """Change the first top-level `name = ...` for each name to the given value."""
    tree = ast.parse(source)
    remaining = dict(values)
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in remaining:
                    node.value = ast.parse(repr(remaining.pop(target.id)), mode="eval").body
    if remaining:
        raise MissingVariable(", ".join(sorted(remaining)))
    return ast.unparse(tree)


# ----- normalization -------------------------------------------------------------


def normalize(text, options):
    text = text.replace("\r\n", "\n")
    lines = [line.rstrip() for line in text.split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    while lines and lines[0] == "":
        lines.pop(0)
    text = "\n".join(lines)
    if "case" in options:
        text = text.lower()
    if "punctuation" in options:
        text = text.translate(str.maketrans("", "", string.punctuation))
    if "spaces" in options:
        text = re.sub(r"[ \t]+", " ", text)
        text = "\n".join(line.strip() for line in text.split("\n"))
    return text


def same_value(a, b):
    return _canon(a) == _canon(b)


def _canon(value):
    if isinstance(value, float):
        return round(value, 9)
    if isinstance(value, (list, tuple)):
        return [_canon(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _canon(v) for k, v in value.items()}
    return value


def jsonable(value):
    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return repr(value)


# ----- validators ---------------------------------------------------------------


def v_output(spec, ctx):
    match = spec.get("match", "normalized")
    options = spec.get("normalize") or []
    actual = ctx.output
    if match == "exact":
        return actual == spec.get("expect", ""), {}
    if match == "regex":
        pattern = spec.get("expect_regex") or spec.get("expect", "")
        flags = re.MULTILINE | (re.IGNORECASE if "case" in options else 0)
        return re.search(pattern, normalize(actual, [o for o in options if o != "case"]), flags) is not None, {}
    expected = normalize(spec.get("expect", ""), options)
    actual_n = normalize(actual, options)
    if match == "normalized":
        return actual_n == expected, {}
    if match == "contains":
        return expected in actual_n, {}
    if match == "fuzzy":
        opts = set(options) | {"case", "spaces", "punctuation"}
        ratio = SequenceMatcher(None, normalize(actual, opts), normalize(spec.get("expect", ""), opts)).ratio()
        return ratio >= float(spec.get("threshold", 0.9)), {"ratio": round(ratio, 3)}
    raise ValueError(f"unknown output match {match!r}")


def v_state(spec, ctx):
    w = ctx.world
    checks = []
    if "hero_at" in spec:
        checks.append(list(w.get("hero", [])) == list(spec["hero_at"]))
    if "hero_on" in spec:
        checks.append(w.get("heroOn") == spec["hero_on"])
    if "facing" in spec:
        checks.append(w.get("facing") == spec["facing"])
    if "has_items" in spec:
        inv = w.get("inventory", [])
        checks.append(all(item in inv for item in spec["has_items"]))
    if "items_count" in spec:
        inv = w.get("inventory", [])
        checks.append(all(inv.count(k) == n for k, n in spec["items_count"].items()))
    if "chests_opened" in spec:
        want = spec["chests_opened"]
        opened = w.get("chestsOpened", [])
        checks.append(len(opened) >= want if isinstance(want, int) else all(c in opened for c in want))
    if "max_bonks" in spec:
        checks.append(w.get("bonks", 0) <= spec["max_bonks"])
    if "said_contains" in spec:
        needle = str(spec["said_contains"]).lower()
        checks.append(any(needle in s.lower() for s in w.get("said", [])))
    if "said_exact" in spec:
        checks.append(list(w.get("said", [])) == list(spec["said_exact"]))
    if "visited" in spec:
        visited = {tuple(v) for v in w.get("visited", [])}
        checks.append(all(tuple(v) in visited for v in spec["visited"]))
    return all(checks), {}


def v_variable(spec, ctx):
    name = spec["name"]
    if name not in ctx.vars:
        return False, {"missing": name}
    value = ctx.vars[name]
    ok = True
    if "value_type" in spec:
        ok = ok and type(value).__name__ == spec["value_type"]
    if "equals" in spec:
        ok = ok and same_value(value, spec["equals"])
    if "matches" in spec:
        ok = ok and isinstance(value, str) and re.search(spec["matches"], value) is not None
    return ok, {}


def _call_name(call):
    func = call.func
    if isinstance(func, ast.Name):
        return func.id
    if isinstance(func, ast.Attribute):
        if isinstance(func.value, ast.Name):
            return f"{func.value.id}.{func.attr}"
        return func.attr
    return ""


def _imported_from(tree, module):
    """Names brought in with `from module import a, b` (so a() counts as module.a())."""
    names = set()
    for n in ast.walk(tree):
        if isinstance(n, ast.ImportFrom) and n.module == module:
            names.update(alias.asname or alias.name for alias in n.names)
    return names


def count_calls(tree, name):
    """Calls of `name`. "random.*" counts any call into the random module."""
    calls = [_call_name(n) for n in ast.walk(tree) if isinstance(n, ast.Call)]
    if name.endswith(".*"):
        module = name[:-2]
        local = _imported_from(tree, module)
        return sum(1 for c in calls if c.startswith(module + ".") or c in local)
    return sum(1 for c in calls if c == name)


# Words for groups of nodes: "Loop" is any for or while loop.
NODE_GROUPS = {"Loop": (ast.For, ast.While)}


def count_nodes(tree, node_name):
    cls = NODE_GROUPS.get(node_name) or getattr(ast, node_name, None)
    if cls is None:
        raise ValueError(f"unknown ast node {node_name!r}")
    return sum(1 for n in ast.walk(tree) if isinstance(n, cls))


def has_final_else(tree):
    for node in ast.walk(tree):
        if isinstance(node, ast.If):
            tail = node
            while len(tail.orelse) == 1 and isinstance(tail.orelse[0], ast.If):
                tail = tail.orelse[0]
            if tail.orelse:
                return True
    return False


def code_lines(source):
    count = 0
    for line in source.split("\n"):
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            count += 1
    return count


def v_ast(spec, ctx):
    tree = ctx.tree
    if tree is None:
        return False, {}
    for node_name in spec.get("require", []):
        if count_nodes(tree, node_name) == 0:
            return False, {"missing": node_name}
    for node_name in spec.get("forbid", []):
        if count_nodes(tree, node_name) > 0:
            return False, {"forbidden": node_name}
    for name in spec.get("require_calls", []):
        if count_calls(tree, name) == 0:
            return False, {"missing_call": name}
    for name, n in (spec.get("min_count") or {}).items():
        found = count_calls(tree, name) if (name[:1].islower() or "." in name) else count_nodes(tree, name)
        if found < n:
            return False, {"count": name, "found": found}
    if spec.get("require_else") and not has_final_else(tree):
        return False, {"missing": "else"}
    fn = spec.get("function")
    if fn:
        defs = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == fn["name"]]
        if not defs:
            return False, {"missing_function": fn["name"]}
        d = defs[0]
        if "params" in fn and len(d.args.args) != fn["params"]:
            return False, {"params": len(d.args.args)}
        if fn.get("returns") and not any(isinstance(n, ast.Return) and n.value is not None for n in ast.walk(d)):
            return False, {"returns": False}
    literals = spec.get("no_literal") or []
    if literals:
        for n in ast.walk(tree):
            if isinstance(n, ast.Constant) and not isinstance(n.value, bool) and n.value in literals:
                return False, {"literal": repr(n.value)}
    for name in spec.get("uses_names", []):
        if not any(isinstance(n, ast.Name) and n.id == name and isinstance(n.ctx, ast.Load) for n in ast.walk(tree)):
            return False, {"unused": name}
    if "max_lines" in spec and code_lines(ctx.source) > spec["max_lines"]:
        return False, {"lines": code_lines(ctx.source)}
    return True, {}


def comments_by_line(source):
    found = {}
    try:
        for tok in tokenize.generate_tokens(io.StringIO(source).readline):
            if tok.type == tokenize.COMMENT:
                found[tok.start[0]] = tok.string
    except (tokenize.TokenError, IndentationError, SyntaxError):
        pass
    return found


def v_style(spec, ctx):
    comments = comments_by_line(ctx.source)
    real = {ln: c for ln, c in comments.items() if c.lstrip("#").strip()}
    if len(real) < spec.get("min_comments", 0):
        return False, {"comments": len(real)}
    pattern = spec.get("comment_above")
    if pattern:
        lines = ctx.source.split("\n")
        for i, line in enumerate(lines, start=1):
            if line.strip() and not line.strip().startswith("#") and re.search(pattern, line):
                if i not in real and (i - 1) not in real:
                    return False, {"uncommented_line": i}
    limit = spec.get("max_line_length")
    if limit and any(len(line) > limit for line in ctx.source.split("\n")):
        return False, {}
    return True, {}


# ----- hidden tests --------------------------------------------------------------


def run_case(spec, case, ctx):
    """Run one hidden case and return what we observed, as JSON-friendly data."""
    mode = spec["mode"]
    try:
        if mode == "vars":
            run = ctx.run(vars=case["vars"])
        elif mode == "inputs":
            run = ctx.run(inputs=case["inputs"])
        elif mode == "seed":
            run = ctx.run(seed=case["seed"], inputs=case.get("inputs"))
        elif mode == "stages":
            run = ctx.run(stage=case["stage"], inputs=case.get("inputs"))
        elif mode == "call":
            run = ctx.run(inputs=case.get("inputs"))
        else:
            raise ValueError(f"unknown hidden_tests mode {mode!r}")
    except MissingVariable as missing:
        return {"error": "missing_var", "missing": str(missing)}
    observed = {
        "output": normalize(run.output, []),
        "said": run.world.get("said", []),
        "state": {k: run.world.get(k) for k in ("hero", "inventory", "chestsOpened", "bonks")},
        "error": run.error["key"] if run.error else None,
    }
    for key in spec.get("compare", []):
        if key.startswith("vars:"):
            name = key[5:]
            observed[key] = jsonable(run.vars.get(name, "<missing>"))
    if mode == "call" and not run.error:
        fn = run.vars.get(spec["function"])
        if not callable(fn):
            return {"error": "missing_function"}
        # Call inside the student's namespace so their helpers are visible.
        call = execute_call(run, spec["function"], case.get("args", []))
        observed["returns"] = call["returns"]
        observed["output"] = call["output"]
        observed["error"] = call["error"]
    return observed


def execute_call(run, name, args):
    """Call a student function with args, capturing return value and printed output."""
    from ._sandbox import RedirectOutput
    from ._errors import classify
    from . import _world

    env = run.outcome.env
    start = len(env.transcript)
    _world.set_world(run.outcome.world)
    result = {"returns": None, "output": "", "error": None}
    try:
        with RedirectOutput(env):
            value = run.namespace[name](*args)
        env.flush()
        result["returns"] = jsonable(value)
    except BaseException as exc:  # noqa: BLE001
        result["error"] = classify(exc, run.source)["key"]
    finally:
        _world.set_world(None)
    result["output"] = normalize("".join(env.transcript[start:]), [])
    return result


def v_hidden_tests(spec, ctx):
    compare = spec.get("compare") or ["output"]
    failed = []
    for i, case in enumerate(spec["cases"]):
        expect = case.get("expect")
        if expect is None:
            raise ValueError("hidden test case has no expectation (bake it with build-content)")
        got = run_case(spec, case, ctx)
        if got.get("error") and got.get("error") != expect.get("error"):
            failed.append(i)
            continue
        for key in compare:
            if key == "output":
                if normalize(got.get("output", ""), ["spaces"]) != normalize(expect.get("output", ""), ["spaces"]):
                    failed.append(i)
                    break
            elif not same_value(got.get(key), expect.get(key)):
                failed.append(i)
                break
    return not failed, {"failed_cases": failed}


def bake_cases(spec, ctx):
    """Build-time helper: record the reference solution's behavior as expectations."""
    baked = []
    keys = set(spec.get("compare") or ["output"]) | {"error"}
    for case in spec["cases"]:
        got = run_case(spec, case, ctx)
        baked.append({**case, "expect": {k: got.get(k) for k in keys}})
    return baked


# ----- custom checks -------------------------------------------------------------


class Pass:
    passed = True

    def __init__(self, hint=""):
        self.hint = hint


class Fail:
    passed = False

    def __init__(self, hint=""):
        self.hint = hint


def run_custom(source, fn_name, ctx):
    scope = {"Pass": Pass, "Fail": Fail, "ast": ast, "re": re}
    exec(compile(source, "<quest-check>", "exec"), scope)
    verdict = scope[fn_name](ctx)
    if isinstance(verdict, bool):
        return verdict, ""
    return bool(verdict.passed), getattr(verdict, "hint", "")


def v_custom(spec, ctx):
    passed, hint = run_custom(spec["python"], "check", ctx)
    return passed, {"hint": hint} if hint else {}


# ----- session validators ------------------------------------------------------
# They look across all of the student's runs in a quest session, not just the last one
# (docs/specs.md §9.3). The main thread keeps the history (one summary per run, saved with
# the draft) and sends it with each run.

SESSION_VALIDATORS = frozenset({"branch_coverage", "runs_ok"})


def branch_arms(tree, source):
    """Every if/elif/else body (a "door") in the program, in source order.

    Each arm is {id, kind, line, first}: `line` is where the door is written and `first` is
    the first line of its body, which is the line coverage sees run.
    """
    if tree is None:
        return []
    lines = source.split("\n")

    def is_elif(node):
        return lines[node.lineno - 1].lstrip().startswith("elif")

    elifs = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.If) and len(node.orelse) == 1 and isinstance(node.orelse[0], ast.If):
            if is_elif(node.orelse[0]):
                elifs.add(id(node.orelse[0]))
    heads = sorted(
        (n for n in ast.walk(tree) if isinstance(n, ast.If) and id(n) not in elifs),
        key=lambda n: (n.lineno, n.col_offset),
    )
    arms = []
    for chain, head in enumerate(heads, start=1):
        doors = []
        node, kind = head, "if"
        while True:
            doors.append((kind, node.lineno, node.body[0].lineno))
            orelse = node.orelse
            if len(orelse) == 1 and id(orelse[0]) in elifs:
                node, kind = orelse[0], "elif"
                continue
            if orelse:
                first = orelse[0].lineno
                # The AST has no line for `else:` itself; find it above the body.
                written = range(first, node.body[-1].end_lineno, -1)
                line = next((n for n in written if re.match(r"\s*else\s*:", lines[n - 1])), first)
                doors.append(("else", line, first))
            break
        for n, (kind, line, first) in enumerate(doors, start=1):
            arms.append({"id": f"{chain}.{n}", "kind": kind, "line": line, "first": first})
    return arms


def program_key(ctx):
    """Two runs are "the same program" when their code has the same structure (comments and
    spacing don't count)."""
    text = ast.dump(ctx.tree) if ctx.tree is not None else ctx.source
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def session_summary(ctx):
    """What the session history keeps about one run."""
    arms = branch_arms(ctx.tree, ctx.source)
    covered = ctx.outcome.lines or set()
    return {
        "program": program_key(ctx),
        "ok": ctx.outcome.status == "ok",
        "inputs": [str(v) for v in ctx.request.get("inputs") or []],
        "shape": ",".join(f"{a['id']}{a['kind']}" for a in arms),
        "lines": [a["line"] for a in arms],
        "lit": [a["id"] for a in arms if a["first"] in covered],
    }


def v_branch_coverage(spec, ctx):
    """Every door has run in at least one run of a program with the same doors."""
    arms = branch_arms(ctx.tree, ctx.source)
    shape = ",".join(f"{a['id']}{a['kind']}" for a in arms)
    lit = set()
    for run in ctx.session:
        if run.get("shape") == shape:
            lit.update(run.get("lit", []))
    lamps = [{"id": a["id"], "kind": a["kind"], "line": a["line"], "lit": a["id"] in lit} for a in arms]
    count = sum(1 for lamp in lamps if lamp["lit"])
    want = spec.get("min", "all")
    need = len(arms) if want == "all" else int(want)
    return bool(arms) and count >= need, {"lamps": lamps, "lit": count, "need": need}


def v_runs_ok(spec, ctx):
    """This program finished without an error in enough of the student's runs."""
    key = program_key(ctx)
    runs = [r for r in ctx.session if r.get("program") == key and r.get("ok")]
    if spec.get("distinct_inputs"):
        count = len({tuple(r.get("inputs", [])) for r in runs})
    else:
        count = len(runs)
    need = int(spec.get("min_runs", 3))
    return count >= need, {"ok_runs": count, "need": need}


VALIDATORS = {
    "output": v_output,
    "state": v_state,
    "variable": v_variable,
    "ast": v_ast,
    "style": v_style,
    "hidden_tests": v_hidden_tests,
    "custom": v_custom,
    "branch_coverage": v_branch_coverage,
    "runs_ok": v_runs_ok,
}


def run_validator(spec, ctx):
    kind = spec["type"]
    passed, detail = VALIDATORS[kind](spec, ctx)
    hint = detail.pop("hint", "") or spec.get("fail_hint", "")
    return {"id": spec.get("id", kind), "type": kind, "passed": bool(passed), "hint": "" if passed else hint, "detail": detail}


# ----- mistakes -----------------------------------------------------------------


def strip_comments(source):
    lines = source.split("\n")
    for ln, comment in comments_by_line(source).items():
        line = lines[ln - 1]
        idx = line.rfind(comment)
        if idx >= 0:
            lines[ln - 1] = line[:idx]
    return "\n".join(lines)


def detect(rule, ctx, results):
    kind = rule["kind"]
    error = ctx.error
    if kind == "error":
        if not error:
            return False
        if "key" in rule and error["key"] != rule["key"]:
            return False
        if "type" in rule and error["type"] != rule["type"]:
            return False
        if "message_regex" in rule and not re.search(rule["message_regex"], error["params"].get("message", "")):
            return False
        return True
    if kind == "code_regex":
        source = strip_comments(ctx.source) if rule.get("ignore_comments", True) else ctx.source
        return re.search(rule["pattern"], source, re.MULTILINE) is not None
    if kind == "output_regex":
        found = re.search(rule["pattern"], ctx.output, re.MULTILINE) is not None
        return found if rule.get("expect", "present") == "present" else not found
    if kind == "validator_failed":
        return any(r["id"] == rule["id"] and not r["passed"] for r in results)
    if kind == "hidden_case_fails":
        for r in results:
            if r["id"] == rule["validator"] and not r["passed"]:
                return rule["case"] in r["detail"].get("failed_cases", [])
        return False
    if kind == "state":
        w = ctx.world
        if "min_bonks" in rule and w.get("bonks", 0) < rule["min_bonks"]:
            return False
        if "hero_at" in rule and list(w.get("hero", [])) != list(rule["hero_at"]):
            return False
        return True
    if kind == "detector":
        return _detectors.run(rule["name"], ctx, rule)
    if kind == "custom":
        passed, _ = run_custom(rule["python"], "detect", ctx)
        return passed
    raise ValueError(f"unknown mistake detector kind {kind!r}")


# ----- the whole evaluation ------------------------------------------------------


def evaluate(request, outcome):
    ctx = Ctx(request, outcome)
    session = any(v["type"] in SESSION_VALIDATORS for v in request.get("validators", []))
    summary = session_summary(ctx) if session else None
    if session:
        ctx.session = [*(request.get("session") or []), summary]
    ran_ok = outcome.status == "ok"
    results = [run_validator(spec, ctx) for spec in request.get("validators", [])] if ran_ok else []
    passed = ran_ok and all(r["passed"] for r in results)
    feedback = {"source": "success"}
    if not passed:
        feedback = None
        for mistake in request.get("mistakes", []):
            if detect(mistake["detect"], ctx, results):
                feedback = {"source": "mistake", "id": mistake["id"], "text": mistake["feedback"]}
                break
        if feedback is None:
            if outcome.error:
                feedback = {"source": "error"}
            else:
                failing = next((r for r in results if not r["passed"] and r["hint"]), None)
                if failing:
                    feedback = {"source": "validator", "id": failing["id"], "text": failing["hint"]}
                else:
                    feedback = {"source": "generic"}
    bonus = []
    if passed:
        for b in request.get("bonus", []):
            ok = run_validator({"id": b["id"], **b["check"]}, ctx)["passed"]
            if ok:
                bonus.append(b["id"])
    report = {"passed": passed, "results": results, "feedback": feedback, "bonus": bonus}
    if summary is not None:
        report["session"] = summary
    return report
