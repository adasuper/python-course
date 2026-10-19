// What map characters mean, for drawing. Quest stages mirror the Python legend in
// src/python/codeweald/_world.py (a unit test keeps them in sync).
import type { LegendEntry, StageSpec } from '../runtime/protocol';

export interface OverworldCell {
  tile: string;
  over?: string;
  solid?: boolean;
}

/** Default overworld legend; regions can add entries in `overworld.legend`. */
export const OVERWORLD_LEGEND: Record<string, OverworldCell> = {
  '.': { tile: 'grass' },
  ',': { tile: 'grass_alt' },
  '"': { tile: 'flowers' },
  '=': { tile: 'path' },
  ':': { tile: 'cobble' },
  '~': { tile: 'water', solid: true },
  s: { tile: 'sand' },
  T: { tile: 'grass', over: 'tree', solid: true },
  b: { tile: 'grass', over: 'bush', solid: true },
  o: { tile: 'grass', over: 'rock', solid: true },
  '-': { tile: 'grass', over: 'fence_h', solid: true },
  '|': { tile: 'grass', over: 'fence_v', solid: true },
  h: { tile: 'hedge', solid: true },
  W: { tile: 'house_wall', solid: true },
  R: { tile: 'house_roof', solid: true },
  d: { tile: 'house_door', solid: true },
  w: { tile: 'house_window', solid: true },
  O: { tile: 'cobble', over: 'well', solid: true },
  '#': { tile: 'stone_wall', solid: true },
  B: { tile: 'bridge' },
  L: { tile: 'grass', over: 'lamp_post', solid: true },
  M: { tile: 'cobble', over: 'market_stall', solid: true },
};

/** Mirrors DEFAULT_LEGEND in _world.py. */
export const STAGE_LEGEND: Record<string, LegendEntry> = {
  '#': { tile: 'wall', solid: true },
  '.': { tile: 'floor' },
  ' ': { tile: 'floor' },
  H: { tile: 'floor', hero: true },
  E: { tile: 'exit' },
  '~': { tile: 'water', solid: true },
  D: { tile: 'floor', object: 'door' },
  C: { tile: 'floor', object: 'chest' },
  N: { tile: 'floor', object: 'npc' },
  g: { tile: 'floor', item: 'gem' },
  k: { tile: 'floor', item: 'key' },
  $: { tile: 'floor', item: 'coin' },
  '*': { tile: 'floor', item: 'star' },
};

export function stageRows(stage: StageSpec): string[] {
  const rows = (stage.grid ?? '').split('\n');
  while (rows.length && rows[rows.length - 1]!.trim() === '') rows.pop();
  return rows;
}

export function stageCell(stage: StageSpec, ch: string): LegendEntry {
  return stage.legend?.[ch] ?? STAGE_LEGEND[ch] ?? { tile: 'floor' };
}

export function overworldCell(legend: Record<string, OverworldCell>, ch: string): OverworldCell {
  return legend[ch] ?? OVERWORLD_LEGEND[ch] ?? { tile: 'grass' };
}
