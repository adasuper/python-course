import { px, shiftX, sprite, type Frame } from './helpers';
import { SHARED_PALETTE } from './palette';
import type { PixelSprite } from './types';

/*
 * 16×16 tiles drawn in the shared palette (see palette.ts for the key).
 * Ground tiles fill the whole square. "Prop" tiles (trees, signs, chests, …) keep a
 * transparent background so they can be layered on top of grass or floor.
 */

// ── Ground ───────────────────────────────────────────────────────────────────────

const grass = px`
  GGGGGGGGGGGGGGGG
  GGGhGGGGGGGGgGGG
  GGgGGGGGGGGGGGGG
  GGGGGGGGhGGGGGGG
  GGGGGgGGGGGGGGGG
  GGGGGGGGGGGGGGhG
  GhGGGGGGGGgGGGGG
  GGGGGGGGGGGGGGGG
  GGGGGGGhGGGGGGGG
  GGGgGGGGGGGGGGgG
  GGGGGGGGGGGhGGGG
  GGGGGGGGGGGGGGGG
  GGhGGGGGgGGGGGGG
  GGGGGGGGGGGGGGGG
  GGGGGGGGGGGGGhGG
  GgGGGGGGGGGGGGGG
`;

const grassAlt = px`
  GGGGGGGGGGGGGGGG
  GGGGGGGGGGGGGGGG
  GGGhGGGGGGGGGGGG
  GGhgGhGGGGGGGGGG
  GGGgGgGGGGGhGGGG
  GGGGGGGGGGhgGhGG
  GGGGGGGGGGGgGgGG
  GGGGGGGGGGGGGGGG
  GGGGGGGGGGGGGGGG
  GhGGGGGGGGGGGGGG
  hgGhGGGGGGGGGGGG
  GgGgGGGGGhGGGGGG
  GGGGGGGGhgGhGGGG
  GGGGGGGGGgGgGGGG
  GGGGGGGGGGGGGGGG
  GGGGGGGGGGGGGGGG
`;

const flowers = px`
  GGGGGGGGGGGGGGGG
  GGGMGGGGGGGGGGGG
  GGMYMGGGGGGWGGGG
  GGGMGGGGGGWYWGGG
  GGGgGGGGGGGWGGGG
  GGGGGGGGGGGgGGGG
  GGGGGGGGGGGGGGGG
  GGGGGWGGGGGGGGGG
  GGGGWYWGGGGGMGGG
  GGGGGWGGGGGMYMGG
  GGGGGgGGGGGGMGGG
  GGGGGGGGGGGGgGGG
  GMGGGGGGGGGGGGGG
  MYMGGGGGLGGGGGGG
  GMGGGGGLYLGGGGGG
  GgGGGGGGLGGGGGGG
`;

const path = px`
  PPPPPPPPPPPPPPPP
  PPPPPpPPPPPPPPPP
  PPpPPPPPPPPPqPPP
  PPPPPPPPPPPPPPPP
  PPPPPPPPPpPPPPPP
  PPPPqPPPPPPPPPPP
  PPPPPPPPPPPPPPpP
  PPPPPPPPPPPPPPPP
  PpPPPPPPPPPPPPPP
  PPPPPPPPpPPPPPPP
  PPPPPPPPPPPPqPPP
  PPPqPPPPPPPPPPPP
  PPPPPPPPPPPPPPPP
  PPPPPPPpPPPPPPPP
  PPPPPPPPPPPPPpPP
  PPpPPPPPPPPPPPPP
`;

const cobbleBand = px`
  dSSSSSSSdSSSSSSS
  dSWSSSSsdSWSSSSs
  dsssssssdsssssss
  dddddddddddddddd
  SSSSdSSSSSSSdSWS
  SSSsdSWSSSSsdSSS
  ssssdsssssssdsss
  dddddddddddddddd
`;
const cobble = [...cobbleBand, ...cobbleBand];

const water0 = px`
  BBBBBBBBBBBBBBBB
  BBBccBBBBBBBBBBB
  BBcBBcBBBBBBBBBB
  BBBBBBBBBBBBBBBB
  BBBBBBBBBbBBBBBB
  BBBBBBBBBBBBccBB
  BBBBBBBBBBBcBBcB
  BBbBBBBBBBBBBBBB
  BBBBBBBBBBBBBBBB
  BBBBBccBBBBBBBBB
  BBBBcBBcBBBBBbBB
  BBBBBBBBBBBBBBBB
  BBBBBBBBBBBBBBBB
  BcBBBBBBBBccBBBB
  cBBcBBBBBcBBcBBB
  BBBBBBbBBBBBBBBB
`;
// Frame 2: the ripples drift one pixel to the right (wrapping, so the tile still tiles).
const water1 = shiftX(water0, 1, true);

