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
  'spicy',
  'spice',
  'shiitake',
  'sexton',
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

/** Letters only, with leetspeak undone. Repeated letters are kept: see stemPattern. */
function letters(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0134578@$!]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]/g, '');
}

/** Each letter may repeat ("fuuuck"), without collapsing innocent names ("Bob" is not a stem). */
const stemPattern = (stem: string) =>
  stem
    .split('')
    .map((c) => `${c}+`)
    .join('');

const STEMS = BLOCKED.map(letters)
  .filter((stem) => stem.length >= 3)
  .map((stem) => ({
    // Long stems are blocked anywhere; short ones only as a word or with a short ending.
    short: stem.length < SHORT,
    anywhere: new RegExp(stemPattern(stem)),
    word: new RegExp(`^${stemPattern(stem)}[a-z]{0,3}$`),
  }));
const ALLOWED_WORDS = ALLOWED.filter((a) => !a.includes(' ')).map(letters);
const ALLOWED_PHRASES = ALLOWED.filter((a) => a.includes(' '));

/** An allowed word, also with a short ending ("Buttons", "Sextons"). */
const allowed = (word: string) =>
  ALLOWED_WORDS.some((a) => word.startsWith(a) && word.length - a.length <= 3);

function isBlocked(raw: string): boolean {
  if (/k{3}/i.test(raw.replace(/[^a-z]/gi, ''))) return true;
  let text = raw.toLowerCase();
  for (const phrase of ALLOWED_PHRASES) text = text.split(phrase).join(' ');
  const pieces = text
    .split(/[\s-]+/)
    .map(letters)
    .filter(Boolean);
  const words = pieces.filter((w) => !allowed(w));
  // Short pieces next to each other are read together: "F u c k", "Sh-it", "Ma Sh It".
  const runs: string[] = [];
  let run: string[] = [];
  for (const piece of [...pieces, '']) {
    if (piece && piece.length <= 3) run.push(piece);
    else {
      if (run.length > 1) runs.push(run.join(''));
      run = [];
    }
  }
  const everything = words.join('');
  return STEMS.some(
    (stem) =>
      (!stem.short && stem.anywhere.test(everything)) ||
      words.some((w) => stem.word.test(w)) ||
      runs.some((r) => stem.anywhere.test(r)),
  );
}

export function checkNickname(raw: string): NicknameProblem {
  const name = raw.trim();
  if (name.length < 2 || name.length > 16) return 'length';
  if (!/^[A-Za-z0-9 -]+$/.test(name)) return 'characters';
  if (/\d{5,}/.test(name.replace(/[ -]/g, ''))) return 'personal';
  return isBlocked(name) ? 'blocked' : null;
}
