// Region 6 — Clocktower Peaks: its people, Bug, tiles and item icons.
// Each region keeps its own art here, so regions can be drawn side by side. Characters are
// 16×16 with 2 frames (see ../characters.ts for the roles and the villager() builder);
// tiles and item icons use the shared palette (../palette.ts).
import { BUG_PALETTE, villager } from '../characters';
import { blank, overlay, px, sprite, type Frame } from '../helpers';
import { SHARED_PALETTE } from '../palette';
import type { RegionArt } from './types';

// ── People ───────────────────────────────────────────────────────────────────────────
// Accessory roles (a b c x y z k) get their colours from each villager's extraPalette.

/** A 16×16 accessory made of parts, each drawn from its own top row down. */
const layers = (...parts: [top: number, rows: Frame][]): Frame =>
  parts.reduce((acc, [top, rows]) => overlay(acc, rows, top), blank());

// Dinah Dong, the bell ringer: a striped bobble hat, and a hand bell.
const BELLRINGER = layers(
  [
    0,
    px`
      .......aa.......
      .....OOaaOO.....
      ....ObbbbbbO....
      ...ObcbcbcbcO...
      ...OOOOOOOOOO...
    `,
  ],
  [
    10,
    px`
      .............Ok.
      .............Ok.
      .............Ok.
      ............OyO.
      ...........OyyyO
      ...........OzzzO
    `,
  ],
);

// Gerta Gearwright, the clockmaker: an apron with a brass gear on it (and glasses).
const CLOCKMAKER = layers([
  10,
  px`
    .....aaaaaa.....
    .....axbbxa.....
    .....abxxba.....
    .....axbbxa.....
  `,
]);

// Nell Pulley, the lift-keeper: a lift-operator's cap with a gold badge.
const LIFTKEEPER = px`
  ................
  ....OOOOOOOO....
  ...OaaaaaaaaO...
  ...OaaaxxaaaO...
  ..ObbbbbbbbbbO..
`;

// Tollkeeper Copperpot: a copper top hat, and a little bucket of coins.
const TOLLKEEPER = layers(
  [
    0,
    px`
      ....OOOOOOOO....
      ....OaaaaabO....
      ....OaaaaabO....
      ....OxxxxxxO....
      ..OOOOOOOOOOOO..
    `,
  ],
  [
    11,
    px`
      ...........OOOO.
      ...........OyyO.
      ...........OabO.
      ............OO..
    `,
  ],
);

// Milo Minute, the apprentice: goggles up on his forehead, and his first clock.
const APPRENTICE = layers(
  [
    3,
    px`
      ....OOO..OOO....
      ...OaLaOOaLaO...
      ....OOO..OOO....
    `,
  ],
  [
    10,
    px`
      ............OOO.
      ...........OczcO
      ...........OcczO
      ............OOO.
    `,
  ],
);

// Wren Warpwell, the weaver: a ball of yarn with a loose thread.
const WEAVER = layers([
  10,
  px`
    ..........a.....
    ...........aOOO.
    ...........OxaxO
    ...........OaxaO
    ............OOO.
  `,
]);

// Granny Hourglass: a shawl, and her hourglass.
const GRANNY = layers([
  9,
  px`
    ...........OOOO.
    ....bbbbbbbOyyO.
    .....bbbbbb.OO..
    ............OO..
    ...........OcyO.
    ...........OyyO.
    ...........OOOO.
  `,
]);

