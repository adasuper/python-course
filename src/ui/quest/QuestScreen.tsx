// Opens a quest (or a boss with phases) and wires completion to progress (§9.6).
import { useEffect, useState } from 'preact/hooks';
import type { BossQuest, NormalQuest } from '../../content/types';
import { getWorldView } from '../../game/worldView';
import { t } from '../../i18n/en';
import { completePhase, completeQuest, playableRegions, record } from '../../state/progress';
import { course, getStorage, go, loadRegion, profile, regions, update } from '../../state/store';
import { Hud } from '../screens/Overworld';
import { QuestPlay } from './QuestPlay';
import { questTab, type QuestTab } from './questTabs';

export function QuestScreen({ questId }: { questId: string }) {
  const c = course.value!;
  const info = c.questInfo[questId]!;
  const region = regions.value[info.region];
  useEffect(() => {
    if (!region) void loadRegion(info.region);
  }, [info.region]);
  // Opening a quest makes it "in progress" (F-QST-01) and remembers it as where the
  // student left off (F-SAV-10) until they go back to the map.
  useEffect(() => {
    update((x) => {
      record(x, questId);
      x.location.quest = questId;
    });
    return () =>
      update((x) => {
        if (x.location.quest === questId) x.location.quest = null;
      });
  }, [questId]);
  if (!region) return <main id="main" class="screen" />;
  const quest = region.questData[questId]!;
  return quest.type === 'boss' ? (
    <BossScreen quest={quest} regionName={region.name} />
  ) : (
    <SingleQuest quest={quest} regionName={region.name} />
  );
}

/** Skip links (F-A11-06). The editor may be a Parsons puzzle instead. */
function SkipLinks() {
  const jump = (e: Event, tab: QuestTab | null, ...selectors: string[]) => {
    e.preventDefault();
    // On a narrow screen the target may be on another tab: show it first.
    if (tab) questTab.value = tab;
    requestAnimationFrame(() => {
      const target = selectors.map((s) => document.querySelector<HTMLElement>(s)).find(Boolean);
      if (!target) return;
      if (!target.hasAttribute('tabindex') && !target.isContentEditable) target.tabIndex = -1;
      target.focus();
    });
  };
  return (
    <>
      <a class="skip-link" href="#main" onClick={(e) => jump(e, null, '#main')}>
        {t.skipToMain}
      </a>
      <a
        class="skip-link"
        href="#code-editor"
        onClick={(e) => jump(e, 'work', '#code-editor', '.parsons button')}
      >
        {t.quest.skipToEditor}
      </a>
      <a class="skip-link" href="#output-body" onClick={(e) => jump(e, 'stage', '#output-body')}>
        {t.quest.skipToOutput}
      </a>
    </>
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
      <SkipLinks />
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
  // A carry_code phase starts from the passing code of the phase before. After a reload
  // that code comes from the previous phase's saved draft (F-BOS-02).
  const [carry, setCarry] = useState<{ phase: string; code: string | null } | null>(null);
  useEffect(() => {
    const prev = quest.phases[index - 1];
    if (!phase.carryCode || !prev) return setCarry({ phase: phase.id, code: null });
    if (starterFromPrevious) return setCarry({ phase: phase.id, code: starterFromPrevious });
    void getStorage()
      .draft(p.id, `${quest.id}›${prev.id}`)
      .then((draft) => setCarry({ phase: phase.id, code: draft ?? null }));
  }, [index]);
  const defeated = p.quests[quest.id]?.status === 'completed';
  useEffect(() => document.getElementById('quest-title')?.focus(), [index]);

  return (
    <div class="screen quest-screen boss">
      <SkipLinks />
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
        {carry?.phase === phase.id && (
          <QuestPlay
            key={phase.id}
            quest={quest as never}
            body={phase}
            unitKey={`${quest.id}›${phase.id}`}
            phaseId={phase.id}
            outro={phase.storyOutro ?? (index === quest.phases.length - 1 ? quest.storyOutro : null)}
            starter={carry.code ?? phase.starterCode}
            onPassed={(code) => {
              let reward = {
                xp: 0,
                item: null as string | null,
                levelUp: null as number | null,
                bossDefeated: false,
              };
              update((x) => (reward = completePhase(x, course.value!, quest.id, phase.id, code)));
              setStarterFromPrevious(code);
              if (reward.bossDefeated) getWorldView().celebrateBoss(quest.boss.sprite);
              return reward;
            }}
            afterPass={
              index < quest.phases.length - 1 ? (
                <button type="button" class="primary" onClick={() => setIndex(index + 1)}>
                  {t.quest.nextPhase} ▸
                </button>
              ) : (
                <div class="row">
                  <button type="button" class="primary" onClick={() => go({ name: 'overworld' })}>
                    {t.quest.continue} ▸
                  </button>
                  {/* The road to the next region is open now (F-WLD-08). */}
                  {playableRegions(course.value!).length > 1 && (
                    <button type="button" onClick={() => go({ name: 'worldmap' })}>
                      🗺️ {t.worldMap.open}
                    </button>
                  )}
                </div>
              )
            }
          />
        )}
      </main>
    </div>
  );
}
