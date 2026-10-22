// Title-screen quick settings (F-A11-13): text size and contrast before any profile exists.
// They live in this browser only and become the first settings of a new adventurer.
import type { Settings } from '../state/profile';

export type QuickPrefs = Partial<Pick<Settings, 'textScale' | 'highContrast'>>;

const KEY = 'codeweald:quick';
const SCALES: Settings['textScale'][] = [1, 1.25, 1.5, 2];

export function loadQuick(): QuickPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>;
    const prefs: QuickPrefs = {};
    if (SCALES.includes(raw.textScale as Settings['textScale']))
      prefs.textScale = raw.textScale as Settings['textScale'];
    if (typeof raw.highContrast === 'boolean') prefs.highContrast = raw.highContrast;
    return prefs;
  } catch {
    return {};
  }
}

export function saveQuick(prefs: QuickPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked: the setting still applies until the page closes.
  }
}

/** The next text size up, wrapping back to 100% after 200%. */
export function nextScale(scale: Settings['textScale'] = 1): Settings['textScale'] {
  return SCALES[(SCALES.indexOf(scale) + 1) % SCALES.length]!;
}
