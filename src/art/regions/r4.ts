// Region 4 — Forked Road Forest: its people, Bug, tiles and item icons.
// Each region keeps its own art here, so regions can be drawn side by side. Characters are
// 16×16 with 2 frames (see ../characters.ts for the roles and the villager() builder);
// tiles and item icons use the shared palette (../palette.ts).
import { BUG_PALETTE, villager } from '../characters';
import { px, shiftX, sprite, type Frame } from '../helpers';
import { SHARED_PALETTE } from '../palette';
import type { PixelSprite } from '../types';
import type { RegionArt } from './types';

// ── People (villagers facing down; accessories use the roles a b c x z) ─────────────

/** Ranger Hazel's flat-brimmed ranger hat with a green band. */
const RANGER_HAT = px`
  ......OOOO......
  .....OaabaO.....
  ....OaaabaaO....
  ...OccccccccO...
  OOaaaaaaaaaaaaOO
  .OOOOOOOOOOOOOO.
`;

/** Gatekeeper Moss's mossy helmet with a green gem, and a tall spear. */
const GATEKEEPER_HELMET_AND_SPEAR = px`
  ..............z.
  .......OO....zzz
  ......OaaO....c.
  .....OaaxaO...c.
  ....OaaaaaaO..c.
  ...ObbbbbbbbO.c.
  ..............c.
  ..............c.
  ..............c.
  ..............c.
  ..............c.
  ..............c.
  ..............c.
  ..............c.
  ..............c.
  ..............c.
`;

/** Woodcutter Burl's knit cap with a pompom, a bushy beard, and an axe. */
const WOODCUTTER_CAP_BEARD_AXE = px`
  ................
  ......OxxO......
  .....OOOOOO.....
  ....OaabaabO....
  ...OaaaaaaaaOzzc
  ...ObbbbbbbbOzzc
  ..............zc
  ...O3......3O..c
  ...O33333333O..c
  ....O333333O...c
  ...............c
  ...............c
  ...............c
  ...............c
  ...............c
  ...............c
`;

/** Nimbus's yellow rain hat (a sou'wester) and a little rain cloud. */
const RAIN_HAT_AND_CLOUD = px`
  .OOO............
  OzzzO...........
  .OOOO.OOOO......
  .x.x.OaaaaO.....
  ....OaaaaaaO....
  ..OOaaaaaaaaOO..
`;

/** Tobias Toll's tall hat and a red bow tie. */
const TOP_HAT_AND_BOW = px`
  .....OOOOOO.....
  .....OaaaaO.....
  .....OaaaaO.....
  .....OccccO.....
  ..OOOOOOOOOOOO..
  ................
  ................
  ................
  ................
  ................
  ......zxxz......
`;

/** Toadstool Tilly's spotted mushroom-cap hat. */
const MUSHROOM_CAP = px`
  ....OOOOOOOO....
  ..OOaaxaaaaxOO..
  .OaxaaaaaxaaaaO.
  OaaaaaxaaaaaxaaO
  OOOOOOOOOOOOOOOO
`;

