/**
 * A sprite drawn as text. Each frame is `height` rows of `width` characters.
 * `'.'` is always transparent; every other character is looked up in `palette`
 * and must map to a `#rrggbb` colour.
 */
export interface PixelSprite {
  name: string;
  width: number;
  height: number;
  frames: string[][];
  palette: Record<string, string>;
}
