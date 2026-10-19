import type { Rich } from '../../content/richtext';
import { t } from '../../i18n/en';
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
  return (
    <section class="hints" aria-labelledby="hints-h">
      <h2 id="hints-h" class="panel-title">
        💡 {t.quest.hints}
      </h2>
      <p class="muted small-text">{t.quest.hintsFree}</p>
      <div class="row">
        {hints.map((_, i) => (
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
      {hints.slice(0, revealed).map((h, i) => (
        <div key={i} class="hint" role="note" aria-label={t.quest.hintButton(i + 1)}>
          <RichText rich={h} onCopyCode={i === 2 ? onCopy : undefined} />
        </div>
      ))}
    </section>
  );
}
