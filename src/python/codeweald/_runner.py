"""Run one student program in the sandbox and collect everything the UI needs."""

import ast
import io
import re
import reprlib
import sys
import tokenize
import types

from . import _world
from ._budget import MONITOR
from ._common import (
    SPELLBOOK,
    ActionBudgetExceeded,
    LoopBudgetExceeded,
    NeedInput,
    OutputBudgetExceeded,
    ProgramExit,
)
from ._errors import classify, loop_line
from ._sandbox import Env, RedirectOutput, find_locked, make_builtins

DEFAULT_LIMITS = {
    "loopBudget": 100_000,
    "maxActions": 2_000,
    "maxOutputChars": 100_000,
    "recursionLimit": 200,
}

_repr = reprlib.Repr()
_repr.maxstring = 80
_repr.maxother = 80
_repr.maxlist = 12
_repr.maxdict = 12
_repr.maxlevel = 2


class Outcome:
    """What happened when a program ran."""

    def __init__(self, source):
        self.source = source
        self.status = "ok"
        self.error = None
        self.needs_input = None
        self.namespace = {}
        self.world = None
        self.env = None
        self.loop_iterations = 0
        self.lines = None

    @property
    def output(self):
        return self.env.text() if self.env else ""

    def to_result(self):
        return {
            "status": self.status,
            "actions": self.world.actions if self.world else [],
            "error": self.error,
            "needsInput": {"prompt": self.needs_input} if self.needs_input is not None else None,
            "world": self.world.snapshot() if self.world else None,
            "vars": snapshot_vars(self.namespace),
            "output": self.output,
            "coverage": sorted(self.lines) if self.lines is not None else None,
            "stats": {"loopIterations": self.loop_iterations},
        }


def execute(source, stage=None, inputs=None, interactive=False, seed=0, limits=None, coverage=False):
    limits = {**DEFAULT_LIMITS, **(limits or {})}
    outcome = Outcome(source)
    try:
        world = _world.World(stage, limits["maxActions"])
    except ValueError as exc:  # a broken quest map: validate-content reports it with file and line
        outcome.status = "error"
        outcome.error = _game_error("stage.invalid", None, problem=str(exc)) | {"type": "StageError", "raw": str(exc)}
        return outcome
    env = Env(world, inputs, interactive, seed, limits["maxOutputChars"])
    outcome.world = world
    outcome.env = env

    # A fill-quest gap left as it was. Checked before compiling: a gap where an operator
    # belongs (`if gold ____ 10:`) is not even valid Python yet.
    gap = find_gap(source)
    if gap:
        line, col, end_col = gap
        outcome.status = "error"
        outcome.error = _game_error("fill.gap_left", line) | {"type": "GapLeft", "col": col, "endCol": end_col}
        return outcome

    try:
        code = compile(source, SPELLBOOK, "exec")
    except SyntaxError as exc:  # also IndentationError
        outcome.status = "error"
        outcome.error = classify(exc, source)
        return outcome

    locked = find_locked(ast.parse(source))
    if locked:
        name, line = locked
        outcome.status = "error"
        outcome.error = _game_error("sandbox.locked", line, name=name) | {
            "type": "LockedName",
            "raw": f'  File "{SPELLBOOK}", line {line}\nLockedName: {name} is locked in Codeweald',
        }
        return outcome

    namespace = {"__name__": "__main__", "__builtins__": make_builtins(env)}
    outcome.namespace = namespace
    _world.set_world(world)
    old_limit = sys.getrecursionlimit()
    sys.setrecursionlimit(_stack_depth() + limits["recursionLimit"])
    try:
        with RedirectOutput(env):
            MONITOR.start(limits["loopBudget"], coverage)
            try:
                exec(code, namespace)
            finally:
                MONITOR.stop()
                env.flush()
    except NeedInput as signal:
        outcome.status = "needs-input"
        outcome.needs_input = signal.prompt
    except LoopBudgetExceeded as signal:
        outcome.status = "loop-budget"
        line = loop_line(source, signal.line)
        outcome.error = _game_error("limits.loop", line, budget=limits["loopBudget"])
    except ActionBudgetExceeded:
        outcome.status = "action-budget"
        outcome.error = _game_error("limits.actions", None, budget=limits["maxActions"])
    except OutputBudgetExceeded:
        outcome.status = "output-budget"
        outcome.error = _game_error("limits.output", None, budget=limits["maxOutputChars"])
    except (ProgramExit, SystemExit):
        pass
    except BaseException as exc:  # noqa: BLE001 - every student error is reported, never raised
        outcome.status = "error"
        outcome.error = classify(exc, source)
    finally:
        sys.setrecursionlimit(old_limit)
        _world.set_world(None)
        outcome.loop_iterations = MONITOR.count
        outcome.lines = MONITOR.lines
    return outcome


GAP = re.compile(r"_{3,}")


def find_gap(source):
    """The first `____` gap left in the code, as (line, col, end_col) (1-based), or None.

    Gaps are found as name tokens, so a `____` inside a string or a comment is fine.
    """
    try:
        for tok in tokenize.generate_tokens(io.StringIO(source).readline):
            if tok.type == tokenize.NAME and GAP.fullmatch(tok.string):
                return tok.start[0], tok.start[1] + 1, tok.end[1] + 1
    except (tokenize.TokenError, SyntaxError):  # compile() reports these with a better message
        pass
    return None


def _game_error(key, line, **params):
    return {
        "type": "LimitReached",
        "key": key,
        "params": {k: f"{v:,}" if isinstance(v, int) else str(v) for k, v in params.items()}
        | {"line": "" if line is None else str(line)},
        "line": line,
        "col": None,
        "endCol": None,
        "raw": "",
    }


def _stack_depth():
    depth = 0
    frame = sys._getframe()
    while frame is not None:
        depth += 1
        frame = frame.f_back
    return depth


SKIP_VALUES = (types.ModuleType, type)


def snapshot_vars(namespace):
    """Top-level variables as {name, type, repr} for the Jar Shelf and validators."""
    jars = []
    for name, value in namespace.items():
        if name.startswith("__"):
            continue
        if isinstance(value, SKIP_VALUES) or value is _world.hero or value is _world.world:
            continue
        if isinstance(value, types.FunctionType):
            params = ", ".join(value.__code__.co_varnames[: value.__code__.co_argcount])
            jars.append({"name": name, "type": "function", "repr": f"{name}({params})"})
            continue
        if callable(value):
            continue
        jars.append({"name": name, "type": type(value).__name__, "repr": _repr.repr(value)})
    return jars
