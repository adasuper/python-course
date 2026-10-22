// Region 5 — The Endless Mines: its people, Bug, tiles and item icons.
// Each region keeps its own art here, so regions can be drawn side by side. Characters are
// 16×16 with 2 frames (see ../characters.ts for the roles and the villager() builder);
// tiles and item icons use the shared palette (../palette.ts).
import { BUG_PALETTE, villager } from '../characters';
import { mirrorX, overlay, px, shiftX, sprite, stack, type Frame } from '../helpers';
import { SHARED_PALETTE } from '../palette';
import type { PixelSprite } from '../types';
import type { RegionArt } from './types';

// ── Miners ─────────────────────────────────────────────────────────────────────────────
// Every miner wears a helmet with a lamp on the front: a (helmet), b (helmet shade),
// x (the lamp's glow). Tools and bags use c and z.

const EMPTY_ROWS = (n: number): Frame => Array.from({ length: n }, () => '................');

const HELMET: Frame = [
  ...px`
    ......OOOO......
    ....OOaaaaOO....
    ...OaaaOOaabO...
    ...OaaOxxOabO...
    ..OOOOOOOOOOOO..
  `,
  ...EMPTY_ROWS(11),
];

/** A pickaxe over the shoulder (Dot). */
const PICKAXE = px`
  ................
  ................
  ................
  ................
  ................
  ..........OOOO..
  .........OccccO.
  ..........OOzOcO
  ...........OzO.O
  ...........OzO..
  ..........OzO...
  ..........OzO...
  ..........OzO...
  ................
`;

/** A little lantern held up in one hand (Wick), and a white beard. */
const HAND_LANTERN = px`
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ....OccccccO....
  ....OccccccO....
  .....OccccO.....
  ............OzO.
  ...........OzzzO
  ...........OxxzO
  ...........OxxzO
  ............OOO.
`;

/** A bag of gems at the hip (Gemma). */
const GEM_BAG = px`
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
  ...........OOO..
  ..........OczcO.
  ..........OcccO.
  ...........OOO..
`;

/** A big shovel (Digby). */
const SHOVEL = px`
  ................
  ................
  ................
  ................
  ................
  ................
  .............OO.
  ............OzO.
  ...........OzO..
  ...........OzO..
  ..........OzO...
  .........OcccO..
  .........OcccO..
  ..........OcO...
`;

/** A wrench (Rosa) and a neckerchief. */
const WRENCH = px`
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  .....OccccO.....
  ............O.O.
  ...........OcOcO
  ...........OcccO
  ............OcO.
  ............OcO.
`;

/** A round depth gauge with a needle (Ottie). */
const GAUGE = px`
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
  ...........OOO..
  ..........OcccO.
  ..........OczcO.
  ..........OcccO.
  ...........OOO..
`;

/** A walking stick (Nell). */
const STICK = px`
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
  .............Oz.
  ............OzO.
  ............OzO.
  ............OzO.
  ............OzO.
  ............OO..
`;

const LAMP = '#fff3b0';

const MINERS: PixelSprite[] = [
  villager(
    'npc_miner_dot',
    {
      skin: ['#c98e5d', '#a66f45'],
      hair: ['#2b2022', '#160f12'],
      style: 'short',
      cloak: '#e2583a',
      cloakShade: '#a83a24',
      extraPalette: { a: '#f7cd4f', b: '#c9972f', x: LAMP, c: '#c2bab0', z: '#7d4b30' },
    },
    stack(HELMET, PICKAXE),
  ),
  villager(
    'npc_miner_wick',
    {
      skin: ['#f2c9a2', '#d6a47c'],
      hair: ['#e8e2da', '#c4bcb2'],
      style: 'short',
      cloak: '#5f7a5a',
      cloakShade: '#435940',
      extraPalette: { a: '#9a5cc6', b: '#6f3d96', x: LAMP, c: '#fff6e0', z: '#2b1d2e' },
    },
    stack(HELMET, HAND_LANTERN),
  ),
  villager(
    'npc_miner_gemma',
    {
      skin: ['#6e4229', '#52301c'],
      hair: ['#2b2022', '#160f12'],
      style: 'long',
      cloak: '#3b82d6',
      cloakShade: '#285ea3',
      extraPalette: { a: '#ec6f9c', b: '#b84a74', x: LAMP, c: '#c99560', z: '#52d8a6' },
    },
    stack(HELMET, GEM_BAG),
    [
      [11, 12, 'z'],
      [12, 13, 'z'],
    ],
  ),
  villager(
    'npc_miner_digby',
    {
      skin: ['#e8b48a', '#c48c64'],
      hair: ['#b8562e', '#8a3c1e'],
      style: 'short',
      cloak: '#8a6a4a',
      cloakShade: '#634a32',
      extraPalette: { a: '#f39a45', b: '#c46f22', x: LAMP, c: '#918780', z: '#bd7d4c' },
    },
    stack(HELMET, SHOVEL),
  ),
  villager(
    'npc_miner_rosa',
    {
      skin: ['#d9a679', '#b5845a'],
      hair: ['#5b3a24', '#3d2616'],
      style: 'curly',
      cloak: '#2f6b8c',
      cloakShade: '#204a63',
      extraPalette: { a: '#cf5a3e', b: '#93392c', x: LAMP, c: '#f7cd4f', z: '#625868' },
    },
    stack(HELMET, WRENCH),
  ),
  villager(
    'npc_miner_ottie',
    {
      skin: ['#a86a44', '#84502f'],
      hair: ['#2b2022', '#160f12'],
      style: 'buzz',
      cloak: '#6cbf4a',
      cloakShade: '#4a9a3c',
      glasses: '#625868',
      extraPalette: { a: '#4a98dc', b: '#2f68b0', x: LAMP, c: '#fff6e0', z: '#cf5a3e' },
    },
    stack(HELMET, GAUGE),
  ),
  villager(
    'npc_miner_nell',
    {
      skin: ['#f3cfae', '#d7a983'],
      hair: ['#b9b2c8', '#8f88a0'],
      style: 'bun',
      cloak: '#8c5fcc',
      cloakShade: '#64409a',
      extraPalette: { a: '#c2bab0', b: '#918780', x: LAMP, z: '#7d4b30' },
    },
    stack(HELMET, STICK),
  ),
];

