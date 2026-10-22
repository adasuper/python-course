import {
  bobRows,
  mirrorX,
  overlay,
  plot,
  px,
  recolorRows,
  scale,
  shiftX,
  sprite,
  stack,
  type Frame,
} from './helpers';
import type { PixelSprite } from './types';

/*
 * Characters are 16×16 and built from layers drawn with "role" characters:
 *
 *   O outline   1 skin   2 skin shade   3 hair   4 hair shade   e eyes
 *   5 cloak     6 cloak shade           7 trousers   8 shoes
 *   G glasses   L lens glint   W/w wheel (dark/light)  9 wheelchair seat
 *   Y sparkle (the stars of a bump, the sparkles of a celebration)
 *   a b c x z   accessory colours (hats, aprons, bells…), set per character
 *
 * A palette per character maps roles to real colours, so one body template
 * serves every avatar, theme and villager. Left-facing art is mirrored for right.
 */

export type Direction = 'down' | 'up' | 'left' | 'right';
export const DIRECTIONS: Direction[] = ['down', 'up', 'left', 'right'];

type DrawnDirection = 'down' | 'up' | 'left';
type HairStyle = 'short' | 'long' | 'curly' | 'bun' | 'buzz' | 'covering' | 'none';

// ── Body templates (frame A = standing, frame B = mid-step) ─────────────────────────

const HEAD_DOWN = px`
  ................
  ................
  .....OOOOOO.....
  ....O111111O....
  ...O11111111O...
  ...O11111111O...
  ...O1e1111e1O...
  ...O11111111O...
  ...O21111112O...
  ....O222222O....
`;

const HEAD_UP = px`
  ................
  ................
  .....OOOOOO.....
  ....O111111O....
  ...O11111111O...
  ...O11111111O...
  ...O11111111O...
  ...O11111111O...
  ...O21111112O...
  ....O222222O....
`;

const HEAD_LEFT = px`
  ................
  ................
  .....OOOOOO.....
  ....O111111O....
  ...O11111111O...
  ...O11111111O...
  ...O1e111111O...
  ..O111111111O...
  ...O11111112O...
  ....O222222O....
`;

const TORSO_FRONT = px`
  ...O55555555O...
  ..O5O555555O5O..
  ..O1O566665O1O..
`;

const TORSO_SIDE = px`
  ....O555555O....
  ....O556655O....
  ....O516665O....
`;

const LEGS_FRONT_A = px`
  ....O777777O....
  ....O77OO77O....
  ....O88OO88O....
`;
const LEGS_FRONT_B = px`
  ....O777777O....
  ....O88OO77O....
  .....OO.O88O....
`;
const LEGS_SIDE_A = px`
  ....O777777O....
  .....O7777O.....
  .....O8888O.....
`;
const LEGS_SIDE_B = px`
  ....O777777O....
  ....O77OO77O....
  ...O88O..O88O...
`;

const BODY: Record<DrawnDirection, [Frame, Frame]> = {
  down: [
    [...HEAD_DOWN, ...TORSO_FRONT, ...LEGS_FRONT_A],
    [...HEAD_DOWN, ...TORSO_FRONT, ...LEGS_FRONT_B],
  ],
  up: [
    [...HEAD_UP, ...TORSO_FRONT, ...LEGS_FRONT_A],
    [...HEAD_UP, ...TORSO_FRONT, ...LEGS_FRONT_B],
  ],
  left: [
    [...HEAD_LEFT, ...TORSO_SIDE, ...LEGS_SIDE_A],
    [...HEAD_LEFT, ...TORSO_SIDE, ...LEGS_SIDE_B],
  ],
};

// ── Hair (and head covering) layers ─────────────────────────────────────────────────

const SHORT_DOWN = px`
  ................
  ................
  .....OOOOOO.....
  ....O334333O....
  ...O33333333O...
  ...O33....33O...
  ...O3......3O...
`;
const SHORT_UP = px`
  ................
  ................
  .....OOOOOO.....
  ....O333343O....
  ...O33433333O...
  ...O33333333O...
  ...O33333433O...
  ...O43333334O...
  ...O.444444.O...
`;
const SHORT_LEFT = px`
  ................
  ................
  .....OOOOOO.....
  ....O333343O....
  ...O33333433O...
  ...O3....333O...
  ...O.....333O...
  ..........33O...
  ...........3O...
`;

