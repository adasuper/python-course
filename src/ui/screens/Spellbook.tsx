// The Spellbook's reference pages (docs/specs.md §11.5, §9.8): Spell Pages (concept cards of
// completed quests), My Spells (my own passing code), worked examples from concept scenes,
// concept scenes to watch again, and the whole glossary (F-PRG-05, F-DLG-04, F-DLG-06).
import { useEffect, useState } from 'preact/hooks';
import { plainText } from '../../content/richtext';
import type { Quest } from '../../content/types';
import { t } from '../../i18n/en';
import { announce, course, go, loadRegion, profile, regions, type Route } from '../../state/store';
import { RichText } from '../components/RichText';
import { Tabs } from '../components/Tabs';
import { Hud } from './Overworld';

export type SpellbookTab = 'pages' | 'spells' | 'examples' | 'scenes' | 'glossary';

/** Copies text, or selects it when the clipboard isn't allowed (some managed devices). */
export async function copyText(text: string, fallback?: HTMLElement | null) {
  try {
    await navigator.clipboard.writeText(text);
    announce(t.spellbook.copied);
  } catch {
    if (fallback) {
      const range = document.createRange();
      range.selectNodeContents(fallback);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      announce(t.spellbook.copySelected);
    }
  }
}

function CodeCard({ code, label }: { code: string; label: string }) {
  let pre: HTMLPreElement | null = null;
  return (
    <div class="spell-code">
      <pre class="code-block" ref={(el) => void (pre = el)} aria-label={label}>
        <code>{code}</code>
      </pre>
      <button type="button" class="small" onClick={() => void copyText(code, pre)}>
        📋 {t.spellbook.copy}
      </button>
    </div>
  );
}

