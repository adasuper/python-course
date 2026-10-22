// Flesch–Kincaid grade level for student text (docs/specs.md §18.5).
// Code is removed first. Glossary terms can be left out too: technical words such as
// "variable" are explained in the game, but they add syllables and push the score up.
import { parseRich, plainText } from '../../src/content/richtext';

export interface Score {
  words: number;
  sentences: number;
  syllables: number;
  /** Flesch–Kincaid grade, or null when there are no words. */
  grade: number | null;
}

/** Estimate the syllables in one English word. */
export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, (m) => m[0]!);
  w = w.replace(/^y/, '');
  const groups = w.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 0);
}

/** Words are runs of letters (with inner apostrophes or hyphens); numbers don't count. */
export function words(text: string): string[] {
  return text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [];
}

export function sentenceCount(text: string): number {
  const parts = text
    .split(/[.!?]+(?=\s|$)|\n+/)
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0);
  return Math.max(1, parts.length);
}

export function score(text: string): Score {
  const list = words(text);
  const sentences = sentenceCount(text);
  const syl = list.reduce((n, w) => n + syllables(w), 0);
  const grade = list.length
    ? Math.round((0.39 * (list.length / sentences) + 11.8 * (syl / list.length) - 15.59) * 10) / 10
    : null;
  return { words: list.length, sentences, syllables: syl, grade };
}

/** Student-visible words of a content string: code, glossary link syntax and {placeholders} removed. */
export function studentText(source: string): string {
  return plainText(parseRich(source.replace(/\{[a-z_]+\}/g, '…')), false);
}

/** A function that removes glossary terms (and their plurals) from a text. */
export function glossaryRemover(terms: string[]): (text: string) => string {
  const sorted = [...new Set(terms.map((t) => t.trim().toLowerCase()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (!sorted.length) return (text) => text;
  const escaped = sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
  const re = new RegExp(`\\b(?:${escaped.join('|')})(?:s|es)?\\b`, 'gi');
  return (text) => text.replace(re, ' ');
}
