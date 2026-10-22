"""Turn Python errors into kid-friendly error keys (docs/specs.md §6.8).

classify() returns a key such as "name.missing_quotes" plus parameters. The words a
student sees live in content/errors.yaml, so teachers can change them without code.
The real traceback is kept too, because reading real errors is a skill we teach.
"""

import ast
import builtins
import difflib
import keyword
import re
import traceback

from ._common import SPELLBOOK, CodewealdError

CURLY_QUOTES = "“”‘’"
WRONG_CASE = {"true": "True", "false": "False", "none": "None"}


def classify(exc, source):
    """Describe `exc` (raised by code compiled from `source`) as a dict for the UI."""
    lines = source.split("\n")
    info = {
        "type": type(exc).__name__,
        "key": "generic",
        "params": {},
        "line": None,
        "col": None,
        "endCol": None,
        "raw": real_traceback(exc, lines),
    }
    if isinstance(exc, SyntaxError):
        _syntax(exc, lines, info)
    else:
        info["line"] = innermost_line(exc)
        if isinstance(exc, CodewealdError):
            info["key"] = exc.key
            info["params"] = dict(exc.params)
        else:
            _runtime(exc, source, info)
    info["params"].setdefault("line", "" if info["line"] is None else str(info["line"]))
    info["params"].setdefault("type", info["type"])
    return info


# ----- syntax errors -----------------------------------------------------------


def _syntax(exc, lines, info):
    msg = exc.msg or ""
    line = exc.lineno
    info["line"] = line
    info["col"] = exc.offset
    info["endCol"] = getattr(exc, "end_offset", None)
    text = lines[line - 1] if line and 0 < line <= len(lines) else ""
    params = info["params"]
    params["message"] = msg

    if isinstance(exc, IndentationError):
        if isinstance(exc, TabError):
            info["key"] = "indent.tabs"
        elif msg.startswith("expected an indented block"):
            info["key"] = "indent.expected"
            m = re.search(r"after '(\w+)' statement on line (\d+)", msg)
            if m:
                params["after"] = m.group(1)
                params["after_line"] = m.group(2)
        elif msg.startswith("unexpected indent"):
            info["key"] = "indent.unexpected"
        elif msg.startswith("unindent does not match"):
            info["key"] = "indent.mismatch"
        else:
            info["key"] = "indent.generic"
        return

    if msg.startswith("unterminated string literal") or msg.startswith("unterminated triple-quoted"):
        info["key"] = "syntax.unclosed_string"
    elif re.match(r"'[(\[{]' was never closed", msg):
        info["key"] = "syntax.unclosed_bracket"
        params["bracket"] = msg[1]
        params["closer"] = {"(": ")", "[": "]", "{": "}"}[msg[1]]
    elif msg.startswith("unmatched '") or msg.startswith("closing parenthesis"):
        info["key"] = "syntax.extra_bracket"
    elif msg.startswith("Missing parentheses in call to 'print'"):
        info["key"] = "syntax.print_no_parens"
    elif msg == "expected ':'":
        info["key"] = "syntax.missing_colon"
    elif msg.startswith("invalid character"):
        m = re.search(r"invalid character '(.)'", msg)
        ch = m.group(1) if m else ""
        info["key"] = "syntax.smart_quotes" if ch in CURLY_QUOTES else "syntax.invalid_character"
        params["char"] = ch
    elif msg.startswith("invalid decimal literal"):
        info["key"] = "syntax.name_starts_with_digit"
    elif msg.startswith("cannot assign to expression") and "-" in text.split("=")[0]:
        info["key"] = "syntax.bad_variable_name"
        params["name"] = text.split("=")[0].strip()
    elif msg == "invalid syntax" and re.match(r"^\s*[A-Za-z_]\w*(\s+[A-Za-z_]\w*)+\s*=[^=]", text):
        first = text.split("=")[0]
        if not any(keyword.iskeyword(w) for w in first.split()):
            info["key"] = "syntax.bad_variable_name"
            params["name"] = first.strip()
        else:
            info["key"] = "syntax.generic"
    elif "Maybe you meant '==' or ':=' instead of '='" in msg:
        info["key"] = "syntax.assign_in_condition"
    elif "Perhaps you forgot a comma" in msg:
        info["key"] = "syntax.missing_comma"
    elif msg.startswith("cannot assign to literal") or msg.startswith("cannot assign to"):
        info["key"] = "syntax.assign_to_value"
    else:
        info["key"] = "syntax.generic"