const HAIR: Record<HairStyle, Record<DrawnDirection, Frame>> = {
  none: { down: [], up: [], left: [] },
  short: { down: SHORT_DOWN, up: SHORT_UP, left: SHORT_LEFT },
  long: {
    down: [
      ...SHORT_DOWN.slice(0, 6),
      ...px`
        ..O33......33O..
        ..O3........3O..
        ..O3........3O..
        ..O33......33O..
        ..OO........OO..
      `,
    ],
    up: [
      ...SHORT_UP,
      ...px`
        ...O33333333O...
        ...O34333343O...
        ....O444444O....
      `,
    ],
    left: [
      ...SHORT_LEFT.slice(0, 7),
      ...px`
        .........3333O..
        .........3333O..
        .........3343O..
        ..........44O...
      `,
    ],
  },
  curly: {
    down: px`
      ....OOOOOOOO....
      ..OO33343333OO..
      .O333433334333O.
      .O343333333343O.
      O33343333334333O
      O3343......3343O
      O343........343O
      .O33........33O.
      ..OO........OO..
    `,
    up: px`
      ....OOOOOOOO....
      ..OO33343333OO..
      .O333433334333O.
      .O343333333343O.
      O33343333334333O
      O33433333343333O
      O34333343333343O
      .O333433333433O.
      ..OO33333333OO..
      ....OOOOOOOO....
    `,
    left: px`
      .....OOOOOOO....
      ...OO3334333OO..
      ..O3334333343O..
      .O333333333343O.
      .O3343333333333O
      .O33.....333343O
      ..O3.....33343O.
      ..........3343O.
      ...........33O..
    `,
  },
  bun: {
    down: [
      ...px`
        ......OOOO......
        .....O3443O.....
        .....O3333O.....
      `,
      ...SHORT_DOWN.slice(3),
    ],
    up: [
      ...px`
        ......OOOO......
        .....O3443O.....
        .....O3333O.....
      `,
      ...SHORT_UP.slice(3),
    ],
    left: [
      ...px`
        ........OOO.....
        .......O344O....
        .....OOO333O....
      `,
      ...SHORT_LEFT.slice(3),
    ],
  },
  buzz: {
    down: px`
      ................
      ................
      .....OOOOOO.....
      ....O444444O....
      ...O4......4O...
    `,
    up: px`
      ................
      ................
      .....OOOOOO.....
      ....O444444O....
      ...O44444444O...
      ...O44444444O...
      ...O44444444O...
      ...O.444444.O...
    `,
    left: px`
      ................
      ................
      .....OOOOOO.....
      ....O444444O....
      ...O44444444O...
      ...O......44O...
      ...O.......4O...
    `,
  },
  covering: {
    down: px`
      ................
      ......OOOO......
      ....OO3333OO....
      ...O33333333O...
      ..O3333333333O..
      ..O33......33O..
      ..O33......33O..
      ..O33......33O..
      ..O343....343O..
      ..O3333333333O..
      ..O4444444444O..
      .....444444.....
    `,
    up: px`
      ................
      ......OOOO......
      ....OO3333OO....
      ...O33333333O...
      ..O3333333333O..
      ..O3333333333O..
      ..O3343333433O..
      ..O3333333333O..
      ..O3333333333O..
      ..O3333333333O..
      ..O4444444444O..
      .....444444.....
    `,
    left: px`
      ................
      .....OOOOOO.....
      ....O333333O....
      ...O33333333O...
      ..O3333333333O..
      ..O3.....3333O..
      ..O3.....3333O..
      .........3333O..
      ...O3....3333O..
      ...O333333333O..
      ...O444444444O..
    `,
  },
};

const GLASSES: Record<DrawnDirection, Frame> = {
  // Square frames around each eye, with a pale lens glint (L) beside the pupil.
  down: px`
    ................
    ................
    ................
    ................
    ................
    ....GGG..GGG....
    ....G.LGGL.G....
    ....GGG..GGG....
  `,
  // From behind, the arms of the glasses are hidden by the hair.
  up: [],
  left: px`
    ................
    ................
    ................
    ................
    ................
    ....GGG.........
    ....G.LGGG......
    ....GGG.........
  `,
};

