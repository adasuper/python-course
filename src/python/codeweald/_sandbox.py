"""The safe environment student code runs in (docs/specs.md §6.4–§6.7).

This is a *teaching* sandbox: it keeps curious students away from things that
don't belong in a quest (files, eval, other modules). The real security boundary
is the Web Worker, which has its network and storage APIs removed.
"""

import builtins
import math
import random as _random
import sys
import types

from ._common import CodewealdError, NeedInput, OutputBudgetExceeded, ProgramExit, SandboxImportError

ALLOWED_MODULES = ("random", "math", "time", "codeweald")

# Builtins students never need in Codeweald. Each is replaced by a friendly stub.
BLOCKED_BUILTINS = ("open", "eval", "exec", "compile", "breakpoint", "help", "memoryview")

SLEEP_CAP_PER_CALL = 3.0
SLEEP_CAP_PER_RUN = 15.0
START_TIME = 1_767_225_600.0  # 2026-01-01, so time.time() is the same on every run


class Env:
    """Everything that is fresh for one run: world, input queue, output, clock."""

    def __init__(self, world, inputs, interactive, seed, max_output_chars):
        self.world = world
        self.inputs = list(inputs or [])
        self.interactive = interactive
        self.seed = seed
        self.max_output_chars = max_output_chars
        self.transcript = []
        self.output_chars = 0
        self.clock = START_TIME
        self.slept = 0.0
        self.stdout = OutputWriter(self, "stdout")
        self.stderr = OutputWriter(self, "stderr")
        self.modules = {
            "random": make_random_module(seed),
            "math": math,
            "time": make_time_module(self),
            "codeweald": make_codeweald_module(),
        }

    def text(self):
        return "".join(self.transcript)

    def flush(self):
        self.stdout.flush()
        self.stderr.flush()


class OutputWriter:
    """Replaces sys.stdout. Each finished line becomes an "out" action."""

    def __init__(self, env, stream):
        self.env = env
        self.stream = stream
        self.buffer = ""

    def write(self, text):
        text = str(text)
        env = self.env
        env.output_chars += len(text)
        if env.output_chars > env.max_output_chars:
            raise OutputBudgetExceeded()
        if self.stream == "stdout":
            env.transcript.append(text)
        self.buffer += text
        while "\n" in self.buffer:
            line, self.buffer = self.buffer.split("\n", 1)
            env.world.log({"t": "out", "stream": self.stream, "text": line + "\n"})
        return len(text)

    def flush(self):
        if self.buffer:
            self.env.world.log({"t": "out", "stream": self.stream, "text": self.buffer})
            self.buffer = ""

    def isatty(self):
        return False


def make_builtins(env):
    safe = dict(builtins.__dict__)

    def blocked(name):
        def stub(*args, **kwargs):
            raise CodewealdError(
                "sandbox.blocked", f"{name}() isn't available in the Spellbook.", name=name
            )

        stub.__name__ = name
        return stub

    for name in BLOCKED_BUILTINS:
        safe[name] = blocked(name)

    def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
        root = name.split(".")[0]
        if level != 0 or root not in ALLOWED_MODULES or name != root:
            raise SandboxImportError(
                "import.not_allowed",
                f"There is no {name!r} spellbook in Codeweald's library.",
                name=name,
                allowed=", ".join(ALLOWED_MODULES),
            )
        return env.modules[root]

    def safe_input(prompt=""):
        prompt = str(prompt)
        env.flush()
        if env.inputs:
            value = str(env.inputs.pop(0))
            source = "queue"
        elif env.interactive:
            raise NeedInput(prompt)
        else:
            raise CodewealdError(
                "input.empty",
                "Nobody has any more answers to give you.",
                prompt=prompt,
            )
        env.transcript.append(prompt + value + "\n")
        env.world.log({"t": "input", "prompt": prompt, "value": value, "source": source})
        return value

    def safe_exit(*args):
        raise ProgramExit()

    safe["__import__"] = safe_import
    safe["input"] = safe_input
    safe["exit"] = safe_exit
    safe["quit"] = safe_exit
    return safe


def make_random_module(seed):
    rng = _random.Random(seed)
    module = types.ModuleType("random", "Random numbers (seeded so quests can be checked).")
    for name in (
        "random",
        "randint",
        "randrange",
        "choice",
        "choices",
        "shuffle",
        "sample",
        "uniform",
        "gauss",
        "seed",
    ):
        setattr(module, name, getattr(rng, name))
    return module


def make_time_module(env):
    module = types.ModuleType("time", "Time, Codeweald style: sleep() pauses the replay.")

    def sleep(seconds):
        if isinstance(seconds, bool) or not isinstance(seconds, (int, float)):
            raise CodewealdError(
                "api.sleep_not_number", "sleep() needs a number of seconds.", value=repr(seconds)
            )
        if seconds < 0:
            raise CodewealdError("api.sleep_negative", "sleep() can't go back in time.", value=repr(seconds))
        env.clock += float(seconds)
        shown = min(float(seconds), SLEEP_CAP_PER_CALL, max(0.0, SLEEP_CAP_PER_RUN - env.slept))
        env.slept += shown
        env.flush()
        env.world.log({"t": "wait", "seconds": round(shown, 3)})

    def now():
        return env.clock

    module.sleep = sleep
    module.time = now
    module.monotonic = now
    module.perf_counter = now
    return module


def make_codeweald_module():
    from . import _world
    from ._common import CodewealdError as _Error

    module = types.ModuleType("codeweald", "The Codeweald game API: hero and world.")
    module.hero = _world.hero
    module.world = _world.world
    module.CodewealdError = _Error
    return module


class RedirectOutput:
    """Context manager: send print() to the env's writers while student code runs."""

    def __init__(self, env):
        self.env = env

    def __enter__(self):
        self.saved = (sys.stdout, sys.stderr)
        sys.stdout, sys.stderr = self.env.stdout, self.env.stderr

    def __exit__(self, *exc):
        sys.stdout, sys.stderr = self.saved
        return False
