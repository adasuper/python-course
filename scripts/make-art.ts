/**
 * Renders Codeweald's original pixel art (src/art/) to PNG files in public/assets/art/.
 *
 *   npx tsx scripts/make-art.ts
 *
 * Output:
 *   tiles.png + tiles.json            16×16 tile sheet and frame index
 *   characters.png + characters.json  avatars (every theme/direction/frame), Byte, villagers, Bugs
 *   portraits/byte-0.png, byte-1.png  32×32 dialogue portraits
 *   portraits/<character>.png         16×16 portraits of villagers and Bugs (shown at 64 px)
 *   icons/<item>.png                  item icons for the DOM
 *   icons/avatar-N-<theme>.png        character-creator icons
 *   preview.html                      a contact sheet for reviewing the art
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AVATARS,
  BYTE_PORTRAIT,
  CHARACTERS,
  DIRECTIONS,
  ITEMS,
  THEMES,
  TILES,
  avatarFrames,
  checkSprite,
  type PixelSprite,
} from '../src/art/index';
import { encodePng } from './lib/png';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'art');
const FRAME = 16;
const SHEET_COLUMNS = 16;

type Rgba = [number, number, number, number];

function hexToRgba(hex: string): Rgba {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255];
}

/** A frame plus the palette it is drawn in. */
interface Cell {
  key: string;
  frame: string[];
  palette: Record<string, string>;
}

function paint(target: Uint8Array, targetWidth: number, ox: number, oy: number, cell: Cell): void {
  cell.frame.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row.charAt(x);
      if (c === '.') continue;
      const hex = cell.palette[c];
      if (!hex) throw new Error(`${cell.key}: colour "${c}" missing from palette`);
      const [r, g, b, a] = hexToRgba(hex);
      const i = ((oy + y) * targetWidth + (ox + x)) * 4;
      target[i] = r;
      target[i + 1] = g;
      target[i + 2] = b;
      target[i + 3] = a;
    }
  });
}

function renderSingle(cell: Cell): Buffer {
  const h = cell.frame.length;
  const w = cell.frame[0]?.length ?? 0;
  const rgba = new Uint8Array(w * h * 4);
  paint(rgba, w, 0, 0, cell);
  return encodePng(w, h, rgba);
}

interface SheetIndex {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  frames: Record<string, number>;
}

function renderSheet(cells: Cell[]): { png: Buffer; index: SheetIndex } {
  const rows = Math.max(1, Math.ceil(cells.length / SHEET_COLUMNS));
  const width = SHEET_COLUMNS * FRAME;
  const height = rows * FRAME;
  const rgba = new Uint8Array(width * height * 4);
  const frames: Record<string, number> = {};
  cells.forEach((cell, i) => {
    paint(rgba, width, (i % SHEET_COLUMNS) * FRAME, Math.floor(i / SHEET_COLUMNS) * FRAME, cell);
    frames[cell.key] = i;
  });
  return {
    png: encodePng(width, height, rgba),
    index: { frameWidth: FRAME, frameHeight: FRAME, columns: SHEET_COLUMNS, frames },
  };
}

/** Cells for a sprite: frame 0 under the bare name and `name:N` for every frame. */
function spriteCells(s: PixelSprite): Cell[] {
  return s.frames.map((frame, i) => ({ key: `${s.name}:${i}`, frame, palette: s.palette }));
}

function withBareAliases(cells: Cell[], index: SheetIndex): SheetIndex {
  const frames = { ...index.frames };
  for (const cell of cells) {
    if (cell.key.endsWith(':0')) frames[cell.key.slice(0, -2)] = index.frames[cell.key] ?? 0;
  }
  return { ...index, frames };
}

function dataUri(png: Buffer): string {
  return `data:image/png;base64,${png.toString('base64')}`;
}

const started = performance.now();

// Validate everything first so a typo in the art gives a clear error.
const allSprites = [
  ...Object.values(TILES),
  ...Object.values(CHARACTERS),
  ...Object.values(ITEMS),
  BYTE_PORTRAIT,
];
allSprites.forEach(checkSprite);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'portraits'), { recursive: true });
mkdirSync(join(OUT, 'icons'), { recursive: true });

// ── Tiles ──
const tileCells = Object.values(TILES).flatMap(spriteCells);
const tileSheet = renderSheet(tileCells);
const tileIndex = withBareAliases(tileCells, tileSheet.index);
writeFileSync(join(OUT, 'tiles.png'), tileSheet.png);
writeFileSync(join(OUT, 'tiles.json'), JSON.stringify(tileIndex, null, 2));

