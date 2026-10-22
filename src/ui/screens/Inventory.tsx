// Inventory: concept items double as a reference notebook (§11.3–§11.4). Full notebook in Phase 2.
import { t } from '../../i18n/en';
import { course, go, profile, regions } from '../../state/store';
import { RichText } from '../components/RichText';
import { Hud } from './Overworld';

const ART = `${import.meta.env.BASE_URL}assets/art/`;

export function InventoryScreen() {
  const p = profile.value!;
  const c = course.value!;
  const region = regions.value[p.location.region];
  const fragments = Object.values(regions.value).filter((r) => p.quests[r.boss]?.status === 'completed');
  return (
    <div class="screen inventory-screen">
      <Hud regionName={region?.name ?? ''} />
      <main id="main">
        <div class="quest-header">
          <button type="button" class="ghost" onClick={() => go({ name: 'overworld' })}>
            ◀ {t.quest.back}
          </button>
          <h1>🎒 {t.inventory.heading}</h1>
          <button
            type="button"
            class="ghost"
            onClick={() =>
              go({ name: 'story', title: c.title, lines: c.opening, next: { name: 'inventory' } })
            }
          >
            📜 {t.dialogue.replayOpening}
          </button>
        </div>
        {p.items.length === 0 && <p class="muted">{t.inventory.empty}</p>}
        <ul class="items">
          {p.items.map((id) => {
            const item = c.items[id];
            if (!item) return null;
            return (
              <li key={id} class="item card">
                <img src={`${ART}icons/${item.icon}.png`} alt="" width={48} height={48} class="pixel" />
                <div>
                  <h2>{item.name}</h2>
                  <RichText rich={item.description} />
                  {item.example && <pre class="code-block">{item.example}</pre>}
                </div>
              </li>
            );
          })}
        </ul>
        {fragments.length > 0 && (
          <section>
            <h2>{t.inventory.fragments}</h2>
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
      </main>
    </div>
  );
}
