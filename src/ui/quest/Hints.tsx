import type { Rich } from '../../content/richtext';
import { t } from '../../i18n/en';
import { config } from '../../state/store';
import { RichText } from '../components/RichText';

export function Hints({
  hints,
  revealed,
  onReveal,
  onCopy,
}: {
  hints: Rich[];
  revealed: number;
  onReveal(tier: 1 | 2 | 3): void;
  onCopy(code: string): void;
}) {
  // Deploy setting defaults.hints: all three tiers, only the nudge, or none (F-DEP-02).
  const mode = config.value.defaults.hints;
  if (mode === 'off') return null;
  const available = mode === 'nudge' ? hints.slice(0, 1) : hints;
  return (
    <section class="hints" aria-labelledby="hints-h">
      <h2 id="hints-h" class="panel-title">
        💡 {t.quest.hints}
      </h2>
      <p class="muted small-text">{t.quest.hintsFree}</p>
      <div class="row">
        {available.map((_, i) => (
          <button
            key={i}
            type="button"
            class="small"
            disabled={i > revealed}
            aria-expanded={i < revealed}
            onClick={() => onReveal((i + 1) as 1 | 2 | 3)}
          >
            {t.quest.hintButton(i + 1)}
          </button>
        ))}
      </div>
      {available.slice(0, revealed).map((h, i) => (
        <div key={i} class="hint" role="note" aria-label={t.quest.hintButton(i + 1)}>
          <RichText rich={h} onCopyCode={i === 2 ? onCopy : undefined} />
        </div>
      ))}
    </section>
  );
}
