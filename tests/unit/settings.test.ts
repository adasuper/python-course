// M2.9 settings helpers: read-aloud text (§14.5), offline voices, and the title-screen quick
// settings (F-A11-13).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseRich } from '../../src/content/richtext';
import { loadQuick, nextScale, saveQuick } from '../../src/ui/quickPrefs';
import { canSpeak, speak, speakableCode, speakableText } from '../../src/ui/speech';

afterEach(() => vi.unstubAllGlobals());

describe('read aloud', () => {
  it('names the symbols in code', () => {
    expect(speakableCode('print("hi")')).toBe('print open parenthesis quote hi quote close parenthesis');
    expect(speakableCode('gold_coins = 3')).toBe('gold underscore coins equals 3');
  });

  it('skips code blocks by default but always reads a word of code in a sentence', () => {
    const rich = parseRich('Use `print` to talk.\n\n```\nprint("hi")\n```\n\nThen run it.');
    expect(speakableText(rich, false)).toBe('Use print to talk. Then run it.');
    expect(speakableText(rich, true)).toBe(
      'Use print to talk. print open parenthesis quote hi quote close parenthesis Then run it.',
    );
  });

  it('reads lists and emphasis as plain sentences', () => {
    expect(speakableText(parseRich('- **one** thing\n- *two* things'), false)).toBe('one thing. two things');
  });
});

describe('offline voices', () => {
  const voice = (name: string, lang: string, localService: boolean) => ({ name, lang, localService });
  const install = (voices: ReturnType<typeof voice>[]) => {
    const spoken: { text: string; voice: unknown; rate: number }[] = [];
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => voices,
      cancel: vi.fn(),
      speak: (u: { text: string; voice: unknown; rate: number }) => spoken.push(u),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        voice: unknown = null;
        rate = 1;
        constructor(readonly text: string) {}
      },
    );
    return spoken;
  };
  const tts = { autoRead: false, voice: '', rate: 1.25, readCode: false };

  it('never uses a network voice; says it cannot speak instead', () => {
    const spoken = install([voice('Cloud Voice', 'en-US', false)]);
    expect(canSpeak()).toBe(false);
    expect(speak('hello', tts)).toBe(false);
    expect(spoken).toEqual([]);
  });

  it('uses the chosen voice, else an English one, at the chosen rate', () => {
    const spoken = install([voice('Voix', 'fr-FR', true), voice('Robin', 'en-GB', true)]);
    expect(canSpeak()).toBe(true);
    speak('hello', tts);
    speak('again', { ...tts, voice: 'Voix' });
    expect(spoken.map((u) => [(u.voice as { name: string }).name, u.rate])).toEqual([
      ['Robin', 1.25],
      ['Voix', 1.25],
    ]);
  });

  it('is quiet where the browser has no speech at all', () => {
    expect(canSpeak()).toBe(false);
    expect(speak('hello', tts)).toBe(false);
  });
});

describe('title-screen quick settings', () => {
  const memory = () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    });
    return data;
  };

  it('saves and loads text size and contrast', () => {
    memory();
    expect(loadQuick()).toEqual({});
    saveQuick({ textScale: 1.5, highContrast: true });
    expect(loadQuick()).toEqual({ textScale: 1.5, highContrast: true });
  });

  it('ignores values it does not know', () => {
    const data = memory();
    data.set('codeweald:quick', JSON.stringify({ textScale: 7, highContrast: 'yes', other: 1 }));
    expect(loadQuick()).toEqual({});
    data.set('codeweald:quick', 'not json');
    expect(loadQuick()).toEqual({});
  });

  it('works without storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadQuick()).toEqual({});
    expect(() => saveQuick({ textScale: 2 })).not.toThrow();
  });

  it('steps through the text sizes and wraps around', () => {
    expect([nextScale(), nextScale(1.25), nextScale(1.5), nextScale(2)]).toEqual([1.25, 1.5, 2, 1]);
  });
});
