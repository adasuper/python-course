// Region 3 — Merchant's Crossing: its people, Bug, tiles and item icons.
// Each region keeps its own art here, so regions can be drawn side by side. Characters are
// 16×16 with 2 frames (see ../characters.ts for the roles and the villager() builder);
// tiles and item icons use the shared palette (../palette.ts).
import { BUG_PALETTE, villager } from '../characters';
import { overlay, px, sprite, type Frame } from '../helpers';
import { SHARED_PALETTE } from '../palette';
import type { PixelSprite } from '../types';
import type { RegionArt } from './types';

// ── Villagers (accessory roles: a b c x z m, set per character) ──────────────────────

// Tally Brightcoin, the money-changer: a green eyeshade and a gold coin.
const EYESHADE_AND_COIN = px`
  ................
  ................
  ................
  ....OaaaaaaO....
  ...OOOOOOOOOO...
  ..ObbbbbbbbbbO..
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ............OOO.
  ...........OxxzO
  ............OOO.
`;

// Granny Pippin, the apple seller: a basket of apples on her arm.
const APPLE_BASKET = px`
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
  ..........OxxOx.
  .........OxxzxxO
  .........OaabaaO
  .........ObaabaO
  ..........OOOOO.
`;

// Marta Crust, the pie merchant: a spotted bandana and a fresh lattice pie.
const BANDANA_AND_PIE = px`
  ................
  ................
  .....OOOOOO.....
  ....OaabaaaO....
  ...OabaaaabaOaO.
  ...OOOOOOOOOOaa.
  ................
  ................
  ................
  ................
  ....OOOOOOOO....
  ...OxzxzxzxzO...
  ...OyyyyyyyyO...
  ....OOOOOOOO....
`;

// Hattie Honeycomb, the honey seller: a striped beekeeper's hat and a honey pot.
const BEE_HAT_AND_HONEY = px`
  ....OOOOOOOO....
  ...OaaaaaaaaO...
  ...ObcbcbcbcO...
  .OOaaaaaaaaaaOO.
  OaaaaaaaaaaaaaaO
  .OOOOOOOOOOOOOO.
  ................
  ................
  ................
  ................
  ................
  ................
  ............OOO.
  ...........OxxxO
  ...........OxzxO
  ............OOO.
`;

// Bea Barrow, the turnip seller: a farmer's cap and a prize turnip.
const CAP_AND_TURNIP = px`
  ................
  ................
  .....OOOOOO.....
  ....OaaaaaaO....
  ...OaaaaaaaaO...
  ...OOOOOOOOOOOO.
  ................
  ................
  ................
  ................
  ............g.g.
  ............OgO.
  ...........OxxxO
  ...........OxzzO
  ............OzO.
`;

// Clerk Tuppence: a tall clerk's hat with a quill, and a long receipt.
const CLERK_HAT_AND_RECEIPT = px`
  ..........z.....
  .....OOOOOOz....
  ....OaaaaaaOz...
  ....OaaaaaaO....
  ...ObbbbbbbbO...
  ................
  ................
  ................
  ................
  ................
  ................
  ............OOO.
  ............OzO.
  ............OmO.
  ............OzO.
  ............OmO.
`;

// Wren, a young shopper: a cap and a little coin pouch.
const CAP_AND_POUCH = px`
  ................
  ................
  .....OOOOOO.....
  ....OaaaaaaO....
  ...OaaaaaaaaO...
  ..OOOOOOOOOOOO..
  ................
  ................
  ................
  ................
  ................
  ................
  ............ObO.
  ...........OxxxO
  ...........OxxxO
  ............OOO.
`;

// Captain Dunes, the caravan driver: goggles over a desert head wrap.
const GOGGLES = px`
  ................
  ................
  ................
  ...OOOOOOOOOO...
  ...OxzOOOOxzO...
`;