const PEOPLE = [
  villager(
    'npc_peaks_bellringer',
    {
      skin: ['#c98e5d', '#a66f45'],
      hair: ['#2b2022', '#160f12'],
      style: 'long',
      cloak: '#d0603a',
      cloakShade: '#a2442a',
      extraPalette: {
        a: '#fff6e0',
        b: '#3b82d6',
        c: '#fff6e0',
        k: '#7d4b30',
        y: '#f7cd4f',
        z: '#c9972f',
      },
    },
    BELLRINGER,
  ),
  villager(
    'npc_peaks_clockmaker',
    {
      skin: ['#f0c29a', '#d29e74'],
      hair: ['#c8c2d0', '#9a94a6'],
      style: 'bun',
      cloak: '#6f86a6',
      cloakShade: '#4c607d',
      glasses: '#c9972f',
      extraPalette: { a: '#e8d3a8', b: '#c4a874', x: '#c9972f' },
    },
    CLOCKMAKER,
  ),
  villager(
    'npc_peaks_liftkeeper',
    {
      skin: ['#7a4a2e', '#5b331e'],
      hair: ['#2a1c1a', '#170f0e'],
      style: 'short',
      cloak: '#2f68b0',
      cloakShade: '#1f4a82',
      extraPalette: { a: '#b8322a', b: '#7c1f1a', x: '#f7cd4f' },
    },
    LIFTKEEPER,
  ),
  villager(
    'npc_peaks_tollkeeper',
    {
      skin: ['#e8b48a', '#c48c64'],
      hair: ['#8e3b2b', '#64271c'],
      style: 'short',
      cloak: '#3c7a2a',
      cloakShade: '#2b5a1e',
      extraPalette: { a: '#d9822b', b: '#a85d1c', x: '#f7cd4f', y: '#f7cd4f' },
    },
    TOLLKEEPER,
  ),
  villager(
    'npc_peaks_apprentice',
    {
      skin: ['#d9a679', '#b5845a'],
      hair: ['#e8c25a', '#bf9638'],
      style: 'short',
      cloak: '#9a5cc6',
      cloakShade: '#6f3d96',
      extraPalette: { a: '#f39a45', c: '#fff6e0', z: '#2b1d2e' },
    },
    APPRENTICE,
  ),
  villager(
    'npc_peaks_weaver',
    {
      skin: ['#5a3622', '#3f2414'],
      hair: ['#ec6f9c', '#b84a74'],
      style: 'covering',
      cloak: '#52a88a',
      cloakShade: '#367a63',
      extraPalette: { a: '#ec6f9c', x: '#f7cd4f' },
    },
    WEAVER,
  ),
  villager(
    'npc_peaks_granny',
    {
      skin: ['#fce4cf', '#e8c0a2'],
      hair: ['#f4f1ec', '#cfc8be'],
      style: 'bun',
      cloak: '#7d6a9a',
      cloakShade: '#5a4b72',
      glasses: '#8e4fa0',
      extraPalette: { b: '#b4436c', y: '#f2dc9e', c: '#b4e6ff' },
    },
    GRANNY,
  ),
];

// ── Tick-Tock-Tick, the Bug Boss ─────────────────────────────────────────────────────
// A round clock-face Bug with three hands: the minute hand (Y), the hour hand (y) and a
// pink second hand (M). The hands jump to new places on every tick.

const TICKTOCK_0 = px`
  .......Y........
  .......Y........
  .....OOYOOO.....
  ...OOVVYVVVOO...
  ..OVVwwYwwwVVO..
  ..OVLewYwLewVO..
  .OVweewYweewwVO.
  .OVwwwwOyyyyyyyy
  .OVwwwMwwwwwwVO.
  .OVwwMwweMMewVO.
  ..OVMwwwweewVO..
  ..OMVwwwwwwVVO..
  ..MOOVVVVVVOO...
  .M...OOOOOO.....
  ....O.O..O.O....
  ...g..g..g..g...
`;

const TICKTOCK_1 = px`
  .......Y........
  .......Y........
  .....OOYOOO.....
  ...OOVVYVVVOO...
  ..OVVwwYwwwVVO..
  ..OVeLwYweLwVO..
  .OVweewYweewwVO.
  yyyyyyyOwwwwwVO.
  .OVwwwwMwwwwwVO.
  .OVwwwwMeMMewVO.
  ..OVwwwMweewVO..
  ..OVVwwMwwwVVO..
  ...OOVVMVVVOO...
  .....OOMOOO.....
  ..O.O....O.O....
  .g..g....g..g...
`;

const BUGS = [sprite('bug_ticktock', [TICKTOCK_0, TICKTOCK_1], BUG_PALETTE)];

// ── Tiles ───────────────────────────────────────────────────────────────────────────

/** The shared palette plus mountain colours: alpine grass, snow and slate. */
const PEAK_PALETTE: Record<string, string> = {
  ...SHARED_PALETTE,
  J: '#7fae63', // alpine grass
  j: '#5f8f4c', // alpine grass shade
  U: '#eef4fb', // snow
  u: '#c6d4e8', // snow shade
  X: '#5b6f99', // slate
  x: '#3e4c70', // slate shade
  v: '#8aa0cc', // slate light
};

const peakGround = px`
  JJJJJJJJJJJJJJJJ
  JJjJJJJJJJJJsJJJ
  JJJJJJJJJJJsSsJJ
  JJJJJhJJJJJJJJJJ
  JJJJJJJJJJJJJJJJ
  JsJJJJJJJjJJJJJJ
  sSsJJJJJJJJJJJhJ
  JJJJJJJJJJJJJJJJ
  JJJJJJjJJJJJJJJJ
  JJJJJJJJJJJSJJJJ
  JJhJJJJJJJsdJJJJ
  JJJJJJJJJJJJJJjJ
  JJJJjJJJJJJJJJJJ
  JJJJJJJJsJJJJJJJ
  JJJJJJJsSsJJhJJJ
  JjJJJJJJJJJJJJJJ
`;

