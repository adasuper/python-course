"""The simulated quest world and the student-facing `hero` and `world` objects.

A quest stage is a small ASCII grid (see docs/specs.md §7.2). The simulation here is
the single source of truth: Phaser only *replays* the action log this module records.
"""

import difflib

from ._common import (
    ActionBudgetExceeded,
    ApiAttributeError,
    CodewealdError,
    student_line,
)

DIRECTIONS = {"up": (0, -1), "down": (0, 1), "left": (-1, 0), "right": (1, 0)}

# What each map character means. Quests may add or override entries with `legend:`.
#   tile:   the ground ("floor", "wall", "water", "exit", ...)
#   solid:  the hero can't walk onto it
#   object: something that sits on the tile ("chest", "npc", "door", ...); objects are solid
#   item:   something the hero can pick up ("gem", "key", ...)
#   hero:   the hero starts here
#   look:   what world.look() reports (defaults to object, then item, then tile)
DEFAULT_LEGEND = {
    "#": {"tile": "wall", "solid": True},
    ".": {"tile": "floor"},
    " ": {"tile": "floor"},
    "H": {"tile": "floor", "hero": True},
    "E": {"tile": "exit"},
    "~": {"tile": "water", "solid": True},
    "D": {"tile": "floor", "object": "door"},
    "C": {"tile": "floor", "object": "chest"},
    "N": {"tile": "floor", "object": "npc"},
    "g": {"tile": "floor", "item": "gem"},
    "k": {"tile": "floor", "item": "key"},
    "$": {"tile": "floor", "item": "coin"},
    "*": {"tile": "floor", "item": "star"},
}

MAX_SAY = 200


def _giver(stage):
    """The first named character on stage: the cast of an npc stage, or a map's NPCs."""
    if not stage:
        return None
    for member in stage.get("cast") or []:
        if member.get("name"):
            return member["name"]
    for spec in (stage.get("npcs") or {}).values():
        if isinstance(spec, dict) and spec.get("name"):
            return spec["name"]
    return None