const PEOPLE: PixelSprite[] = [
  villager(
    'npc_moneychanger',
    {
      skin: ['#8d5a3b', '#6b4029'],
      hair: ['#2a1c1a', '#170f0e'],
      style: 'short',
      cloak: '#8e3b4a',
      cloakShade: '#64273a',
      extraPalette: { a: '#3f8f45', b: '#2f6b3c', x: '#f7cd4f', z: '#c9972f' },
    },
    EYESHADE_AND_COIN,
  ),
  villager(
    'npc_apple_seller',
    {
      skin: ['#f2c9a2', '#d6a47c'],
      hair: ['#d8d0c8', '#b0a69c'],
      style: 'bun',
      cloak: '#c46a8a',
      cloakShade: '#94495f',
      glasses: '#918780',
      extraPalette: { a: '#bd7d4c', b: '#7d4b30', x: '#d8402f', z: '#93392c' },
    },
    APPLE_BASKET,
  ),
  villager(
    'npc_pie_merchant',
    {
      skin: ['#c98e5d', '#a66f45'],
      hair: ['#5b2e1e', '#3d1d12'],
      style: 'long',
      cloak: '#e2a03a',
      cloakShade: '#b07a22',
      extraPalette: { a: '#cf3b3b', b: '#fff6e0', x: '#e6c088', z: '#94643c', y: '#918780' },
    },
    BANDANA_AND_PIE,
  ),
  villager(
    'npc_honey_seller',
    {
      skin: ['#5a3622', '#3f2414'],
      hair: ['#24191a', '#120c0d'],
      style: 'short',
      cloak: '#c46a2a',
      cloakShade: '#93491a',
      extraPalette: { a: '#fff6e0', b: '#2b1d2e', c: '#f7cd4f', x: '#f39a45', z: '#fff6e0' },
    },
    BEE_HAT_AND_HONEY,
  ),
  villager(
    'npc_turnip_seller',
    {
      skin: ['#d9a679', '#b5845a'],
      hair: ['#c4622d', '#93421c'],
      style: 'long',
      cloak: '#7a9a4a',
      cloakShade: '#56702e',
      extraPalette: { a: '#3c7a2a', g: '#6cbf4a', x: '#8c5fcc', z: '#fff6e0' },
    },
    CAP_AND_TURNIP,
  ),
  villager(
    'npc_clerk',
    {
      skin: ['#fce4cf', '#e8c0a2'],
      hair: ['#3a2a22', '#22170f'],
      style: 'short',
      cloak: '#5a4a8a',
      cloakShade: '#3f3366',
      extraPalette: { a: '#2f4a8a', b: '#f7cd4f', z: '#fff6e0', m: '#918780' },
    },
    CLERK_HAT_AND_RECEIPT,
  ),
  villager(
    'npc_customer',
    {
      skin: ['#7a4a2e', '#5b331e'],
      hair: ['#2a1c1a', '#170f0e'],
      style: 'short',
      cloak: '#3b82d6',
      cloakShade: '#285ea3',
      extraPalette: { a: '#f39a45', b: '#7d4b30', x: '#bd7d4c' },
    },
    CAP_AND_POUCH,
  ),
  villager(
    'npc_caravan_driver',
    {
      skin: ['#c98e5d', '#a66f45'],
      hair: ['#e8d3a8', '#c4a874'],
      style: 'covering',
      cloak: '#cf5a3e',
      cloakShade: '#93392c',
      extraPalette: { x: '#9ad8f2', z: '#fff6e0' },
    },
    GOGGLES,
  ),
];

// ── Hagglebug, the Bug of this region ───────────────────────────────────────────────

/** Bug colours, plus a top hat (n), a price tag (W) and its string (k). */
const HAGGLE_PALETTE: Record<string, string> = {
  ...BUG_PALETTE,
  n: '#1d1424',
  W: '#fff6e0',
  k: '#7d4b30',
};

