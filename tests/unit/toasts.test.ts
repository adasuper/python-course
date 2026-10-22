// Toasts never pile up over the game (F-PRG-08): one save point at a time, at most three.
import { describe, expect, it } from 'vitest';
import { announcement, MAX_TOASTS, toast, toasts } from '../../src/state/store';

describe('toasts', () => {
  it('keeps one save point and the newest few, but announces every one', () => {
    toasts.value = [];
    toast('save-point', 'Save point 1', 0);
    toast('save-point', 'Save point 2', 0);
    expect(toasts.value.map((x) => x.text)).toEqual(['Save point 2']);
    for (const text of ['Level up!', 'Badge A', 'Badge B']) toast('celebrate', text, 0, '⭐');
    expect(toasts.value.map((x) => x.text)).toEqual(['Level up!', 'Badge A', 'Badge B']);
    expect(toasts.value).toHaveLength(MAX_TOASTS);
    // Messages that arrive together are joined for screen readers.
    expect(announcement.value.text).toContain('Level up! Badge A Badge B');
  });

  it('lets celebrations outlast XP and save-point toasts when a pass brings many', () => {
    toasts.value = [];
    toast('celebrate', 'Badge earned: First Bug Squashed!', 0);
    toast('celebrate', 'Badge earned: Clean Cast!', 0);
    toast('reward', '+35 XP', 0);
    toast('save-point', 'Save point', 0);
    expect(toasts.value.map((x) => x.text)).toEqual([
      'Badge earned: First Bug Squashed!',
      'Badge earned: Clean Cast!',
      'Save point',
    ]);
  });
});