class World:
    """State of one program run: the map, the hero, and the action log."""

    def __init__(self, stage, max_actions=2000):
        self.actions = []
        self.hero_actions = 0
        self.max_actions = max_actions
        self.has_map = False
        self.width = 0
        self.height = 0
        self.cells = []
        self.items = {}
        self.objects = {}
        self.chests = {}
        self.hero = (0, 0)
        self.facing = "down"
        self.inventory = []
        self.said = []
        self.bonks = 0
        self.picked = []
        self.chests_opened = []
        self.visited = set()
        # Who hands over the quest's input() answers in the replay (F-EXE-12).
        self.giver = _giver(stage)
        if stage and stage.get("kind") == "grid":
            self._load_grid(stage)

    # ----- setup -------------------------------------------------------------

    def _load_grid(self, stage):
        legend = dict(DEFAULT_LEGEND)
        legend.update(stage.get("legend") or {})
        rows = [r for r in stage["grid"].split("\n")]
        while rows and rows[-1].strip() == "":
            rows.pop()
        self.height = len(rows)
        self.width = max((len(r) for r in rows), default=0)
        chest_specs = stage.get("chests") or {}
        npc_specs = stage.get("npcs") or {}
        hero_at = None
        for y, row in enumerate(rows):
            line = []
            for x in range(self.width):
                ch = row[x] if x < len(row) else " "
                entry = legend.get(ch)
                if entry is None:
                    raise ValueError(f"Map character {ch!r} at ({x}, {y}) is not in the legend")
                line.append(entry)
                if entry.get("hero"):
                    hero_at = (x, y)
                if entry.get("item"):
                    self.items[(x, y)] = [entry["item"]]
                obj = entry.get("object")
                if obj:
                    spec = {"kind": obj, "char": ch, "solid": entry.get("solid", True)}
                    spec.update(npc_specs.get(ch) or {})
                    if entry.get("name"):
                        spec.setdefault("name", entry["name"])
                    if entry.get("look"):
                        spec["look"] = entry["look"]
                    self.objects[(x, y)] = spec
                    if obj == "chest":
                        cspec = chest_specs.get(ch) or {}
                        self.chests[(x, y)] = {
                            "char": ch,
                            "code": str(cspec.get("code", "")),
                            "loot": list(cspec.get("loot") or []),
                            "opened": False,
                        }
            self.cells.append(line)
        if hero_at is None:
            raise ValueError("The map needs an H where the hero starts")
        self.hero = hero_at
        self.facing = stage.get("facing", "right")
        self.visited = {hero_at}
        self.has_map = True

    # ----- helpers -----------------------------------------------------------

    def log(self, action):
        action["ln"] = student_line()
        self.actions.append(action)
        if action["t"] not in ("out", "input"):
            self.hero_actions += 1
            if self.hero_actions > self.max_actions:
                raise ActionBudgetExceeded()

    def in_bounds(self, x, y):
        return 0 <= x < self.width and 0 <= y < self.height

    def is_solid(self, x, y):
        if not self.in_bounds(x, y):
            return True
        if self.cells[y][x].get("solid"):
            return True
        obj = self.objects.get((x, y))
        return bool(obj) and obj.get("solid", True)

    def describe(self, x, y):
        """The word world.look() returns for a tile."""
        if not self.in_bounds(x, y):
            return "edge"
        obj = self.objects.get((x, y))
        if obj:
            return obj.get("look") or obj["kind"]
        items = self.items.get((x, y))
        if items:
            return items[0]
        cell = self.cells[y][x]
        return cell.get("look") or cell["tile"]

    def ahead(self):
        dx, dy = DIRECTIONS[self.facing]
        return self.hero[0] + dx, self.hero[1] + dy

    def need_map(self, action):
        if not self.has_map:
            raise CodewealdError(
                "api.no_map",
                f"There's no map in this quest, so the hero can't {action}.",
                action=action,
            )

    # ----- actions -----------------------------------------------------------

    def move(self, direction, steps=1):
        self.need_map("move")
        direction = check_direction(direction)
        steps = check_steps(steps)
        dx, dy = DIRECTIONS[direction]
        if steps == 0:
            self.face(direction)
            return True
        for _ in range(steps):
            self.facing = direction
            x, y = self.hero
            nx, ny = x + dx, y + dy
            if self.is_solid(nx, ny):
                self.bonks += 1
                self.log({"t": "bonk", "dir": direction, "at": [x, y], "into": self.describe(nx, ny)})
                return False
            self.log({"t": "move", "dir": direction, "from": [x, y], "to": [nx, ny]})
            self.hero = (nx, ny)
            self.visited.add(self.hero)
        return True

    def face(self, direction):
        self.need_map("turn")
        self.facing = check_direction(direction)
        self.log({"t": "face", "dir": self.facing})

    def say(self, text):
        text = str(text)
        if len(text) > MAX_SAY:
            text = text[: MAX_SAY - 1] + "…"
        self.said.append(text)
        self.log({"t": "say", "text": text})

    def pick_up(self):
        self.need_map("pick things up")
        here = self.items.get(self.hero)
        if not here:
            self.log({"t": "pickup", "at": list(self.hero), "item": None})
            return None
        item = here.pop(0)
        if not here:
            del self.items[self.hero]
        self.inventory.append(item)
        self.picked.append(item)
        self.log({"t": "pickup", "at": list(self.hero), "item": item})
        return item

    def open_chest(self, code):
        self.need_map("open chests")
        target = self.ahead()
        chest = self.chests.get(target)
        code_text = str(code)
        if chest is None:
            self.log({"t": "chest", "at": list(target), "ok": False, "code": code_text, "loot": [], "missing": True})
            return False
        if chest["opened"]:
            self.log({"t": "chest", "at": list(target), "ok": True, "code": code_text, "loot": []})
            return True
        if code_text.strip() == chest["code"]:
            chest["opened"] = True
            loot = list(chest["loot"])
            self.inventory.extend(loot)
            self.chests_opened.append(chest["char"])
            self.log({"t": "chest", "at": list(target), "ok": True, "code": code_text, "loot": loot})
            return True
        self.log({"t": "chest", "at": list(target), "ok": False, "code": code_text, "loot": []})
        return False

    def look(self):
        self.need_map("look around")
        x, y = self.ahead()
        saw = self.describe(x, y)
        self.log({"t": "look", "at": [x, y], "saw": saw})
        return saw

    def items_here(self):
        self.need_map("look for items")
        return list(self.items.get(self.hero, []))

    # ----- results -----------------------------------------------------------

    def snapshot(self):
        return {
            "hasMap": self.has_map,
            "hero": list(self.hero),
            "facing": self.facing,
            "heroOn": self.describe(*self.hero) if self.has_map else None,
            "inventory": list(self.inventory),
            "said": list(self.said),
            "bonks": self.bonks,
            "picked": list(self.picked),
            "chestsOpened": list(self.chests_opened),
            "visited": sorted([list(v) for v in self.visited]),
        }


