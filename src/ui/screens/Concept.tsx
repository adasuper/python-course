import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../../i18n/en';
import { getRunner, go, regions, update, type Route } from '../../state/store';
import { Portrait } from '../components/Common';
import { Editor } from '../components/Editor';
import { OutputScroll, type OutLine } from '../components/Output';
import { RichText } from '../components/RichText';
import { speakerName } from './Story';

export function ConceptScreen({ route }: { route: Extract<Route, { name: 'concept' }> }) {
  const region = regions.value[route.regionId]!;
  const scene = region.conceptScene;
  const [out, setOut] = useState<OutLine[]>([]);
  const [ran, setRan] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  const finish = () => {
    update((p) => {
      if (!p.seen.conceptScenes.includes(region.id)) p.seen.conceptScenes.push(region.id);
    });
    go(route.next);
  };
  const run = async () => {
    const result = await getRunner().run({
      mode: 'example',
      code: scene.workedExample.code,
      stage: scene.workedExample.stage,
      inputs: [],
      interactiveInput: false,
      seed: 0,
      validators: [],
      mistakes: [],
      bonus: [],
    });
    setOut(
      result.actions.flatMap((a) => (a.t === 'out' ? [{ kind: a.stream, text: a.text } as OutLine] : [])),
    );
    setRan(true);
  };

  return (
    <main id="main" class="screen concept-screen" tabIndex={-1}>
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
            <Editor value={scene.workedExample.code} readOnly label="Worked example code (read only)" />
          </div>
          <ul class="explain">
            {scene.workedExample.explain.map((e) => (
              <li key={e.line}>
                <span class="line-tag">{t.quest.lineLabel(e.line)}</span> <RichText rich={e.text} inline />
              </li>
            ))}
          </ul>
          <button type="button" onClick={run}>
            ▶ Run the example
          </button>
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
