import { describe, expect, it } from 'vitest';
import {
  glossaryRemover,
  score,
  sentenceCount,
  studentText,
  syllables,
  words,
} from '../../scripts/lib/readingLevel';
import { readingLevels } from '../../scripts/reading-level';

describe('reading level', () => {
  it('estimates syllables', () => {
    expect(syllables('cat')).toBe(1);
    expect(syllables('make')).toBe(1);
    expect(syllables('table')).toBe(2);
    expect(syllables('village')).toBe(2);
    expect(syllables('adventure')).toBe(3);
    expect(syllables('computer')).toBe(3);
    expect(syllables('42')).toBe(0);
  });

  it('counts words and sentences', () => {
    expect(words("Byte's hero walks 3 steps, then stops.")).toEqual([
      "Byte's",
      'hero',
      'walks',
      'steps',
      'then',
      'stops',
    ]);
    expect(sentenceCount('Hi there. How are you? Great!')).toBe(3);
    expect(sentenceCount('First line\nSecond line')).toBe(2);
    expect(sentenceCount('Version 3.14 is out')).toBe(1);
  });

  it('computes the Flesch–Kincaid grade', () => {
    expect(score('The cat sat on the mat.').grade).toBeLessThan(1);
    const hard = score(
      'Understanding computational abstraction necessitates considerable intellectual concentration and perseverance.',
    );
    expect(hard.grade).toBeGreaterThan(12);
    expect(score('42').grade).toBeNull();
  });

  it('leaves out code, link syntax and placeholders', () => {
    expect(studentText('Use `print("Hello, world!")` to talk.\n\n```\nx = 1\n```').trim()).toBe(
      'Use  to talk.',
    );
    expect(studentText('A [[jar|variable]] holds {value}.')).toBe('A jar holds ….');
  });

  it('can leave out glossary terms and their plurals', () => {
    const remove = glossaryRemover(['variable', 'for loop']);
    expect(words(remove('Two variables and a for loop.'))).toEqual(['Two', 'and', 'a']);
  });

  it('finds the student text in the content files, with lines', () => {
    const texts = readingLevels();
    const kinds = new Set(texts.map((t) => t.kind));
    for (const k of ['story', 'goal', 'hint', 'feedback', 'dialogue', 'glossary', 'description'])
      expect(kinds).toContain(k);
    // Reference solutions, starter code and checks are never scored.
    expect(texts.some((t) => t.text.includes('print("'))).toBe(false);
    expect(texts.every((t) => t.line > 0 && t.file.startsWith('content/'))).toBe(true);
  });
});
