// The Workshop (docs/specs.md §11.7): free coding on sandbox maps, with the full API, typed
// input (Mode B) and the larger loop budget. No checks. Programs can be saved (up to 20) and
// downloaded as .py files (F-WSH-01–04).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { narrate } from '../../game/narration';
import { ReplayEngine, type ReplayState, type Speed } from '../../game/replay';
import { getWorldView } from '../../game/worldView';
import { t } from '../../i18n/en';
import type { RunRequest, RunResult } from '../../runtime/protocol';
import { regionUnlocked, workshopUnlocked } from '../../state/progress';
import { today } from '../../state/profile';
import type { Program } from '../../state/storage';
import { MAX_PROGRAMS } from '../../state/storage';
import {
  announce,
  config,
  course,
  getRunner,
  getStorage,
  go,
  profile,
  regions,
  update,
} from '../../state/store';
import { LoadingPanel } from '../components/Common';
import { CodeSize, Editor } from '../components/Editor';
import { InputDialog } from '../components/InputDialog';
import { JarShelf, OutputScroll, type OutLine } from '../components/Output';
import { RichText } from '../components/RichText';
import { playEffect } from '../audio';
import { prefersReducedMotion } from '../flow';
import { ErrorExplanation, errorTemplate } from '../quest/Feedback';
import { ReplayControls } from '../quest/ReplayControls';
import { runWithInput } from '../runWithInput';
import { Hud } from './Overworld';

export const STARTER = `from codeweald import hero, world

hero.say("Hello, Workshop!")
hero.move("right", 3)
`;