/** Wheelchair rows 11–15 replace the arms and legs. Frame B swaps wheel shades (turning). */
const WHEELCHAIR: Record<DrawnDirection, Frame> = {
  down: px`
    ..O5O556655O5O..
    .OwO15666651OwO.
    OWwO77777777OwWO
    OwWOO88OO88OOWwO
    .OWO.OOOOOO.OWO.
  `,
  up: px`
    .OwO99999999OwO.
    .OWO99999999OWO.
    OWwO99999999OwWO
    OwWOOOOOOOOOOWwO
    .OWO........OWO.
  `,
  left: px`
    ....O516655O9...
    ..OO77OWWWWO9O..
    ..O8OWwWWwWO9O..
    ..OOOWWwwWWOOO..
    ......OWWWWO....
  `,
};
const WHEELCHAIR_HANDLE_SIDE = px`
  ....O555555Ow...
`;
const WHEELCHAIR_HANDLES_UP = px`
  ..wO55555555Ow..
`;

// ── Avatars and themes ────────────────────────────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  /** Cloak / tunic colour. */
  cloak: string;
  cloakShade: string;
  /** A darker accent for UI (buttons, focus rings) on light backgrounds. */
  accent: string;
}

export const THEMES: Theme[] = [
  { id: 'ember', name: 'Ember', cloak: '#e2583a', cloakShade: '#a83a24', accent: '#b8401f' },
  { id: 'moss', name: 'Moss', cloak: '#5aa63c', cloakShade: '#3c7a2a', accent: '#3a7a28' },
  { id: 'tide', name: 'Tide', cloak: '#3b82d6', cloakShade: '#285ea3', accent: '#2563b0' },
  { id: 'plum', name: 'Plum', cloak: '#9a5cc6', cloakShade: '#6f3d96', accent: '#7a3fa8' },
  { id: 'sun', name: 'Sun', cloak: '#f2b632', cloakShade: '#c48a1c', accent: '#9a6a0c' },
  { id: 'slate', name: 'Slate', cloak: '#6f86a6', cloakShade: '#4c607d', accent: '#4a5f7e' },
];

interface AvatarDef {
  id: string;
  /** Short alt text for the character creator. */
  alt: string;
  skin: [string, string];
  hair: [string, string];
  style: HairStyle;
  glasses?: string;
  wheelchair?: boolean;
}

const AVATAR_DEFS: AvatarDef[] = [
  {
    id: 'avatar-1',
    alt: 'Light skin, short auburn hair',
    skin: ['#f9d6b5', '#e0ad8a'],
    hair: ['#b5532c', '#82361d'],
    style: 'short',
  },
  {
    id: 'avatar-2',
    alt: 'Dark brown skin, curly black hair, gold glasses',
    skin: ['#7a4a2e', '#5b331e'],
    hair: ['#2a1c1a', '#170f0e'],
    style: 'curly',
    glasses: '#f7cd4f',
  },
  {
    id: 'avatar-3',
    alt: 'Tan skin, long black hair',
    skin: ['#c98e5d', '#a66f45'],
    hair: ['#2b2022', '#160f12'],
    style: 'long',
  },
  {
    id: 'avatar-4',
    alt: 'Deep brown skin, buzz-cut black hair',
    skin: ['#5a3622', '#3f2414'],
    hair: ['#24191a', '#120c0d'],
    style: 'buzz',
  },
  {
    id: 'avatar-5',
    alt: 'Medium skin, lavender head covering',
    skin: ['#d9a679', '#b5845a'],
    hair: ['#9b7fd1', '#7459ad'],
    style: 'covering',
  },
  {
    id: 'avatar-6',
    alt: 'Peach skin, blonde hair in a bun',
    skin: ['#f0c29a', '#d29e74'],
    hair: ['#e8c25a', '#bf9638'],
    style: 'bun',
  },
  {
    id: 'avatar-7',
    alt: 'Brown skin, short dark hair, uses a wheelchair',
    skin: ['#9a6340', '#78482b'],
    hair: ['#4a2e1f', '#2f1c12'],
    style: 'short',
    wheelchair: true,
  },
  {
    id: 'avatar-8',
    alt: 'Pale skin, long plum-dyed hair',
    skin: ['#fce4cf', '#e8c0a2'],
    hair: ['#8e4fa0', '#643573'],
    style: 'long',
  },
];

export const AVATARS: { id: string; alt: string }[] = AVATAR_DEFS.map(({ id, alt }) => ({ id, alt }));