// ── Characters ──
const avatarCells: Cell[] = [];
for (const avatar of AVATARS) {
  for (const theme of THEMES) {
    const art = avatarFrames(avatar.id, theme.id);
    for (const dir of DIRECTIONS) {
      art[dir].forEach((frame, i) => {
        avatarCells.push({ key: `${avatar.id}:${theme.id}:${dir}:${i}`, frame, palette: art.palette });
      });
    }
  }
}
for (const cell of avatarCells) {
  checkSprite({ name: cell.key, width: FRAME, height: FRAME, frames: [cell.frame], palette: cell.palette });
}
const otherCharacterCells = Object.values(CHARACTERS).flatMap(spriteCells);
const characterCells = [...avatarCells, ...otherCharacterCells];
const characterSheet = renderSheet(characterCells);
const characterIndex = withBareAliases(otherCharacterCells, characterSheet.index);
writeFileSync(join(OUT, 'characters.png'), characterSheet.png);
writeFileSync(join(OUT, 'characters.json'), JSON.stringify(characterIndex, null, 2));

// ── Portraits ──
BYTE_PORTRAIT.frames.forEach((frame, i) => {
  writeFileSync(
    join(OUT, 'portraits', `byte-${i}.png`),
    renderSingle({ key: `byte_portrait:${i}`, frame, palette: BYTE_PORTRAIT.palette }),
  );
});
for (const character of Object.values(CHARACTERS)) {
  writeFileSync(
    join(OUT, 'portraits', `${character.name}.png`),
    renderSingle({ key: character.name, frame: character.frames[0] ?? [], palette: character.palette }),
  );
}

// ── Icons ──
const iconPngs: Record<string, Buffer> = {};
for (const item of Object.values(ITEMS)) {
  const frame = item.frames[0] ?? [];
  const png = renderSingle({ key: item.name, frame, palette: item.palette });
  iconPngs[item.name] = png;
  writeFileSync(join(OUT, 'icons', `${item.name}.png`), png);
}
const avatarIconPngs: Record<string, Buffer> = {};
for (const avatar of AVATARS) {
  for (const theme of THEMES) {
    const art = avatarFrames(avatar.id, theme.id);
    const png = renderSingle({ key: avatar.id, frame: art.down[0] ?? [], palette: art.palette });
    avatarIconPngs[`${avatar.id}-${theme.id}`] = png;
    writeFileSync(join(OUT, 'icons', `${avatar.id}-${theme.id}.png`), png);
  }
}

// ── Preview contact sheet ──
function previewScene(): Buffer {
  // A 12×8 village corner: ground first, then props, then characters.
  const ground = [
    'ggggggggpggg',
    'gHHHgggfpggg',
    'gRRRgggfpggg',
    'gWDWgggfpggg',
    'gppppppppppp',
    'gggfgggpgwww',
    'ggggggggpwww',
    'gggggfgggwww',
  ];
  const props = [
    'T..........T',
    '.......Q....',
    '............',
    '........S...',
    '............',
    '..L.....B...',
    '............',
    'R...........',
  ];
  const groundTiles: Record<string, string> = {
    g: 'grass',
    f: 'flowers',
    p: 'path',
    H: 'house_roof',
    R: 'house_roof',
    W: 'house_window',
    D: 'house_door',
    w: 'water',
  };
  const propTiles: Record<string, string> = {
    T: 'tree',
    Q: 'quest_board',
    S: 'sign',
    L: 'lamp_post',
    B: 'bush',
    R: 'rock',
  };
  const width = 12 * FRAME;
  const height = 8 * FRAME;
  const rgba = new Uint8Array(width * height * 4);
  const put = (name: string, x: number, y: number, sheet: Record<string, PixelSprite>) => {
    const s = sheet[name];
    if (!s) return;
    paint(rgba, width, x * FRAME, y * FRAME, { key: name, frame: s.frames[0] ?? [], palette: s.palette });
  };
  ground.forEach((row, y) => [...row].forEach((c, x) => put(groundTiles[c] ?? 'grass', x, y, TILES)));
  props.forEach((row, y) =>
    [...row].forEach((c, x) => (propTiles[c] ? put(propTiles[c], x, y, TILES) : undefined)),
  );
  const hero = avatarFrames('avatar-2', 'tide');
  paint(rgba, width, 5 * FRAME, 4 * FRAME, {
    key: 'hero',
    frame: hero.right[0] ?? [],
    palette: hero.palette,
  });
  put('npc_crier', 7, 4, CHARACTERS);
  put('byte', 4, 2, CHARACTERS);
  put('bug_clangle', 10, 3, CHARACTERS);
  return encodePng(width, height, rgba);
}

