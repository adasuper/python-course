// "Read aloud" for a dialogue line (F-DLG-07). With no offline voice on the device, it says
// so instead of failing silently.
import { useEffect, useState } from 'preact/hooks';
import type { Rich } from '../../content/richtext';
import { t } from '../../i18n/en';
import { DEFAULT_SETTINGS } from '../../state/profile';
import { profile } from '../../state/store';
import { canSpeak, onVoicesChanged, speak, speakableText } from '../speech';

/** True once the browser has an offline voice (the list often fills in after page load). */
export function useCanSpeak(): boolean {
  const [ok, setOk] = useState(canSpeak);
  useEffect(() => onVoicesChanged(() => setOk(canSpeak())), []);
  return ok;
}

export function ReadAloud({ rich, label }: { rich: Rich; label?: string }) {
  const ok = useCanSpeak();
  const tts = profile.value?.settings.tts ?? DEFAULT_SETTINGS.tts;
  if (!ok) return <span class="small-text muted read-aloud-missing">🔇 {t.speech.noVoice}</span>;
  return (
    <button
      type="button"
      class="small ghost read-aloud"
      onClick={() => speak(speakableText(rich, tts.readCode), tts)}
    >
      🔊 {label ?? t.speech.readAloud}
    </button>
  );
}

/** Reads each new line by itself when the student turned on auto-read. */
export function useAutoRead(rich: Rich | null) {
  const tts = profile.value?.settings.tts;
  useEffect(() => {
    if (rich && tts?.autoRead) speak(speakableText(rich, tts.readCode), tts);
  }, [rich]);
}
