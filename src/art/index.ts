/**
 * Codeweald's original pixel art, defined as text so it can be read, diffed and
 * edited without an image editor. `scripts/make-art.ts` renders it to PNG
 * spritesheets in `public/assets/art/`.
 */
import { CHARACTERS as BASE_CHARACTERS } from './characters';
import { ITEMS as BASE_ITEMS } from './items';
import { REGION_ART } from './regions';
import { PROP_TILES as BASE_PROPS, TILES as BASE_TILES } from './tiles';
import type { PixelSprite } from './types';

export type { PixelSprite } from './types';
export { PALETTE, SHARED_PALETTE } from './palette';
export {
  AVATARS,
  THEMES,
  DIRECTIONS,
  BYTE_PORTRAIT,
  avatarFrames,
  type AvatarArt,
  type Direction,
  type Theme,
} from './characters';
export { checkSprite } from './helpers';

const byName = (sprites: PixelSprite[]) => Object.fromEntries(sprites.map((s) => [s.name, s]));

/** Region 1's art plus every later region's (src/art/regions). Names must not repeat. */
export const TILES: Record<string, PixelSprite> = {
  ...BASE_TILES,
  ...byName(REGION_ART.flatMap((r) => r.tiles)),
};
export const TILE_NAMES: string[] = Object.keys(TILES);
export const PROP_TILES = new Set([...BASE_PROPS, ...REGION_ART.flatMap((r) => r.props)]);
export const CHARACTERS: Record<string, PixelSprite> = {
  ...BASE_CHARACTERS,
  ...byName(REGION_ART.flatMap((r) => r.characters)),
};
export const ITEMS: Record<string, PixelSprite> = {
  ...BASE_ITEMS,
  ...byName(REGION_ART.flatMap((r) => r.items)),
};
export const ITEM_NAMES: string[] = Object.keys(ITEMS);
