"""Shared names for the codeweald package.

Everything a student can trigger by mistake raises a CodewealdError. It carries a
`key` (looked up in content/errors.yaml for a kid-friendly message) and `params`
(filled into that message). The English `message` is a fallback for tests and logs.
"""

import sys

# Student code is compiled with this file name, so we can tell their frames apart
# from ours in tracebacks and in sys.monitoring callbacks.
SPELLBOOK = "<spellbook>"


class CodewealdError(Exception):
    """A friendly, explainable problem caused by student code."""

    def __init__(self, key, message="", **params):
        super().__init__(message or key)
        self.key = key
        self.params = {k: str(v) for k, v in params.items()}
        self.message = message or key


class ApiAttributeError(CodewealdError, AttributeError):
    """The student asked the hero or world for something it can't do (e.g. hero.mvoe)."""


class SandboxImportError(CodewealdError, ImportError):
    """The student imported a module that isn't on the allowlist."""


# These control-flow signals derive from BaseException so that a student's
# `except Exception:` can't accidentally swallow them.
class NeedInput(BaseException):
    def __init__(self, prompt):
        super().__init__(prompt)
        self.prompt = prompt


class ProgramExit(BaseException):
    """The student called exit() or quit(). The program simply ends."""


class LoopBudgetExceeded(BaseException):
    def __init__(self, line):
        super().__init__(line)
        self.line = line


class ActionBudgetExceeded(BaseException):
    pass


class OutputBudgetExceeded(BaseException):
    pass


def student_line():
    """Line number in the student's code that is running right now (or None)."""
    frame = sys._getframe(1)
    while frame is not None:
        if frame.f_code.co_filename == SPELLBOOK:
            return frame.f_lineno
        frame = frame.f_back
    return None