const COMMON_ROLES: Record<string, string> = {
  Y: '#ffd84a',
  O: '#2b1d2e',
  e: '#1d1424',
  7: '#4b3b5c',
  8: '#3a2a22',
  W: '#3d3a4a',
  w: '#a8a4b8',
  9: '#5a4a6a',
  L: '#b4e6ff',
};

interface PersonOptions {
  skin: [string, string];
  hair: [string, string];
  style: HairStyle;
  cloak: string;
  cloakShade: string;
  trousers?: string;
  glasses?: string;
  wheelchair?: boolean;
  extraPalette?: Record<string, string>;
}

function personPalette(o: PersonOptions): Record<string, string> {
  return {
    ...COMMON_ROLES,
    1: o.skin[0],
    2: o.skin[1],
    3: o.hair[0],
    4: o.hair[1],
    5: o.cloak,
    6: o.cloakShade,
    ...(o.trousers ? { 7: o.trousers } : {}),
    G: o.glasses ?? '#1d1424',
    ...(o.extraPalette ?? {}),
  };
}

/** Compose one direction's two frames for a person. */
function personFrames(o: PersonOptions, dir: DrawnDirection): [Frame, Frame] {
  return BODY[dir].map((base, i) => {
    let f = stack(base, HAIR[o.style][dir]);
    if (o.glasses) f = overlay(f, GLASSES[dir]);
    if (o.wheelchair) {
      f = overlay(f, WHEELCHAIR[dir], 11);
      if (dir === 'up') f = overlay(f, WHEELCHAIR_HANDLES_UP, 10);
      if (dir === 'left') f = overlay(f, WHEELCHAIR_HANDLE_SIDE, 10);
      // Frame B: the wheels "turn" by swapping their two shades.
      if (i === 1) f = recolorRows(f, 12, 16, { W: 'w', w: 'W' });
    }
    return f;
  }) as [Frame, Frame];
}

export interface AvatarArt {
  down: string[][];
  up: string[][];
  left: string[][];
  right: string[][];
  /** One frame per direction for a bump: stars over the head (F-ONB-03). It is a still
   *  picture, so it also works as the "static bonk icon" with reduced motion (F-API-13). */
  bonk: Record<Direction, string[]>;
  /** Facing the player with both arms up, under sparkles. */
  celebrate: string[];
  palette: Record<string, string>;
}

const DIZZY_STARS = px`
  ..Y.........Y...
  .YYY.......YYY..
  ..Y.........Y...
`;

const SPARKLES = px`
  .Y............Y.
  YYY..........YYY
  .Y............Y.
`;

/** Both arms raised beside the head (starting at row 3). */
const ARMS_UP = px`
  .O1O........O1O.
  .O5O........O5O.
  .O5O........O5O.
  .O5O........O5O.
  .O5O........O5O.
  .O5O........O5O.
  .O5O........O5O.
`;

/** The front torso with the arms gone from the sides (they are up). */
const TORSO_FRONT_ARMS_UP = px`
  ...O55555555O...
  ...O55555555O...
  ...O55666655O...
`;

function celebrateFrame(o: PersonOptions): Frame {
  let f = stack([...HEAD_DOWN, ...TORSO_FRONT_ARMS_UP, ...LEGS_FRONT_A], HAIR[o.style].down);
  if (o.glasses) f = overlay(f, GLASSES.down);
  if (o.wheelchair) {
    f = overlay(f, WHEELCHAIR.down, 11);
    // The chair's armrests stay; the arms themselves are up.
    f = overlay(
      f,
      px`
      ...O55666655O...
      .OwOO566665OOwO.
    `,
      11,
    );
  }
  return stack(f, SPARKLES, [...Array(3).fill('................'), ...ARMS_UP]);
}

