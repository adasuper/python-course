import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { narrate } from '../../game/narration';
import { ReplayEngine, type ReplayState, type ReplayView, type Speed } from '../../game/replay';
import { getWorldView } from '../../game/worldView';
import { t } from '../../i18n/en';
import { announce, getRunner, go, profile, regions, update, type Route } from '../../state/store';
import { LoadingPanel, Portrait } from '../components/Common';
import { Editor } from '../components/Editor';
import { OutputScroll, type OutLine } from '../components/Output';
import { RichText } from '../components/RichText';
import { prefersReducedMotion } from '../flow';
import { ReplayControls } from '../quest/ReplayControls';
import { speakerName } from './Story';

const NOOP_VIEW: ReplayView = { apply: async () => {}, reset: () => {} };

export function ConceptScreen({ route }: { route: Extract<Route, { name: 'concept' }> }) {
  const region = regions.value[route.regionId]!;
  const scene = region.conceptScene;
  const example = scene.workedExample;
  const hasStage = example.stage.kind !== 'none';
  const p = profile.value!;
  const runner = getRunner();
  const [out, setOut] = useState<OutLine[]>([]);
  const [ran, setRan] = useState(false);
  const [line, setLine] = useState<number | null>(null);
  const [state, setState] = useState<ReplayState>('idle');
  const [pos, setPos] = useState(0);
  const [speed, setSpeed] = useState<Speed>(
    p.settings.replaySpeed === 'instant' ? 1 : p.settings.replaySpeed,
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const stageHolder = useRef<HTMLDivElement>(null);
  useEffect(() => heading.current?.focus(), []);

  // The worked example replays like a quest: line by line, with Step (F-DLG-05).
  const engine = useMemo(
    () =>
      new ReplayEngine(hasStage ? getWorldView() : NOOP_VIEW, {
        onState: setState,
        onAction: (i) => setPos(i + 1),
        onLine: setLine,
        onOutput: (a) =>
          setOut((lines) => [
            ...lines,
            a.t === 'out'
              ? { kind: a.stream, text: a.text }
              : { kind: 'input', text: a.prompt, value: a.value },
          ]),
        onReset: () => {
          setOut([]);
          setPos(0);
        },
        onNarrate: (actions) => {
          const sentences = narrate(actions);
          if (sentences.length) announce(sentences.join(' '));
        },
      }),
    [hasStage],
  );
  useEffect(() => {
    if (!hasStage) return;
    const world = getWorldView();
    world.setReducedMotion(prefersReducedMotion());
    world.mount(stageHolder.current!);
    void world.showStage(example.stage, { avatar: p.avatarId, theme: p.themeId });
    return () => engine.cancel();
  }, [region.id]);

  const finish = () => {
    engine.cancel();
    update((x) => {
      if (!x.seen.conceptScenes.includes(region.id)) x.seen.conceptScenes.push(region.id);
    });
    go(route.next);
  };
  const run = async () => {
    const result = await runner.run({
      mode: 'example',
      code: example.code,
      stage: example.stage,
      inputs: [],
      interactiveInput: false,
      seed: 0,
      validators: [],
      mistakes: [],
      bonus: [],
    });
    setRan(true);
    engine.setSpeed(speed);
    engine.load(result.actions);
    void engine.play();
  };
  const ready = runner.status.value === 'ready' || runner.status.value === 'running';

  return (
    <main
      id="main"
      class="screen concept-screen"
      tabIndex={-1}
      onKeyDown={(e) => {
        // Esc skips the scene, except inside the editor, where Esc then Tab leaves it.
        if (e.key === 'Escape' && !(e.target as HTMLElement).closest('.cm-editor')) finish();
      }}
    >
      <p class="eyebrow">{region.name} · Byte's lesson</p>
      <h1 ref={heading} tabIndex={-1}>
        {scene.title}
      </h1>
      <div class="concept-grid">
        <section class="card" aria-label="Byte explains">
          <div class="analogy">
            <Portrait speaker="byte" />
            <div>
              <RichText rich={scene.analogy} />
            </div>
          </div>
          <ol class="chat">
            {scene.lines.map((l, i) => (
              <li key={i}>
                <strong>{speakerName(l.speaker) ?? ''}:</strong> <RichText rich={l.text} inline />
              </li>
            ))}
          </ol>
        </section>
        <section class="card" aria-labelledby="example-h">
          <h2 id="example-h">Worked example</h2>
          <div class="example-editor">
            <Editor value={example.code} readOnly replayLine={line} label="Worked example code (read only)" />
          </div>
          <ul class="explain">
            {example.explain.map((e) => (
              <li key={e.line} class={e.line === line ? 'current' : undefined}>
                <span class="line-tag">{t.quest.lineLabel(e.line)}</span> <RichText rich={e.text} inline />
              </li>
            ))}
          </ul>
          {hasStage && (
            <div
              class="stage-holder mini"
              ref={stageHolder}
              role="img"
              aria-label="The worked example's map"
            />
          )}
          <div class="row">
            <button type="button" onClick={() => void run()} disabled={!ready}>
              ▶ Run the example
            </button>
            {ran && (
              <ReplayControls
                state={state}
                speed={speed}
                position={pos}
                length={engine.length}
                onPlay={() => void engine.play()}
                onPause={() => engine.pause()}
                onStep={() => void engine.step()}
                onRestart={() => void engine.restart()}
                onSkip={() => void engine.skipToEnd()}
                onSpeed={(s) => {
                  setSpeed(s);
                  engine.setSpeed(s);
                }}
              />
            )}
          </div>
          {!ready && <LoadingPanel runner={runner} />}
          {ran && <OutputScroll lines={out} />}
        </section>
      </div>
      <div class="row">
        <button type="button" class="primary" onClick={finish}>
          Let's go! ▸
        </button>
        <button type="button" class="ghost" onClick={finish}>
          {t.dialogue.skip}
        </button>
      </div>
    </main>
  );
}
