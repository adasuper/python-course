// The finale (M4.6): every region is restored and the Great Script is whole. The fragments,
// the student's journey in numbers, and the credits: the people of each region, Byte, and the
// student first of all. Nothing moves on its own, so it reads well with reduced motion too.
import { useEffect, useRef } from 'preact/hooks';
import { t } from '../../i18n/en';
import { levelFor, titleFor } from '../../state/profile';
import { playableRegions } from '../../state/progress';
import { course, go, profile } from '../../state/store';

export function FinaleScreen() {
  const p = profile.value!;
  const c = course.value!;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const regions = playableRegions(c);
  const done = Object.entries(p.quests).filter(([id, q]) => q.status === 'completed' && c.questInfo[id]);
  const side = done.filter(([id]) => c.questInfo[id]!.sideQuest).length;
  const earned = c.badges.filter((b) => p.badges[b.id]).length;
  const level = levelFor(p.xp);
  const bugs = regions.flatMap((r) => r.bugs);

  return (
    <main id="main" class="screen finale-screen">
      <div class="quest-header">
        <button type="button" class="ghost" onClick={() => go({ name: 'worldmap' })}>
          ◀ {t.worldMap.open}
        </button>
        <h1 ref={heading} tabIndex={-1}>
          🌟 {t.finale.heading}
        </h1>
      </div>
      <p class="finale-intro">{t.finale.intro(p.nickname, regions.length)}</p>

      <div class="finale-grid">
        <section class="card" aria-labelledby="fragments-h">
          <h2 id="fragments-h">📜 {t.finale.fragments}</h2>
          <ol class="fragment-list">
            {regions.map((r) => (
              <li key={r.id}>
                <span aria-hidden="true">✨ </span>
                <strong>{r.fragment}</strong> <span class="muted">· {r.name}</span>
              </li>
            ))}
          </ol>
        </section>

        <section class="card" aria-labelledby="journey-h">
          <h2 id="journey-h">🧭 {t.finale.stats}</h2>
          <ul class="journey-list">
            <li>{t.finale.level(level, titleFor(level))}</li>
            <li>{t.finale.quests(done.length - side)}</li>
            {c.sideQuests && <li>{t.finale.sideQuests(side)}</li>}
            <li>{t.finale.badges(earned, c.badges.length)}</li>
          </ul>
          <div class="row">
            <button type="button" class="primary" onClick={() => go({ name: 'workshop' })}>
              🛠️ {t.finale.workshop}
            </button>
          </div>
        </section>
      </div>

      <section class="card credits-roll" aria-labelledby="roll-h">
        <h2 id="roll-h">🎬 {t.finale.rollHeading}</h2>
        <h3>{t.finale.starring}</h3>
        <ul class="cast-list">
          <li>
            <strong>{t.finale.scriptwright(p.nickname)}</strong>
          </li>
          <li>{t.finale.byte}</li>
        </ul>
        {regions
          .filter((r) => r.cast.length)
          .map((r) => (
            <div key={r.id}>
              <h3>{t.finale.peopleOf(r.name)}</h3>
              <p>{r.cast.join(' · ')}</p>
            </div>
          ))}
        {bugs.length > 0 && (
          <>
            <h3>{t.finale.fireflies}</h3>
            <p>{bugs.join(' · ')}</p>
          </>
        )}
        <h3>{t.finale.madeWith}</h3>
        <p>{t.finale.tools}</p>
        <p class="finale-thanks">
          <strong>{t.finale.thanks}</strong>
        </p>
        <button type="button" class="small" onClick={() => go({ name: 'credits', back: { name: 'finale' } })}>
          {t.finale.allCredits}
        </button>
      </section>
    </main>
  );
}
