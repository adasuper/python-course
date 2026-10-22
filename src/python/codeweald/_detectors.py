"""Named mistake detectors (docs/specs.md §9.4).

Each detector looks at the student's code (and sometimes its output) and answers:
"did the student make this particular, common mistake?" Quest YAML refers to them by
name, e.g. `detect: { kind: detector, name: printed_not_stored, var: gold }`.
"""

import ast
import re


def _calls(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id == name:
                yield node
            elif isinstance(func, ast.Attribute) and func.attr == name:
                yield node


def _assigned_at_top(tree, var):
    for node in tree.body:
        if isinstance(node, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            if any(isinstance(t, ast.Name) and t.id == var for t in targets):
                return True
    return False


def missing_call_parens(ctx, rule):
    """`hero.say` or `print` written without the () that make it happen."""
    tree = ctx.tree
    if tree is None:
        return False
    names = set(rule.get("names") or ["print", "say", "move", "pick_up", "look"])
    for node in ast.walk(tree):
        if isinstance(node, ast.Expr):
            v = node.value
            if isinstance(v, ast.Name) and v.id in names:
                return True
            if isinstance(v, ast.Attribute) and v.attr in names:
                return True
    return False


def printed_not_stored(ctx, rule):
    """The answer is printed, but never stored in the variable the quest asks for."""
    tree = ctx.tree
    if tree is None:
        return False
    return not _assigned_at_top(tree, rule["var"]) and any(True for _ in _calls(tree, "print"))


def stored_not_printed(ctx, rule):
    """The variable exists, but it is never printed."""
    tree = ctx.tree
    if tree is None or not _assigned_at_top(tree, rule["var"]):
        return False
    for call in _calls(tree, "print"):
        for node in ast.walk(call):
            if isinstance(node, ast.Name) and node.id == rule["var"]:
                return False
    return True


def number_as_string(ctx, rule):
    """A number was written in quotes, e.g. gold = "10"."""
    tree = ctx.tree
    if tree is None:
        return False
    var = rule.get("var")
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Constant):
            value = node.value.value
            if isinstance(value, str) and re.fullmatch(r"-?\d+(\.\d+)?", value.strip()):
                if var is None or any(isinstance(t, ast.Name) and t.id == var for t in node.targets):
                    return True
    return False


def missing_fstring_prefix(ctx, rule):
    """"Hello {name}" without the f, so the braces print as-is."""
    tree = ctx.tree
    if tree is None:
        return False
    in_fstring = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr):
            for part in ast.walk(node):
                in_fstring.add(id(part))
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and id(node) not in in_fstring:
            if re.search(r"\{[A-Za-z_]\w*\}", node.value):
                return True
    return False


def assign_in_condition(ctx, rule):
    """`if gold = 10:` (one = stores, two == compare)."""
    return re.search(r"^\s*(if|elif|while)\b[^#\n]*[^=!<>]=[^=]", ctx.source, re.MULTILINE) is not None


def loop_var_not_updated(ctx, rule):
    """A while loop whose condition variables never change inside the loop."""
    tree = ctx.tree
    if tree is None:
        return False
    for node in ast.walk(tree):
        if isinstance(node, ast.While):
            used = {n.id for n in ast.walk(node.test) if isinstance(n, ast.Name)}
            if not used:
                continue
            changed = set()
            for stmt in node.body:
                for n in ast.walk(stmt):
                    if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store):
                        changed.add(n.id)
            if not (used & changed):
                return True
    return False


def function_not_called(ctx, rule):
    """A function is defined but never called."""
    tree = ctx.tree
    if tree is None:
        return False
    defined = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    called = {n.func.id for n in ast.walk(tree) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)}
    target = rule.get("function")
    if target:
        return target in defined and target not in called
    return bool(defined - called)


def hardcoded_output(ctx, rule):
    """The expected answer is typed straight into a print instead of being computed."""
    tree = ctx.tree
    if tree is None:
        return False
    text = str(rule["text"])
    for call in _calls(tree, "print"):
        for node in ast.walk(call):
            if isinstance(node, ast.Constant) and str(node.value).strip() == text:
                return True
    return False


def _range_values(call):
    """The numbers a range(...) call with constant arguments produces, or None."""
    args = []
    for arg in call.args:
        if isinstance(arg, ast.Constant) and type(arg.value) is int:
            args.append(arg.value)
        elif isinstance(arg, ast.UnaryOp) and isinstance(arg.op, ast.USub) and isinstance(arg.operand, ast.Constant):
            args.append(-arg.operand.value)
        else:
            return None
    if not 1 <= len(args) <= 3 or (len(args) == 3 and args[2] == 0):
        return None
    values = range(*args)
    return values if len(values) <= 100_000 else None


def _is_len_plus_one(node):
    return (
        isinstance(node, ast.BinOp)
        and isinstance(node.op, ast.Add)
        and isinstance(node.left, ast.Call)
        and isinstance(node.left.func, ast.Name)
        and node.left.func.id == "len"
        and isinstance(node.right, ast.Constant)
        and node.right.value == 1
    )


