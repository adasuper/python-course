import { useState } from 'preact/hooks';
import { t } from '../../i18n/en';
import { levelFor, type Profile } from '../../state/profile';
import { exportProfile } from '../../state/saving';
import { announce, getStorage, go, profiles, storageMode, toast } from '../../state/store';
import { Modal } from '../components/Common';
import { RestoreDialog } from '../components/SaveDialogs';
import { applySettings, selectProfile } from '../flow';
import { OfflineStatus } from '../components/OfflineStatus';
import { loadQuick, nextScale, saveQuick } from '../quickPrefs';

const ART = `${import.meta.env.BASE_URL}assets/art/`;

export function TitleScreen() {
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState<Profile | null>(null);
  return (
    <main id="main" class="screen title-screen" tabIndex={-1}>
      <header class="title-header">
        <img src={`${ART}portraits/byte-0.png`} alt="" width={96} height={96} class="portrait big" />
        <div>
          <h1>{t.appName}</h1>
          <p class="tagline">{t.tagline}</p>
        </div>
      </header>
      {storageMode.value === 'memory' && (
        <p class="banner warn" role="alert">
          ⚠ {t.storageMemory}
        </p>
      )}
      <p class="banner info">💾 {t.title.deviceNote}</p>
      <section aria-labelledby="who" class="card">
        <h2 id="who">{t.title.chooseProfile}</h2>
        {profiles.value.length === 0 && <p class="muted">{t.title.noProfiles}</p>}
        <ul class="profile-list">
          {profiles.value.map((p) => (
            <li key={p.id} class="profile-row">
              <button type="button" class="profile-button" onClick={() => void selectProfile(p)}>
                <img
                  src={`${ART}icons/${p.avatarId}-${p.themeId}.png`}
                  alt=""
                  width={48}
                  height={48}
                  class="pixel"
                />
                <span>
                  <strong>{p.nickname}</strong>
                  <span class="muted"> · {t.title.level(levelFor(p.xp))}</span>
                </span>
              </button>
              <button
                type="button"
                class="small ghost"
                aria-label={t.title.deleteLabel(p.nickname)}
                onClick={() => setDeleting(p)}
              >
                🗑 {t.title.delete}
              </button>
            </li>
          ))}
        </ul>
        <div class="row">
          <button type="button" class="primary" onClick={() => go({ name: 'creator' })}>
            ✨ {t.title.newAdventurer}
          </button>
          <button type="button" onClick={() => setRestoring(true)}>
            📜 {t.title.continueFromSave}
          </button>
        </div>
      </section>
      <QuickSettings />
      <OfflineStatus />
      <p class="credits-link">
        <button type="button" class="ghost small" onClick={() => go({ name: 'credits' })}>
          {t.credits.link}
        </button>
        <button type="button" class="ghost small" onClick={() => go({ name: 'system' })}>
          {t.system.link}
        </button>
      </p>
      {deleting && <DeleteProfile profile={deleting} onClose={() => setDeleting(null)} />}
      {restoring && (
        <RestoreDialog
          onClose={() => setRestoring(false)}
          onRestored={(p) => {
            setRestoring(false);
            toast('info', t.save.restored(p.nickname));
            void selectProfile(p);
          }}
        />
      )}
    </main>
  );
}

/** Text size and contrast before anyone has a profile (F-A11-13). */
function QuickSettings() {
  const [prefs, setPrefs] = useState(loadQuick);
  const change = (next: typeof prefs) => {
    saveQuick(next);
    setPrefs(next);
    applySettings(null);
  };
  return (
    <section aria-labelledby="quick" class="quick-settings">
      <h2 id="quick" class="small-heading">
        {t.settings.quick}
      </h2>
      <div class="row">
        <button
          type="button"
          class="small"
          onClick={() => change({ ...prefs, textScale: nextScale(prefs.textScale) })}
        >
          🔍 {t.settings.biggerText}: {Math.round((prefs.textScale ?? 1) * 100)}%
        </button>
        <button
          type="button"
          class="small"
          aria-pressed={prefs.highContrast === true}
          onClick={() => change({ ...prefs, highContrast: !prefs.highContrast })}
        >
          ◐ {t.settings.contrast}
        </button>
      </div>
    </section>
  );
}

/** Removing a profile names it and offers to save a progress file first (F-SAV-09). */
function DeleteProfile({ profile: p, onClose }: { profile: Profile; onClose(): void }) {
  const [saved, setSaved] = useState(false);
  return (
    <Modal title={t.title.deleteHeading(p.nickname)} onClose={onClose} labelId="delete-title">
      <p>{t.title.deleteWarning(p.nickname)}</p>
      <div class="modal-actions">
        <button
          type="button"
          onClick={async () => {
            if ((await exportProfile(p)) === 'cancelled') return;
            setSaved(true);
            announce(t.title.deleteSaved);
          }}
        >
          💾 {t.title.deleteSaveFirst}
        </button>
        <button
          type="button"
          class="danger"
          onClick={async () => {
            await getStorage().deleteProfile(p.id);
            profiles.value = profiles.value.filter((x) => x.id !== p.id);
            onClose();
            toast('info', t.title.deleted(p.nickname));
          }}
        >
          🗑 {t.title.deleteConfirm(p.nickname)}
        </button>
        <button type="button" class="ghost" data-autofocus onClick={onClose}>
          {t.title.deleteCancel}
        </button>
      </div>
      {saved && (
        <p role="status" class="small-text">
          ✓ {t.title.deleteSaved}
        </p>
      )}
    </Modal>
  );
}