const sand = px`
  NNNNNNNNNNNNNNNN
  NNNmNNNNNNNNNNNN
  NNNNNNNNNNmNNNNN
  NNNNNNNNNNNNNNNN
  NmNNNNNNNNNNNNNN
  NNNNNNmNNNNNNNmN
  NNNNNNNNNNNNNNNN
  NNNNNNNNNmNNNNNN
  NNNNNNNNNNNNNNNN
  NNmNNNNNNNNNNNNN
  NNNNNNNNNNNNmNNN
  NNNNNmNNNNNNNNNN
  NNNNNNNNNNNNNNNN
  NNNNNNNNmNNNNNmN
  NmNNNNNNNNNNNNNN
  NNNNNNNNNNNNNNNN
`;

const hedge = px`
  fhffffhfffffhfff
  hhfhffhhfhffhhfh
  ffffFffffFffffFf
  fFfffffFfffffFff
  fffhffffffhfffff
  ffhhfffFffhhffFf
  FfffffFffffFffff
  fffFfffffFfffffF
  ffffffhfffffhfff
  FfFfffhhfFffhhff
  fffffFffffffFfff
  FffFffffFffFffff
  FFfFFFfFFFfFFFfF
  FFFFFFFFFFFFFFFF
  KKKKKKKKKKKKKKKK
  gggggggggggggggg
`;

// ── Village buildings (full tiles) ─────────────────────────────────────────────────

const houseWall = px`
  tttttttttttttttt
  TTTTTTTTTTTTTTTT
  wWWWWWWtTWWWWWWw
  wWWWWWWtTWWWWWWw
  wWWwWWWtTWWWWwWw
  wWWWWWWtTWWWWWWw
  wWWWWWWtTWWWWWWw
  tttttttttttttttt
  TTTTTTTTTTTTTTTT
  wWWWWWWtTWWWWWWw
  wWWWwWWtTWWWWWWw
  wWWWWWWtTWWwWWWw
  wwwwwwwtTwwwwwww
  sSSsdSSSsdsSSSsd
  SsssdsSssdSsssds
  dddddddddddddddd
`;

const roofBand = px`
  RRRRRRRrRRRRRRRr
  ORRRRRRrORRRRRRr
  RRRRRRRrRRRRRRRr
  rrrrrrrrrrrrrrrr
  RRRrRRRRRRRrRRRR
  RRRrORRRRRRrORRR
  RRRrRRRRRRRrRRRR
  rrrrrrrrrrrrrrrr
`;
const houseRoof = [...roofBand, ...roofBand];

const houseDoor = px`
  tttttttttttttttt
  TTTTTTTTTTTTTTTT
  wWWWKKKKKKKKWWWw
  wWWKtTTTTTTtKWWw
  wWKtTTtTTtTTtKWw
  wWKtTTtTTtTTtKWw
  wWKtTTtTTtTTtKWw
  ttKtTTtTTtTTtKtt
  TTKtTTtTTtTYtKTT
  wWKtTTtTTtTTtKWw
  wWKtTTtTTtTTtKWw
  wWKtTTtTTtTTtKWw
  wwKtTTtTTtTTtKww
  sSKtTTtTTtTTtKSd
  SsKKKKKKKKKKKKsd
  ddqqqqqqqqqqqqdd
`;

const houseWindow = px`
  tttttttttttttttt
  TTTTTTTTTTTTTTTT
  wWWWWWWWWWWWWWWw
  wWWKKKKKKKKKKWWw
  wWWKAActtAAcKWWw
  wWWKAcBttAcBKWWw
  wWWKcBBttcBBKWWw
  tttKttttttttKttt
  TTTKAcBttAcBKTTT
  wWWKcBBttcBBKWWw
  wWWKBBbttBBbKWWw
  wWKKKKKKKKKKKKWw
  wWKMGYGMGYGMGKWw
  sSSsdSSSsdsSSSsd
  SsssdsSssdSsssds
  dddddddddddddddd
`;

