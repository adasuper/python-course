// Progress on session validators (docs/specs.md §9.3): a lamp for every if/elif/else door,
// and how many runs finished without a crash.
import { t } from '../../i18n/en';
import type { SessionStatus } from '../../state/session';

export function SessionPanel({ status }: { status: SessionStatus }) {
  const lit = status.lamps?.filter((l) => l.lit).length ?? 0;
  return (
    <section class="session" aria-labelledby="session-h">
      <h2 id="session-h" class="panel-title">
        🏮 {t.quest.sessionHeading}
      </h2>
      {status.lamps && (
        <>
          <p class="muted small-text">{t.quest.lampsHelp}</p>
          {status.lamps.length > 0 && (
            <ul class="lamps" aria-label={t.quest.lamps}>
              {status.lamps.map((l) => (
                <li key={l.id} class={l.lit ? 'lit' : ''}>
                  <span class="lamp" aria-hidden="true">
                    {l.lit ? '🔆' : '○'}
                  </span>{' '}
                  {t.quest.lamp(l.kind, l.line, l.lit)}
                </li>
              ))}
            </ul>
          )}
          <p>{status.lamps.length ? t.quest.lampsLit(lit, status.lampsNeeded) : t.quest.lampsNone}</p>
        </>
      )}
      {status.okRuns !== null && (
        <p>
          {t.quest.runsOk(status.okRuns, status.runsNeeded)}
          {status.distinctInputs && ` ${t.quest.runsOkDistinct}`}
        </p>
      )}
    </section>
  );
}
