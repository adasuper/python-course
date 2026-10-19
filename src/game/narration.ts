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
      return `Answered "${action.value}".`;
    case 'out':
      return null; // output is shown (and announced) by the Scroll of Output itself
  }
}

function article(word: string): string {
  if (word === 'edge') return 'the edge of the map';
  if (/^(wall|water|floor|exit|grass)$/.test(word)) return `the ${word}`;
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}

/** Merge a run of actions into sentences. */
export function narrate(actions: Action[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < actions.length) {
    const a = actions[i]!;
    if (a.t === 'move') {
      let n = 1;
      while (i + n < actions.length) {
        const next = actions[i + n]!;
        if (next.t !== 'move' || next.dir !== a.dir) break;
        n++;
      }
      out.push(sentenceFor(a, n)!);
      i += n;
      continue;
    }
    const s = sentenceFor(a);
    if (s) out.push(s);
    i++;
  }
  return out;
}
