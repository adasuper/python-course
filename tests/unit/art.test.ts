import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  AVATARS,
  BYTE_PORTRAIT,
  CHARACTERS,
  DIRECTIONS,
  ITEMS,
  THEMES,
  TILES,
  avatarFrames,
  type PixelSprite,
} from '../../src/art/index';
import { encodePng, PNG_SIGNATURE } from '../../scripts/lib/png';

const REQUIRED_TILES = [
  'grass',
  'grass_alt',
  'flowers',
  'path',
  'cobble',
  'water',
  'sand',
  'tree',
  'bush',
  'rock',
  'fence_h',
  'fence_v',
  'hedge',
  'house_wall',
  'house_roof',
  'house_door',
  'house_window',
  'well',
  'sign',
  'quest_board',
  'market_stall',
  'crier_podium',
  'bridge',
  'lamp_post',
  'stone_wall',
  'floor',
  'wall',
  'exit',
  'door',
  'chest_closed',
  'chest_open',
];
const REQUIRED_CHARACTERS = [
  'byte',
  'npc_crier',
  'npc_baker',
  'npc_miller',
  'npc_painter',
  'npc_villager_a',
  'npc_villager_b',
  'npc_librarian',
  'bug_clangle',
  'bug_generic',
  'firefly',
];
const REQUIRED_ITEMS = [
  'quill',
  'feather',
  'spyglass',
  'script_fragment',
  'gem',
  'coin',
  'key',
  'star',
  'jar',
  'scroll',
  'lamp',
  'duck',
];
const REQUIRED_THEMES = ['ember', 'moss', 'tide', 'plum', 'sun', 'slate'];

function expectWellFormed(s: PixelSprite) {
  expect(s.frames.length, `${s.name} has frames`).toBeGreaterThan(0);
  for (const [fi, frame] of s.frames.entries()) {
    expect(frame.length, `${s.name} frame ${fi} height`).toBe(s.height);
    for (const [y, row] of frame.entries()) {
      expect(row.length, `${s.name} frame ${fi} row ${y} width`).toBe(s.width);
      for (const c of row) {
        if (c !== '.') expect(s.palette, `${s.name} frame ${fi} row ${y} colour "${c}"`).toHaveProperty(c);
      }
    }
  }
  for (const [key, hex] of Object.entries(s.palette)) {
    expect(key, `${s.name} palette key`).not.toBe('.');
    expect(hex, `${s.name} palette "${key}"`).toMatch(/^#[0-9a-f]{6}$/i);
  }
}

describe('pixel art', () => {
  it('has every required tile, 16×16', () => {
    for (const name of REQUIRED_TILES) {
      expect(TILES, name).toHaveProperty(name);
      expect(TILES[name]?.width).toBe(16);
      expect(TILES[name]?.height).toBe(16);
    }
    expect(TILES.water?.frames.length).toBe(2);
  });

  it('has every required character and item', () => {
    for (const name of REQUIRED_CHARACTERS) {
      expect(CHARACTERS, name).toHaveProperty(name);
      expect(CHARACTERS[name]?.frames.length, `${name} frames`).toBe(2);
    }
    for (const name of REQUIRED_ITEMS) expect(ITEMS, name).toHaveProperty(name);
  });

  it('draws every tile, character and item correctly', () => {
    [...Object.values(TILES), ...Object.values(CHARACTERS), ...Object.values(ITEMS)].forEach(
      expectWellFormed,
    );
  });

  it("draws Byte's 32×32 portrait in two frames", () => {
    expect(BYTE_PORTRAIT.width).toBe(32);
    expect(BYTE_PORTRAIT.height).toBe(32);
    expect(BYTE_PORTRAIT.frames.length).toBe(2);
    expectWellFormed(BYTE_PORTRAIT);
  });

  it('has 8 avatars with alt text and the 6 themes', () => {
    expect(AVATARS.map((a) => a.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => `avatar-${n}`));
    for (const a of AVATARS) expect(a.alt.length, a.id).toBeGreaterThan(5);
    expect(THEMES.map((t) => t.id)).toEqual(REQUIRED_THEMES);
    for (const t of THEMES) {
      expect(t.cloak).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('draws every avatar × theme × direction with 2 walk frames', () => {
    for (const a of AVATARS) {
      for (const t of THEMES) {
        const art = avatarFrames(a.id, t.id);
        for (const dir of DIRECTIONS) {
          expect(art[dir].length, `${a.id}/${t.id}/${dir}`).toBe(2);
          expectWellFormed({
            name: `${a.id}/${t.id}/${dir}`,
            width: 16,
            height: 16,
            frames: art[dir],
            palette: art.palette,
          });
        }
      }
    }
  });

  it('mirrors left-facing art for right-facing art', () => {
    const art = avatarFrames('avatar-1', 'moss');
    expect(art.right[0]?.[6]).toBe([...(art.left[0]?.[6] ?? '')].reverse().join(''));
  });

  it('rejects unknown avatars and themes', () => {
    expect(() => avatarFrames('avatar-99', 'moss')).toThrow();
    expect(() => avatarFrames('avatar-1', 'neon')).toThrow();
  });
});

describe('PNG encoder', () => {
  it('writes a valid signature, IHDR size and pixel data', () => {
    const w = 3;
    const h = 2;
    const rgba = new Uint8Array(w * h * 4).map((_, i) => i % 256);
    const png = encodePng(w, h, rgba);
    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(png.toString('ascii', 12, 16)).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(w);
    expect(png.readUInt32BE(20)).toBe(h);
    // Colour type 6 = RGBA, bit depth 8.
    expect(png[24]).toBe(8);
    expect(png[25]).toBe(6);

    const idatLength = png.readUInt32BE(33);
    expect(png.toString('ascii', 37, 41)).toBe('IDAT');
    const raw = inflateSync(png.subarray(41, 41 + idatLength));
    expect(raw.length).toBe((w * 4 + 1) * h);
    expect(raw[0]).toBe(0); // filter byte
    expect([...raw.subarray(1, 5)]).toEqual([0, 1, 2, 3]);
  });

  it('rejects a buffer of the wrong size', () => {
    expect(() => encodePng(2, 2, new Uint8Array(3))).toThrow();
  });
});
