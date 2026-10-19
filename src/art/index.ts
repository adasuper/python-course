/**
 * Codeweald's original pixel art, defined as text so it can be read, diffed and
 * edited without an image editor. `scripts/make-art.ts` renders it to PNG
 * spritesheets in `public/assets/art/`.
 */
export type { PixelSprite } from './types';
export { PALETTE, SHARED_PALETTE } from './palette';
export { TILES, TILE_NAMES, PROP_TILES } from './tiles';
export { ITEMS, ITEM_NAMES } from './items';
export {
  AVATARS,
  THEMES,
  DIRECTIONS,
  CHARACTERS,
  BYTE_PORTRAIT,
  avatarFrames,
  type AvatarArt,
  type Direction,
  type Theme,
} from './characters';
export { checkSprite } from './helpers';
