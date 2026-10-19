"""JSON entry points used by the Web Worker and by Node tools/tests.

Keeping the boundary as JSON strings in and out makes the worker protocol simple and
identical in the browser and in Node.
"""

import json

from ._check import Ctx, bake_cases, evaluate
from ._runner import execute


def _execute(req, source=None):
    return execute(
        req["code"] if source is None else source,
        req.get("stage"),
        req.get("inputs"),
        req.get("interactiveInput", False),
        req.get("seed", 0),
        req.get("limits"),
        req.get("coverage", False),
    )


def run(request_json):
    """Run a program; validate it when the request carries validators."""
    req = json.loads(request_json)
    outcome = _execute(req)
    result = outcome.to_result()
    if req.get("mode", "quest") == "quest" and (req.get("validators") or req.get("mistakes")):
        if outcome.status != "needs-input":
            result["validation"] = evaluate(req, outcome)
    return json.dumps(result)


def bake(request_json):
    """Build time: run the reference solution and record hidden-test expectations."""
    req = json.loads(request_json)
    outcome = _execute(req)
    if outcome.status != "ok":
        return json.dumps({"ok": False, "error": outcome.error, "status": outcome.status})
    ctx = Ctx(req, outcome)
    validators = []
    for spec in req.get("validators", []):
        if spec["type"] == "hidden_tests":
            spec = {**spec, "cases": bake_cases(spec, ctx)}
        validators.append(spec)
    return json.dumps({"ok": True, "validators": validators})
