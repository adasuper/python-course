import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../../i18n/en';
import { go, regions, type Route } from '../../state/store';
import { Portrait } from '../components/Common';
import { RichText } from '../components/RichText';

export function speakerName(speaker: string): string | null {
  if (speaker === 'byte') return 'Byte';
  if (speaker === 'narrator') return null;
  for (const region of Object.values(regions.value)) {
    const npc = region.npcs[speaker];
    if (npc) return npc.name;
  }
  return speaker;
}

export function StoryScreen({ route }: { route: Extract<Route, { name: 'story' }> }) {
  const [i, setI] = useState(0);
  const next = useRef<HTMLButtonElement>(null);
  const line = route.lines[i]!;
  const last = i === route.lines.length - 1;
  useEffect(() => next.current?.focus(), [i]);
  const finish = () => go(route.next);
  const name = speakerName(line.speaker);
  return (
    <main
      id="main"
      class="screen story-screen"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') finish();
      }}
    >
      <h1 class="story-title">{route.title}</h1>
      <div class={`dialogue-box speaker-${line.speaker}`}>
        <Portrait speaker={line.speaker} talking />
        <div class="dialogue-text" aria-live="polite">
          {name && <p class="speaker">{name}</p>}
          <RichText rich={line.text} />
        </div>
      </div>
      <div class="row dialogue-actions">
        {i > 0 && (
          <button type="button" onClick={() => setI(i - 1)}>
            ◂ {t.dialogue.back}
          </button>
        )}
        <button type="button" class="primary" ref={next} onClick={() => (last ? finish() : setI(i + 1))}>
          {last ? t.dialogue.done : `${t.dialogue.next} ▸`}
        </button>
        {!last && (
          <button type="button" class="ghost" onClick={finish}>
            {t.dialogue.skip}
          </button>
        )}
        <span class="muted" aria-hidden="true">
          {i + 1} / {route.lines.length}
        </span>
      </div>
    </main>
  );
}
