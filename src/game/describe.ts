// Words for the map (F-WLD-06, docs/specs.md §14.1): where the people, signs, the Quest Board
// and the way out are, as seen from the hero.
import type { OverworldObject } from '../content/types';
import type { XY } from '../runtime/protocol';

interface MapInfo {
  name: string;
  overworld: { objects: OverworldObject[] };
  npcs: Record<string, { name: string }>;
}

const tiles = (n: number) => `${n} ${n === 1 ? 'tile' : 'tiles'}`;

/** "2 tiles up and 1 tile right", or "right here". */
export function direction(from: XY, to: XY): string {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const parts = [
    dy < 0 ? `${tiles(-dy)} up` : dy > 0 ? `${tiles(dy)} down` : '',
    dx < 0 ? `${tiles(-dx)} left` : dx > 0 ? `${tiles(dx)} right` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' and ') : 'right here';
}

function nameOf(map: MapInfo, o: OverworldObject): string {
  if (o.kind === 'npc') return map.npcs[o.id ?? '']?.name ?? 'Someone';
  if (o.kind === 'board') return 'The Quest Board';
  if (o.kind === 'exit') return 'The way out';
  return 'A sign';
}

const distance = (a: XY, b: XY) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

function nearest(map: MapInfo, at: XY, kinds: OverworldObject['kind'][], count: number) {
  return map.overworld.objects
    .filter((o) => kinds.includes(o.kind))
    .sort((a, b) => distance(a.at, at) - distance(b.at, at))
    .slice(0, count)
    .map((o) => `${nameOf(map, o)} is ${direction(at, o.at)}.`);
}

/** One sentence for the map picture: the place and the nearest person or thing. */
export function sceneLabel(map: MapInfo, at: XY): string {
  return [`${map.name}.`, ...nearest(map, at, ['npc', 'board', 'sign'], 1)].join(' ');
}

/** "Describe surroundings": the three nearest people or things, and the nearest way out. */
export function describeSurroundings(map: MapInfo, at: XY): string {
  return [
    `${map.name}.`,
    ...nearest(map, at, ['npc', 'board', 'sign'], 3),
    ...nearest(map, at, ['exit'], 1),
    'Press Q for the quest log.',
  ].join(' ');
}