function img(png: Buffer, label: string, scaleBy = 4): string {
  return `<figure><img src="${dataUri(png)}" alt="${label}" style="width:${16 * scaleBy}px"><figcaption>${label}</figcaption></figure>`;
}

const tileFigures = Object.values(TILES)
  .flatMap((s) =>
    s.frames.map((frame, i) =>
      img(
        renderSingle({ key: s.name, frame, palette: s.palette }),
        s.frames.length > 1 ? `${s.name}:${i}` : s.name,
      ),
    ),
  )
  .join('');
const characterFigures = Object.values(CHARACTERS)
  .flatMap((s) =>
    s.frames.map((frame, i) =>
      img(renderSingle({ key: s.name, frame, palette: s.palette }), `${s.name}:${i}`),
    ),
  )
  .join('');
const avatarDirectionFigures = AVATARS.map((a) => {
  const art = avatarFrames(a.id, 'moss');
  const cells = DIRECTIONS.flatMap((d) =>
    art[d].map((frame, i) => img(renderSingle({ key: a.id, frame, palette: art.palette }), `${d} ${i}`)),
  ).join('');
  return `<div class="row"><h3>${a.id} — ${a.alt}</h3>${cells}</div>`;
}).join('');
const avatarThemeFigures = AVATARS.map(
  (a) =>
    `<div class="row"><h3>${a.id}</h3>${THEMES.map((t) => img(avatarIconPngs[`${a.id}-${t.id}`] ?? Buffer.alloc(0), t.name)).join('')}</div>`,
).join('');
const itemFigures = Object.entries(iconPngs)
  .map(([name, png]) => img(png, name))
  .join('');
const portraitFigures = BYTE_PORTRAIT.frames
  .map((frame, i) =>
    img(
      renderSingle({ key: 'byte_portrait', frame, palette: BYTE_PORTRAIT.palette }),
      `byte_portrait:${i}`,
      4,
    ),
  )
  .join('')
  .replaceAll('width:64px', 'width:128px');

const preview = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Codeweald Art Preview</title>
<style>
  body { font-family: system-ui, sans-serif; background: #2b1d2e; color: #fff6e0; margin: 0; padding: 16px; }
  h1, h2, h3 { margin: 16px 0 8px; } h3 { font-size: 14px; width: 100%; }
  section { background: #3a2a3e; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
  .grid, .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
  figure { margin: 0; text-align: center; font-size: 11px; }
  img { image-rendering: pixelated; display: block; background: #6cbf4a33; }
  .scene img { width: 768px; max-width: 100%; }
</style>
</head>
<body>
<h1>Codeweald art preview</h1>
<p>Original art, CC0. Generated by <code>scripts/make-art.ts</code> from <code>src/art/</code>. Everything is shown at 4×.</p>
<section class="scene"><h2>Sample village scene</h2><img src="${dataUri(previewScene())}" alt="A sample village scene"></section>
<section><h2>Tiles</h2><div class="grid">${tileFigures}</div></section>
<section><h2>Byte, villagers and Bugs</h2><div class="grid">${characterFigures}</div><div class="grid">${portraitFigures}</div></section>
<section><h2>Avatars (moss theme, every direction and walk frame)</h2>${avatarDirectionFigures}</section>
<section><h2>Avatars × themes</h2>${avatarThemeFigures}</section>
<section><h2>Items</h2><div class="grid">${itemFigures}</div></section>
</body>
</html>
`;
writeFileSync(join(OUT, 'preview.html'), preview);

const ms = Math.round(performance.now() - started);
const kb = (b: Buffer) => `${(b.length / 1024).toFixed(1)} KB`;
console.log(
  `make-art: ${Object.keys(TILES).length} tiles (${tileCells.length} frames, ${kb(tileSheet.png)}), ` +
    `${characterCells.length} character frames (${kb(characterSheet.png)}), ` +
    `${Object.keys(ITEMS).length} item icons, ${Object.keys(avatarIconPngs).length} avatar icons, ${2 + Object.keys(CHARACTERS).length} portraits ` +
    `→ public/assets/art in ${ms} ms`,
);
