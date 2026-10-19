// Opens a quest (or a boss with phases) and wires completion to progress (§9.6).
import { useEffect, useState } from 'preact/hooks';
import type { BossQuest, NormalQuest } from '../../content/types';
import { t } from '../../i18n/en';
import { completePhase, completeQuest } from '../../state/progress';
import { course, go, loadRegion, profile, regions, update } from '../../state/store';
import { Hud } from '../screens/Overworld';
import { QuestPlay } from './QuestPlay';

export function QuestScreen({ questId }: { questId: string }) {
  const c = course.value!;
  const info = c.questInfo[questId]!;
  const region = regions.value[info.region];
  useEffect(() => {
    if (!region) void loadRegion(info.region);
  }, [info.region]);
  if (!region) return <main id="main" class="screen" />;
  const quest = region.questData[questId]!;
  return quest.type === 'boss' ? (
    <BossScreen quest={quest} regionName={region.name} />
  ) : (
    <SingleQuest quest={quest} regionName={region.name} />
  );
}

function Header({ title, kind, regionName }: { title: string; kind: string; regionName: string }) {
  return (
    <>
      <Hud regionName={regionName} />
      <div class="quest-header">
        <button type="button" class="ghost" onClick={() => go({ name: 'overworld' })}>
          ◀ {t.quest.back}
        </button>
        <h1 id="quest-title" tabIndex={-1}>
          {title}
        </h1>
        <span class="type-badge">{kind}</span>
      </div>
    </>
  );
}

function SingleQuest({ quest, regionName }: { quest: NormalQuest; regionName: string }) {
  useEffect(() => document.getElementById('quest-title')?.focus(), [quest.id]);
  return (
    <div class="screen quest-screen">
      <a class="skip-link" href="#main">
        {t.skipToMain}
      </a>
      <Header
        title={quest.title}
        kind={quest.sideQuest ? `⭐ side quest · ${quest.type}` : quest.type}
        regionName={regionName}
      />
      <main id="main" tabIndex={-1}>
        <QuestPlay
          quest={quest}
          body={quest}
          unitKey={quest.id}
          outro={quest.storyOutro}
          starter={quest.starterCode}
          onPassed={(code) => {
            let reward = {
              xp: 0,
              item: null as string | null,
              levelUp: null as number | null,
              bossDefeated: false,
            };
            update((p) => (reward = completeQuest(p, course.value!, quest.id, code)));
            return reward;
          }}
          afterPass={
            <button type="button" class="primary" onClick={() => go({ name: 'overworld' })}>
              {t.quest.continue} ▸
            </button>
          }
        />
      </main>
    </div>
  );
}

function BossScreen({ quest, regionName }: { quest: BossQuest; regionName: string }) {
  const p = profile.value!;
  const done = p.quests[quest.id]?.phasesDone ?? [];
  const firstOpen = quest.phases.findIndex((ph) => !done.includes(ph.id));
  const [index, setIndex] = useState(firstOpen < 0 ? 0 : firstOpen);
  const [starterFromPrevious, setStarterFromPrevious] = useState<string | null>(null);
  const phase = quest.phases[index]!;
  const left = quest.phases.length - done.length;
  const defeated = p.quests[quest.id]?.status === 'completed';
  useEffect(() => document.getElementById('quest-title')?.focus(), [index]);

  return (
    <div class="screen quest-screen boss">
      <Header title={quest.title} kind={`boss · ${quest.boss.bug}`} regionName={regionName} />
      <main id="main" tabIndex={-1}>
        <div class="boss-bar card">
          <img
            src={`${import.meta.env.BASE_URL}assets/art/icons/script_fragment.png`}
            alt=""
            width={32}
            height={32}
            class="pixel"
          />
          <div>
            <p>
              <strong>{quest.boss.name}</strong> —{' '}
              {defeated ? t.quest.bossDefeated : t.quest.bossHealth(left, quest.phases.length)}
            </p>
            <progress
              max={quest.phases.length}
              value={quest.phases.length - left}
              aria-label={t.quest.bossHealth(left, quest.phases.length)}
            />
          </div>
          <nav aria-label="Boss phases" class="phase-tabs">
            {quest.phases.map((ph, i) => {
              const available = i === 0 || done.includes(quest.phases[i - 1]!.id) || done.includes(ph.id);
              return (
                <button
                  key={ph.id}
                  type="button"
                  class={`small ${i === index ? 'current' : ''}`}
                  aria-current={i === index ? 'step' : undefined}
                  disabled={!available}
                  onClick={() => setIndex(i)}
                >
                  {done.includes(ph.id) ? '✓ ' : ''}
                  {t.quest.phase(i + 1, quest.phases.length)}: {ph.title}
                </button>
              );
            })}
          </nav>
        </div>
        <QuestPlay
          key={phase.id}
          quest={quest as never}
          body={phase}
          unitKey={`${quest.id}›${phase.id}`}
          outro={phase.storyOutro ?? (index === quest.phases.length - 1 ? quest.storyOutro : null)}
          starter={phase.carryCode && starterFromPrevious ? starterFromPrevious : phase.starterCode}
          onPassed={(code) => {
            let reward = {
              xp: 0,
              item: null as string | null,
              levelUp: null as number | null,
              bossDefeated: false,
            };
            update((x) => (reward = completePhase(x, course.value!, quest.id, phase.id, code)));
            setStarterFromPrevious(code);
            return reward;
          }}
          afterPass={
            index < quest.phases.length - 1 ? (
              <button type="button" class="primary" onClick={() => setIndex(index + 1)}>
                {t.quest.nextPhase} ▸
              </button>
            ) : (
              <button type="button" class="primary" onClick={() => go({ name: 'overworld' })}>
                {t.quest.continue} ▸
              </button>
            )
          }
        />
      </main>
    </div>
  );
}
