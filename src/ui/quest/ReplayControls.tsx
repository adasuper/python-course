import { t } from '../../i18n/en';
import type { ReplayState, Speed } from '../../game/replay';

const SPEEDS: Speed[] = [0.5, 1, 2, 4, 'instant'];

export function ReplayControls({
  state,
  speed,
  position,
  length,
  onPlay,
  onPause,
  onStep,
  onRestart,
  onSkip,
  onSpeed,
}: {
  state: ReplayState;
  speed: Speed;
  position: number;
  length: number;
  onPlay(): void;
  onPause(): void;
  onStep(): void;
  onRestart(): void;
  onSkip(): void;
  onSpeed(s: Speed): void;
}) {
  const disabled = length === 0;
  return (
    <div class="replay-controls" role="toolbar" aria-label={t.replay.controls}>
      {state === 'playing' ? (
        <button type="button" class="small" onClick={onPause}>
          ⏸ {t.replay.pause}
        </button>
      ) : (
        <button type="button" class="small" onClick={onPlay} disabled={disabled || state === 'done'}>
          ▶ {t.replay.play}
        </button>
      )}
      <button type="button" class="small" onClick={onStep} disabled={disabled || state === 'done'}>
        ⏭ {t.replay.step}
      </button>
      <button type="button" class="small" onClick={onRestart} disabled={disabled}>
        ↺ {t.replay.restart}
      </button>
      <button type="button" class="small" onClick={onSkip} disabled={disabled || state === 'done'}>
        ⏩ {t.replay.skip}
      </button>
      <label class="speed">
        {t.replay.speed}{' '}
        <select
          value={String(speed)}
          onChange={(e) => onSpeed(parseSpeed((e.target as HTMLSelectElement).value))}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={String(s)}>
              {s === 'instant' ? t.replay.instant : `${s}×`}
            </option>
          ))}
        </select>
      </label>
      <span class="muted small-text" aria-live="off">
        {position}/{length}
      </span>
    </div>
  );
}

function parseSpeed(v: string): Speed {
  return v === 'instant' ? 'instant' : (Number(v) as Speed);
}
