// What Byte says after a run: success, a targeted hint, or a friendly error (§9.4, §6.8).
import { useState } from 'preact/hooks';
import { fillRich, parseRich } from '../../content/richtext';
import { t } from '../../i18n/en';
import type { BonusSpec, PyErrorInfo, RunResult } from '../../runtime/protocol';
import { course, update } from '../../state/store';
import { RichText } from '../components/RichText';

export function errorTemplate(error: PyErrorInfo) {
  const templates = course.value!.errors;
  const tpl = templates[error.key] ?? templates.generic!;
  const params = { ...error.params, line: error.params.line || String(error.line ?? '') };
  return {
    title: tpl.title,
    message: fillRich(tpl.message, params),
    tip: tpl.tip ? fillRich(tpl.tip, params) : null,
  };
}

export function ErrorExplanation({ error }: { error: PyErrorInfo }) {
  const [real, setReal] = useState(false);
  const tpl = errorTemplate(error);
  return (
    <div class="error-explain">
      <p class="error-title">
        <span aria-hidden="true">🐛</span> <strong>{tpl.title}</strong>
        {error.line ? <span class="line-tag">{t.quest.lineLabel(error.line)}</span> : null}
      </p>
      <RichText rich={tpl.message} />
      {tpl.tip && (
        <div class="tip">
          <RichText rich={tpl.tip} />
        </div>
      )}
      {error.raw && (
        <>
          <button
            type="button"
            class="small ghost"
            aria-expanded={real}
            onClick={() => {
              // Reading real errors counts toward the Error Reader badge (F-FBK-09).
              if (!real) update((p) => void p.counters.realErrorViews++);
              setReal(!real);
            }}
          >
            {real ? t.quest.hideRealError : t.quest.showRealError}
          </button>
          {real && (
            <pre class="real-error" lang="zxx">
              {error.raw}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

export interface RewardView {
  xp: number;
  itemName: string | null;
  levelUp: number | null;
  /** "Bonus challenge complete! +15 XP", when one was earned on this run. */
  bonusText: string;
}

/** Optional extra challenges, shown once the quest is passed (§9.4). */
export function BonusList({ bonus, done }: { bonus: BonusSpec[]; done(id: string): boolean }) {
  return (
    <section class="bonus" aria-labelledby="bonus-h">
      <h2 id="bonus-h" class="panel-title">
        ⭐ {t.quest.bonusHeading}
      </h2>
      <p class="muted small-text">{t.quest.bonusHelp}</p>
      <ul class="bonus-list">
        {bonus.map((b) => {
          const ok = done(b.id);
          return (
            <li key={b.id} class={ok ? 'done' : ''}>
              <span class={`bonus-status ${ok ? 'ok' : ''}`}>
                {ok ? `✓ ${t.quest.bonusEarned}` : `○ ${t.quest.bonusOpen}`}
              </span>{' '}
              <RichText rich={parseRich(b.description)} inline />{' '}
              <span class="xp-tag">{t.quest.bonusXp(b.xp)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Feedback({
  result,
  passed,
  outro,
  reward,
  note,
  children,
}: {
  result: RunResult | null;
  passed: boolean;
  outro?: import('../../content/richtext').Rich | null;
  reward?: RewardView | null;
  /** Shown instead of the generic "not quite" (e.g. progress on session validators). */
  note?: string | null;
  children?: preact.ComponentChildren;
}) {
  if (!result) return null;
  if (passed) {
    return (
      <section class="feedback success" aria-labelledby="fb-h" tabIndex={-1} id="feedback">
        <h2 id="fb-h">
          <span aria-hidden="true">✓</span> {t.quest.passed}
        </h2>
        <RichText rich={outro} />
        {reward && (
          <ul class="rewards">
            {reward.xp > 0 && <li>✨ {t.quest.xpGained(reward.xp)}</li>}
            {reward.itemName && <li>🎒 {t.quest.itemGained(reward.itemName)}</li>}
            {reward.levelUp && <li>⭐ {t.quest.levelUp(reward.levelUp)}</li>}
            {reward.bonusText && <li>🌟 {reward.bonusText}</li>}
          </ul>
        )}
        {children}
      </section>
    );
  }
  const fb = result.validation?.feedback;
  const showError = result.error && (!fb || fb.source === 'error');
  return (
    <section class="feedback not-yet" aria-labelledby="fb-h" tabIndex={-1} id="feedback">
      <h2 id="fb-h">
        <span aria-hidden="true">✗</span>{' '}
        {result.status === 'timeout' || result.status === 'crashed' ? t.quest.timeout : t.quest.notYet}
      </h2>
      {fb?.text && <RichText rich={parseRich(fb.text)} />}
      {fb?.source === 'mistake' && result.error && <ErrorExplanation error={result.error} />}
      {showError && <ErrorExplanation error={result.error!} />}
      {!fb?.text && !result.error && <p>{note ?? t.quest.generic}</p>}
      <p class="muted">{t.quest.tryAgain}</p>
      {children}
    </section>
  );
}
