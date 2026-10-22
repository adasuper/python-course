// Words for the map (F-WLD-06): the map picture's name and "Describe surroundings".
import { describe, expect, it } from 'vitest';
import { describeSurroundings, direction, sceneLabel } from '../../src/game/describe';
import type { OverworldObject } from '../../src/content/types';

const objects: OverworldObject[] = [
  { kind: 'spawn', at: [5, 5] },
  { kind: 'npc', id: 'crier', at: [7, 5] },
  { kind: 'npc', id: 'baker', at: [5, 1] },
  { kind: 'board', at: [4, 6] },
  { kind: 'sign', at: [9, 9], text: 'Hi' },
  { kind: 'poi', id: 'nook', at: [5, 6] },
  { kind: 'exit', at: [5, 12], text: 'The road' },
] as unknown as OverworldObject[];
const map = {
  name: 'Hearthvale square',
  overworld: { objects },
  npcs: { crier: { name: 'The Crier' }, baker: { name: 'Baker Bun' } },
};

describe('map descriptions', () => {
  it('gives directions in tiles', () => {
    expect(direction([5, 5], [7, 5])).toBe('2 tiles right');
    expect(direction([5, 5], [4, 6])).toBe('1 tile down and 1 tile left');
    expect(direction([5, 5], [5, 5])).toBe('right here');
  });

  it("names the map picture after the place and what's nearest", () => {
    expect(sceneLabel(map, [6, 5])).toBe('Hearthvale square. The Crier is 1 tile right.');
  });

  it('describes the three nearest things and the way out, never secret corners', () => {
    const text = describeSurroundings(map, [5, 5]);
    expect(text).toBe(
      'Hearthvale square. The Crier is 2 tiles right. The Quest Board is 1 tile down and 1 tile left. ' +
        'Baker Bun is 4 tiles up. The way out is 7 tiles down. Press Q for the quest log.',
    );
    expect(text).not.toContain('nook');
  });
});