/** All four directions (two walk frames each) for one avatar in one colour theme. */
export function avatarFrames(avatarId: string, themeId: string): AvatarArt {
  const def = AVATAR_DEFS.find((a) => a.id === avatarId);
  const theme = THEMES.find((t) => t.id === themeId);
  if (!def) throw new Error(`Unknown avatar "${avatarId}"`);
  if (!theme) throw new Error(`Unknown theme "${themeId}"`);
  const opts: PersonOptions = {
    skin: def.skin,
    hair: def.hair,
    style: def.style,
    cloak: theme.cloak,
    cloakShade: theme.cloakShade,
    glasses: def.glasses,
    wheelchair: def.wheelchair,
  };
  const left = personFrames(opts, 'left');
  const down = personFrames(opts, 'down');
  const up = personFrames(opts, 'up');
  const right = left.map(mirrorX) as [Frame, Frame];
  const dizzy = (f: Frame) => overlay(f, DIZZY_STARS);
  return {
    down,
    up,
    left,
    right,
    bonk: { down: dizzy(down[0]), up: dizzy(up[0]), left: dizzy(left[0]), right: dizzy(right[0]) },
    celebrate: celebrateFrame(opts),
    palette: personPalette(opts),
  };
}

// ── Villagers (facing down, two idle "bob" frames) ────────────────────────────────────

function villager(
  name: string,
  o: PersonOptions,
  accessory: Frame = [],
  points: [number, number, string][] = [],
) {
  const base = plot(stack(BODY.down[0], HAIR[o.style].down, accessory), points);
  const withGlasses = o.glasses ? overlay(base, GLASSES.down) : base;
  // The bob dips the head and torso by one pixel; the feet stay planted.
  return sprite(name, [withGlasses, bobRows(withGlasses, 0, 12)], personPalette(o));
}

const CRIER_HAT_AND_BELL = px`
  ................
  ...OOOOOOOOOO...
  ..OaaaaxaaaaaO..
  .OaabbbbbbbbaaO.
  .OxxxxxxxxxxxxO.
  ..OO........OO..
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ............OxO.
  ...........OxxzO
  ............OzO.
`;

const BAKER_HAT_AND_APRON = px`
  .....OOOOOO.....
  ....OaaaaabO....
  ....OaaaaabO....
  ....ObbbbbbO....
  ...OOOOOOOOOO...
  ................
  ................
  ................
  ................
  ................
  .....aaaaaa.....
  .....aaaaaa.....
  .....abaaba.....
  .....aaaaaa.....
`;

const MILLER_SACK = px`
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ............OOO.
  ...........OaaaO
  ...........OabaO
  ...........OaaaO
  ...........ObbaO
  ............OOO.
`;

const PAINTER_BERET_AND_BRUSH = px`
  ........OO......
  ....OOOOOOOO....
  ...OaaaaaaaabO..
  ..OaaaaaaaaabbO.
  ...OOOOOOOOOOOO.
  ................
  ................
  ................
  ................
  ...x............
  ...z............
  ...z............
`;

const STRAW_HAT = px`
  ....OOOOOOOO....
  ...OaabaabaaO...
  ...OaaaaaaaaO...
  .OOabbbbbbbbaOO.
  OaaaaaaaaaaaaaaO
  .OOOOOOOOOOOOOO.
`;

const LIBRARIAN_BOOK = px`
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  .....OaaaaO.....
  ....O1bbbb1O....
  .....OaaaaO.....
`;