/** A safe file name for a download: letters, digits and dashes. */
export function fileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug || 'my-program'}.py`;
}

/** Downloads text as a file, with no network involved. */
export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/x-python' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function WorkshopScreen() {
  const p = profile.value!;
  const c = course.value!;
  const maps = c.workshop.maps;
  const runner = getRunner();
  const [mapId, setMapId] = useState(maps[0]!.id);
  const map = maps.find((m) => m.id === mapId) ?? maps[0]!;
  const [code, setCode] = useState(STARTER);
  const [current, setCurrent] = useState<{ id: string | null; name: string }>({ id: null, name: '' });
  const [programs, setPrograms] = useState<Program[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [out, setOut] = useState<OutLine[]>([]);
  const [replayState, setReplayState] = useState<ReplayState>('idle');
  const [replayPos, setReplayPos] = useState(0);
  const [replayLine, setReplayLine] = useState<number | null>(null);
  const [speed, setSpeed] = useState<Speed>(p.settings.replaySpeed);
  const [inputRequest, setInputRequest] = useState<{
    prompt: string;
    output: string;
    resolve(value: string | null): void;
  } | null>(null);
  const stageHolder = useRef<HTMLDivElement>(null);
  const unlocked = workshopUnlocked(p, c, config.value.features.workshop);

  const engine = useMemo(
    () =>
      new ReplayEngine(getWorldView(), {
        onState: setReplayState,
        onAction: (i, action) => {
          setReplayPos(i + 1);
          if (action.t === 'bonk') playEffect('bonk');
          else if (action.t === 'pickup' && action.item) playEffect('pickup');
        },
        onLine: setReplayLine,
        onOutput: (a) =>
          setOut((lines) => [
            ...lines,
            a.t === 'out'
              ? { kind: a.stream, text: a.text }
              : { kind: 'input', text: a.prompt, value: a.value },
          ]),
        onReset: () => {
          setOut([]);
          setReplayPos(0);
        },
        onNarrate: (actions) => {
          const sentences = narrate(actions);
          if (sentences.length) announce(sentences.join(' '));
        },
      }),
    [],
  );

  useEffect(() => document.getElementById('screen-title')?.focus(), []);
  // The last code and map, and the saved programs.
  useEffect(() => {
    if (!unlocked) return;
    const storage = getStorage();
    void storage.draft(p.id, 'workshop').then((draft) => draft !== undefined && setCode(draft));
    void storage
      .draft(p.id, 'workshop-map')
      .then((id) => id && maps.some((m) => m.id === id) && setMapId(id));
    void storage.programs(p.id).then(setPrograms);
    return () => engine.cancel();
  }, []);
  useEffect(() => {
    if (!unlocked) return;
    const timer = setTimeout(() => void getStorage().saveDraft(p.id, 'workshop', code), 800);
    return () => clearTimeout(timer);
  }, [code]);
  // Show the chosen map.
  useEffect(() => {
    if (!unlocked || !stageHolder.current) return;
    const world = getWorldView();
    world.setReducedMotion(prefersReducedMotion());
    world.mount(stageHolder.current);
    void world.showStage(map.stage, { avatar: p.avatarId, theme: p.themeId });
    void getStorage().saveDraft(p.id, 'workshop-map', map.id);
    setResult(null);
    setOut([]);
  }, [mapId]);

  if (!unlocked) {
    return (
      <div class="screen workshop-screen">
        <Hud regionName={regions.value[p.location.region]?.name ?? ''} />
        <main id="main">
          <h1 id="screen-title" tabIndex={-1}>
            🛠️ {t.workshop.heading}
          </h1>
          <p>{t.workshop.locked}</p>
          <button type="button" class="primary" onClick={() => go({ name: 'overworld' })}>
            ◀ {t.quest.back}
          </button>
        </main>
      </div>
    );
  }

  // The API calls from regions the student has reached; the rest are "more".
  const reached = Math.max(1, ...c.regions.filter((r) => regionUnlocked(p, c, r.id)).map((r) => r.number));
  const known = c.workshop.api.filter((a) => a.region <= reached);
  const more = c.workshop.api.filter((a) => a.region > reached);

  const ask = (prompt: string, output: string) =>
    new Promise<string | null>((resolve) => setInputRequest({ prompt, output, resolve }));

  const run = async () => {
    if (running) return;
    announce(t.quest.runningAnnounce);
    setRunning(true);
    setResult(null);
    setNote(null);
    const exec = config.value.execution;
    const request: RunRequest = {
      mode: 'workshop',
      code,
      stage: map.stage,
      inputs: [],
      interactiveInput: true,
      // A new seed for every Run (§6.7); answering input() questions keeps it.
      seed: Math.floor(Math.random() * 2 ** 31),
      validators: [],
      mistakes: [],
      bonus: [],
      limits: {
        loopBudget: exec.workshopLoopBudget,
        maxActions: exec.maxActions,
        maxOutputChars: exec.maxOutputChars,
      },
    };
    runner.setTimeoutMs(exec.timeoutSeconds * 1000);
    const outcome = await runWithInput((r) => runner.run(r), request, ask);
    setRunning(false);
    if ('stopped' in outcome) {
      setNote(outcome.stopped === 'cancelled' ? t.quest.inputStopped : t.quest.inputTooMany);
      return;
    }
    const res = outcome.result;
    update((x) => void x.counters.workshopRuns++);
    setResult(res);
    engine.setSpeed(speed);
    engine.load(res.actions);
    if (speed === 'instant' || res.actions.length === 0) await engine.skipToEnd();
    else void engine.play();
    if (res.error) announce(t.quest.errorOnLine(res.error.line, errorTemplate(res.error).title));
  };

  const save = async (asNew: boolean) => {
    const name = current.name.trim() || t.workshop.untitled;
    const id = !asNew && current.id ? current.id : crypto.randomUUID();
    const existing = programs.some((x) => x.id === id);
    if (!existing && programs.length >= MAX_PROGRAMS) {
      announce(t.workshop.full(MAX_PROGRAMS));
      setNote(t.workshop.full(MAX_PROGRAMS));
      return;
    }
    const program: Program = { id, name, code, mapId: map.id, savedOn: today() };
    const next = [program, ...programs.filter((x) => x.id !== id)];
    await getStorage().savePrograms(p.id, next);
    setPrograms(next);
    setCurrent({ id, name });
    announce(t.workshop.saved(name));
  };

  const open = (program: Program) => {
    setCode(program.code);
    setCurrent({ id: program.id, name: program.name });
    if (maps.some((m) => m.id === program.mapId)) setMapId(program.mapId);
    announce(t.workshop.opened(program.name));
    requestAnimationFrame(() => document.getElementById('code-editor')?.focus());
  };

  const remove = async (program: Program) => {
    if (!confirm(t.workshop.deleteConfirm(program.name))) return;
    const next = programs.filter((x) => x.id !== program.id);
    await getStorage().savePrograms(p.id, next);
    setPrograms(next);
    if (current.id === program.id) setCurrent({ id: null, name: current.name });
    announce(t.workshop.deleted(program.name));
  };

  const ready = runner.status.value === 'ready' || runner.status.value === 'running';
  const editorError =
    result?.error && replayState === 'done'
      ? {
          line: result.error.line,
          col: result.error.col,
          endCol: result.error.endCol,
          message: errorTemplate(result.error).title,
        }
      : null;

  return (
    <div class="screen workshop-screen quest-screen">
      <Hud regionName={regions.value[p.location.region]?.name ?? ''} />
      <div class="quest-header">
        <button type="button" class="ghost" onClick={() => go({ name: 'overworld' })}>
          ◀ {t.quest.back}
        </button>
        <h1 id="screen-title" tabIndex={-1}>
          🛠️ {t.workshop.heading}
        </h1>
      </div>
      <main id="main" class="quest-grid">
        <section class="quest-story card" aria-label={t.workshop.tools}>
          <label class="field">
            {t.workshop.map}{' '}
            <select value={mapId} onChange={(e) => setMapId((e.target as HTMLSelectElement).value)}>
              {maps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <RichText rich={map.description} />

          <section aria-labelledby="programs-h">
            <h2 id="programs-h" class="panel-title">
              💾 {t.workshop.programs}{' '}
              <span class="muted small-text">
                ({programs.length}/{MAX_PROGRAMS})
              </span>
            </h2>
            <label class="field">
              {t.workshop.name}{' '}
              <input
                type="text"
                maxLength={40}
                value={current.name}
                onInput={(e) => setCurrent({ ...current, name: (e.target as HTMLInputElement).value })}
              />
            </label>
            <div class="row">
              <button type="button" class="small" onClick={() => void save(false)}>
                💾 {t.workshop.save}
              </button>
              {current.id && (
                <button type="button" class="small" onClick={() => void save(true)}>
                  {t.workshop.saveAsNew}
                </button>
              )}
              <button type="button" class="small" onClick={() => download(fileName(current.name), code)}>
                ⬇ {t.workshop.download}
              </button>
              <button
                type="button"
                class="small ghost"
                onClick={() => {
                  setCode(STARTER);
                  setCurrent({ id: null, name: '' });
                }}
              >
                ＋ {t.workshop.newProgram}
              </button>
            </div>
            {programs.length === 0 ? (
              <p class="muted small-text">{t.workshop.noPrograms}</p>
            ) : (
              <ul class="program-list">
                {programs.map((program) => (
                  <li key={program.id} class={program.id === current.id ? 'current' : ''}>
                    <span>
                      <strong>{program.name}</strong>{' '}
                      <span class="muted small-text">
                        {maps.find((m) => m.id === program.mapId)?.name ?? ''} · {program.savedOn}
                      </span>
                    </span>
                    <span class="row">
                      <button type="button" class="small" onClick={() => open(program)}>
                        {t.workshop.open}
                        <span class="sr-only"> {program.name}</span>
                      </button>
                      <button
                        type="button"
                        class="small"
                        onClick={() => download(fileName(program.name), program.code)}
                      >
                        ⬇ .py<span class="sr-only"> {program.name}</span>
                      </button>
                      <button type="button" class="small ghost" onClick={() => void remove(program)}>
                        {t.workshop.delete}
                        <span class="sr-only"> {program.name}</span>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="api-h" class="api-ref">
            <h2 id="api-h" class="panel-title">
              📜 {t.workshop.api}
            </h2>
            <ApiList entries={known} />
            {more.length > 0 && (
              <details>
                <summary>{t.workshop.moreSpells(more.length)}</summary>
                <ApiList entries={more} />
              </details>
            )}
          </section>
        </section>

        <section class="quest-work card" aria-label={t.workshop.code}>
          <div class="editor-wrap">
            <Editor
              value={code}
              onChange={setCode}
              onRun={() => void run()}
              id="code-editor"
              fontSize={p.settings.editorFontSize}
              replayLine={replayLine}
              error={editorError}
            />
            <div class="editor-tools">
              <p id="editor-help" class="muted small-text">
                ⌨️ {t.quest.editorHelp}
              </p>
              <CodeSize
                size={p.settings.editorFontSize}
                onChange={(n) => update((x) => void (x.settings.editorFontSize = n))}
              />
            </div>
          </div>
          <div class="run-bar">
            <button
              type="button"
              class="primary run"
              disabled={running || !ready}
              onClick={() => void run()}
              aria-keyshortcuts="Control+Enter"
            >
              {running ? t.quest.running : `▶ ${t.quest.run}`}
            </button>
          </div>
          {!ready && <LoadingPanel runner={runner} />}
          {note && (
            <p class="banner info" role="status">
              {note}
            </p>
          )}
          {result?.error && replayState === 'done' && (
            <section class="feedback not-yet" aria-label={t.workshop.problem}>
              <ErrorExplanation error={result.error} />
            </section>
          )}
        </section>

        <section class="quest-stage card" aria-label={t.workshop.stage}>
          <h2 class="panel-title">🗺️ {map.name}</h2>
          <div
            class="stage-holder"
            ref={stageHolder}
            role="img"
            aria-label={`${map.name}. Use “${t.hud.describe}” to hear what is around the hero.`}
          />
          <div class="row">
            <ReplayControls
              state={replayState}
              speed={speed}
              position={replayPos}
              length={engine.length}
              onPlay={() => void engine.play()}
              onPause={() => engine.pause()}
              onStep={() => void engine.step()}
              onRestart={() => void engine.restart()}
              onSkip={() => void engine.skipToEnd()}
              onSpeed={(s) => {
                setSpeed(s);
                engine.setSpeed(s);
                update((x) => void (x.settings.replaySpeed = s));
              }}
            />
            <button
              type="button"
              class="small ghost"
              onClick={() => announce(getWorldView().describeStage())}
            >
              👂 {t.hud.describe}
            </button>
          </div>
          <OutputScroll
            lines={out}
            onShowAll={
              replayState === 'playing' || replayState === 'paused'
                ? () => void engine.skipToEnd()
                : undefined
            }
          />
          {result && <JarShelf vars={result.vars} />}
        </section>
      </main>
      {inputRequest && (
        <InputDialog
          prompt={inputRequest.prompt}
          output={inputRequest.output}
          onAnswer={(value) => {
            inputRequest.resolve(value);
            setInputRequest(null);
          }}
          onCancel={() => {
            inputRequest.resolve(null);
            setInputRequest(null);
          }}
        />
      )}
    </div>
  );
}

function ApiList({
  entries,
}: {
  entries: { call: string; summary: import('../../content/richtext').Rich; example: string }[];
}) {
  return (
    <dl class="api-list">
      {entries.map((a) => (
        <div key={a.call}>
          <dt>
            <code>{a.call}</code>
          </dt>
          <dd>
            <RichText rich={a.summary} />
            <pre class="code-block">
              <code>{a.example}</code>
            </pre>
          </dd>
        </div>
      ))}
    </dl>
  );
}