# ----- runtime errors ----------------------------------------------------------


def _runtime(exc, source, info):
    params = info["params"]
    message = str(exc)
    params["message"] = message
    line = info["line"]

    if isinstance(exc, NameError):
        _name_error(exc, source, line, info)
    elif isinstance(exc, TypeError):
        if message.startswith("can only concatenate str"):
            info["key"] = "type.str_plus_number"
            m = re.search(r'\(not "(\w+)"\)', message)
            params["other"] = m.group(1) if m else ""
        elif message.startswith("unsupported operand type(s) for"):
            m = re.search(r"for (\S+): '(\w+)' and '(\w+)'", message)
            if m:
                params.update(op=m.group(1), left=m.group(2), right=m.group(3))
                pair = {m.group(2), m.group(3)}
                if "str" in pair and pair & {"int", "float"}:
                    info["key"] = "type.number_plus_str"
                elif "NoneType" in pair:
                    info["key"] = "type.none_value"
                else:
                    info["key"] = "type.bad_operands"
            else:
                info["key"] = "type.bad_operands"
        elif "cannot be interpreted as an integer" in message:
            info["key"] = "type.str_as_int" if message.startswith("'str'") else "type.not_int"
        elif "by non-int of type" in message or "indices must be integers" in message:
            # "ab" * 1.5, or my_list["a"]: both needed a whole number.
            info["key"] = "type.not_int"
        elif re.search(r"takes \d+ positional arguments? but \d+ (were|was) given", message) or (
            "required positional argument" in message
        ):
            info["key"] = "type.arg_count"
        elif "'NoneType' object" in message:
            info["key"] = "type.none_value"
        elif re.search(r"'(\w+)' object is not callable", message):
            info["key"] = "type.not_callable"
            params["what"] = re.search(r"'(\w+)' object", message).group(1)
        else:
            info["key"] = "type.generic"
    elif isinstance(exc, IndexError):
        _index_error(exc, source, info)
    elif isinstance(exc, KeyError):
        _key_error(exc, source, info)
    elif isinstance(exc, ZeroDivisionError):
        info["key"] = "zero_division"
    elif isinstance(exc, ValueError):
        m = re.match(r"invalid literal for int\(\) with base 10: (.*)", message)
        if m:
            info["key"] = "value.int_conversion"
            params["text"] = m.group(1)
        elif message.startswith("could not convert string to float"):
            info["key"] = "value.float_conversion"
        elif "not in list" in message:
            info["key"] = "value.remove_missing"
        else:
            info["key"] = "value.generic"
    elif isinstance(exc, AttributeError):
        info["key"] = "attribute.generic"
        m = re.search(r"'(\w+)' object has no attribute '(\w+)'", message)
        if m:
            params.update(what=m.group(1), name=m.group(2))
    elif isinstance(exc, RecursionError):
        info["key"] = "limits.recursion"
    elif isinstance(exc, MemoryError) or (
        isinstance(exc, OverflowError) and ("index-sized integer" in message or "convert to C" in message)
    ):
        # [0] * 10**9 runs out of memory; [0] * 2**40 is too big to even try.
        info["key"] = "limits.memory"


# ----- which list or dictionary? --------------------------------------------------
# "No item at that position" helps more as "`shelf` has 3 items, so its positions go from 0
# to 2. You asked for position 3." To say that, look at the subscripts on the error line and
# work out their values from the student's variables, without running any of their code:
# only names, literals, len(), unary minus, + and -, and indexing into built-in lists, strings,
# tuples and dictionaries are looked at.


class _Unknown(Exception):
    pass


def _student_frame(exc):
    frame = None
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == SPELLBOOK:
            frame = tb.tb_frame
        tb = tb.tb_next
    return frame


SAFE_CONTAINERS = (list, tuple, str, dict)


