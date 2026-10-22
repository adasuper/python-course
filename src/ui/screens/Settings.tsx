// One settings screen (docs/specs.md §14.4, F-A11-13). Everything is stored per profile and
// applies at once.
import { useEffect, useState } from 'preact/hooks';
import { AVATARS, THEMES } from '../../art';
import type { Speed } from '../../game/replay';
import { t } from '../../i18n/en';
import type { Settings } from '../../state/profile';
import { go, profile, regions, saveDialogOpen, update } from '../../state/store';
import { applyAudio, playEffect } from '../audio';
import { useCanSpeak } from '../components/ReadAloud';
import { applySettings } from '../flow';
import { OfflineStatus } from '../components/OfflineStatus';
import { offlineVoices, onVoicesChanged, speak } from '../speech';
import { Hud } from './Overworld';

const ART = `${import.meta.env.BASE_URL}assets/art/`;

function Choice<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange(value: T): void;
}) {
  return (
    <fieldset class="setting">
      <legend>{legend}</legend>
      <div class="row">
        {options.map((o) => (
          <label key={String(o.value)} class={`choice small-choice ${o.value === value ? 'selected' : ''}`}>
            <input type="radio" name={name} checked={o.value === value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange(value: number): void }) {
  const id = `slider-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div class="setting slider">
      <label for={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={10}
        value={Math.round(value * 100)}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value) / 100)}
      />
      <output for={id}>{Math.round(value * 100)}%</output>
    </div>
  );
}

export function SettingsScreen() {
  const p = profile.value!;
  const s = p.settings;
  const canSpeak = useCanSpeak();
  const [voices, setVoices] = useState(offlineVoices);
  useEffect(() => onVoicesChanged(() => setVoices(offlineVoices())), []);
  useEffect(() => document.getElementById('screen-title')?.focus(), []);

  /** Change settings, then apply them to the page right away. */
  const set = (change: (settings: Settings) => void) => {
    update((x) => change(x.settings));
    applySettings(profile.value);
  };

  return (
    <div class="screen settings-screen">
      <Hud regionName={regions.value[p.location.region]?.name ?? ''} />
      <main id="main">
        <div class="quest-header">
          <button type="button" class="ghost" onClick={() => go({ name: 'overworld' })}>
            ◀ {t.quest.back}
          </button>
          <h1 id="screen-title" tabIndex={-1}>
            ⚙️ {t.settings.heading}
          </h1>
        </div>
        <p class="muted">{t.settings.intro}</p>

        <section class="card" aria-labelledby="set-reading">
          <h2 id="set-reading">{t.settings.reading}</h2>
          <Choice
            legend={t.settings.textSize}
            name="text-size"
            value={s.textScale}
            options={[1, 1.25, 1.5, 2].map((v) => ({
              value: v as Settings['textScale'],
              label: `${v * 100}%`,
            }))}
            onChange={(v) => set((x) => void (x.textScale = v))}
          />
          <Choice
            legend={t.settings.font}
            name="font"
            value={s.font}
            options={[
              { value: 'atkinson', label: 'Atkinson Hyperlegible' },
              { value: 'opendyslexic', label: 'OpenDyslexic' },
              { value: 'system', label: t.settings.systemFont },
            ]}
            onChange={(v) => set((x) => void (x.font = v))}
          />
          <Choice
            legend={t.settings.codeFont}
            name="code-font"
            value={s.codeFont}
            options={[
              { value: 'atkinson', label: 'Atkinson Hyperlegible Mono' },
              { value: 'system', label: t.settings.systemMono },
            ]}
            onChange={(v) => set((x) => void (x.codeFont = v))}
          />
          <label class="check-label setting">
            <input
              type="checkbox"
              checked={s.highContrast}
              onChange={(e) => set((x) => void (x.highContrast = (e.target as HTMLInputElement).checked))}
            />{' '}
            {t.settings.highContrast}
          </label>
        </section>

        <section class="card" aria-labelledby="set-motion">
          <h2 id="set-motion">{t.settings.motion}</h2>
          <Choice
            legend={t.settings.reduceMotion}
            name="motion"
            value={s.reducedMotion}
            options={[
              { value: 'system', label: t.settings.motionSystem },
              { value: 'on', label: t.settings.motionOn },
              { value: 'off', label: t.settings.motionOff },
            ]}
            onChange={(v) => set((x) => void (x.reducedMotion = v))}
          />
          <div class="setting">
            <label for="replay-speed">{t.settings.replaySpeed}</label>{' '}
            <select
              id="replay-speed"
              value={String(s.replaySpeed)}
              onChange={(e) => {
                const raw = (e.target as HTMLSelectElement).value;
                set((x) => void (x.replaySpeed = (raw === 'instant' ? 'instant' : Number(raw)) as Speed));
              }}
            >
              {['0.5', '1', '2', '4'].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
              <option value="instant">{t.replay.instant}</option>
            </select>
          </div>
        </section>

        <section class="card" aria-labelledby="set-speech">
          <h2 id="set-speech">🔊 {t.settings.readAloud}</h2>
          {!canSpeak ? (
            <p>{t.speech.noVoice}</p>
          ) : (
            <>
              <label class="check-label setting">
                <input
                  type="checkbox"
                  checked={s.tts.autoRead}
                  onChange={(e) => set((x) => void (x.tts.autoRead = (e.target as HTMLInputElement).checked))}
                />{' '}
                {t.settings.autoRead}
              </label>
              <div class="setting">
                <label for="voice">{t.settings.voice}</label>{' '}
                <select
                  id="voice"
                  value={s.tts.voice}
                  onChange={(e) => set((x) => void (x.tts.voice = (e.target as HTMLSelectElement).value))}
                >
                  <option value="">{t.settings.anyVoice}</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
              <div class="setting slider">
                <label for="rate">{t.settings.rate}</label>
                <input
                  id="rate"
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.25}
                  value={s.tts.rate}
                  onInput={(e) =>
                    set((x) => void (x.tts.rate = Number((e.target as HTMLInputElement).value)))
                  }
                />
                <output for="rate">{s.tts.rate}×</output>
              </div>
              <label class="check-label setting">
                <input
                  type="checkbox"
                  checked={s.tts.readCode}
                  onChange={(e) => set((x) => void (x.tts.readCode = (e.target as HTMLInputElement).checked))}
                />{' '}
                {t.settings.readCode}
              </label>
              <button type="button" class="small" onClick={() => speak(t.settings.voiceSample, s.tts)}>
                ▶ {t.settings.tryVoice}
              </button>
            </>
          )}
        </section>

        <section class="card" aria-labelledby="set-sound">
          <h2 id="set-sound">🎵 {t.settings.sound}</h2>
          <Slider
            label={t.settings.master}
            value={s.audio.master}
            onChange={(v) => set((x) => void (x.audio.master = v))}
          />
          <Slider
            label={t.settings.music}
            value={s.audio.music}
            onChange={(v) => set((x) => void (x.audio.music = v))}
          />
          <Slider
            label={t.settings.effects}
            value={s.audio.effects}
            onChange={(v) => {
              set((x) => void (x.audio.effects = v));
              applyAudio(profile.value!.settings.audio);
              playEffect('pickup');
            }}
          />
          <p class="small-text muted">{t.settings.soundNote}</p>
        </section>

        <section class="card" aria-labelledby="set-keys">
          <h2 id="set-keys">⌨️ {t.settings.keys}</h2>
          <label class="check-label setting">
            <input
              type="checkbox"
              checked={s.shortcuts}
              onChange={(e) => set((x) => void (x.shortcuts = (e.target as HTMLInputElement).checked))}
            />{' '}
            {t.settings.shortcuts}
          </label>
          <p class="small-text muted">{t.settings.shortcutsNote}</p>
        </section>

        <section class="card" aria-labelledby="set-look">
          <h2 id="set-look">🎨 {t.settings.look}</h2>
          <fieldset class="setting">
            <legend>{t.creator.avatar}</legend>
            <div class="choice-grid">
              {AVATARS.map((a) => (
                <label key={a.id} class={`choice ${p.avatarId === a.id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="avatar"
                    checked={p.avatarId === a.id}
                    onChange={() => update((x) => void (x.avatarId = a.id))}
                  />
                  <img
                    src={`${ART}icons/${a.id}-${p.themeId}.png`}
                    alt=""
                    width={48}
                    height={48}
                    class="pixel"
                  />
                  <span class="choice-label">{a.alt}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset class="setting">
            <legend>{t.creator.theme}</legend>
            <div class="choice-grid themes">
              {THEMES.map((th) => (
                <label key={th.id} class={`choice ${p.themeId === th.id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="theme"
                    checked={p.themeId === th.id}
                    onChange={() => {
                      update((x) => void (x.themeId = th.id));
                      applySettings(profile.value);
                    }}
                  />
                  <span class="swatch" style={{ background: th.cloak }} aria-hidden="true" />
                  <span class="choice-label">{th.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section class="card" aria-labelledby="set-save">
          <h2 id="set-save">💾 {t.settings.saving}</h2>
          <p>{t.save.why}</p>
          <button type="button" onClick={() => (saveDialogOpen.value = true)}>
            {t.hud.save}
          </button>
        </section>

        <section class="card" aria-labelledby="set-offline">
          <h2 id="set-offline">📶 {t.offline.heading}</h2>
          <OfflineStatus />
          <button type="button" class="small" onClick={() => go({ name: 'system' })}>
            🩺 {t.system.link}
          </button>
        </section>
      </main>
    </div>
  );
}
