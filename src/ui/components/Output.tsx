// The Scroll of Output and the Jar Shelf (docs/specs.md §6.6, §11.5a).
import { useEffect, useRef } from 'preact/hooks';
import { t } from '../../i18n/en';
import type { VarSnapshot } from '../../runtime/protocol';

export interface OutLine {
  kind: 'stdout' | 'stderr' | 'input';
  text: string;
  value?: string;
}

export function OutputScroll({ lines, empty = t.quest.outputEmpty }: { lines: OutLine[]; empty?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines.length]);
  return (
    <section class="output" aria-labelledby="output-h">
      <h2 id="output-h" class="panel-title">
        📜 {t.quest.output}
      </h2>
      <div class="output-body" ref={ref} role="log" aria-live="polite" tabIndex={0}>
        {lines.length === 0 ? (
          <p class="muted">{empty}</p>
        ) : (
          <pre>
            {lines.map((l, i) =>
              l.kind === 'input' ? (
                <span key={i} class="out-input">
                  {l.text}
                  <mark>{l.value}</mark>
                  {'\n'}
                </span>
              ) : (
                <span key={i} class={l.kind === 'stderr' ? 'out-err' : undefined}>
                  {l.text}
                </span>
              ),
            )}
          </pre>
        )}
      </div>
    </section>
  );
}

export function JarShelf({ vars }: { vars: VarSnapshot[] }) {
  return (
    <details class="jar-shelf">
      <summary>🫙 {t.quest.jarShelf}</summary>
      {vars.length === 0 ? (
        <p class="muted">{t.quest.jarsEmpty}</p>
      ) : (
        <table>
          <caption class="sr-only">Variables after your program finished</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Value</th>
              <th scope="col">Kind</th>
            </tr>
          </thead>
          <tbody>
            {vars.map((v) => (
              <tr key={v.name}>
                <th scope="row">
                  <code>{v.name}</code>
                </th>
                <td>
                  <code>{v.repr}</code>
                </td>
                <td>{KIND[v.type] ?? v.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}

const KIND: Record<string, string> = {
  int: 'whole number',
  float: 'decimal number',
  str: 'text (string)',
  bool: 'True/False',
  list: 'list',
  dict: 'dictionary',
  function: 'function',
  NoneType: 'nothing (None)',
};