const stoneWall = px`
  SSSSSSSdSSSSSSSd
  SWSSSSsdSWSSSSsd
  SSSSSSsdSSSSSSsd
  sssssssdsssssssd
  dddddddddddddddd
  SSSdSSSSSSSdSSSS
  SSsdSWSSSSsdSWSS
  SSsdSSSSSSsdSSSS
  sssdsssssssdssss
  dddddddddddddddd
  SSSSSSSdSSSSSSSd
  SWSSSSsdSWSSSSsd
  SSSSSSsdSSSSSSsd
  sssssssdsssssssd
  dddddddddddddddd
  KKKKKKKKKKKKKKKK
`;

const bridge = px`
  BBBBBBBBBBBBBBBB
  KKKKKKKKKKKKKKKK
  TTTTTTTTTTTTTTTT
  KKKKKKKKKKKKKKKK
  TTTtTTTtTTTtTTTt
  TkTtTTTtTkTtTTTt
  TTTtTTTtTTTtTTTt
  TTTtTkTtTTTtTkTt
  TTTtTTTtTTTtTTTt
  TkTtTTTtTkTtTTTt
  TTTtTTTtTTTtTTTt
  KKKKKKKKKKKKKKKK
  TTTTTTTTTTTTTTTT
  KKKKKKKKKKKKKKKK
  BBBBBBBBBBBBBBBB
  bBBBBBBBBBBBBBBb
`;

// ── Props (transparent background) ─────────────────────────────────────────────

const tree = px`
  ................
  .....KKKKKK.....
  ...KKfffffhKK...
  ..KffffffhhhfK..
  .KfffFfffffhhfK.
  .KffFFffffffhfK.
  KfffFFfffffffffK
  KffFFFfffFffffhK
  KfFFFffffFFfffFK
  .KFFFfffFFFfffK.
  .KFFFFFFFFFFFFK.
  ..KKFFKttKFFKK..
  ....KKKtTKKK....
  ......KtTK......
  .....KttTtK.....
  ....gKKKKKKg....
`;

const bush = px`
  ................
  ................
  ................
  ................
  ................
  ....KKKKKKK.....
  ..KKfffffhhKK...
  .KfffffffhhhfK..
  .KffMffffffhfK..
  KffffffFfffffffK
  KfFfffFFffMfffFK
  KFFFffFFFfffFFFK
  .KFFFFFFFFFFFFK.
  ..KKKKKKKKKKKK..
  ...gggggggggg...
  ................
`;

const rock = px`
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ......KKKK......
  ....KKSSSSKK....
  ...KSSSWSSSsK...
  ..KSSSSSSSsssK..
  ..KsSSSSSsssdK..
  .KssssssssdddK..
  .KdddssddddddK..
  ..KKKKKKKKKKK...
  ...ggggggggg....
`;

const fenceH = px`
  ................
  ................
  ................
  ..KK.....KK.....
  .KTtK...KTtK....
  KKTtKKKKKTtKKKKK
  TTTTTTTTTTTTTTTT
  tttttttttttttttt
  KKTtKKKKKTtKKKKK
  .KTtK...KTtK....
  KKTtKKKKKTtKKKKK
  TTTTTTTTTTTTTTTT
  tttttttttttttttt
  KKTtKKKKKTtKKKKK
  .KTtK...KTtK....
  ..gg.....gg.....
`;

const fenceV = px`
  ......KTtK......
  ......KTtK......
  .....KKKKKK.....
  .....KTTTtK.....
  .....KTTTtK.....
  .....KTTttK.....
  .....KKKKKK.....
  ......KTtK......
  ......KTtK......
  ......KTtK......
  .....KKKKKK.....
  .....KTTTtK.....
  .....KTTTtK.....
  .....KTTttK.....
  .....KKKKKK.....
  ......KTtK......
`;

const well = px`
  ................
  ...KKKKKKKKKK...
  ..KRRRRRRRRRRK..
  .KRRORRRRORRRrK.
  .KrrrrrrrrrrrrK.
  ...KtK....KtK...
  ...KTK....KTK...
  ..KKtKKKKKKtKK..
  .KSSSSSSSSSSSSK.
  KSsKKKKKKKKKKsSK
  KSKbBBBBcBBBbKSK
  KsKbbBBBBBBbbKsK
  KSsKKKKKKKKKKsSK
  .KSSsSSSSSsSSSK.
  ..KKKKKKKKKKKK..
  ...gggggggggg...
`;