def range_off_by_one(ctx, rule):
    """A range that stops one step short (or goes one too far), e.g. range(5, 50, 5) when
    the loop should reach 50. `last` (and `first`) say which values the loop should reach;
    without them, only range(len(x) + 1) counts, which always runs past the end."""
    tree = ctx.tree
    if tree is None:
        return False
    first, last = rule.get("first"), rule.get("last")
    for call in _calls(tree, "range"):
        if call.args and _is_len_plus_one(call.args[-1] if len(call.args) < 3 else call.args[1]):
            return True
        values = _range_values(call)
        if values is None or not len(values):
            continue
        step = values.step
        if last is not None and values[-1] in (last - step, last + step):
            return True
        if first is not None and values[0] in (first - 1, first + 1):
            return True
    return False


def _breaks_out(body):
    """Can this loop body leave its loop: a break of its own (not of a loop nested inside
    it), or a return?"""

    def visit(node, nested):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            return False
        if isinstance(node, ast.Return) or (isinstance(node, ast.Break) and not nested):
            return True
        inner = nested or isinstance(node, (ast.For, ast.While))
        return any(visit(child, inner) for child in ast.iter_child_nodes(node))

    return any(visit(stmt, False) for stmt in body)


def infinite_while_true_without_break(ctx, rule):
    """`while True:` with no break (or return) inside, so it can never stop."""
    tree = ctx.tree
    if tree is None:
        return False
    for node in ast.walk(tree):
        if isinstance(node, ast.While) and isinstance(node.test, ast.Constant) and node.test.value:
            if not _breaks_out(node.body):
                return True
    return False


def _functions(tree, rule):
    target = rule.get("function")
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and (target is None or node.name == target):
            yield node


def function_prints_not_returns(ctx, rule):
    """A function prints its answer but never returns it, so the caller gets None."""
    tree = ctx.tree
    if tree is None:
        return False
    for fn in _functions(tree, rule):
        prints = any(True for _ in _calls(fn, "print"))
        returns = any(isinstance(n, ast.Return) and n.value is not None for n in ast.walk(fn))
        if prints and not returns:
            return True
    return False


def _always_returns(body):
    for stmt in body:
        if isinstance(stmt, ast.Return):
            return True
        if isinstance(stmt, ast.If) and stmt.orelse and _always_returns(stmt.body) and _always_returns(stmt.orelse):
            return True
    return False


def return_inside_loop_too_early(ctx, rule):
    """A loop inside a function returns on its very first pass (a return straight in the
    loop, or in both the if and the else), so it never looks at the other items."""
    tree = ctx.tree
    if tree is None:
        return False
    for fn in _functions(tree, rule):
        for node in ast.walk(fn):
            if isinstance(node, (ast.For, ast.While)) and _always_returns(node.body):
                return True
    return False


def unused_variable(ctx, rule):
    """A variable is given a value but never used. `var` names it; without it, any variable
    counts (loop variables like `for i in range(3)` are fine to leave unused)."""
    tree = ctx.tree
    if tree is None:
        return False
    stored, loaded = set(), set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            for t in targets:
                stored.update(n.id for n in ast.walk(t) if isinstance(n, ast.Name))
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            loaded.add(node.id)
        if isinstance(node, ast.AugAssign) and isinstance(node.target, ast.Name):
            loaded.add(node.target.id)  # gold += 1 reads gold
    unused = {name for name in stored - loaded if not name.startswith("_")}
    var = rule.get("var")
    return var in unused if var else bool(unused)


SHADOWED = frozenset(
    {
        "list", "dict", "str", "int", "float", "bool", "set", "tuple", "sum", "max", "min", "len",
        "print", "input", "range", "type", "id", "sorted", "round", "abs", "any", "all", "map",
        "filter", "zip", "enumerate", "reversed", "next", "iter", "format", "open", "object",
    }
)  # fmt: skip


def shadowed_builtin(ctx, rule):
    """A variable or function takes the name of one of Python's own, e.g. `list = [1, 2]`,
    so the real `list()` stops working. `names` narrows which ones count."""
    tree = ctx.tree
    if tree is None:
        return False
    names = set(rule.get("names") or SHADOWED)
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store) and node.id in names:
            return True
        if isinstance(node, ast.FunctionDef) and node.name in names:
            return True
        if isinstance(node, ast.arg) and node.arg in names:
            return True
    return False


DETECTORS = {
    "missing_call_parens": missing_call_parens,
    "printed_not_stored": printed_not_stored,
    "stored_not_printed": stored_not_printed,
    "number_as_string": number_as_string,
    "missing_fstring_prefix": missing_fstring_prefix,
    "assign_in_condition": assign_in_condition,
    "loop_var_not_updated": loop_var_not_updated,
    "function_not_called": function_not_called,
    "hardcoded_output": hardcoded_output,
    "range_off_by_one": range_off_by_one,
    "infinite_while_true_without_break": infinite_while_true_without_break,
    "function_prints_not_returns": function_prints_not_returns,
    "return_inside_loop_too_early": return_inside_loop_too_early,
    "unused_variable": unused_variable,
    "shadowed_builtin": shadowed_builtin,
}


def run(name, ctx, rule):
    if name not in DETECTORS:
        raise ValueError(f"unknown detector {name!r}")
    return DETECTORS[name](ctx, rule)