def _peek(node, frame):
    """The value of a simple expression in the student's frame, or raise _Unknown."""
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, (ast.List, ast.Tuple, ast.Dict)):
        try:
            return ast.literal_eval(node)
        except ValueError:
            raise _Unknown from None
    if isinstance(node, ast.Name):
        for scope in (frame.f_locals, frame.f_globals):
            if node.id in scope:
                return scope[node.id]
        raise _Unknown
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        value = _peek(node.operand, frame)
        if isinstance(value, int) and not isinstance(value, bool):
            return -value
    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub)):
        left, right = _peek(node.left, frame), _peek(node.right, frame)
        if all(isinstance(v, int) and not isinstance(v, bool) for v in (left, right)):
            return left + right if isinstance(node.op, ast.Add) else left - right
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "len":
        if len(node.args) == 1 and not node.keywords:
            value = _peek(node.args[0], frame)
            if type(value) in SAFE_CONTAINERS:
                return len(value)
    if isinstance(node, ast.Subscript):
        container, index = _peek(node.value, frame), _peek(node.slice, frame)
        if type(container) in SAFE_CONTAINERS:
            try:
                return container[index]
            except (IndexError, KeyError, TypeError):
                raise _Unknown from None
    raise _Unknown


def _subscripts_on(source, line):
    tree = _parse(source)
    if tree is None or line is None:
        return []
    found = [n for n in ast.walk(tree) if isinstance(n, ast.Subscript) and n.lineno == line]
    return sorted(found, key=lambda n: n.col_offset)


def _index_error(exc, source, info):
    params = info["params"]
    info["key"] = "index.generic"
    if str(exc) == "pop from empty list":
        info["key"] = "index.pop_empty"
        return
    frame = _student_frame(exc)
    if frame is None:
        return
    for node in _subscripts_on(source, info["line"]):
        try:
            container, index = _peek(node.value, frame), _peek(node.slice, frame)
        except _Unknown:
            continue
        if type(container) not in (list, tuple, str) or type(index) is not int:
            continue
        if -len(container) <= index < len(container):
            continue
        params.update(name=ast.unparse(node.value), index=str(index), length=str(len(container)))
        params["unit"] = "characters" if isinstance(container, str) else "items"
        params["last"] = str(len(container) - 1)
        info["key"] = "index.empty" if not container else "index.out_of_range"
        return


def _key_error(exc, source, info):
    params = info["params"]
    missing = exc.args[0] if exc.args else None
    params["key"] = repr(missing) if exc.args else ""
    info["key"] = "key.generic"
    frame = _student_frame(exc)
    if frame is None:
        return
    for node in _subscripts_on(source, info["line"]):
        try:
            container, key = _peek(node.value, frame), _peek(node.slice, frame)
        except _Unknown:
            continue
        if type(container) is not dict or key in container or key != missing:
            continue
        params["name"] = ast.unparse(node.value)
        keys = [repr(k) for k in list(container)[:6]]
        params["keys"] = ", ".join(keys) + (", …" if len(container) > 6 else "")
        info["key"] = "key.missing" if container else "key.empty"
        return


def _name_error(exc, source, line, info):
    params = info["params"]
    name = getattr(exc, "name", None) or _name_from_message(str(exc))
    params["name"] = name or ""
    if isinstance(exc, UnboundLocalError):
        info["key"] = "name.unbound_local"
        return
    tree = _parse(source)
    assigned = assigned_names(tree) if tree else set()
    known = set(assigned) | set(dir(builtins))
    if name and name.lower() in WRONG_CASE:
        info["key"] = "name.wrong_case"
        params["suggestion"] = WRONG_CASE[name.lower()]
        return
    if name:
        same_but_case = [k for k in known if k.lower() == name.lower() and k != name]
        if same_but_case:
            info["key"] = "name.wrong_case"
            params["suggestion"] = sorted(same_but_case)[0]
            return
    if tree and name and _assigned_after(tree, name, line):
        info["key"] = "name.before_assignment"
        return
    # A near-miss of one of the student's own names is a typo, even inside print().
    close = difflib.get_close_matches(name or "", [k for k in assigned if not k.startswith("_")], n=1, cutoff=0.75)
    if close:
        info["key"] = "name.typo"
        params["suggestion"] = close[0]
        return
    if tree and name and name not in assigned and _used_in_print_or_say(tree, name, line):
        info["key"] = "name.missing_quotes"
        return
    close = difflib.get_close_matches(name or "", [k for k in known if not k.startswith("_")], n=1, cutoff=0.75)
    if close:
        info["key"] = "name.typo"
        params["suggestion"] = close[0]
        return
    info["key"] = "name.not_defined"