const sign = px`
  ................
  ................
  ..KKKKKKKKKKKK..
  .KTTTTTTTTTTTTK.
  .KTkkkTkkTTkkTK.
  .KTTTTTTTTTTTTK.
  .KTkkTTkkkkTTTK.
  .KttttttttttttK.
  ..KKKKKtTKKKKK..
  ......KtTK......
  ......KtTK......
  ......KtTK......
  ......KtTK......
  ......KtTK......
  .....KKKKKK.....
  ....gggggggg....
`;

// A notice board with a lined paper and a big red "!" paper: the quest-giver shape.
const questBoard = px`
  ................
  .KKKKKKKKKKKKKK.
  KRrRRRRRRRRRRrRK
  KKKKKKKKKKKKKKKK
  .KTTTTTTTTTTTTK.
  .KTWWWWTTWWWWTK.
  .KTWkkWTTWRRWTK.
  .KTWWWWTTWRRWTK.
  .KTWkkWTTWRRWTK.
  .KTWWWWTTWWWWTK.
  .KTWkkWTTWRRWTK.
  .KTwwwwTTwwwwTK.
  .KttttttttttttK.
  .KKKKKKKKKKKKKK.
  ..KtK......KtK..
  .gKKKg....gKKKg.
`;

const marketStall = px`
  ................
  KKKKKKKKKKKKKKKK
  KRRWWRRWWRRWWRRK
  KRRWWRRWWRRWWRRK
  KrrwwrrwwrrwwrrK
  .KrrK.KwwK.KrrK.
  ..KK...KK...KK..
  .Kt..........tK.
  .Kt..........tK.
  .Kt..........tK.
  KKKKKKKKKKKKKKKK
  KOYOMEOYMOEYOMOK
  KTTTTTTTTTTTTTTK
  KTttTTttTTttTTtK
  KKKKKKKKKKKKKKKK
  .gggggggggggggg.
`;

const crierPodium = px`
  ................
  ................
  ................
  ................
  ................
  ....KKKKKKKK....
  ...KTTTTTTTTK...
  ...KttttttttK...
  ..KKKKKKKKKKKK..
  ..KTRRRRRRRRTK..
  ..KTRYRRRRYRTK..
  ..KTrrrrrrrrTK..
  ..KTTTTTTTTTTK..
  ..KttttttttttK..
  ..KKKKKKKKKKKK..
  ..gggggggggggg..
`;

const lampPost = px`
  ......KKKK......
  .....KYYYYK.....
  .....KYWWYK.....
  .....KYYYYK.....
  ......KKKK......
  .......KdK......
  .......KdK......
  .......KdK......
  .......KdK......
  .......KdK......
  .......KdK......
  .......KdK......
  .......KdK......
  ......KKdKK.....
  .....KdddddK....
  .....gggggggg...
`;

// ── Quest-stage tiles ──────────────────────────────────────────────────────────

const floor = px`
  NNNNNNNmNNNNNNNm
  NWNNNNNmNWNNNNNm
  NNNNNNNmNNNNNNNm
  NNNNNNNmNNNNNNNm
  NNNNNNNmNNNNNNNm
  NNNNNmNmNNNNNNNm
  NNNNNNNmNNNNNNNm
  mmmmmmmmmmmmmmmm
  NNNmNNNNNNNmNNNN
  NWNmNNNNNWNmNNNN
  NNNmNNNNNNNmNNNN
  NNNmNNNNNNNmNNmN
  NNNmNNNNNNNmNNNN
  NNNmNNNNNNNmNNNN
  NNNmNNNNNNNmNNNN
  mmmmmmmmmmmmmmmm
`;

const wall = px`
  SSSSSSSSSSSSSSSS
  SWSSSSSSSSWSSSSS
  SSSSSSSSSSSSSSSS
  ssssssssssssssss
  KKKKKKKKKKKKKKKK
  sssssssKsssssssK
  dddddddKdddddddK
  dddddddKdddddddK
  KKKKKKKKKKKKKKKK
  sssKsssssssKssss
  dddKdddddddKdddd
  dddKdddddddKdddd
  KKKKKKKKKKKKKKKK
  sssssssKsssssssK
  dddddddKdddddddK
  KKKKKKKKKKKKKKKK
`;

