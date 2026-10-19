// Nickname rules and a local, offline profanity filter (docs/specs.md §11.8).

const ADJECTIVES = [
  'Brave',
  'Clever',
  'Curious',
  'Daring',
  'Gentle',
  'Happy',
  'Jolly',
  'Lucky',
  'Mighty',
  'Nimble',
  'Quiet',
  'Quick',
  'Shiny',
  'Sleepy',
  'Sneaky',
  'Sunny',
  'Swift',
  'Witty',
  'Cosmic',
  'Mossy',
];
const CREATURES = [
  'Newt',
  'Otter',
  'Badger',
  'Falcon',
  'Fox',
  'Hedgehog',
  'Lynx',
  'Moth',
  'Panda',
  'Puffin',
  'Rabbit',
  'Raven',
  'Salamander',
  'Sparrow',
  'Squirrel',
  'Turtle',
  'Wombat',
  'Yak',
  'Gecko',
  'Beetle',
];

export function randomNickname(random: () => number = Math.random): string {
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]!;
  return `${pick(ADJECTIVES)} ${pick(CREATURES)}`;
}

// Blocked word stems, stored ROT13 so the source stays readable for everyone.
const BLOCKED_ROT13 = [
  'shpx',
  'fuvg',
  'ovgpu',
  'nffubyr',
  'onfgneq',
  'qnza',
  'penc',
  'phag',
  'qvpx',
  'pbpx',
  'chffl',
  'jnax',
  'gjng',
  'fyhg',
  'jubre',
  'anmv',
  'avttre',
  'avttn',
  'snttbg',
  'snt',
  'ergneq',
  'cravf',
  'intvan',
  'obbo',
  'gvgf',
  'frk',
  'cbea',
  'zheqre',
  'fhvpvqr',
  'cvff',
  'ohgg',
  'nefr',
  'oybjwbo',
  'qvyqb',
  'pyvg',
  'fcrez',
  'ubeal',
  'anxrq',
  'urebva',
  'pbpnvar',
  'jrrq',
  'fcvp',
  'puvax',
  'xvxr',
  'jrgonpx',
  'snt',
  'ubzb',
  'qlxr',
  'genaal',
  'xxx',
  'uvgyre',
];
const rot13 = (s: string) =>
  s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
const BLOCKED = BLOCKED_ROT13.map(rot13);
// Innocent words that contain a blocked stem (the "Scunthorpe problem").
const ALLOWED = [
  'scunthorpe',
  'assassin',
  'class',
  'grass',
  'glass',
  'pass',
  'bass',
  'brass',
  'mass',
  'sassy',
  'cassie',
  'hello',
  'shell',
  'shelly',
  'michelle',
  'dickens',
  'cockatoo',
  'cocker',
  'peacock',
  'hancock',
  'diet',
  'died',
  'diesel',
  'indie',
  'goodie',
  'cookie',
  'birdie',
  'skill',
  'killer whale',
  'kilt',
  'button',
  'butter',
  'buttercup',
  'scrap',
  'trap',
  'wrap',
  'rapid',
  'grape',
  'drape',
  'therapist',
  'sussex',
  'essex',
  'middlesex',
  'saxophone',
  'deadline',
  'sniper',
  'hellebore',
  'shellfish',
  'spice',
  'wink',
];

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

export function normalizeForFilter(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0134578@$!]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1');
}

export type NicknameProblem = 'length' | 'characters' | 'personal' | 'blocked' | null;

export function checkNickname(raw: string): NicknameProblem {
  const name = raw.trim();
  if (name.length < 2 || name.length > 16) return 'length';
  if (!/^[A-Za-z0-9 -]+$/.test(name)) return 'characters';
  if (/\d{5,}/.test(name.replace(/[ -]/g, ''))) return 'personal';
  const lowered = name.toLowerCase();
  let squashed = normalizeForFilter(name);
  for (const ok of ALLOWED) {
    if (lowered.replace(/[^a-z ]/g, '').includes(ok)) squashed = squashed.replace(normalizeForFilter(ok), '');
  }
  if (BLOCKED.some((stem) => squashed.includes(stem.replace(/(.)\1+/g, '$1')))) return 'blocked';
  return null;
}