def _name_from_message(message):
    m = re.search(r"name '(\w+)' is not defined", message)
    return m.group(1) if m else None


def _parse(source):
    try:
        return ast.parse(source)
    except SyntaxError:
        return None


def assigned_names(tree):
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, (ast.Store, ast.Del)):
            names.add(node.id)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, ast.arg):
            names.add(node.arg)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                names.add((alias.asname or alias.name).split(".")[0])
    return names


def _used_in_print_or_say(tree, name, line):
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if line is not None and getattr(node, "lineno", None) != line:
            continue
        func = node.func
        is_print = isinstance(func, ast.Name) and func.id == "print"
        is_say = isinstance(func, ast.Attribute) and func.attr == "say"
        if not (is_print or is_say):
            continue
        for arg in node.args:
            if isinstance(arg, ast.Name) and arg.id == name:
                return True
    return False


def _assigned_after(tree, name, line):
    if line is None:
        return False
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Name)
            and node.id == name
            and isinstance(node.ctx, ast.Store)
            and node.lineno > line
        ):
            return True
    return False


# ----- tracebacks --------------------------------------------------------------


def innermost_line(exc):
    line = None
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == SPELLBOOK:
            line = tb.tb_lineno
        tb = tb.tb_next
    return line


def real_traceback(exc, lines):
    """The real Python error, trimmed to the student's own code."""
    name = type(exc).__name__
    if isinstance(exc, SyntaxError):
        exc.filename = "spellbook"
        return "".join(traceback.format_exception_only(exc)).rstrip("\n")
    out = ["Traceback (most recent call last):"]
    tb = exc.__traceback__
    while tb is not None:
        code = tb.tb_frame.f_code
        if code.co_filename == SPELLBOOK:
            where = "" if code.co_name == "<module>" else f", in {code.co_name}"
            out.append(f'  File "spellbook", line {tb.tb_lineno}{where}')
            if 0 < tb.tb_lineno <= len(lines):
                out.append("    " + lines[tb.tb_lineno - 1].strip())
        tb = tb.tb_next
    message = exc.message if isinstance(exc, CodewealdError) else str(exc)
    out.append(f"{name}: {message}" if message else name)
    return "\n".join(out)


def stuck_while(source, line):
    """For a runaway `while` loop on `line`: (True, names its condition reads that nothing in
    the loop changes). (False, []) when the loop there is not a `while`."""
    tree = _parse(source)
    if tree is None:
        return False, []
    for node in ast.walk(tree):
        if isinstance(node, ast.While) and node.lineno == line:
            read = sorted({n.id for n in ast.walk(node.test) if isinstance(n, ast.Name)})
            changed = set()
            for inner in ast.walk(node):
                if isinstance(inner, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
                    targets = inner.targets if isinstance(inner, ast.Assign) else [inner.target]
                    for target in targets:
                        changed |= {n.id for n in ast.walk(target) if isinstance(n, ast.Name)}
                elif isinstance(inner, (ast.For, ast.With)) and isinstance(getattr(inner, "target", None), ast.Name):
                    changed.add(inner.target.id)
            return True, [name for name in read if name not in changed]
    return False, []


def loop_line(source, line):
    """The header line (while/for) of the innermost loop containing `line`."""
    tree = _parse(source)
    if tree is None or line is None:
        return line
    best = None
    for node in ast.walk(tree):
        if isinstance(node, (ast.While, ast.For)):
            end = getattr(node, "end_lineno", node.lineno)
            if node.lineno <= line <= end:
                if best is None or node.lineno >= best.lineno:
                    best = node
    return best.lineno if best else line
