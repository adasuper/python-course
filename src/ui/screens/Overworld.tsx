// The region map: walk, talk to NPCs, open quests (docs/specs.md §11.1).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { OverworldObject } from '../../content/types';
import { getWorldView } from '../../game/worldView';
import { t } from '../../i18n/en';
import type { Dir, XY } from '../../runtime/protocol';
import { levelFor, titleFor, xpForLevel } from '../../state/profile';
import { questState, regionCounts, regionMarkers } from '../../state/progress';
import {
  announce,
  course,
  go,
  profile,
  regions,
  saveDialogOpen,
  toast,
  unsaved,
  update,
} from '../../state/store';
import { RichText } from '../components/RichText';
import { switchProfile } from '../flow';

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

const STATUS_TEXT = {
  available: '! New',
  in_progress: '… Started',
  completed: '✓ Done',
  locked: '🔒 Locked',
} as const;

export function Hud({ regionName }: { regionName: string }) {
  const p = profile.value!;
  const level = levelFor(p.xp);
  const next = xpForLevel(level + 1);
  const base = xpForLevel(level);
  return (
    <header class="hud">
      <div class="hud-who">
        <strong>{p.nickname}</strong>
        <span class="muted">{t.hud.level(level, titleFor(level))}</span>
        <progress class="xp" max={next - base} value={p.xp - base} aria-label={t.hud.xp(p.xp, next)} />
        <span class="muted small-text">{t.hud.xp(p.xp, next)}</span>
      </div>
      <p class="hud-region">{regionName}</p>
      <nav class="hud-actions" aria-label={t.hud.menu}>
        <button
          type="button"
          class={unsaved.value ? 'unsaved' : ''}
          onClick={() => (saveDialogOpen.value = true)}
        >
          💾 {t.hud.save}
          {unsaved.value && <span class="badge">{t.hud.unsaved}</span>}
        </button>
        <button type="button" onClick={() => go({ name: 'inventory' })}>
          🎒 {t.hud.inventory}
        </button>
        <button type="button" class="ghost" onClick={() => void switchProfile()}>
          {t.hud.title}
        </button>
      </nav>
    </header>
  );
}

interface Talk {
  object: OverworldObject;
}

