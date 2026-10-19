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
  for (;;) {
    const name = `${pick(ADJECTIVES)} ${pick(CREATURES)}`;
    if (name.length <= 16) return name;
  }
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

const SHORT = 5;

/** Words of a nickname, normalized; runs of single letters ("F u c k") are joined back up. */
function words(raw: string): string[] {
  const tokens = raw.split(/[\s-]+/).filter(Boolean);
  const out: string[] = [];
  let run = '';
  for (const token of tokens) {
    if (token.length === 1) {
      run += token;
      continue;
    }
    if (run) out.push(run);
    run = '';
    out.push(token);
  }
  if (run) out.push(run);
  return out.map(normalizeForFilter).filter(Boolean);
}

function isBlocked(raw: string): boolean {
  if (/k{3}/i.test(raw.replace(/[^a-z]/gi, ''))) return true;
  const ws = words(raw);
  const allowed = new Set(ALLOWED.map(normalizeForFilter));
  const joined = ws.filter((w) => !allowed.has(w)).join('');
  for (const stem of BLOCKED) {
    const s = normalizeForFilter(stem);
    if (s.length < 3) continue;
    if (s.length >= SHORT) {
      if (joined.includes(s)) return true;
    } else if (
      ws.some((w) => !allowed.has(w) && (w === s || (w.startsWith(s) && w.length - s.length <= 3)))
    ) {
      return true;
    }
  }
  return false;
}

export function checkNickname(raw: string): NicknameProblem {
  const name = raw.trim();
  if (name.length < 2 || name.length > 16) return 'length';
  if (!/^[A-Za-z0-9 -]+$/.test(name)) return 'characters';
  if (/\d{5,}/.test(name.replace(/[ -]/g, ''))) return 'personal';
  return isBlocked(name) ? 'blocked' : null;
}