export function SpellbookScreen({ tab = 'pages' }: { tab?: SpellbookTab }) {
  const p = profile.value!;
  const c = course.value!;
  const [current, setCurrent] = useState<SpellbookTab>(tab);
  useEffect(() => document.getElementById('screen-title')?.focus(), []);
  // Load every region the student has been to, for its quests and concept scene.
  useEffect(() => {
    const visited = new Set([p.location.region, ...p.seen.conceptScenes]);
    for (const id of Object.keys(p.quests)) visited.add(c.questInfo[id]?.region ?? '');
    for (const r of c.regions) if (visited.has(r.id)) void loadRegion(r.id);
  }, []);

  const loaded = c.regions.map((r) => regions.value[r.id]).filter((r) => r !== undefined);
  const quests: Quest[] = c.questOrder
    .map((id) => loaded.find((r) => r.questData[id])?.questData[id])
    .filter((q) => q !== undefined);
  const done = quests.filter((q) => p.quests[q.id]?.status === 'completed');

  const panel = () => {
    switch (current) {
      case 'pages': {
        const pages = done.filter((q) => q.type !== 'boss' && q.conceptCard);
        if (!pages.length) return <p class="muted">{t.spellbook.noPages}</p>;
        return (
          <ul class="spell-list">
            {pages.map((q) => (
              <li key={q.id} class="card">
                <h3>📘 {q.title}</h3>
                {q.type !== 'boss' && q.conceptCard && <RichText rich={q.conceptCard} />}
              </li>
            ))}
          </ul>
        );
      }
      case 'spells': {
        // Predict and investigate quests use the game's code, not the student's own.
        const spells = done.filter(
          (q) => q.type !== 'predict' && q.type !== 'investigate' && p.quests[q.id]?.solution,
        );
        if (!spells.length) return <p class="muted">{t.spellbook.noSpells}</p>;
        return (
          <ul class="spell-list">
            {spells.map((q) => (
              <li key={q.id} class="card">
                <h3>✨ {q.title}</h3>
                <CodeCard code={p.quests[q.id]!.solution!} label={t.spellbook.spellLabel(q.title)} />
              </li>
            ))}
          </ul>
        );
      }
      case 'examples': {
        const seen = loaded.filter((r) => p.seen.conceptScenes.includes(r.id));
        if (!seen.length) return <p class="muted">{t.spellbook.noScenes}</p>;
        return (
          <ul class="spell-list">
            {seen.map((r) => (
              <li key={r.id} class="card">
                <h3>
                  🧪 {r.conceptScene.title} <span class="muted small-text">({r.name})</span>
                </h3>
                <CodeCard
                  code={r.conceptScene.workedExample.code}
                  label={t.spellbook.exampleLabel(r.conceptScene.title)}
                />
                <ol class="example-notes">
                  {r.conceptScene.workedExample.explain.map((note) => (
                    <li key={note.line} value={note.line}>
                      <span class="sr-only">{t.quest.lineLabel(note.line)}: </span>
                      <RichText rich={note.text} inline />
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        );
      }
      case 'scenes': {
        const seen = c.regions.filter((r) => p.seen.conceptScenes.includes(r.id));
        if (!seen.length) return <p class="muted">{t.spellbook.noScenes}</p>;
        return (
          <ul class="spell-list">
            {seen.map((r) => (
              <li key={r.id} class="card row">
                <span>
                  🎬 <strong>{regions.value[r.id]?.conceptScene.title ?? r.name}</strong>{' '}
                  <span class="muted small-text">({r.name})</span>
                </span>
                <button
                  type="button"
                  class="small"
                  onClick={async () => {
                    await loadRegion(r.id);
                    const next: Route = { name: 'spellbook', tab: 'scenes' };
                    go({ name: 'concept', regionId: r.id, next });
                  }}
                >
                  ▶ {t.spellbook.watchAgain}
                </button>
              </li>
            ))}
          </ul>
        );
      }
      case 'glossary':
        return <Glossary quests={quests} />;
    }
  };

  return (
    <div class="screen spellbook-screen">
      <Hud regionName={regions.value[p.location.region]?.name ?? ''} />
      <main id="main">
        <div class="quest-header">
          <button type="button" class="ghost" onClick={() => go({ name: 'overworld' })}>
            ◀ {t.quest.back}
          </button>
          <h1 id="screen-title" tabIndex={-1}>
            📖 {t.spellbook.heading}
          </h1>
        </div>
        <Tabs<SpellbookTab>
          id="spellbook"
          label={t.spellbook.heading}
          current={current}
          onSelect={setCurrent}
          tabs={[
            { key: 'pages', label: t.spellbook.pages },
            { key: 'spells', label: t.spellbook.spells },
            { key: 'examples', label: t.spellbook.examples },
            { key: 'scenes', label: t.spellbook.scenes },
            { key: 'glossary', label: t.spellbook.glossary },
          ]}
        >
          {panel()}
        </Tabs>
      </main>
    </div>
  );
}

/** Every glossary term, A to Z, with search. Words from quests the student has started are
 *  "met"; the others are marked, or hidden with the checkbox (F-DLG-04). */
function Glossary({ quests }: { quests: Quest[] }) {
  const p = profile.value!;
  const c = course.value!;
  const [query, setQuery] = useState('');
  const [onlyMet, setOnlyMet] = useState(false);
  const met = new Set(
    quests.filter((q) => p.quests[q.id]).flatMap((q) => q.vocabulary.map((v) => v.toLowerCase())),
  );
  const needle = query.trim().toLowerCase();
  const entries = Object.entries(c.glossary)
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([key]) => !onlyMet || met.has(key))
    .filter(
      ([key, g]) => !needle || key.includes(needle) || plainText(g.definition).toLowerCase().includes(needle),
    );
  return (
    <section aria-label={t.spellbook.glossary}>
      <div class="row">
        <label class="search">
          {t.spellbook.searchWords}{' '}
          <input
            type="search"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="check-label">
          <input
            type="checkbox"
            checked={onlyMet}
            onChange={(e) => setOnlyMet((e.target as HTMLInputElement).checked)}
          />{' '}
          {t.spellbook.onlyMet}
        </label>
      </div>
      <p class="sr-only" role="status">
        {needle || onlyMet ? t.spellbook.wordsFound(entries.length) : ''}
      </p>
      {entries.length === 0 && <p class="muted">{t.spellbook.noWords}</p>}
      <dl class="glossary-list">
        {entries.map(([key, g]) => (
          <div key={key} class="card glossary-entry" id={`word-${key.replace(/\W+/g, '-')}`}>
            <dt>
              {g.term} {!met.has(key) && <span class="muted small-text">({t.spellbook.notMet})</span>}
            </dt>
            <dd>
              <RichText rich={g.definition} />
              <div class="glossary-example">
                <RichText rich={g.example} />
              </div>
              {g.related.length > 0 && (
                <p class="small-text">
                  {t.spellbook.related}{' '}
                  {g.related.map((r, i) => (
                    <span key={r}>
                      {i > 0 && ', '}
                      <button type="button" class="link" onClick={() => setQuery(r)}>
                        {r}
                      </button>
                    </span>
                  ))}
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