// ── Rumblebug, the Bug boss ───────────────────────────────────────────────────────────
// A round, rocky Bug with violet cracks. Frame 1 shakes sideways and kicks up dust.

const RUMBLEBUG_PALETTE: Record<string, string> = {
  ...BUG_PALETTE,
  s: '#918780',
  S: '#c2bab0',
  d: '#625868',
  D: '#efdcb4',
};

const RUMBLEBUG_0 = px`
  ....g......g....
  .....O....O.....
  ......OOOOO.....
  ....OOSSSssOO...
  ...OSSSsssssdO..
  ..OSOsssssssOdO.
  .OSSwOOsssOOwsdO
  .OSSwwesssewwsdO
  .OSsssssssssssdO
  .OsVsssMMMMsVsdO
  .OssVssMwwMsVddO
  ..OdsssssssssdO.
  ...OdddVdddddO..
  ....OOOOOOOOO...
  ...O.O.O.O.O.O..
  ..O..O..O..O..O.
`;

const RUMBLEBUG_1 = overlay(
  shiftX(RUMBLEBUG_0, 1),
  px`
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
    ................
    ................
    D..............D
    .D............D.
    D.D..........D.D
  `,
);

// ── Tiles ─────────────────────────────────────────────────────────────────────────────

const mineFloor = px`
  tttttttttttttttt
  ttqtttttttttkttt
  tttttttktttttttt
  tttttttttttttttt
  tkttttttttqttttt
  ttttttttttttttqt
  ttttttdtttttkttt
  tttttdKttttttttt
  ttttttttkttttttt
  tqtttttttttttttt
  tttttttttttqtttt
  ttttkttttttttttt
  tttttttttttdtktt
  ttqtttttttttKttt
  tttttttqtttttttt
  tttttttttttttttt
`;

const mineWall = px`
  KdddsdddKddddsdK
  dsSsdddKdsSsdddd
  ddsdddKKddsddKdd
  dddddKdddddddKdd
  KKddKddsdddKKddd
  ddsKdddsSsdddKdd
  dsSsddddsddddddK
  ddsdddKddddKdddd
  dddddKKddsddKKdd
  KddddKddsSsdddKd
  dddsdddddsdddddd
  ddsSsddKdddddsdd
  dddsddKKddddsSsd
  KddddKddddKddsdd
  ddKKdddsddKddddd
  KKddddKKKKKddKKK
`;

// A wooden support: a beam across the top and a post on each side.
const mineBeamWall = px`
  TTTTTTTTTTTTTTTT
  tttttttttttttttt
  KKKKKKKKKKKKKKKK
  KTtKddsddddsKTtK
  KTtKdsSsdKddKTtK
  KTtKddsddKddKTtK
  KTtKdddddddsKTtK
  KTtKKddsddsSKTtK
  KTtKddsSsddsKTtK
  KTtKdddsdddKKTtK
  KTtKddddKddsKTtK
  KTtKdsddKddsKTtK
  KTtKsSsdddddKTtK
  KTtKdsddsddKKTtK
  KTtKddddsSsdKTtK
  KKKKKKKKKKKKKKKK
`;