// The exit is an arched, glowing doorway with an "out" arrow and steps:
// recognisable by its shape, not just its colour.
const exit = px`
  NNNNNNNNNNNNNNNN
  NNNNKKKKKKKKNNNN
  NNNKEEEEEEEEKNNN
  NNKEEEEWWEEEEKNN
  NKEEEEWWWWEEEEKN
  NKEEEWWWWWWEEEKN
  NKEEWWWWWWWWEEKN
  NKEEEEEWWEEEEEKN
  NKEEEEEWWEEEEEKN
  NKEEEEEWWEEEEEKN
  NKKKKKKKKKKKKKKN
  NKSSSSSSSSSSSSKN
  NKssssssssssssKN
  NKSSSSSSSSSSSSKN
  NKddddddddddddKN
  mmmmmmmmmmmmmmmm
`;

// A closed wooden door with iron bands and a keyhole (solid until opened).
const door = px`
  ssssssssssssssss
  sdKKKKKKKKKKKKds
  sdKTTtTTtTTtTKds
  sdKTTtTTtTTtTKds
  sdKddddddddddKds
  sdKTTtTTtTTtTKds
  sdKTTtTTtTTtTKds
  sdKTTtTKKTTtTKds
  sdKTTtTKKTTtTKds
  sdKTTtTTKTTtTKds
  sdKTTtTTtTTtTKds
  sdKddddddddddKds
  sdKTTtTTtTTtTKds
  sdKTTtTTtTTtTKds
  sdKKKKKKKKKKKKds
  dddddddddddddddd
`;

const chestClosed = px`
  ................
  ................
  ................
  ................
  ...KKKKKKKKKK...
  ..KTTTTTTTTTTK..
  ..KTYTTTTTTYTK..
  ..KTYTTTTTTYTK..
  ..KKYKKYYKKYKK..
  ..KtYttYYttYtK..
  ..KtYttKKttYtK..
  ..KtYttttttYtK..
  ..KtYttttttYtK..
  ..KKKKKKKKKKKK..
  ...gggggggggg...
  ................
`;

const chestOpen = px`
  ................
  ...KKKKKKKKKK...
  ..KTTTTTTTTTTK..
  ..KTYTTTTTTYTK..
  ..KtYttttttYtK..
  ..KKKKKKKKKKKK..
  ..KnnnnnnnnnnK..
  ..KnYOYnYYnYnK..
  ..KKKKKKKKKKKK..
  ..KtYttYYttYtK..
  ..KtYttKKttYtK..
  ..KtYttttttYtK..
  ..KtYttttttYtK..
  ..KKKKKKKKKKKK..
  ...gggggggggg...
  ................
`;

function tile(name: string, ...frames: Frame[]): PixelSprite {
  return sprite(name, frames, SHARED_PALETTE);
}

/** Every tile, keyed by its name. */
export const TILES: Record<string, PixelSprite> = Object.fromEntries(
  [
    tile('grass', grass),
    tile('grass_alt', grassAlt),
    tile('flowers', flowers),
    tile('path', path),
    tile('cobble', cobble),
    tile('water', water0, water1),
    tile('sand', sand),
    tile('tree', tree),
    tile('bush', bush),
    tile('rock', rock),
    tile('fence_h', fenceH),
    tile('fence_v', fenceV),
    tile('hedge', hedge),
    tile('house_wall', houseWall),
    tile('house_roof', houseRoof),
    tile('house_door', houseDoor),
    tile('house_window', houseWindow),
    tile('well', well),
    tile('sign', sign),
    tile('quest_board', questBoard),
    tile('market_stall', marketStall),
    tile('crier_podium', crierPodium),
    tile('bridge', bridge),
    tile('lamp_post', lampPost),
    tile('stone_wall', stoneWall),
    tile('floor', floor),
    tile('wall', wall),
    tile('exit', exit),
    tile('door', door),
    tile('chest_closed', chestClosed),
    tile('chest_open', chestOpen),
  ].map((s) => [s.name, s]),
);

/** Tile names in sheet order. */
export const TILE_NAMES: string[] = Object.keys(TILES);

/** Tiles drawn with a transparent background, meant to sit on top of a ground tile. */
export const PROP_TILES = new Set([
  'tree',
  'bush',
  'rock',
  'fence_h',
  'fence_v',
  'well',
  'sign',
  'quest_board',
  'market_stall',
  'crier_podium',
  'lamp_post',
  'chest_closed',
  'chest_open',
]);
