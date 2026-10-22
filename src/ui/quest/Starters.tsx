// Pick a starter: some quests let the student choose the program they build, such as the
// capstone's three game ideas. The chosen program goes into the spellbook to edit.
import { useState } from 'preact/hooks';
import type { Starter } from '../../content/types';
import { t } from '../../i18n/en';
import { RichText } from '../components/RichText';

export function StarterPicker({ starters, onPick }: { starters: Starter[]; onPick(starter: Starter): void }) {
  const [chosen, setChosen] = useState(starters[0]!.id);
  return (
    <section class="starters" aria-labelledby="starters-h">
      <h2 id="starters-h" class="panel-title">
        🧭 {t.starters.heading}
      </h2>
      <p class="muted small-text">{t.starters.intro}</p>
      <fieldset>
        <legend class="sr-only">{t.starters.heading}</legend>
        {starters.map((s) => (
          <label key={s.id}>
            <input
              type="radio"
              name="starter"
              value={s.id}
              checked={chosen === s.id}
              onChange={() => setChosen(s.id)}
            />{' '}
            <strong>{s.title}</strong>
            <span class="starter-description small-text">
              <RichText rich={s.description} inline />
            </span>
          </label>
        ))}
      </fieldset>
      <button type="button" class="primary" onClick={() => onPick(starters.find((s) => s.id === chosen)!)}>
        {t.starters.use}
      </button>
    </section>
  );
}
