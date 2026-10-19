import { useState } from 'preact/hooks';
import { AVATARS, THEMES } from '../../art';
import { t } from '../../i18n/en';
import { checkNickname, randomNickname } from '../../state/nickname';
import { go } from '../../state/store';
import { createProfile } from '../flow';

const ART = `${import.meta.env.BASE_URL}assets/art/`;

export function CreatorScreen() {
  const [avatar, setAvatar] = useState(AVATARS[0]!.id);
  const [theme, setTheme] = useState(THEMES[0]!.id);
  const [nickname, setNickname] = useState('');
  const [problem, setProblem] = useState<keyof typeof t.creator.problems | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    const found = checkNickname(nickname);
    setProblem(found);
    if (found) {
      document.getElementById('nickname')?.focus();
      return;
    }
    setBusy(true);
    await createProfile(nickname, avatar, theme);
  };

  return (
    <main id="main" class="screen creator-screen" tabIndex={-1}>
      <h1>{t.creator.heading}</h1>
      <form onSubmit={submit} class="card creator-form">
        <fieldset>
          <legend>{t.creator.avatar}</legend>
          <div class="choice-grid">
            {AVATARS.map((a) => (
              <label key={a.id} class={`choice ${avatar === a.id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="avatar"
                  value={a.id}
                  checked={avatar === a.id}
                  onChange={() => setAvatar(a.id)}
                />
                <img src={`${ART}icons/${a.id}-${theme}.png`} alt="" width={64} height={64} class="pixel" />
                <span class="choice-label">{a.alt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div class="field">
          <label for="nickname">{t.creator.nickname}</label>
          <p id="nickname-help" class="muted">
            🦉 {t.creator.nicknameHelp}
          </p>
          <div class="row">
            <input
              id="nickname"
              type="text"
              maxLength={16}
              autoComplete="off"
              spellcheck={false}
              value={nickname}
              aria-describedby={`nickname-help${problem ? ' nickname-problem' : ''}`}
              aria-invalid={problem ? true : undefined}
              onInput={(e) => setNickname((e.target as HTMLInputElement).value)}
            />
            <button type="button" onClick={() => (setNickname(randomNickname()), setProblem(null))}>
              🎲 {t.creator.makeOne}
            </button>
          </div>
          {problem && (
            <p id="nickname-problem" class="error-text" role="alert">
              ⚠ {t.creator.problems[problem]}
            </p>
          )}
        </div>

        <fieldset>
          <legend>{t.creator.theme}</legend>
          <div class="choice-grid themes">
            {THEMES.map((th) => (
              <label key={th.id} class={`choice ${theme === th.id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="theme"
                  value={th.id}
                  checked={theme === th.id}
                  onChange={() => setTheme(th.id)}
                />
                <span class="swatch" style={{ background: th.cloak }} aria-hidden="true" />
                <span class="choice-label">{th.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div class="row">
          <button type="submit" class="primary" disabled={busy}>
            {t.creator.start}
          </button>
          <button type="button" class="ghost" onClick={() => go({ name: 'title' })}>
            Back
          </button>
        </div>
      </form>
    </main>
  );
}