const peakSnow = px`
  UUUUUUUUUUUUUUUU
  UUUUUUUUUUuUUUUU
  UUWUUUUUUUUUUUUU
  UUUUUUUuuUUUUUUU
  UUUUUUUUUUUUUWUU
  UuUUUUUUUUUUUUUU
  UUUUUUUUUUUuUUUU
  UUUUUWUUUUUUUUUU
  UUUUUUUUUUUUUUUU
  UUUUUUUUuuUUUUUU
  UUUWUUUUUUUUUUUU
  UUUUUUUUUUUUUuUU
  UUUUUUuUUUUUUUUU
  UUUUUUUUUUUWUUUU
  UUuUUUUUUUUUUUUU
  UUUUUUUUUUUUUUUU
`;

// A rock face in layers, with dark cracks between them (solid).
const peakCliff = px`
  sSSSsssSSSssSSSs
  SSSssdSSSsSSSssS
  ssdddddsddddddss
  dKddddKddddKdddd
  sSSsssSSSssSSSss
  SSssdSSSssSSssdS
  sdddKdddddKdddds
  ddddddddKddddddd
  SSSsssSSSssSSSSs
  SsssSSSsssdSSssS
  dddKddddddddKddd
  dddddKdddddddddd
  sSSSssSSSsssSSSs
  SSssSSSssdSSSssS
  ddddddKdddddddKd
  dddddddddddddddd
`;

// Four stone steps: a light tread, a riser and a shadow each.
const stepBand = px`
  SSSSSSSSSSSSSSSS
  SSSWSSSSSSSSWSSS
  ssssssssssssssss
  dddddddddddddddd
`;
const peakStairs = [...stepBand, ...stepBand, ...stepBand, ...stepBand];

// The great clocktower: sandstone bricks, a slate roof, the clock face and its door.
const brickBand = px`
  NNNNNNNqNNNNNNNq
  NWNNNNNqNWNNNNNq
  mmmmmmmqmmmmmmmq
  qqqqqqqqqqqqqqqq
  NNNqNNNNNNNqNNNN
  NWNqNNNNNWNqNNNN
  mmmqmmmmmmmqmmmm
  qqqqqqqqqqqqqqqq
`;
const clockWall = [...brickBand, ...brickBand];

const roofBand = px`
  XvvXXXxXXvvXXXxX
  XXXXXXxXXXXXXXxX
  XXXXXXxXXXXXXXxX
  xxxxxxxxxxxxxxxx
  XXxXvvXXXxXvvXXX
  XXxXXXXXXxXXXXXX
  XXxXXXXXXxXXXXXX
  xxxxxxxxxxxxxxxx
`;
const clockRoof = [...roofBand, ...roofBand];

const clockFace = px`
  NNNNNKKKKKKNNNNN
  NNNKKYYYYYYKKNNN
  NNKYYWWyWWWYYKNN
  NKYWWWWWWWWWWYKN
  NKYWWWWkWWWWWYKN
  KYWWWWWkWWWWWWYK
  KYWWWWWkWWWWWWYK
  KYyWWWWKkkkWWyYK
  KYWWWWWWWWWWWWYK
  KYWWWWWWWWWWWWYK
  KYWWWWWWWWWWWWYK
  NKYWWWWWWWWWWYKN
  NKYWWWWyWWWWWYKN
  NNKYYWWWWWWYYKNN
  NNNKKYYYYYYKKNNN
  qqqqqKKKKKKqqqqq
`;

const clockDoor = px`
  NNNNNNNqNNNNNNNq
  NWNNKKKKKKKKNNNq
  mmmKTTTTTTTTKmmq
  qqKTTtTTTTtTTKqq
  NNKTTtTTTTtTTKNN
  NNKTTtTTTTtTTKNN
  mmKYYYYYYYYYYKmm
  qqKTTtTTTTtTTKqq
  NNKTTtTTTTtTTKNN
  NNKTTtTTTYtTTKNN
  mmKTTtTTTTtTTKmm
  qqKYYYYYYYYYYKqq
  NNKTTtTTTTtTTKNN
  NNKTTtTTTTtTTKNN
  mmKTTtTTTTtTTKmm
  ssKKKKKKKKKKKKss
`;

// ── Props (see-through background) ─────────────────────────────────────────────────

const peakPine = px`
  .......KK.......
  ......KUUK......
  .....KUfFUK.....
  .....KffFfK.....
  ....KUUfFUUK....
  ....KffFFffK....
  ...KUUffFfUUK...
  ...KfffFFfffK...
  ..KUUfffFffUUK..
  ..KfffFFFFfffK..
  .KUUffffFfffUUK.
  .KffffFFFFffffK.
  .KKKKKKttKKKKKK.
  ......KtTK......
  ......KtTK......
  ......KKKK......
`;