const NPCS: PixelSprite[] = [
  villager(
    'npc_crier',
    {
      skin: ['#e8b48a', '#c48c64'],
      hair: ['#5b3a24', '#3d2616'],
      style: 'short',
      cloak: '#2f68b0',
      cloakShade: '#1f4a82',
      extraPalette: { a: '#b8322a', b: '#7c1f1a', x: '#f7cd4f', z: '#c9972f' },
    },
    CRIER_HAT_AND_BELL,
  ),
  villager(
    'npc_baker',
    {
      skin: ['#a86a44', '#84502f'],
      hair: ['#2b2022', '#160f12'],
      style: 'none',
      cloak: '#d98a4a',
      cloakShade: '#a86630',
      extraPalette: { a: '#fff6e0', b: '#e0cfae' },
    },
    BAKER_HAT_AND_APRON,
  ),
  villager(
    'npc_miller',
    {
      skin: ['#f2c9a2', '#d6a47c'],
      hair: ['#d8d0c8', '#b0a69c'],
      style: 'short',
      cloak: '#b89a6e',
      cloakShade: '#8e7350',
      extraPalette: { a: '#e8d3a8', b: '#c4a874', x: '#fff6e0' },
    },
    MILLER_SACK,
    [
      [6, 10, 'x'],
      [9, 11, 'x'],
      [7, 12, 'x'],
      [10, 10, 'x'],
      [5, 4, 'x'],
      [9, 3, 'x'],
    ],
  ),
  villager(
    'npc_painter',
    {
      skin: ['#d9a679', '#b5845a'],
      hair: ['#3a2a22', '#22170f'],
      style: 'short',
      cloak: '#8fb8de',
      cloakShade: '#6a92ba',
      extraPalette: { a: '#8c5fcc', b: '#64409a', x: '#e2583a', z: '#7d4b30', y: '#f7cd4f', g: '#5aa63c' },
    },
    PAINTER_BERET_AND_BRUSH,
    [
      [6, 11, 'y'],
      [9, 10, 'x'],
      [8, 12, 'g'],
    ],
  ),
  villager(
    'npc_villager_a',
    {
      skin: ['#c98e5d', '#a66f45'],
      hair: ['#6b4226', '#4a2c18'],
      style: 'short',
      cloak: '#5aa63c',
      cloakShade: '#3c7a2a',
      extraPalette: { a: '#e8c25a', b: '#bf9638' },
    },
    STRAW_HAT,
  ),
  villager(
    'npc_villager_b',
    {
      skin: ['#6e4229', '#52301c'],
      hair: ['#8e3b2b', '#64271c'],
      style: 'long',
      cloak: '#4a7cc8',
      cloakShade: '#335a96',
      extraPalette: { x: '#ec6f9c', y: '#f7cd4f' },
    },
    [],
    [
      [11, 4, 'x'],
      [12, 4, 'y'],
      [11, 5, 'x'],
    ],
  ),
  villager(
    'npc_librarian',
    {
      skin: ['#f3cfae', '#d7a983'],
      hair: ['#b9b2c8', '#8f88a0'],
      style: 'bun',
      cloak: '#8c5fcc',
      cloakShade: '#64409a',
      glasses: '#c9972f',
      extraPalette: { a: '#2f68b0', b: '#fff6e0' },
    },
    LIBRARIAN_BOOK,
  ),
];

// ── Byte the owl ────────────────────────────────────────────────────────────────────

const BYTE_PALETTE: Record<string, string> = {
  O: '#2b1d2e',
  b: '#7a4f36',
  B: '#a8744c',
  c: '#f0dcb0',
  w: '#fffaf0',
  e: '#1d1424',
  n: '#5a1f2a',
  y: '#f2a93b',
  s: '#2f9e8f',
  S: '#1f7268',
  m: '#f7cd4f',
};

const BYTE_IDLE = px`
  ................
  ..OO........OO..
  ..ObOO....OObO..
  ..ObbbOOOObbbO..
  .ObBBBBBBBBBBbO.
  .ObwwwwBBmmmmbO.
  .ObweewBBmeembO.
  .ObwwwwyymmmmbO.
  .ObbBBByyBBBbbO.
  .OssssssssssssO.
  .ObSsbccccccbbO.
  ObbbccccccccbbbO
  ObbbcBcBcBcBbbbO
  .ObbccccccccbbO.
  ..OOOyyOOyyOOO..
  ................
`;

// Byte winks with the eye that has no monocle. Smug, as always.
const BYTE_WINK = overlay(
  BYTE_IDLE,
  px`
    .ObBBBBBBmmmmbO.
    .ObBeeBBBmeembO.
    .ObBBBByymmmmbO.
  `,
  5,
);

const BYTE_BUST = px`
  .OO..........OO.
  .ObO........ObO.
  .ObbOOOOOOOObbO.
  ObbBBBBBBBBBBbbO
  ObBBBBBBBBBBBBbO
  ObwwwwwBBmmmmmbO
  ObwweewBBmweembO
  ObwweewyymweembO
  ObwwwwwyymwwwmbO
  ObBBBBBBBmmmmmbO
  ObBBBBBBBBBBBmbO
  ObbBBBBBBBBBBbbO
  OssssssssssssssO
  OSssssssssssssSO
  ObsScccccccccbbO
  ObbcccccccccccbO
`;

function portrait(bust: Frame): Frame {
  // Upscale to 32×32, then add eye shine and a little feather texture at full size.
  return plot(scale(bust, 2), [
    [8, 12, 'w'],
    [22, 12, 'w'],
    [10, 7, 'b'],
    [20, 7, 'b'],
    [14, 9, 'b'],
    [16, 9, 'b'],
  ]);
}
const BYTE_TALK = plot(BYTE_BUST, [
  [7, 8, 'n'],
  [8, 8, 'n'],
  [7, 9, 'y'],
  [8, 9, 'y'],
]);

