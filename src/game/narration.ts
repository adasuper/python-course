// Turns replayed actions into short sentences for screen readers (docs/specs.md §8).
// Consecutive moves in the same direction merge: "Moved right 3 steps."
import type { Action } from '../runtime/protocol';

export function sentenceFor(action: Action, count = 1): string | null {
  switch (action.t) {
    case 'move':
      return `Moved ${action.dir}${count > 1 ? ` ${count} steps` : ''}.`;
    case 'bonk':
      return `Bumped into ${article(action.into)}.`;
    case 'face':
      return `Turned to face ${action.dir}.`;
    case 'say':
      return `Hero says: ${action.text}`;
    case 'pickup':
      return action.item ? `Picked up ${article(action.item)}.` : 'Nothing to pick up here.';
    case 'chest':
      if (action.missing) return 'There is no chest in front of the hero.';
      return action.ok
        ? `The chest opened${action.loot.length ? `: ${action.loot.join(', ')}` : ''}.`
        : 'The chest rattles. Wrong code.';
    case 'look':
      return `Looked ahead and saw ${article(action.saw)}.`;
    case 'wait':
      return `Waited ${action.seconds} second${action.seconds === 1 ? '' : 's'}.`;
    case 'input':
      if (action.source === 'player') return `You answered "${action.value}".`;
      return action.by ? `${action.by} says: ${action.value}` : `Handed over "${action.value}".`;
    case 'out':
      return null; // output is shown (and announced) by the Scroll of Output itself
  }
}

function article(word: string): string {
  if (word === 'edge') return 'the edge of the map';
  if (/^(wall|water|floor|exit|grass)$/.test(word)) return `the ${word}`;
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}

const list = (words: string[]) =>
  words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Which actions in a row read as one sentence: moves the same way, bumps into the same
 *  thing, pickups, and speech. */
function sameGroup(a: Action, b: Action): boolean {
  if (a.t !== b.t) return false;
  if (a.t === 'move' && b.t === 'move') return a.dir === b.dir;
  if (a.t === 'bonk' && b.t === 'bonk') return a.into === b.into;
  return a.t === 'pickup' || a.t === 'say';
}

function groupSentences(group: Action[]): string[] {
  const first = group[0]!;
  const n = group.length;
  if (n === 1) {
    const s = sentenceFor(first);
    return s ? [s] : [];
  }
  switch (first.t) {
    case 'move':
      return [sentenceFor(first, n)!];
    case 'bonk':
      return [`Bumped into ${article(first.into)} ${times(n)}.`];
    case 'say':
      return [`Hero says: ${group.map((a) => (a.t === 'say' ? a.text : '')).join(', then ')}`];
    case 'pickup': {
      const items = group.flatMap((a) => (a.t === 'pickup' && a.item ? [article(a.item)] : []));
      const empty = n - items.length;
      return [
        ...(items.length ? [`Picked up ${list(items)}.`] : []),
        ...(empty ? [empty === 1 ? 'Nothing to pick up here.' : `Nothing to pick up, ${times(empty)}.`] : []),
      ];
    }
    default:
      return group.flatMap((a) => sentenceFor(a) ?? []);
  }
}

/** Merge a run of actions into short sentences (F-API-12): "Moved right 3 steps.",
 *  "Bumped into the wall twice.", "Picked up an apple and a key.", "Hero says: Hi, then Bye". */
export function narrate(actions: Action[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < actions.length) {
    let n = 1;
    while (i + n < actions.length && sameGroup(actions[i]!, actions[i + n]!)) n++;
    out.push(...groupSentences(actions.slice(i, i + n)));
    i += n;
  }
  return out;
}

/** One sentence for a whole replay: "The hero walked 12 steps, bumped twice and said 3 things." */
export function summarize(actions: Action[]): string | null {
  const count = (pred: (a: Action) => boolean) => actions.filter(pred).length;
  const steps = count((a) => a.t === 'move');
  const bumps = count((a) => a.t === 'bonk');
  const says = count((a) => a.t === 'say');
  const items = count((a) => a.t === 'pickup' && Boolean(a.item));
  const chests = count((a) => a.t === 'chest' && a.ok);
  const parts = [
    steps ? `walked ${plural(steps, 'step')}` : '',
    bumps ? `bumped ${times(bumps)}` : '',
    says ? `said ${plural(says, 'thing')}` : '',
    items ? `picked up ${plural(items, 'item')}` : '',
    chests ? `opened ${plural(chests, 'chest')}` : '',
  ].filter(Boolean);
  return parts.length ? `The hero ${list(parts)}.` : null;
}

/** What to announce for a stretch of the replay. A replay shown all at once (Instant speed,
 *  or Skip to end) gets a summary, unless it is only a few sentences anyway. */
export function narration(actions: Action[], allAtOnce = false): string {
  const sentences = narrate(actions);
  if (allAtOnce && sentences.length > 3) return summarize(actions) ?? '';
  return sentences.join(' ');
}