const clockGear = px`
  ................
  ......KKKK......
  ...KK.KYYK.KK...
  ..KYYKKYYKKYYK..
  ..KYYYYYYYYYyK..
  ...KYYYyyYYYyK..
  .KKKYYyKKyYYyKK.
  .KYYYYyK.KyYYyK.
  .KYYYYyK.KyYYyK.
  .KKKYYyKKyYYyKK.
  ...KYYYyyYYyyK..
  ..KYYYYYYYYyyK..
  ..KYYKKyyKKyyK..
  ...KK.KyyK.KK...
  ......KKKK......
  ................
`;

const clockBell = px`
  ................
  KKKKKKKKKKKKKKKK
  KTTTTTTTTTTTTTTK
  KttKKKKKKKKKKttK
  KtK....KK....KtK
  KtK...KYYK...KtK
  KtK..KYYWYK..KtK
  KtK..KYYWYK..KtK
  KtK..KYYYYK..KtK
  KtK.KYYYYYyK.KtK
  KtK.KYYYYYyK.KtK
  KtKKYYYYYYyyKKtK
  KtKKKKKKKKKKKKtK
  KtK....KyyK..KtK
  KtK.....KK...KtK
  KKK..........KKK
`;

const tile = (name: string, ...frames: Frame[]) => sprite(name, frames, PEAK_PALETTE);

const TILES = [
  tile('peak_ground', peakGround),
  tile('peak_snow', peakSnow),
  tile('peak_cliff', peakCliff),
  tile('peak_stairs', peakStairs),
  tile('clock_wall', clockWall),
  tile('clock_roof', clockRoof),
  tile('clock_face', clockFace),
  tile('clock_door', clockDoor),
  tile('peak_pine', peakPine),
  tile('clock_gear', clockGear),
  tile('clock_bell', clockBell),
];

const PROPS = ['peak_pine', 'clock_gear', 'clock_bell'];

// ── Item icons ──────────────────────────────────────────────────────────────────────

// Boots of Looping: a leather boot with a glowing loop stitched on it.
const bootsOfLooping = px`
  ................
  .....KKKKKK.....
  .....KTTTTK.....
  .....KTEETK.....
  .....KETTEK.....
  .....KETTEK.....
  .....KTEETK.....
  .....KTTTTK.....
  .....KTTTtK.....
  .E...KTTTtKKK...
  E.E..KTTTTTTtKK.
  .E...KTTTTTTTTtK
  ....KTTTTTTTTTTK
  ....KyyyyyyyyyyK
  ....KKKKKKKKKKKK
  ................
`;

// Bucket of Totals: a copper bucket heaped with coins.
const bucketOfTotals = px`
  ................
  ................
  .....KKKKKK.....
  ...KKYYyYYYKK...
  ..KYYyYYYyYYYK..
  .KKKKKKKKKKKKKK.
  .KOOOOOOOOOOOrK.
  ..KOOWOOOOOOrK..
  ..KOOWOOOOOOrK..
  ..KTTTTTTTTTTK..
  ...KOOWOOOOrK...
  ...KOOOOOOOrK...
  ...KOOOOOOOrK...
  ...KTTTTTTTTK...
  ....KKKKKKKK....
  ................
`;

// Weaver's Loom: a wooden frame with warp threads and a striped band woven in.
const weaversLoom = px`
  ................
  KKKKKKKKKKKKKKKK
  KTTTTTTTTTTTTTTK
  KtKKKKKKKKKKKKtK
  KtK.w.w.w.w.wKtK
  KtK.w.w.w.w.wKtK
  KtK.w.w.w.w.wKtK
  KtKMMMMMMMMMMKtK
  KtKVVVVVVVVVVKtK
  KtKEEEEEEEEEEKtK
  KtKYYYYYYYYYYKtK
  KtKMMMMMMMMMMKtK
  KtKKKKKKKKKKKKtK
  KTTTTTTTTTTTTTTK
  KKKKKKKKKKKKKKKK
  .KK..........KK.
`;

const ITEMS = [
  sprite('boots_of_looping', [bootsOfLooping], SHARED_PALETTE),
  sprite('bucket_of_totals', [bucketOfTotals], SHARED_PALETTE),
  sprite('weavers_loom', [weaversLoom], SHARED_PALETTE),
];

export const art: RegionArt = {
  characters: [...PEOPLE, ...BUGS],
  tiles: TILES,
  props: PROPS,
  items: ITEMS,
};