// A grinning Bug in a tiny top hat, with a gold-coin belly and a price tag in its claw.
const HAGGLEBUG_0 = px`
  ....OOOOO.......
  ....OnnnO.......
  ....OnnnO.......
  ...OOMMMOO......
  ..OOOOOOOOOO....
  .OVVLLVVVVVVO...
  OVVwwVVVVwwVVO..
  OVVweVVVVweVVO..
  OVVVMVVVVMVVVO..
  OVVVVMMMMVVVVO..
  OVYYYYYYYYYYVOg.
  OVYyYYYYYYyYVOWW
  .OVYyyyyyyyYVOWk
  ..OOOOOOOOOOO.WW
  ..O.O.O..O.O.O..
  .g..g..gg..g..g.
`;
// Frame 2: the hat hops, the eyes dart and the legs shuffle. Haggle, haggle.
const HAGGLEBUG_1 = overlay(
  overlay(
    HAGGLEBUG_0,
    px`
      .....OOOOO......
      .....OnnnO......
      .....OnnnO......
      ...OOOMMMOO.....
    `,
  ),
  px`
    OVVewVVVVewVVO..
  `,
  7,
).map((row, y) => {
  if (y === 14) return '...O.O.OO.O.O...';
  if (y === 15) return '..g..g....g..g..';
  return row;
});

// ── Map tiles ─────────────────────────────────────────────────────────────────────────

// An apple tree: the village tree, with red apples in its leaves.
const appleTree = px`
  ................
  .....KKKKKK.....
  ...KKfffffhKK...
  ..KffRffffhhhfK.
  .KfffFfffRfhhfK.
  .KffFFffffffhfK.
  KfRfFFfffffffRfK
  KffFFFfffFffffhK
  KfFFFffRfFFfffFK
  .KFFFfffFFFfRfK.
  .KFFFFFFFFFFFFK.
  ..KKFFKttKFFKK..
  ....KKKtTKKK....
  ......KtTK......
  .....KttTtK.....
  ....gKKKKKKg....
`;

// Granny Pippin's apple cart: a heap of apples on a wooden cart with one big wheel.
const appleCart = px`
  ................
  ................
  ................
  ................
  .......G........
  ..KKK.KGK.KKK...
  .KRWRKRWRKRWRK..
  .KRRrKRRrKRRrK..
  KKKKKKKKKKKKKKK.
  KTTTTTTTTTTTTTKK
  KtTTtTTTtTTTtTKT
  KKKKKKKKKKKKKKKK
  ..KKKK.....KK...
  .KtTTtK....KK...
  .KTKKTK....KK...
  ..KKKKgggggKKg..
`;

const crate = px`
  ................
  ................
  ................
  ..KKKKKKKKKKKK..
  ..KTTTTTTTTTtK..
  ..KTKKKKKKKKtK..
  ..KTKtTTTTKKtK..
  ..KTKTtTTKtKtK..
  ..KTKTTtKTtKtK..
  ..KTKTTKtTtKtK..
  ..KTKTKTTtTKtK..
  ..KTKKKKKKKKtK..
  ..KTttttttttqK..
  ..KKKKKKKKKKKK..
  ...dddddddddd...
  ................
`;

const barrel = px`
  ................
  ................
  ................
  .....KKKKKK.....
  ....KTTTTTtK....
  ...KTTttttTtK...
  ...KsssssssdK...
  ...KTTTTTTTtK...
  ...KTtTTTTttK...
  ...KTTTTTTTtK...
  ...KsssssssdK...
  ...KTTtTTTTtK...
  ....KTTTTTtK....
  .....KKKKKK.....
  ....dddddddd....
  ................
`;

// The merchant's big balance scale, where Hagglebug likes to sit.
const merchantScale = px`
  .......KK.......
  ......KYYK......
  .KKKKKKYyKKKKKK.
  KYYYYYYYYYYYYYyK
  .KKKKKKTtKKKKKK.
  ..K....KtK...K..
  ..K....KtK...K..
  .KWK...KtK..KYK.
  KWkWK..KtK.KYyYK
  KSSSSK.KtK.KSSSK
  .KssK..KtK..KsK.
  ..KK...KtK...K..
  .....KKTtKK.....
  ....KTTTTtTK....
  ....KKKKKKKK....
  ...dddddddddd...
`;