const PEOPLE: PixelSprite[] = [
  villager(
    'npc_ranger_hazel',
    {
      skin: ['#8d5a3b', '#6e4229'],
      hair: ['#3a2418', '#24160e'],
      style: 'long',
      cloak: '#3f8f45',
      cloakShade: '#2f6b3c',
      extraPalette: { a: '#c9a46a', b: '#9a7a48', c: '#3c7a2a', x: '#f7cd4f' },
    },
    RANGER_HAT,
    [[5, 11, 'x']],
  ),
  villager(
    'npc_gatekeeper_moss',
    {
      skin: ['#f2c9a2', '#d6a47c'],
      hair: ['#a8a29a', '#7e786f'],
      style: 'short',
      cloak: '#7d8a5a',
      cloakShade: '#5c6840',
      extraPalette: { a: '#6a9a4a', b: '#46702e', c: '#7d4b30', x: '#52d8a6', z: '#d8dee8' },
    },
    GATEKEEPER_HELMET_AND_SPEAR,
  ),
  villager(
    'npc_woodcutter_burl',
    {
      skin: ['#e8b48a', '#c48c64'],
      hair: ['#7a3e1e', '#55280f'],
      style: 'none',
      cloak: '#c4402e',
      cloakShade: '#8a2a1e',
      extraPalette: { a: '#4a7cc8', b: '#2f5a9a', c: '#7d4b30', x: '#fff6e0', z: '#c2c6d0' },
    },
    WOODCUTTER_CAP_BEARD_AXE,
    [
      [5, 10, '6'],
      [9, 10, '6'],
      [7, 11, '6'],
    ],
  ),
  villager(
    'npc_weather_nimbus',
    {
      skin: ['#6e4229', '#52301c'],
      hair: ['#1f1a24', '#120e16'],
      style: 'curly',
      cloak: '#f2b632',
      cloakShade: '#c48a1c',
      extraPalette: { a: '#f7cd4f', b: '#c9972f', x: '#4a98dc', z: '#efe9f4' },
    },
    RAIN_HAT_AND_CLOUD,
  ),
  villager(
    'npc_bridge_tobias',
    {
      skin: ['#c98e5d', '#a66f45'],
      hair: ['#d8d0c8', '#b0a69c'],
      style: 'short',
      cloak: '#6f3d96',
      cloakShade: '#4e2a6c',
      glasses: '#c9972f',
      extraPalette: { a: '#2b2530', b: '#1a161e', c: '#b8322a', x: '#e2583a', z: '#93392c' },
    },
    TOP_HAT_AND_BOW,
  ),
  villager(
    'npc_forager_tilly',
    {
      skin: ['#f9d6b5', '#e0ad8a'],
      hair: ['#e8c25a', '#bf9638'],
      style: 'short',
      cloak: '#8a6a3c',
      cloakShade: '#6a4e28',
      extraPalette: { a: '#d8402e', b: '#a02a1e', x: '#fff6e0' },
    },
    MUSHROOM_CAP,
    [
      [12, 13, 'x'],
      [3, 13, 'x'],
    ],
  ),
];

// ── Forky, the talking signpost (two boards and a face; frame B shrugs) ──────────────

const SIGNPOST_PALETTE: Record<string, string> = {
  O: '#2b1d2e',
  T: '#bd7d4c',
  t: '#7d4b30',
  k: '#4a2f2a',
  e: '#1d1424',
  M: '#93392c',
  g: '#4a9a3c',
};

const SIGNPOST_BOARDS = px`
  ..OOOOOOOOO.....
  .OTTTTTTTTTO....
  OTkTkkTkkTTO....
  .OTTTTTTTTTO....
  ..OOOOOOOOOOOO..
  .....OTTTTTTTTO.
  .....OTkkTkkTkTO
  .....OTTTTTTTTO.
  .....OOOOOOOOO..
`;

const SIGNPOST_POST = px`
  .....OTTTTO.....
  .....OeTTeO.....
  .....OTTTTO.....
  .....OTMMTO.....
  .....OTTTTO.....
  ...gOOttttOOg...
`;

const SIGNPOST_0: Frame = ['................', ...SIGNPOST_BOARDS, ...SIGNPOST_POST];
// The shrug: both boards lift by one pixel, like shoulders.
const SIGNPOST_1: Frame = [...SIGNPOST_BOARDS, '.....OTTTTO.....', ...SIGNPOST_POST];

// ── Riddlewig, the Bug in the Riddle Gate's lock ────────────────────────────────────
// A padlock-shaped Bug whose shackle curls into a question mark. The keyhole is its nose.

const RIDDLEWIG_QUESTION = px`
  .....OOOO.......
  ....OYYYYO......
  ...OYO..OYO.....
  ....O...OYO.....
  .......OYO......
  ......OYO.......
`;

const RIDDLEWIG_BODY = px`
  ...OOOOYOOOOO...
  ..OVVLLLVVVVVO..
  ..OVwwVVVVwwVO..
  ..OVweVVVVweVO..
  ..OLVVVOOVVVVO..
  .gOVVVVOOVVVVOg.
  ..OVVMMMMMMVVO..
  ...OVVVVVVVVO...
  ...OOOOOOOOOO...
`;

const RIDDLEWIG_0: Frame = [...RIDDLEWIG_QUESTION, ...RIDDLEWIG_BODY, '...O.O....O.O...'];
const RIDDLEWIG_1: Frame = [
  ...shiftX(RIDDLEWIG_QUESTION, 1),
  ...RIDDLEWIG_BODY.map((row, i) => (i === 3 ? '..OVewVVVVewVO..' : row)),
  '....O.O..O.O....',
];

// ── Tiles ────────────────────────────────────────────────────────────────────────

