// The region map: walk, talk to NPCs, open quests (docs/specs.md §11.1).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { OverworldObject } from '../../content/types';
import { describeSurroundings, sceneLabel } from '../../game/describe';
import { getWorldView } from '../../game/worldView';
import { t } from '../../i18n/en';
import type { Dir, XY } from '../../runtime/protocol';
import { levelFor, titleFor, xpForLevel } from '../../state/profile';
import {
  boardQuests,
  missingFor,
  playableRegions,
  questState,
  regionCounts,
  regionMarkers,
  workshopUnlocked,
} from '../../state/progress';
import {
  announce,
  config,
  course,
  go,
  profile,
  regions,
  saveDialogOpen,
  toast,
  unsaved,
  update,
} from '../../state/store';
import { Portrait } from '../components/Common';
import { RichText } from '../components/RichText';
import { ReadAloud } from '../components/ReadAloud';
import { prefersReducedMotion, switchProfile } from '../flow';
import { online } from '../pwa';

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
      <p class="hud-region">
        {regionName}
        {!online.value && (
          <span class="pill offline-pill" title={t.offline.offlineHelp}>
            📴 {t.offline.offline}
            <span class="sr-only">. {t.offline.offlineHelp}</span>
          </span>
        )}
      </p>
      <nav class="hud-actions" aria-label={t.hud.menu}>
        <button
          type="button"
          class={unsaved.value ? 'unsaved' : ''}
          onClick={() => (saveDialogOpen.value = true)}
        >
          💾 {t.hud.save}
          {unsaved.value && <span class="badge">{t.hud.unsaved}</span>}
        </button>
        <button type="button" onClick={() => go({ name: 'spellbook' })}>
          📖 {t.hud.spellbook}
        </button>
        {workshopUnlocked(p, course.value!, config.value.features.workshop) && (
          <button type="button" onClick={() => go({ name: 'workshop' })}>
            🛠️ {t.hud.workshop}
          </button>
        )}
        <button type="button" onClick={() => go({ name: 'inventory' })}>
          🎒 {t.hud.inventory}
        </button>
        {playableRegions(course.value!).length > 1 && (
          <button type="button" onClick={() => go({ name: 'worldmap' })}>
            🗺️ {t.hud.worldMap}
          </button>
        )}
        <button type="button" onClick={() => go({ name: 'settings' })}>
          ⚙️ {t.hud.settings}
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
  const logOpener = useRef<HTMLElement | null>(null);
  const openLog = () => {
    logOpener.current = document.activeElement as HTMLElement | null;
    setLogOpen(true);
  };
  const closeLog = () => {
    setLogOpen(false);
    (logOpener.current ?? worldEl.current)?.focus();
  };
  useEffect(() => {
    if (logOpen) document.getElementById('quest-log-h')?.focus();
  }, [logOpen]);
  /** "Finish The Path to the Well first" for a locked quest (F-WLD-04). */
  const needsFirst = (questId: string) => {
    const missing = missingFor(p, c, questId);
    return missing.length ? t.hud.finishFirst(missing.map((pre) => c.questInfo[pre]?.title ?? pre)) : '';
  };
  // The map picture's name says where the hero is (F-WLD-06); it follows every step.
  const [scene, setScene] = useState(region.name);
  const markers = regionMarkers(p, c, region.id);
  const counts = regionCounts(p, c, region.id);
  const bossDone = p.quests[region.boss]?.status === 'completed';

  useEffect(() => {
    const world = getWorldView();
    world.setReducedMotion(prefersReducedMotion());
    world.mount(holder.current!);
    void world
      .showOverworld({
        region,
        markers,
        avatar: p.avatarId,
        theme: p.themeId,
        start: p.location.at ?? undefined,
        onInteract: (object) => setTalk({ object }),
        onStep: (pos: XY) => onStep(pos),
        onBlocked: (dir) => announce(`Can't go ${dir}.`),
      })
      .then(() => {
        const at = world.heroPosition;
        if (at) setScene(sceneLabel(region, at));
      });
    worldEl.current?.focus();
  }, [region.id]);

  useEffect(() => {
    getWorldView().updateMarkers(markers);
  }, [JSON.stringify(markers)]);

  const onStep = (pos: XY) => {
    setScene(sceneLabel(region, pos));
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
    // Letter shortcuts (WASD, E, Q, L) can be turned off in Settings; arrows and Enter stay.
    if (e.key.length === 1 && /[a-z]/i.test(e.key) && profile.value?.settings.shortcuts === false) return;
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
      if (logOpen) closeLog();
      else openLog();
    } else if (e.key.toLowerCase() === 'l') {
      e.preventDefault();
      announce(describeAround());
    }
  };

  const describeAround = () => {
    const at = getWorldView().heroPosition;
    return at ? describeSurroundings(region, at) : region.name;
  };

  const openQuest = (questId: string) => {
    setTalk(null);
    go({ name: 'quest', questId });
  };

  const regionQuests = c.questOrder.filter((q) => c.questInfo[q]?.region === region.id);
  const onBoard = boardQuests(c, region.id);

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
          <div class="world-canvas" ref={holder} role="img" aria-label={scene} />
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
        <button type="button" class="small describe-button" onClick={() => announce(describeAround())}>
          👂 {t.hud.describe}
        </button>

        <aside class={`quest-log card ${logOpen ? 'open' : ''}`} aria-label={t.hud.questLog}>
          <button
            id="quest-log-button"
            type="button"
            class="ghost"
            aria-expanded={logOpen}
            aria-controls="quest-log-panel"
            onClick={() => (logOpen ? closeLog() : openLog())}
          >
            📖 {t.hud.questLog} ({counts.done}/{counts.total})
          </button>
          {logOpen && (
            <div
              id="quest-log-panel"
              role="dialog"
              aria-modal="false"
              aria-labelledby="quest-log-h"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  closeLog();
                }
              }}
            >
              <h2 id="quest-log-h" tabIndex={-1}>
                {t.hud.questLog}
              </h2>
              <ul>
                {regionQuests.map((q) => {
                  const state = questState(p, c, q);
                  const info = c.questInfo[q]!;
                  return (
                    <li key={q} class={`quest-row state-${state}`}>
                      <span class="status">{STATUS_TEXT[state]}</span>
                      <span class="quest-name">
                        {info.sideQuest && '⭐ '}
                        <span class="quest-title">{info.title}</span>
                        <span class="muted small-text"> · {info.type}</span>
                        {state === 'locked' && <span class="needs small-text">{needsFirst(q)}</span>}
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
              <button type="button" class="small ghost" onClick={closeLog}>
                {t.hud.closeLog}
              </button>
            </div>
          )}
        </aside>

        {talk && (
          <TalkPanel
            object={talk.object}
            boardQuests={onBoard}
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
    boardQuests,
  }: {
    object: OverworldObject;
    onClose: () => void;
    onOpenQuest: (id: string) => void;
    boardQuests: string[];
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
        <div class="talk-head">
          {object.kind === 'npc' && object.id && <Portrait speaker={object.id} talking />}
          <h2 id="talk-h">{title}</h2>
        </div>
        {npc?.greeting && <p>{npc.greeting}</p>}
        {object.text && <p>{object.text}</p>}
        {object.kind === 'exit' && (
          <button type="button" onClick={() => go({ name: 'worldmap' })}>
            🗺️ {t.worldMap.open}
          </button>
        )}
        {(npc?.greeting || object.text) && (
          <ReadAloud
            rich={[npc?.greeting, object.text]
              .filter((x): x is string => Boolean(x))
              .map((v) => ({ t: 'p' as const, c: [{ t: 'text' as const, v }] }))}
          />
        )}
        {questId && state && (
          <p>
            <strong>{c.questInfo[questId]!.title}</strong> — {STATUS_TEXT[state]}
            {state === 'locked' && questId && <span class="muted"> ({needsFirst(questId)})</span>}
          </p>
        )}
        {object.kind === 'board' && boardQuests.length === 0 && <p>{t.hud.boardEmpty}</p>}
        {object.kind === 'board' && boardQuests.length > 0 && (
          <ul>
            {boardQuests.map((q) => {
              const s = questState(p, c, q);
              const info = c.questInfo[q]!;
              return (
                <li key={q} class="quest-row">
                  <span>
                    {info.sideQuest ? '⭐ ' : ''}
                    {info.title}
                  </span>{' '}
                  <span class="muted">{STATUS_TEXT[s]}</span>
                  {s === 'locked' && <span class="needs small-text"> {needsFirst(q)}</span>}
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