export function OverworldScreen() {
  const p = profile.value!;
  const c = course.value!;
  const region = regions.value[p.location.region]!;
  const holder = useRef<HTMLDivElement>(null);
  const worldEl = useRef<HTMLDivElement>(null);
  const [talk, setTalk] = useState<Talk | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const markers = regionMarkers(p, c, region.id);
  const counts = regionCounts(p, c, region.id);
  const bossDone = p.quests[region.boss]?.status === 'completed';

  useEffect(() => {
    const world = getWorldView();
    world.mount(holder.current!);
    void world.showOverworld({
      region,
      markers,
      avatar: p.avatarId,
      theme: p.themeId,
      start: p.location.at ?? undefined,
      onInteract: (object) => setTalk({ object }),
      onStep: (pos: XY) => onStep(pos),
    });
    worldEl.current?.focus();
  }, [region.id]);

  useEffect(() => {
    getWorldView().updateMarkers(markers);
  }, [JSON.stringify(markers)]);

  const onStep = (pos: XY) => {
    const poi = region.overworld.objects.find(
      (o) => o.kind === 'poi' && o.at[0] === pos[0] && o.at[1] === pos[1],
    );
    update((x) => {
      x.location.at = pos;
      if (poi?.id) {
        const seen = (x.poisVisited[region.id] ??= []);
        if (!seen.includes(poi.id)) {
          seen.push(poi.id);
          toast('reward', `You found a secret corner! (${seen.length} of ${region.pois.length})`);
        }
      }
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
    const world = getWorldView();
    if (dir) {
      e.preventDefault();
      if (!world.moveHero(dir)) announce(`Can't go ${dir}.`);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e') {
      e.preventDefault();
      if (!world.interact()) announce('Nobody to talk to here.');
    } else if (e.key.toLowerCase() === 'q') {
      e.preventDefault();
      setLogOpen(!logOpen);
    } else if (e.key.toLowerCase() === 'l') {
      e.preventDefault();
      announce(describeAround());
    }
  };

  const describeAround = () => {
    const at = getWorldView().heroPosition;
    if (!at) return '';
    const near = region.overworld.objects
      .filter((o) => o.kind === 'npc' || o.kind === 'board' || o.kind === 'sign')
      .map((o) => ({ o, d: Math.abs(o.at[0] - at[0]) + Math.abs(o.at[1] - at[1]) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map(({ o, d }) => {
        const name =
          o.kind === 'npc'
            ? region.npcs[o.id ?? '']?.name
            : o.kind === 'board'
              ? 'the Quest Board'
              : 'a sign';
        const dx = o.at[0] - at[0];
        const dy = o.at[1] - at[1];
        const where = [
          dy < 0 ? `${-dy} up` : dy > 0 ? `${dy} down` : '',
          dx < 0 ? `${-dx} left` : dx > 0 ? `${dx} right` : '',
        ]
          .filter(Boolean)
          .join(' and ');
        return `${name} is ${d === 0 ? 'here' : where}`;
      });
    return `${region.name}. ${near.join('. ')}. Or press Q for the quest log.`;
  };

  const openQuest = (questId: string) => {
    setTalk(null);
    go({ name: 'quest', questId });
  };

  const regionQuests = c.questOrder.filter((q) => c.questInfo[q]?.region === region.id);
  const sideQuests = regionQuests.filter((q) => c.questInfo[q]?.sideQuest);

  return (
    <div class="screen overworld-screen">
      <a class="skip-link" href="#quest-log-button">
        Skip to the quest log
      </a>
      <Hud regionName={region.name} />
      <main id="main" class="overworld-main">
        <div
          class="world"
          ref={worldEl}
          tabIndex={0}
          role="application"
          aria-label={`${region.name} map. ${t.hud.worldHelp} L describes what is nearby. Q opens the quest log.`}
          aria-describedby="world-help"
          onKeyDown={onKeyDown}
        >
          <div class="world-canvas" ref={holder} />
        </div>
        <p id="world-help" class="world-help muted">
          ⌨️ {t.hud.worldHelp} <kbd>L</kbd> describes nearby things. <kbd>Q</kbd> opens the quest log.
        </p>
        <div class="dpad" aria-label="Move the hero">
          {(['up', 'left', 'right', 'down'] as Dir[]).map((d) => (
            <button
              key={d}
              type="button"
              class={`dpad-${d}`}
              aria-label={`Walk ${d}`}
              onClick={() => getWorldView().moveHero(d)}
            >
              {{ up: '▲', down: '▼', left: '◀', right: '▶' }[d]}
            </button>
          ))}
          <button
            type="button"
            class="dpad-talk"
            onClick={() => getWorldView().interact() ?? announce('Nobody to talk to here.')}
          >
            Talk
          </button>
        </div>

        <aside class={`quest-log card ${logOpen ? 'open' : ''}`} aria-labelledby="quest-log-h">
          <h2 id="quest-log-h">
            <button
              id="quest-log-button"
              type="button"
              class="ghost"
              aria-expanded={logOpen}
              onClick={() => setLogOpen(!logOpen)}
            >
              📖 {t.hud.questLog} ({counts.done}/{counts.total})
            </button>
          </h2>
          {logOpen && (
            <ul>
              {regionQuests.map((q) => {
                const state = questState(p, c, q);
                const info = c.questInfo[q]!;
                return (
                  <li key={q} class={`quest-row state-${state}`}>
                    <span class="status">{STATUS_TEXT[state]}</span>
                    <span class="quest-name">
                      {info.sideQuest && '⭐ '}
                      {info.title}
                      <span class="muted small-text"> · {info.type}</span>
                    </span>
                    <button
                      type="button"
                      class="small"
                      disabled={state === 'locked'}
                      onClick={() => openQuest(q)}
                    >
                      {state === 'completed' ? 'Replay' : 'Go'}
                    </button>
                  </li>
                );
              })}
              {bossDone && (
                <li class="quest-row">
                  <span class="status">🧩</span>
                  <span class="quest-name">Review riddles (knowledge check)</span>
                  <button
                    type="button"
                    class="small"
                    onClick={() => go({ name: 'check', regionId: region.id })}
                  >
                    Go
                  </button>
                </li>
              )}
            </ul>
          )}
        </aside>

        {talk && (
          <TalkPanel
            object={talk.object}
            sideQuests={sideQuests}
            onClose={() => {
              setTalk(null);
              worldEl.current?.focus();
            }}
            onOpenQuest={openQuest}
          />
        )}
      </main>
    </div>
  );

  function TalkPanel({
    object,
    onClose,
    onOpenQuest,
    sideQuests,
  }: {
    object: OverworldObject;
    onClose: () => void;
    onOpenQuest: (id: string) => void;
    sideQuests: string[];
  }) {
    const first = useRef<HTMLButtonElement>(null);
    useEffect(() => first.current?.focus(), []);
    const npc = object.kind === 'npc' ? region.npcs[object.id ?? ''] : null;
    const questId = object.quest;
    const state = questId ? questState(p, c, questId) : null;
    const title = npc
      ? npc.name
      : object.kind === 'board'
        ? 'Quest Board'
        : object.kind === 'exit'
          ? 'The road'
          : 'Sign';
    return (
      <section
        class="talk card"
        role="dialog"
        aria-modal="false"
        aria-labelledby="talk-h"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h2 id="talk-h">{title}</h2>
        {npc?.greeting && <p>{npc.greeting}</p>}
        {object.text && <p>{object.text}</p>}
        {questId && state && (
          <p>
            <strong>{c.questInfo[questId]!.title}</strong> — {STATUS_TEXT[state]}
            {state === 'locked' && <span class="muted"> (finish the earlier quests first)</span>}
          </p>
        )}
        {object.kind === 'board' && (
          <ul>
            {sideQuests.map((q) => {
              const s = questState(p, c, q);
              return (
                <li key={q} class="quest-row">
                  <span>⭐ {c.questInfo[q]!.title}</span> <span class="muted">{STATUS_TEXT[s]}</span>
                  <button
                    type="button"
                    class="small"
                    disabled={s === 'locked'}
                    onClick={() => onOpenQuest(q)}
                  >
                    Go
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div class="row">
          {questId && state && state !== 'locked' && (
            <button type="button" class="primary" ref={first} onClick={() => onOpenQuest(questId)}>
              {state === 'completed'
                ? 'Play again'
                : state === 'in_progress'
                  ? 'Continue quest'
                  : 'Start quest'}
            </button>
          )}
          <button type="button" ref={questId && state !== 'locked' ? undefined : first} onClick={onClose}>
            {questId ? 'Not now' : 'Close'}
          </button>
        </div>
        {region.fragment && bossDone && object.quest === region.boss && (
          <RichText rich={region.fragment.description} />
        )}
      </section>
    );
  }
}
