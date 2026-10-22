// Read aloud (docs/specs.md §14.5, F-DLG-07): the Web Speech API with an offline voice. If no
// voice is installed on the device, the controls say so instead of failing silently.
import type { Inline, Rich } from '../content/richtext';
import type { Settings } from '../state/profile';

const SYMBOLS: Record<string, string> = {
  '(': ' open parenthesis ',
  ')': ' close parenthesis ',
  '[': ' open bracket ',
  ']': ' close bracket ',
  '{': ' open brace ',
  '}': ' close brace ',
  '"': ' quote ',
  "'": ' quote ',
  ':': ' colon ',
  '=': ' equals ',
  '#': ' hash ',
  ',': ' comma ',
  _: ' underscore ',
  '+': ' plus ',
  '*': ' times ',
  '/': ' slash ',
  '<': ' less than ',
  '>': ' greater than ',
};

/** Code read out with its symbols named ("print open parenthesis quote hi quote close parenthesis"). */
export function speakableCode(code: string): string {
  return [...code]
    .map((ch) => SYMBOLS[ch] ?? ch)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** What gets read for some rich text. Code blocks are skipped unless `readCode` is on, then
 *  read with their symbols named; a word of code inside a sentence is always read. */
export function speakableText(rich: Rich, readCode: boolean): string {
  const code = (v: string) => (readCode ? speakableCode(v) : v);
  const inline = (nodes: Inline[]): string =>
    nodes.map((n) => (n.t === 'text' ? n.v : n.t === 'code' ? code(n.v) : inline(n.c))).join('');
  return rich
    .map((b) =>
      b.t === 'p'
        ? inline(b.c)
        : b.t === 'ul'
          ? b.items.map(inline).join('. ')
          : readCode
            ? speakableCode(b.v)
            : '',
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const synth = () => (typeof speechSynthesis === 'undefined' ? null : speechSynthesis);

/** Voices that work offline (localService), so reading aloud never needs the network. */
export function offlineVoices(): SpeechSynthesisVoice[] {
  return (
    synth()
      ?.getVoices()
      .filter((v) => v.localService) ?? []
  );
}

/** Calls back when the browser's voice list changes (it often fills in a moment after load). */
export function onVoicesChanged(callback: () => void): () => void {
  const s = synth();
  if (!s) return () => {};
  s.addEventListener('voiceschanged', callback);
  return () => s.removeEventListener('voiceschanged', callback);
}

export function canSpeak(): boolean {
  return offlineVoices().length > 0;
}

export function speak(text: string, tts: Settings['tts']): boolean {
  const s = synth();
  const voices = offlineVoices();
  if (!s || !voices.length || !text) return false;
  s.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice =
    voices.find((v) => v.name === tts.voice) ?? voices.find((v) => v.lang.startsWith('en')) ?? voices[0]!;
  utterance.rate = tts.rate;
  s.speak(utterance);
  return true;
}

export function stopSpeaking() {
  synth()?.cancel();
}
