import { beforeAll, describe, expect, it } from 'vitest';
import { getPyHost, type PyHost } from '../../scripts/lib/pyHost';
import type { StageSpec } from '../../src/runtime/protocol';

let py: PyHost;
beforeAll(async () => {
  py = await getPyHost();
});

const ROOM: StageSpec = {
  kind: 'grid',
  grid: ['#######', '#H.g.C#', '#..#..#', '#....E#', '#######'].join('\n'),
  facing: 'right',
  chests: { C: { code: '1234', loot: ['crown'] } },
};

const run = (code: string, stage: StageSpec | null = ROOM, extra = {}) =>
  py.run({ code: `from codeweald import hero, world\n${code}`, stage, ...extra });

describe('hero movement and the action log', () => {
  it('moves and records each step with the student line number', () => {
    const r = run('hero.move("right", 2)\nhero.move("left")\nhero.move("down")');
    expect(r.status).toBe('ok');
    expect(r.actions).toEqual([
      { t: 'move', dir: 'right', from: [1, 1], to: [2, 1], ln: 2 },
      { t: 'move', dir: 'right', from: [2, 1], to: [3, 1], ln: 2 },
      { t: 'move', dir: 'left', from: [3, 1], to: [2, 1], ln: 3 },
      { t: 'move', dir: 'down', from: [2, 1], to: [2, 2], ln: 4 },
    ]);
    expect(r.world?.hero).toEqual([2, 2]);
  });

  it('bonks harmlessly into walls and keeps running', () => {
    const r = run('ok = hero.move("up")\nhero.say(ok)');
    expect(r.status).toBe('ok');
    expect(r.actions[0]).toMatchObject({ t: 'bonk', dir: 'up', at: [1, 1], into: 'wall' });
    expect(r.actions[1]).toMatchObject({ t: 'say', text: 'False' });
    expect(r.world?.bonks).toBe(1);
  });

  it('stops the remaining steps after a bonk', () => {
    const r = run('hero.move("down", 5)');
    expect(r.actions.filter((a) => a.t === 'move')).toHaveLength(2);
    expect(r.actions.at(-1)).toMatchObject({ t: 'bonk' });
    expect(r.world?.hero).toEqual([1, 3]);
  });

  it('treats the map edge as solid', () => {
    const r = py.run({
      code: 'from codeweald import hero\nhero.move("left")',
      stage: { kind: 'grid', grid: 'H..', facing: 'right' },
    });
    expect(r.actions[0]).toMatchObject({ t: 'bonk', into: 'edge' });
  });

  it('picks up items and reports items_here', () => {
    const r = run(
      'hero.move("right", 2)\nprint(world.items_here())\nprint(hero.pick_up())\nprint(hero.pick_up())',
    );
    expect(r.output).toBe("['gem']\ngem\nNone\n");
    expect(r.world?.inventory).toEqual(['gem']);
  });

  it('opens chests only with the right code', () => {
    const r = run('hero.move("right", 3)\nprint(hero.open_chest(1111))\nprint(hero.open_chest(1234))');
    expect(r.output).toBe('False\nTrue\n');
    expect(r.world?.inventory).toEqual(['crown']);
    expect(r.world?.chestsOpened).toEqual(['C']);
  });

  it('looks ahead', () => {
    const r = run(
      'print(world.look())\nhero.move("right", 3)\nprint(world.look())\nhero.face("up")\nprint(world.look())',
    );
    expect(r.output).toBe('floor\nchest\nwall\n');
  });

  it('explains bad directions and steps', () => {
    expect(run('hero.move("upp")').error).toMatchObject({
      key: 'api.bad_direction',
      params: { suggestion: 'up' },
      line: 2,
    });
    expect(run('hero.move("Up")').error).toMatchObject({ key: 'api.direction_case' });
    expect(run('hero.move("up", "3")').error).toMatchObject({ key: 'api.steps_text' });
    expect(run('hero.mvoe("up")').error).toMatchObject({
      key: 'api.unknown_action',
      params: { suggestion: 'move' },
    });
  });

  it('allows say but not move when there is no map', () => {
    const r = py.run({
      code: 'from codeweald import hero\nhero.say("hi")\nhero.move("up")',
      stage: { kind: 'npc' },
    });
    expect(r.actions[0]).toMatchObject({ t: 'say', text: 'hi' });
    expect(r.error?.key).toBe('api.no_map');
  });

  it('records print output in order with line numbers', () => {
    const r = py.run({ code: 'print("a")\nprint("b", end="")\nprint("c")' });
    expect(r.actions).toEqual([
      { t: 'out', stream: 'stdout', text: 'a\n', ln: 1 },
      { t: 'out', stream: 'stdout', text: 'bc\n', ln: 3 },
    ]);
  });
});

describe('hero queries and edge cases (F-API-07)', () => {
  it('reports position, facing and inventory', () => {
    const r = run(
      'hero.move("right", 2)\nhero.pick_up()\nhero.face("down")\nprint(hero.position(), hero.facing, hero.inventory())',
    );
    expect(r.status).toBe('ok');
    expect(r.output).toBe("(3, 1) down ['gem']\n");
  });

  it('caps what the hero says at 200 characters', () => {
    const r = run('hero.say("x" * 300)');
    const said = r.actions.find((a) => a.t === 'say') as { text: string };
    expect(said.text).toHaveLength(200);
    expect(said.text.endsWith('…')).toBe(true);
  });

  it('opens a chest once, and only where there is one', () => {
    const r = run(
      'hero.move("right", 3)\nprint(hero.open_chest(1234))\nprint(hero.open_chest(1234))\nhero.face("down")\nprint(hero.open_chest(1234))',
    );
    expect(r.output).toBe('True\nTrue\nFalse\n');
    const chests = r.actions.filter((a) => a.t === 'chest');
    expect(chests).toMatchObject([
      { ok: true, loot: ['crown'] },
      { ok: true, loot: [] },
      { ok: false, missing: true },
    ]);
    expect(r.world?.inventory).toEqual(['crown']);
  });

  it("records the line inside the student's own function", () => {
    const r = run('def walk():\n    hero.move("right")\n\nwalk()\nwalk()');
    expect(r.actions.map((a) => a.ln)).toEqual([3, 3]);
  });
});