// ── Bugs ──────────────────────────────────────────────────────────────────────────────

const BUG_PALETTE: Record<string, string> = {
  O: '#2b1d2e',
  Y: '#f7cd4f',
  y: '#c9972f',
  V: '#8c5fcc',
  L: '#cdb0f2',
  w: '#fffaf0',
  e: '#1d1424',
  M: '#ec6f9c',
  g: '#52d8a6',
};

const CLANGLE_0 = px`
  .....g....g.....
  ......O..O......
  ......OOOO......
  .....OYYYYO.....
  ....OYYwYYyO....
  ....OYwwYwwO....
  ...OYYweYweYO...
  ...OYYYYYYYyO...
  ...OYYMMMMYyO...
  ..OYYYYYYYYYyO..
  ..OYYYVYYYgYyO..
  .OYYYYYYYYYYYyO.
  .OyyyyyyyyyyyyO.
  ..OOOOOyyOOOOO..
  ...O.O.OO.O.O...
  ..O.O..gg..O.O..
`;
const CLANGLE_1 = [
  ...shiftX(CLANGLE_0.slice(0, 14), 1),
  ...px`
    ..O.O..OO..O.O..
    ...O.O.gg.O.O...
  `,
];

const BUG_0 = px`
  ................
  .....O....O.....
  ......O..O......
  .....OOOOOO.....
  ....OVVLVVVO....
  ...OVLLVVVVVO...
  ...OVwwVVwwVO...
  ...OVweVVweVO...
  ..OVVVVVVVVVVO..
  ..OVgVVVVVgVVO..
  ..OVVVMMMMVVVO..
  ...OVVVVVVVgO...
  ....OOOOOOOO....
  ...O.O....O.O...
  ..O..O....O..O..
  ................
`;
const BUG_1 = overlay(
  BUG_0,
  px`
    ..OVVVVVgVVVVO..
    ..OgVVVVVVVVgO..
    ..OVVVMMMMVVVO..
    ...OVgVVVVVVO...
    ....OOOOOOOO....
    ....O.O..O.O....
    ...O..O..O..O...
  `,
  8,
);

const FIREFLY_PALETTE: Record<string, string> = {
  O: '#2b1d2e',
  b: '#4a3b5c',
  w: '#e8f4ff',
  Y: '#f7cd4f',
  E: '#52d8a6',
  h: '#fff3b0',
};

const FIREFLY_0 = px`
  ................
  ................
  ................
  ......O..O......
  .......OO.......
  ..ww..ObbO..ww..
  .wwww.ObbO.wwww.
  .wwwwwObbOwwwww.
  ..www.ObbO.www..
  ......OYYO......
  .....OYYYYO.....
  .....OYEEYO.....
  ......OYYO......
  .......OO.......
  ................
  ................
`;
const FIREFLY_1 = px`
  ................
  ................
  ................
  ......O..O......
  .......OO.......
  ......ObbO......
  ..ww..ObbO..ww..
  .wwww.ObbO.wwww.
  .wwwwwObbOwwwww.
  .....hOYYOh.....
  ....hOYYYYOh....
  ....hOYEEYOh....
  .....hOYYOh.....
  ......hOOh......
  .......hh.......
  ................
`;

/** Non-avatar characters: Byte, villagers and Bugs (16×16). */
export const CHARACTERS: Record<string, PixelSprite> = Object.fromEntries(
  [
    sprite('byte', [BYTE_IDLE, BYTE_WINK], BYTE_PALETTE),
    ...NPCS,
    sprite('bug_clangle', [CLANGLE_0, CLANGLE_1], BUG_PALETTE),
    sprite('bug_generic', [BUG_0, BUG_1], BUG_PALETTE),
    sprite('firefly', [FIREFLY_0, FIREFLY_1], FIREFLY_PALETTE),
  ].map((s) => [s.name, s]),
);

/** Byte's 32×32 dialogue portrait: frame 0 neutral, frame 1 talking. */
export const BYTE_PORTRAIT: PixelSprite = sprite(
  'byte_portrait',
  [portrait(BYTE_BUST), portrait(BYTE_TALK)],
  BYTE_PALETTE,
);
