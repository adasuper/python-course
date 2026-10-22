// Small shared pieces: live region, modal dialog, toasts, Byte's portrait, loading panel.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { t } from '../../i18n/en';
import type { PyRunner } from '../../runtime/pyRunner';
import { announcement, dismissToast, toasts } from '../../state/store';

const ART = `${import.meta.env.BASE_URL}assets/art/`;

export function LiveRegion() {
  const a = announcement.value;
  return (
    <div id="live-polite" class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {/* The key forces re-announcement of identical messages. */}
      <span key={a.n}>{a.text}</span>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  labelId = 'modal-title',
}: {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  labelId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(
      'input, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
    return () => previous?.focus?.();
  }, []);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const focusable = [
      ...ref.current.querySelectorAll<HTMLElement>(
        'input, textarea, button, select, [href], [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => !el.hasAttribute('disabled'));
    if (!focusable.length) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  };
  return (
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        ref={ref}
        onKeyDown={onKeyDown}
      >
        <h2 id={labelId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Toasts({ onSave }: { onSave: () => void }) {
  return (
    <div class="toasts">
      {toasts.value.map((toast) => (
        <div key={toast.id} class={`toast toast-${toast.kind}`}>
          <span aria-hidden="true">
            {toast.kind === 'save-point' ? '💾' : toast.kind === 'reward' ? '✨' : 'ℹ️'}
          </span>
          <span>{toast.text}</span>
          {toast.kind === 'save-point' && (
            <button type="button" class="small" onClick={onSave}>
              {t.hud.save}
            </button>
          )}
          <button
            type="button"
            class="small ghost"
            aria-label="Dismiss"
            onClick={() => dismissToast(toast.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function Portrait({ speaker, talking = false }: { speaker: string; talking?: boolean }) {
  if (speaker === 'byte') {
    return (
      <img
        class="portrait"
        src={`${ART}portraits/byte-${talking ? 1 : 0}.png`}
        alt="Byte the owl"
        width={64}
        height={64}
      />
    );
  }
  return null;
}

export function LoadingPanel({ runner }: { runner: PyRunner }) {
  const p = runner.progress.value;
  const status = runner.status.value;
  if (status === 'failed') {
    return (
      <div class="loading-panel" role="alert">
        <Portrait speaker="byte" />
        <p>{t.pythonFailed}</p>
        <p class="muted">{runner.error.value}</p>
      </div>
    );
  }
  const pct =
    p.stage === 'download' && p.total
      ? Math.round(((p.loaded ?? 0) / p.total) * 85)
      : p.stage === 'compile'
        ? 90
        : p.stage === 'stdlib'
          ? 96
          : p.stage === 'ready'
            ? 100
            : 2;
  const label = status === 'restarting' ? t.quest.restarting : t.loading;
  return (
    <div class="loading-panel">
      {/* Stage changes (not every percent) are announced politely (F-ONB-08). */}
      <p class="sr-only" role="status">
        {label} {t.loadingStages[p.stage]}
      </p>
      <Portrait speaker="byte" talking />
      <p>{label}</p>
      <progress
        max={100}
        value={pct}
        aria-label={label}
        aria-valuetext={`${pct}% — ${t.loadingStages[p.stage]}`}
      />
      <p class="muted">
        {t.loadingStages[p.stage]} · {pct}%
      </p>
    </div>
  );
}
