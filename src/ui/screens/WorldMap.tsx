// The world map (F-WLD-08, docs/specs.md §11.1): every region of the course, locked, open or
// restored, in words and icons. A picture of the road shows the same thing at a glance.
import { useEffect, useRef } from 'preact/hooks';
import { t } from '../../i18n/en';
import {
  courseComplete,
  finaleReady,
  playableRegions,
  regionRestored,
  regionUnlocked,
} from '../../state/progress';
import { course, go, profile, regions } from '../../state/store';
import { enterRegion, playFinale } from '../flow';
import { Hud } from './Overworld';

type RegionStatus = 'restored' | 'open' | 'locked';

const ICON: Record<RegionStatus, string> = { restored: '✨', open: '🗺️', locked: '🔒' };

export function WorldMapScreen() {
  const p = profile.value!;
  const c = course.value!;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const list = playableRegions(c).map((r) => {
    const status: RegionStatus = regionRestored(p, c, r.id)
      ? 'restored'
      : regionUnlocked(p, c, r.id)
        ? 'open'
        : 'locked';
    // Core quests and the boss; side quests are extra.
    const core = c.questOrder.filter((q) => c.questInfo[q]?.region === r.id && !c.questInfo[q]!.sideQuest);
    const done = core.filter((q) => p.quests[q]?.status === 'completed').length;
    return { ...r, status, here: r.id === p.location.region, done, total: core.length };
  });
  const previousName = (i: number) => list[i - 1]?.name ?? '';

  return (
    <div class="screen world-map-screen">
      <Hud regionName={regions.value[p.location.region]?.name ?? ''} />
      <main id="main">
        <div class="quest-header">
          <button type="button" class="ghost" onClick={() => go({ name: 'overworld' })}>
            ◀ {t.quest.back}
          </button>
          <h1 ref={heading} tabIndex={-1}>
            🗺️ {t.worldMap.heading}
          </h1>
        </div>
        <p class="muted">{t.worldMap.intro}</p>
        {finaleReady(p, c) && (
          <p>
            <button type="button" class="primary" onClick={playFinale}>
              🌟 {t.finale.replay}
            </button>
          </p>
        )}
        <RoadPicture statuses={list.map((r) => r.status)} here={list.findIndex((r) => r.here)} />
        <ol class="region-list">
          {list.map((r, i) => (
            <li key={r.id} class={`region-row region-${r.status}`}>
              <span class="region-number" aria-hidden="true">
                {r.number}
              </span>
              <span class="region-name">
                <strong>{r.name}</strong>
                <span class="region-status">
                  {' '}
                  <span aria-hidden="true">{ICON[r.status]}</span> {t.worldMap.status[r.status]}
                  {r.here && ` · ${t.worldMap.here}`}
                </span>
                {r.status === 'locked' && i > 0 && (
                  <span class="needs small-text"> {t.worldMap.needs(previousName(i))}</span>
                )}
                {r.status !== 'locked' && (
                  <span class="needs small-text"> {t.worldMap.progress(r.done, r.total)}</span>
                )}
              </span>
              <button
                type="button"
                class="small"
                disabled={r.status === 'locked' || r.here}
                aria-label={r.here ? undefined : t.worldMap.travelTo(r.name)}
                onClick={() => void enterRegion(r.id)}
              >
                {r.here ? t.worldMap.here : t.worldMap.travel}
              </button>
            </li>
          ))}
        </ol>
        {c.moreRegionsComing && (
          <p class="more-regions">
            <span aria-hidden="true">🛤️ </span>
            {courseComplete(p, c) ? t.worldMap.allSoFar : t.worldMap.moreComing}
          </p>
        )}
      </main>
    </div>
  );
}

/** A winding road with one stop per region. Decoration only: the list says it all in words. */
function RoadPicture({ statuses, here }: { statuses: RegionStatus[]; here: number }) {
  const n = statuses.length;
  const w = Math.max(320, n * 90);
  const points = statuses.map((_, i) => [45 + i * ((w - 90) / Math.max(1, n - 1)), i % 2 ? 70 : 40] as const);
  return (
    <svg class="road-picture" viewBox={`0 0 ${w} 110`} aria-hidden="true" focusable="false">
      <polyline points={points.map(([x, y]) => `${x},${y}`).join(' ')} class="road" />
      {points.map(([x, y], i) => (
        <g key={i} class={`stop stop-${statuses[i]}`}>
          <circle cx={x} cy={y} r={i === here ? 17 : 14} />
          <text x={x} y={y + 5} text-anchor="middle">
            {statuses[i] === 'locked' ? '🔒' : i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