// A tall pine in three tiers: a different shape from Hearthvale's round trees.
const forestPine = px`
  .......KK.......
  ......KfFK......
  .....KffFFK.....
  ....KfhfFFFK....
  ...KKKKffKKKK...
  ....KffffFFK....
  ...KfhffffFFK...
  ..KfffffffFFFK..
  ..KKKKffffKKKK..
  ...KfhffffFFFK..
  ..KfffffffFFFFK.
  .KffhffffffFFFFK
  .KKKKKKKKKKKKKKK
  ......KttK......
  ......KtTK......
  ....gKKKKKKg....
`;

// Two red mushrooms. Not solid: the hero can walk through the patch.
const forestMushrooms = px`
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ..KKKK..........
  .KRRWRK.........
  KRWRRRRK........
  KKKKKKKK..KKK...
  ..KwwK...KRWRK..
  ..KwwK..KKKKKKK.
  ..KwwK....KwK...
  ..KwwK....KwK...
  .gKKKKg..gKKKg..
`;

const forestStump = px`
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ....KKKKKKKK....
  ...KNNNNNNNNK...
  ..KNmNNmmNNmNK..
  ..KNNmNNNNmNNK..
  ..KTNNmmmmNNTK..
  ..KtTKKKKKKTtK..
  ..KtTTtTTtTTtK..
  .KKtTTtTTtTTtKK.
  .gKKKKKKKKKKKKg.
`;

// The woodcutter's log pile, seen from the cut ends.
const forestLogs = px`
  ................
  ................
  ................
  ................
  ................
  ......KKKK......
  .....KNNNNK.....
  .....KNmmNK.....
  .....KNNNNK.....
  ...KKKKKKKKKK...
  ..KNNNNKKNNNNK..
  ..KNmmNKKNmmNK..
  ..KNmmNKKNmmNK..
  ..KNNNNKKNNNNK..
  ...KKKKKKKKKK...
  ..gggggggggggg..
`;

// A stone pillar of the Riddle Gate, carved with a question mark.
const riddlePillar = px`
  ....KKKKKKKK....
  ...KSSSSSSSSK...
  ...KddddddddK...
  ....KSSSSSSK....
  ....KSsYYsSK....
  ....KSYssYSK....
  ....KSssYsSK....
  ....KSsYssSK....
  ....KSssssSK....
  ....KSsYssSK....
  ....KSssssSK....
  ....KSSsSSsK....
  ....KSsSSsSK....
  ...KddddddddK...
  ...KSSSSSSSSK...
  ..KKKKKKKKKKKK..
`;

// The top of the Riddle Gate: a stone lintel with a golden lock. The way through is open.
const riddleArch = px`
  KKKKKKKKKKKKKKKK
  KSSSSSKYYKSSSSSK
  KsSSSSKYyKSSSSsK
  KddddKKKKKKddddK
  KdK..........KdK
  KsK..........KsK
  KSK..........KSK
  KsK..........KsK
  KdK..........KdK
  KsK..........KsK
  KSK..........KSK
  KsK..........KsK
  KdK..........KdK
  KsK..........KsK
  KSK..........KSK
  KKK..........KKK
`;

// The gatekeeper's toll gate: two posts, a beam, and a hanging gold-coin sign.
const tollGate = px`
  .KK..........KK.
  KTTKKKKKKKKKKTTK
  KTtTTTTTTTTTTtTK
  KTTKKKKKKKKKKTTK
  KTtK..KKKK..KtTK
  KTTK..KYYK..KTTK
  KTtK..KyYK..KtTK
  KTTK..KKKK..KTTK
  KTtK........KtTK
  KTTK........KTTK
  KTtK........KtTK
  KTTK........KTTK
  KTtK........KtTK
  KTTK........KTTK
  KTtK........KtTK
  KKKK........KKKK
`;

// Packed earth with fallen leaves: the floor of the forest's quest stages.
const forestFloor = px`
  ppppppppqppppppp
  ppppfpppppppppOp
  pppffppPpppppppp
  ppppppppppppqppp
  pqppppppppPppppp
  ppppppppppfppppp
  pppppOppppffpppp
  pPpppppppppppppp
  ppppppppppppppqp
  ppqpppPppppppppp
  ppppppppqppppppp
  ppppppppppppyppp
  ppfppppppPpppppp
  pffppppppqpppppp
  pppppppppppppppp
  ppppppqppppppPpp
`;