const mineGemWall = px`
  KdddsdddKddddsdK
  dsSsdddKdsKKdddd
  ddsddKKddKMWKKdd
  dddddKddKMMMMKdd
  KKddKddsdKMMKddd
  ddsKdddsSsKKdKdd
  dKKsddddsddddddK
  KEWKdKddddKdddKd
  KEEEKKKddsddKKKd
  KKEKddKdsSsKVLKd
  dddKdddddsdKVVVK
  ddsSsddKddddKVKd
  dddsddKKddddsKsd
  KddddKddKKKddsdd
  ddKKdddsKYWKdddd
  KKddddKKKYYKdKKK
`;

const mineTrack = px`
  dsdddddddddsdddd
  ddddsdddddddddsd
  dTTqddddsTTqdddd
  dTTqdddddTTqddsd
  SSSSSSSSSSSSSSSS
  KKKKKKKKKKKKKKKK
  dTTqddsddTTqdddd
  dTTqdddddTTqdsdd
  dTTqdddddTTqdddd
  dTTqdsdddTTqdddd
  SSSSSSSSSSSSSSSS
  KKKKKKKKKKKKKKKK
  dTTqdddddTTqddsd
  dTTqddddsTTqdddd
  ddsdddddddddddsd
  dddddsdddddddddd
`;

// A deep, dark shaft with a ladder going down.
const mineShaft = px`
  nnnnnnnnnnnnnnnn
  nnnKnnnnnnnnnnnn
  nnnnTnnnnnnTnnnn
  nnnnTTTTTTTTnnnn
  nnnnTnnnnnnTnnKn
  nnnnTnnnnnnTnnnn
  nKnnTTTTTTTTnnnn
  nnnnTnnnnnnTnnnn
  nnnnTnnnnnnTnnnn
  nnnnTTTTTTTTnnnn
  nnnnTnnnnnnTnKnn
  nnnnTnnnnnnTnnnn
  nnnnTTTTTTTTnnnn
  nnKnTnnnnnnTnnnn
  nnnnTnnnnnnTnnnn
  nnnnnnnnnnnnnnnn
`;

// The mountain above the mines: grass on top, rock below.
const mineCliff = px`
  GGgGGGGgGGGGGgGG
  gGgggGgggGGgggGg
  KgKKgKKKgKKgKKgK
  SSSSsSSSSSsSSSSs
  SWSssdSSSSssdSWs
  SSsdddSSsSsdddSs
  sssddKsssssddKss
  SSSSsSSSSSsSSSSs
  SSSssdSWSSssdSSs
  SSsdddSSsSsdddSs
  sssddKsssssddKss
  SSSSsSSSSSsSSSSs
  SWSssdSSSSssdSWs
  sSsdddSSsSsdddSs
  ssdddKssdssddKsd
  dddddddddddddddd
`;

// The left half of the mine's mouth: a timber frame around a dark opening.
const mineEntranceLeft = px`
  GGgGGGGgGGGGGgGG
  gGgggGgggGGgggGg
  KgKKgKKKKKKKKKKK
  SSSSsSKTTTTTTTTT
  SWSssKTtttttttTT
  SSsddKTKKKKKKKKK
  sssddKTKnnnnnnnn
  SSSSsKTKnnnnnnnn
  SSSssKTKnnnnnnnn
  SSsddKTKnnnnnnnn
  sssddKTKnnnnnnnn
  SSSSsKTKnnnnnnnn
  SWSssKTKnnnnnnnn
  sSsddKTKnkknnnnn
  ssdddKTKkkkkknnn
  dddddKTKtttttttt
`;
const mineEntranceRight = mirrorX(mineEntranceLeft);

// The way out of a quest cave: a ladder up into the daylight, with an up arrow.
const mineExit = px`
  tttttttttttttttt
  tKKKKKKKKKKKKKKt
  tKAAAAAWWAAAAAKt
  tKAAAAWWWWAAAAKt
  tKAAAWWWWWWAAAKt
  tKAAAAAWWAAAAAKt
  tKAATAAWWAATAAKt
  tKAATTTTTTTTAAKt
  tKAATAAAAAATAAKt
  tKAATAAAAAATAAKt
  tKAATTTTTTTTAAKt
  tKAATAAAAAATAAKt
  tKAATAAAAAATAAKt
  tKAATTTTTTTTAAKt
  tKKKTKKKKKKTKKKt
  tttttttttttttttt
`;

// ── Props (transparent background) ───────────────────────────────────────────────────

const mineCart = px`
  ................
  ................
  ................
  .....YY...Y.....
  ...KYYyYYYyYK...
  ..KYyYYyYYYyYK..
  .KKKKKKKKKKKKKK.
  .KSSSSSSSSSSSSK.
  .KsdsdsdsdsdsdK.
  .KssssssssssssK.
  ..KddddddddddK..
  ..KKKKKKKKKKKK..
  ..KnnK....KnnK..
  ..KnnK....KnnK..
  ...KK......KK...
  ................
`;

