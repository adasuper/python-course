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
}


def run(name, ctx, rule):
    if name not in DETECTORS:
        raise ValueError(f"unknown detector {name!r}")
    return DETECTORS[name](ctx, rule)
