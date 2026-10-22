import { t } from '../../i18n/en';
import type { ReplayState, Speed } from '../../game/replay';
import { profile } from '../../state/store';

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
  const canStep = !disabled && state !== 'done';
  // Shortcuts while the toolbar has focus: "." steps anywhere in it; Space plays or pauses
  // when the toolbar itself is focused (on a button, Space presses that button).
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === '.' && canStep && profile.value?.settings.shortcuts !== false) {
      e.preventDefault();
      onStep();
    } else if (e.key === ' ' && e.target === e.currentTarget) {
      e.preventDefault();
      if (state === 'playing') onPause();
      else if (canStep) onPlay();
    }
  };
  return (
    <div
      class="replay-controls"
      role="toolbar"
      aria-label={t.replay.controls}
      aria-description={t.replay.keys}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {state === 'playing' ? (
        <button type="button" class="small" onClick={onPause} aria-keyshortcuts="Space">
          ⏸ {t.replay.pause}
        </button>
      ) : (
        <button type="button" class="small" onClick={onPlay} disabled={!canStep} aria-keyshortcuts="Space">
          ▶ {t.replay.play}
        </button>
      )}
      <button type="button" class="small" onClick={onStep} disabled={!canStep} aria-keyshortcuts=".">
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