const mineLantern = px`
  ................
  ......KKKK......
  .....KddddK.....
  ....KKKKKKKK....
  ....KYWWWWYK....
  ....KYWWWWYK....
  ....KYYWWYYK....
  ....KYYYYYYK....
  ....KKKKKKKK....
  ......KttK......
  ......KTtK......
  ......KTtK......
  ......KTtK......
  ......KTtK......
  .....KKTtKK.....
  ....KttttttK....
`;

const mineRocks = px`
  ................
  ................
  ................
  .......KKK......
  ......KSSsK.....
  ....KKSWSssK....
  ...KSSKSsssKK...
  ...KSWSKssKSsK..
  ..KSSSssKKSSssK.
  ..KsSssdKSWSsdK.
  .KSSsdddKSSssddK
  .KsssddKSSssdddK
  KSSssddKsssddddK
  KssdddKKddddddK.
  .KKKKKKKKKKKKKK.
  ................
`;

const mineCrystal = px`
  ................
  .......K........
  ......KLK.......
  ......KLVK..K...
  ..K...KLVK.KEK..
  .KLK..KLVK.KEcK.
  .KLVK.KLVKKEEcK.
  .KLVK.KLVKKEEK..
  ..KLVKKLVKEEK...
  ..KLVVKLVKEK....
  ...KLVKLVKEK....
  ...KKLVLVKKK....
  ..KddKKKKKddK...
  .KdddsddsdddK...
  ..KKKKKKKKKKK...
  ................
`;

// ── Item icons (transparent background) ──────────────────────────────────────────────

const minerLantern = px`
  ................
  ......KKKK......
  .....K....K.....
  .....K....K.....
  ....KKKKKKKK....
  ...KdddddddddK..
  ....KYWWWWYK....
  ....KYWWWWYK....
  ....KYWWWWYK....
  ....KYYWWYYK....
  ....KYYYYYYK....
  ....KYYYYYYK....
  ...KdddddddddK..
  ....KKKKKKKK....
  ................
  ................
`;

const tallyStones = px`
  ................
  ................
  ................
  .....KKKK.......
  ....KSSSSK......
  ...KSKSKSsK.....
  ...KSKSKSsK.....
  ...KsKsKssK.....
  ....KssssK.KKKK.
  .KKKKKKKK.KSSSSK
  KSSSSSSSKKSKSKsK
  KSKSKSKSKKSKSKsK
  KsKsKsKsK.KsKssK
  .KssssssK.KKKKK.
  ..KKKKKK........
  ................
`;

const escapeRope = px`
  ................
  .....KKKKKK.....
  ...KKTTTTTTKK...
  ..KTTKKKKKKTTK..
  .KTKKTTTTTTKKTK.
  .KTKTKKKKKKTKTK.
  KTKTKK....KKTKTK
  KTKTK......KTKTK
  KTKTK......KTKTK
  KTKTKK....KKTKTK
  .KTKTKKKKKKTKTK.
  .KTKKTTTTTTKKTKK
  ..KTTKKKKKKTTKTK
  ...KKTTTTTTKK.KT
  .....KKKKKK...KT
  ..............KK
`;

const tile = (name: string, frame: Frame) => sprite(name, [frame], SHARED_PALETTE);

export const art: RegionArt = {
  characters: [...MINERS, sprite('bug_rumblebug', [RUMBLEBUG_0, RUMBLEBUG_1], RUMBLEBUG_PALETTE)],
  tiles: [
    tile('mine_floor', mineFloor),
    tile('mine_wall', mineWall),
    tile('mine_beam_wall', mineBeamWall),
    tile('mine_gem_wall', mineGemWall),
    tile('mine_track', mineTrack),
    tile('mine_shaft', mineShaft),
    tile('mine_cliff', mineCliff),
    tile('mine_entrance_left', mineEntranceLeft),
    tile('mine_entrance_right', mineEntranceRight),
    tile('mine_exit', mineExit),
    tile('mine_cart', mineCart),
    tile('mine_lantern', mineLantern),
    tile('mine_rocks', mineRocks),
    tile('mine_crystal', mineCrystal),
  ],
  props: ['mine_cart', 'mine_lantern', 'mine_rocks', 'mine_crystal'],
  items: [
    sprite('miner_lantern', [minerLantern], SHARED_PALETTE),
    sprite('tally_stones', [tallyStones], SHARED_PALETTE),
    sprite('escape_rope', [escapeRope], SHARED_PALETTE),
  ],
};
