import type { PixelSprite } from './types';

/** One frame of pixel art: an array of equal-length rows. */
export type Frame = string[];

/**
 * Tagged template for drawing a frame as text.
 * Each non-blank line is one row; surrounding whitespace is ignored.
 */
export function px(strings: TemplateStringsArray, ...values: unknown[]): Frame {
  let text = '';
  strings.forEach((part, i) => {
    text += part + (i < values.length ? String(values[i]) : '');
  });
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** A fully transparent frame. */
export function blank(width = 16, height = 16): Frame {
  return Array.from({ length: height }, () => '.'.repeat(width));
}

/** Mirror left-right (used to make right-facing sprites from left-facing ones). */
export function mirrorX(frame: Frame): Frame {
  return frame.map((row) => [...row].reverse().join(''));
}

/**
 * Paint `layer` on top of `base`. Transparent (`'.'`) layer pixels keep the base pixel.
 * The layer may be shorter than the base; it starts at row `top`.
 */
export function overlay(base: Frame, layer: Frame, top = 0): Frame {
  const out = [...base];
  layer.forEach((layerRow, i) => {
    const y = top + i;
    const baseRow = out[y];
    if (baseRow === undefined) return;
    let row = '';
    for (let x = 0; x < baseRow.length; x++) {
      const c = layerRow.charAt(x);
      row += c === '' || c === '.' ? baseRow.charAt(x) : c;
    }
    out[y] = row;
  });
  return out;
}

/** Apply several full-size layers in order. */
export function stack(base: Frame, ...layers: Frame[]): Frame {
  return layers.reduce((acc, layer) => overlay(acc, layer), base);
}

/** Shift a frame sideways by `dx` pixels (no wrap unless `wrap` is true). */
export function shiftX(frame: Frame, dx: number, wrap = false): Frame {
  return frame.map((row) => {
    const w = row.length;
    let out = '';
    for (let x = 0; x < w; x++) {
      let src = x - dx;
      if (wrap) src = ((src % w) + w) % w;
      out += src >= 0 && src < w ? row.charAt(src) : '.';
    }
    return out;
  });
}

/**
 * Move rows `[from, to)` down by one pixel (the row at `to - 1` is pushed onto row `to`,
 * replacing it). Used for a gentle "breathing" bob without clipping the feet.
 */
export function bobRows(frame: Frame, from: number, to: number): Frame {
  const out = [...frame];
  for (let y = to; y > from; y--) {
    const src = frame[y - 1];
    if (src !== undefined && y < out.length) out[y] = src;
  }
  out[from] = '.'.repeat(frame[0]?.length ?? 16);
  return out;
}

/** Replace characters (e.g. swap two wheel shades for a "turning" frame). */
export function recolor(frame: Frame, map: Record<string, string>): Frame {
  return frame.map((row) => [...row].map((c) => map[c] ?? c).join(''));
}

/** Replace characters only inside rows `[from, to)`. */
export function recolorRows(frame: Frame, from: number, to: number, map: Record<string, string>): Frame {
  return frame.map((row, y) => (y >= from && y < to ? [...row].map((c) => map[c] ?? c).join('') : row));
}

/** Nearest-neighbour upscale by an integer factor. */
export function scale(frame: Frame, k: number): Frame {
  const out: Frame = [];
  for (const row of frame) {
    const wide = [...row].map((c) => c.repeat(k)).join('');
    for (let i = 0; i < k; i++) out.push(wide);
  }
  return out;
}

/** Set single pixels: `[x, y, char]` triples. */
export function plot(frame: Frame, points: [number, number, string][]): Frame {
  const out = frame.map((row) => [...row]);
  for (const [x, y, c] of points) {
    const row = out[y];
    if (row && x >= 0 && x < row.length) row[x] = c;
  }
  return out.map((row) => row.join(''));
}

/** Build a sprite; width and height come from the first frame. */
export function sprite(name: string, frames: Frame[], palette: Record<string, string>): PixelSprite {
  const first = frames[0] ?? [];
  return { name, width: first[0]?.length ?? 0, height: first.length, frames, palette };
}

/** Throws if any frame of the sprite has the wrong size or an unknown colour. */
export function checkSprite(s: PixelSprite): void {
  s.frames.forEach((frame, fi) => {
    if (frame.length !== s.height) {
      throw new Error(`${s.name} frame ${fi}: ${frame.length} rows, expected ${s.height}`);
    }
    frame.forEach((row, y) => {
      if (row.length !== s.width) {
        throw new Error(
          `${s.name} frame ${fi} row ${y}: "${row}" is ${row.length} wide, expected ${s.width}`,
        );
      }
      for (const c of row) {
        if (c !== '.' && !(c in s.palette)) {
          throw new Error(`${s.name} frame ${fi} row ${y}: colour "${c}" is not in the palette`);
        }
      }
    });
  });
}
