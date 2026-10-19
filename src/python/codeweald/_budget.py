"""Loop budget and line coverage via sys.monitoring (docs/specs.md §6.3, §9.3).

Counting backward jumps (= loop iterations) in the student's code lets us stop a
runaway loop instantly, name its line, and keep the worker alive. It costs nothing
for our own library code: those locations are switched off with DISABLE.
"""

import sys

from ._common import SPELLBOOK, LoopBudgetExceeded

mon = sys.monitoring
TOOL_ID = 4
_EVENTS = mon.events


class Monitor:
    def __init__(self):
        self.active = False
        self.count = 0
        self.budget = 0
        self.lines = None
        try:
            mon.use_tool_id(TOOL_ID, "codeweald")
        except ValueError:
            pass  # already registered (module reloaded)
        mon.register_callback(TOOL_ID, _EVENTS.JUMP, self._on_jump)
        mon.register_callback(TOOL_ID, _EVENTS.LINE, self._on_line)

    def start(self, budget, coverage=False):
        self.count = 0
        self.budget = budget
        self.lines = set() if coverage else None
        self.active = True
        mon.restart_events()
        events = _EVENTS.JUMP | (_EVENTS.LINE if coverage else 0)
        mon.set_events(TOOL_ID, events)

    def stop(self):
        self.active = False
        mon.set_events(TOOL_ID, 0)

    def _on_jump(self, code, offset, dest):
        if not self.active or code.co_filename != SPELLBOOK:
            return mon.DISABLE
        if dest > offset:
            return None  # forward jump: not a loop iteration
        self.count += 1
        if self.count > self.budget:
            self.stop()
            raise LoopBudgetExceeded(line_of(code, dest))
        return None

    def _on_line(self, code, line):
        if not self.active or code.co_filename != SPELLBOOK:
            return mon.DISABLE
        if self.lines is not None:
            self.lines.add(line)
        return mon.DISABLE  # one hit per location is all coverage needs


def line_of(code, offset):
    for start, end, line in code.co_lines():
        if start <= offset < end and line is not None:
            return line
    return None


MONITOR = Monitor()