def check_direction(direction):
    if not isinstance(direction, str):
        raise CodewealdError(
            "api.direction_not_text",
            f"Directions are words in quotes, like \"up\", not {direction!r}.",
            value=repr(direction),
        )
    if direction in DIRECTIONS:
        return direction
    lowered = direction.strip().lower()
    if lowered in DIRECTIONS:
        raise CodewealdError(
            "api.direction_case",
            f"Directions are lowercase: \"{lowered}\".",
            value=direction,
            suggestion=lowered,
        )
    close = difflib.get_close_matches(lowered, list(DIRECTIONS), n=1)
    raise CodewealdError(
        "api.bad_direction",
        f"{direction!r} isn't a direction.",
        value=direction,
        suggestion=close[0] if close else "",
    )


def check_steps(steps):
    if isinstance(steps, bool) or not isinstance(steps, (int, float, str)):
        raise CodewealdError("api.steps_not_number", "steps must be a whole number.", value=repr(steps))
    if isinstance(steps, str):
        raise CodewealdError(
            "api.steps_text", "steps must be a number, not text.", value=repr(steps)
        )
    if isinstance(steps, float):
        if not steps.is_integer():
            raise CodewealdError("api.steps_not_whole", "steps must be a whole number.", value=repr(steps))
        steps = int(steps)
    if steps < 0:
        raise CodewealdError("api.steps_negative", "steps can't be negative.", value=repr(steps))
    return steps


# ----- the objects students use ---------------------------------------------

_state = {"world": None}


def set_world(world):
    _state["world"] = world


def _world():
    world = _state["world"]
    if world is None:
        raise CodewealdError("api.no_world", "The world isn't ready yet.")
    return world


def _unknown(owner, name, choices):
    close = difflib.get_close_matches(name, choices, n=1)
    raise ApiAttributeError(
        "api.unknown_action",
        f"The {owner} doesn't know {name!r}.",
        owner=owner,
        name=name,
        suggestion=close[0] if close else "",
    )


class Hero:
    """The hero you control. Try hero.move("right") or hero.say("Hello!")."""

    __slots__ = ()
    _ACTIONS = ["move", "face", "say", "pick_up", "open_chest", "position", "facing", "inventory"]

    def move(self, direction, steps=1):
        """Walk `steps` tiles in a direction: "up", "down", "left" or "right"."""
        return _world().move(direction, steps)

    def face(self, direction):
        """Turn to face a direction without moving."""
        _world().face(direction)

    def say(self, text):
        """Show a speech bubble above the hero."""
        _world().say(text)

    def pick_up(self):
        """Pick up the item on the hero's tile. Returns its name, or None."""
        return _world().pick_up()

    def open_chest(self, code):
        """Open the chest in front of the hero with a secret code. Returns True or False."""
        return _world().open_chest(code)

    def position(self):
        """The hero's (column, row). (0, 0) is the top-left corner."""
        return _world().hero

    @property
    def facing(self):
        """The direction the hero is facing."""
        return _world().facing

    def inventory(self):
        """A list of everything the hero carries."""
        return list(_world().inventory)

    def __getattr__(self, name):
        _unknown("hero", name, Hero._ACTIONS)

    def __repr__(self):
        return "<the hero>"


class WorldApi:
    """The world around the hero. Try world.look()."""

    __slots__ = ()
    _ACTIONS = ["look", "items_here"]

    def look(self):
        """What is on the tile in front of the hero, as a word like "wall" or "chest"."""
        return _world().look()

    def items_here(self):
        """A list of the items on the hero's tile."""
        return _world().items_here()

    def __getattr__(self, name):
        _unknown("world", name, WorldApi._ACTIONS)

    def __repr__(self):
        return "<the world>"


hero = Hero()
world = WorldApi()