// The Riddle Gate's two doors. Each has its own emblem (a sun or a moon), so they differ by
// shape, not only by colour.
const goldDoor = px`
  ssssssssssssssss
  sdddKKKKKKKKddds
  sddKYYYYYYYYKdds
  sdKYYyYYYYyYYKds
  sdKYYyYYYYyYYKds
  sdKYYyYOOYyYYKds
  sdKYYyOYYOyYYKds
  sdKYYyOYYOyYYKds
  sdKYYyYOOYyYYKds
  sdKYYyYYYYyYYKds
  sdKYYyYYYYyKYKds
  sdKYYyYYYYyYYKds
  sdKYYyYYYYyYYKds
  sdKYYyYYYYyYYKds
  sdKKKKKKKKKKKKds
  dddddddddddddddd
`;

const silverDoor = px`
  ssssssssssssssss
  sdddKKKKKKKKddds
  sddKSSSSSSSSKdds
  sdKSSsSSSSsSSKds
  sdKSSsSSSSsSSKds
  sdKSSsSAASsSSKds
  sdKSSsAASSsSSKds
  sdKSSsAASSsSSKds
  sdKSSsSAASsSSKds
  sdKSSsSSSSsSSKds
  sdKSSsSSSSsKSKds
  sdKSSsSSSSsSSKds
  sdKSSsSSSSsSSKds
  sdKSSsSSSSsSSKds
  sdKKKKKKKKKKKKds
  dddddddddddddddd
`;

// ── Item icons ───────────────────────────────────────────────────────────────────

// Tuning Fork of Truth: it rings out True or False.
const tuningFork = px`
  ................
  .E..KK....KK..E.
  E..KSWK..KSWK..E
  E..KSWK..KSWK..E
  .E.KSWK..KSWK.E.
  ...KSWK..KSWK...
  ...KSWK..KSWK...
  ...KSWKKKKSWK...
  ...KSSWWWWSSK...
  ....KKSSSSKK....
  ......KSWK......
  ......KSWK......
  ......KSWK......
  ......KTTK......
  ......KttK......
  .......KK.......
`;

// Compass of Conditions: a gold compass whose needle picks one way.
const conditionCompass = px`
  ................
  ......KKKK......
  ....KKYYYYKK....
  ...KYYWWWWYYK...
  ..KYWWWkWWWWyK..
  ..KYWWWWWWRRyK..
  .KYWWWWWWRRWWyK.
  .KYWkWWWOOWWkyK.
  .KYWWWWkkWWWWyK.
  .KYWWWkkWWWWWyK.
  ..KYWWWWWWWWyK..
  ..KYWWWWkWWWyK..
  ...KyyWWWWyyK...
  ....KKyyyyKK....
  ......KKKK......
  ................
`;

// Twin Keys of And & Or: a gold key and a silver key on one ring.
const twinKeys = px`
  ....KKKKKKK.....
  ..KKK.....KKK...
  .KYYYK...KSSSK..
  .KYKYK...KSKSK..
  .KYYYK...KSSSK..
  ..KYK.....KSK...
  ..KYK.....KSK...
  ..KYK.....KSK...
  ..KYK.....KSK...
  ..KYKK....KSKK..
  ..KYYK....KSSK..
  ..KYK.....KSK...
  ..KYKK....KSKK..
  ..KYYK....KSSK..
  ..KKK.....KKK...
  ................
`;

const tile = (name: string, frame: Frame) => sprite(name, [frame], SHARED_PALETTE);

export const art: RegionArt = {
  characters: [
    ...PEOPLE,
    sprite('npc_signpost_forky', [SIGNPOST_0, SIGNPOST_1], SIGNPOST_PALETTE),
    sprite('bug_riddlewig', [RIDDLEWIG_0, RIDDLEWIG_1], BUG_PALETTE),
  ],
  tiles: [
    tile('forest_pine', forestPine),
    tile('forest_mushrooms', forestMushrooms),
    tile('forest_stump', forestStump),
    tile('forest_logs', forestLogs),
    tile('riddle_pillar', riddlePillar),
    tile('riddle_arch', riddleArch),
    tile('toll_gate', tollGate),
    tile('forest_floor', forestFloor),
    tile('gold_door', goldDoor),
    tile('silver_door', silverDoor),
  ],
  props: [
    'forest_pine',
    'forest_mushrooms',
    'forest_stump',
    'forest_logs',
    'riddle_pillar',
    'riddle_arch',
    'toll_gate',
  ],
  items: [
    tile('tuning_fork', tuningFork),
    tile('condition_compass', conditionCompass),
    tile('twin_keys', twinKeys),
  ],
};
