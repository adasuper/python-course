// The Inventory doubles as a reference notebook (docs/specs.md §11.3–§11.4, F-PRG-04):
// concept items as cards that open a detail page, Script Fragments on their own shelf, and
// the badges shelf (§11.6).
import { useEffect, useState } from 'preact/hooks';
import { plainText, termsIn } from '../../content/richtext';
import { t } from '../../i18n/en';
import type { RunResult } from '../../runtime/protocol';
import { course, getRunner, go, loadRegion, profile, regions } from '../../state/store';
import { OutputScroll } from '../components/Output';
import { RichText } from '../components/RichText';
import { ErrorExplanation } from '../quest/Feedback';
import { Hud } from './Overworld';

const ART = `${import.meta.env.BASE_URL}assets/art/`;

function Header({ title, back }: { title: string; back: () => void }) {
  return (
    <div class="quest-header">
      <button type="button" class="ghost" onClick={back}>
        ◀ {t.quest.back}
      </button>
      <h1 id="screen-title" tabIndex={-1}>
        {title}
      </h1>
    </div>
  );
}

export function InventoryScreen() {
  const p = profile.value!;
  const c = course.value!;
  const region = regions.value[p.location.region];
  const [query, setQuery] = useState('');
  useEffect(() => document.getElementById('screen-title')?.focus(), []);
  // Script Fragments need their region's data, which loads on demand.
  useEffect(() => {
    for (const r of c.regions) {
      const boss = c.questOrder.find(
        (q) => c.questInfo[q]?.region === r.id && c.questInfo[q]?.type === 'boss',
      );
      if (boss && p.quests[boss]?.status === 'completed') void loadRegion(r.id);
    }
  }, []);
  const fragments = Object.values(regions.value).filter((r) => p.quests[r.boss]?.status === 'completed');
  const needle = query.trim().toLowerCase();
  const items = p.items
    .map((id) => c.items[id])
    .filter((item) => item !== undefined)
    .filter(
      (item) =>
        !needle ||
        item.name.toLowerCase().includes(needle) ||
        plainText(item.description, true).toLowerCase().includes(needle),
    );
  return (
    <div class="screen inventory-screen">
      <Hud regionName={region?.name ?? ''} />
      <main id="main">
        <Header title={`🎒 ${t.inventory.heading}`} back={() => go({ name: 'overworld' })} />
        <p class="row">
          <button
            type="button"
            class="ghost"
            onClick={() =>
              go({ name: 'story', title: c.title, lines: c.opening, next: { name: 'inventory' } })
            }
          >
            📜 {t.dialogue.replayOpening}
          </button>
        </p>
        <section aria-labelledby="items-h">
          <h2 id="items-h">{t.inventory.items}</h2>
          {p.items.length === 0 ? (
            <p class="muted">{t.inventory.empty}</p>
          ) : (
            <>
              <label class="search">
                {t.inventory.search}{' '}
                <input
                  type="search"
                  value={query}
                  onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                />
              </label>
              <p class="sr-only" role="status">
                {needle ? t.inventory.found(items.length) : ''}
              </p>
              {items.length === 0 && <p class="muted">{t.inventory.noMatch}</p>}
              <ul class="items">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      class="item card item-card"
                      onClick={() => go({ name: 'item', id: item.id })}
                    >
                      <img src={`${ART}icons/${item.icon}.png`} alt="" width={48} height={48} class="pixel" />
                      <span>
                        <strong class="item-name">{item.name}</strong>
                        <span class="item-summary">{plainText(item.description, true)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        {fragments.length > 0 && (
          <section aria-labelledby="fragments-h">
            <h2 id="fragments-h">{t.inventory.fragments}</h2>
            <ul class="items">
              {fragments.map((r) => (
                <li key={r.id} class="item card">
                  <img src={`${ART}icons/script_fragment.png`} alt="" width={48} height={48} class="pixel" />
                  <div>
                    <h3>{r.fragment.name}</h3>
                    <RichText rich={r.fragment.description} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        <BadgeShelf />
      </main>
    </div>
  );
}

/** Every badge, earned or not yet, so students can see what they could aim for. */
function BadgeShelf() {
  const p = profile.value!;
  const badges = course.value!.badges;
  if (!badges.length) return null;
  const earned = badges.filter((b) => b.id in p.badges).length;
  return (
    <section aria-labelledby="badges-h">
      <h2 id="badges-h">
        🏅 {t.inventory.badges}{' '}
        <span class="muted small-text">{t.inventory.badgeCount(earned, badges.length)}</span>
      </h2>
      <ul class="badges">
        {badges.map((b) => {
          const on = p.badges[b.id];
          return (
            <li key={b.id} class={`badge-card card ${on ? 'earned' : 'not-yet'}`}>
              <span class="badge-emoji" aria-hidden="true">
                {on ? b.emoji : '🔒'}
              </span>
              <div>
                <h3>{b.name}</h3>
                <RichText rich={b.description} />
                <p class="small-text">{on ? t.inventory.earnedOn(on) : t.inventory.notYet}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** One item as a notebook page: the concept, a runnable example, its quest and its words. */
export function ItemScreen({ id }: { id: string }) {
  const p = profile.value!;
  const c = course.value!;
  const item = c.items[id];
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const quests = c.questOrder.filter((q) => c.questInfo[q]?.item === id);
  useEffect(() => document.getElementById('screen-title')?.focus(), [id]);
  useEffect(() => {
    for (const q of quests) void loadRegion(c.questInfo[q]!.region);
  }, [id]);
  if (!item) return <main id="main" class="screen" />;
  const terms = termsIn(item.description)
    .map((term) => c.glossary[term.toLowerCase()])
    .filter((g) => g !== undefined);

  const run = async () => {
    setRunning(true);
    const res = await getRunner().run({
      mode: 'example',
      code: item.example!,
      stage: null,
      inputs: [],
      interactiveInput: false,
      seed: 0,
      validators: [],
      mistakes: [],
      bonus: [],
    });
    setRunning(false);
    setResult(res);
  };

  return (
    <div class="screen inventory-screen">
      <Hud regionName={regions.value[p.location.region]?.name ?? ''} />
      <main id="main">
        <Header title={item.name} back={() => go({ name: 'inventory' })} />
        <div class="item-page card">
          <img src={`${ART}icons/${item.icon}.png`} alt="" width={64} height={64} class="pixel" />
          <div>
            <RichText rich={item.description} />
          </div>
        </div>
        {item.example && (
          <section aria-labelledby="example-h" class="card">
            <h2 id="example-h">{t.inventory.example}</h2>
            <pre class="code-block">
              <code>{item.example}</code>
            </pre>
            <button type="button" class="primary" disabled={running} onClick={() => void run()}>
              ▶ {running ? t.quest.running : t.inventory.runExample}
            </button>
            {result && (
              <>
                <OutputScroll
                  lines={result.output ? [{ kind: 'stdout', text: result.output }] : []}
                  empty={t.inventory.noOutput}
                />
                {result.error && <ErrorExplanation error={result.error} />}
              </>
            )}
          </section>
        )}
        {quests.length > 0 && (
          <section aria-labelledby="related-h" class="card">
            <h2 id="related-h">{t.inventory.related}</h2>
            <ul>
              {quests.map((q) => {
                const info = c.questInfo[q]!;
                const card = regions.value[info.region]?.questData[q];
                const conceptCard = card && card.type !== 'boss' ? card.conceptCard : null;
                return (
                  <li key={q}>
                    <strong>{info.title}</strong>
                    {conceptCard && p.quests[q]?.status === 'completed' && (
                      <details class="concept-card">
                        <summary>📘 {t.quest.conceptCard}</summary>
                        <RichText rich={conceptCard} />
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {terms.length > 0 && (
          <section aria-labelledby="words-h" class="card">
            <h2 id="words-h">{t.inventory.words}</h2>
            <dl class="glossary-list">
              {terms.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>
                    <RichText rich={g.definition} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </main>
    </div>
  );
}
