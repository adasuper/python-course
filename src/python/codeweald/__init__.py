"""Codeweald's game API.

Students write:

    from codeweald import hero, world
    hero.move("right", 2)
    hero.say("Hello, Hearthvale!")

Everything starting with an underscore is the engine behind the game, not part of
the student-facing API.
"""

from ._common import CodewealdError
from ._world import hero, world

__all__ = ["hero", "world", "CodewealdError"]
