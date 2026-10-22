import { useState } from 'preact/hooks';
import { t } from '../../i18n/en';
import { levelFor } from '../../state/profile';
import { go, profiles, storageMode, toast } from '../../state/store';
import { RestoreDialog } from '../components/SaveDialogs';
import { selectProfile } from '../flow';

const ART = `${import.meta.env.BASE_URL}assets/art/`;

export function TitleScreen() {
  const [restoring, setRestoring] = useState(false);
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
            <li key={p.id}>
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
      <p class="credits-link">
        <button type="button" class="ghost small" onClick={() => go({ name: 'credits' })}>
          {t.credits.link}
        </button>
      </p>
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