// A turnip field: dark soil with rows of leafy turnip tops.
const turnipPatch = px`
  qqqqqqqqqqqqqqqq
  qpqqqGgqqqqpqqGg
  qqqqGVGqqpqqqGVG
  pqqqqVqqqqqqqqVq
  qqqqqqqqqpqqqqqq
  qqpqqqqqqqqqpqqq
  qqqqqqqqqqqqqqqq
  qGgqqqqpqqGgqqqq
  GVGqqqqqqGVGqqqp
  qVqqqpqqqqVqqqqq
  qqqqqqqqqqqqqqqq
  qqqqqqpqqqqqqpqq
  qqqqqqqqqqqqqqqq
  qqqqGgqqqqqqGgqq
  qqqGVGqqqpqGVGqq
  qpqqVqqqqqqqVqqq
`;

function tile(name: string, frame: Frame): PixelSprite {
  return sprite(name, [frame], SHARED_PALETTE);
}

// ── Item icons ────────────────────────────────────────────────────────────────────────

// Abacus of Reckoning: a wooden frame with rows of coloured beads.
const abacus = px`
  ................
  .KKKKKKKKKKKKKK.
  .KTTTTTTTTTTTTK.
  .KTKKKKKKKKKKTK.
  .KTKRRYYssssKTK.
  .KTKrryykkkkKTK.
  .KTKssssEELLKTK.
  .KTKkkkkggVVKTK.
  .KTKOOssssYYKTK.
  .KTKqqkkkkyyKTK.
  .KTKKKKKKKKKKTK.
  .KTTTTTTTTTTTTK.
  .KttttttttttttK.
  .KKKKKKKKKKKKKK.
  ..KK........KK..
  ................
`;

// Ear Trumpet of Asking: a brass horn, wide at one end, curling into an earpiece.
const earTrumpet = px`
  ................
  ................
  ..KK............
  .KkYK...........
  KkkWYK..........
  KkkWYYKK........
  KkkYYYYyKKKKK...
  KkkYYYYyyyyyyK..
  KkkYYYyyKKKKyyK.
  KkkYyyyK....KyK.
  .KkyyyK.....KyK.
  ..KyyK.....KyyK.
  ...KK.....KyyK..
  .........KkkK...
  ..........KK....
  ................
`;

// Scales of Conversion: a price tag on one pan, a coin on the other, in perfect balance.
const balanceScales = px`
  .......KK.......
  ......KYYK......
  .KKKKKKYyKKKKKK.
  KYYYYYYYYYYYYYyK
  .KKKKKKTtKKKKKK.
  ..K....KtK...K..
  ..K....KtK...K..
  .KWK...KtK..KYK.
  KWkWK..KtK.KYyYK
  KSSSSK.KtK.KSSSK
  .KssK..KtK..KsK.
  ..KK...KtK...K..
  .....KKTtKK.....
  ....KTTTTtTK....
  ....KKKKKKKK....
  ................
`;

function icon(name: string, frame: Frame): PixelSprite {
  return sprite(name, [frame], SHARED_PALETTE);
}

export const art: RegionArt = {
  characters: [...PEOPLE, sprite('bug_hagglebug', [HAGGLEBUG_0, HAGGLEBUG_1], HAGGLE_PALETTE)],
  tiles: [
    tile('apple_tree', appleTree),
    tile('apple_cart', appleCart),
    tile('crate', crate),
    tile('barrel', barrel),
    tile('merchant_scale', merchantScale),
    tile('turnip_patch', turnipPatch),
  ],
  props: ['apple_tree', 'apple_cart', 'crate', 'barrel', 'merchant_scale'],
  items: [icon('abacus', abacus), icon('ear_trumpet', earTrumpet), icon('balance_scales', balanceScales)],
};
