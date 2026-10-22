import type { PixelSprite } from '../types';

/** One region's art. `props` names the tiles drawn with a see-through background, to sit on
 *  top of a ground tile (like trees and signs). */
export interface RegionArt {
  characters: PixelSprite[];
  tiles: PixelSprite[];
  props: string[];
  items: PixelSprite[];
}
