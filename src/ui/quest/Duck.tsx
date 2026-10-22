// Talk to the Duck (docs/specs.md §9.8a): the duck asks "What should this line do?" about each
// line of the student's own program, one at a time. Answers are not graded and stay on this
// computer. Finishing the talk counts toward the Duck Whisperer badge (once per quest).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { QuestBody } from '../../content/types';
import { t } from '../../i18n/en';
import type { DuckTalk } from '../../state/storage';
import { announce, getStorage, profile, update } from '../../state/store';
import { RichText } from '../components/RichText';

/** The lines worth explaining: not blank, and not only a comment. */
export function duckLines(code: string): { line: number; text: string }[] {
  return code
    .split('\n')
    .map((text, i) => ({ line: i + 1, text }))
    .filter(({ text }) => text.trim() !== '' && !text.trim().startsWith('#'));
}

export function DuckPanel({
  duck,
  code,
  unitKey,
  onLine,
}: {
  duck: NonNullable<QuestBody['duck']>;
  code: string;
  unitKey: string;
  /** The line the duck is asking about, to highlight it in the editor (null when closed). */
  onLine(line: number | null): void;
}) {
  const p = profile.value!;
  const [talk, setTalk] = useState<DuckTalk>({ answers: [], finished: false });
  const [step, setStep] = useState<number | null>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lines = duckLines(code);
  const done = step !== null && step >= lines.length;

  useEffect(() => {
    void getStorage().duck(p.id, unitKey).then(setTalk);
  }, [unitKey]);

  useEffect(() => {
    onLine(step !== null && !done ? (lines[step]?.line ?? null) : null);
    if (step !== null && !done) answerRef.current?.focus();
    else if (done) headingRef.current?.focus();
  }, [step, done]);
  useEffect(() => () => onLine(null), []);

  const save = (next: DuckTalk) => {
    setTalk(next);
    void getStorage().saveDuck(p.id, unitKey, next);
  };

  const setAnswer = (value: string) => {
    const answers = [...talk.answers];
    answers[step!] = value;
    setTalk({ ...talk, answers });
  };

  const go = (to: number) => {
    if (to >= lines.length) {
      // The first finished talk in a quest counts toward Duck Whisperer.
      if (!talk.finished) update((x) => void x.counters.duckChats++);
      save({ ...talk, finished: true });
      announce(`${t.duck.listened}`);
    } else save(talk);
    setStep(to);
  };

  if (step === null)
    return (
      <section class="duck-panel" aria-labelledby="duck-h">
        <h2 id="duck-h" class="panel-title">
          🦆 {t.duck.heading}
        </h2>
        <p class="muted small-text">{duck.intro ? <RichText rich={duck.intro} inline /> : t.duck.intro}</p>
        <button type="button" class="small" onClick={() => setStep(0)} disabled={lines.length === 0}>
          🦆 {t.duck.open}
        </button>
        {lines.length === 0 && <p class="muted small-text">{t.duck.noLines}</p>}
      </section>
    );

  if (done)
    return (
      <section class="duck-panel open" aria-labelledby="duck-h">
        <h2 id="duck-h" class="panel-title" ref={headingRef} tabIndex={-1}>
          🦆 {t.duck.listened}
        </h2>
        <div class="duck-closing">
          <RichText rich={duck.closing} />
        </div>
        <h3 class="small-heading">{t.duck.yourNotes}</h3>
        <ol class="duck-notes">
          {lines.map((l, i) => (
            <li key={l.line}>
              <code>{l.text.trim()}</code>
              <span class="duck-note"> — {talk.answers[i]?.trim() || '…'}</span>
            </li>
          ))}
        </ol>
        <div class="row">
          <button type="button" class="small" onClick={() => setStep(0)}>
            ↺ {t.duck.again}
          </button>
          <button type="button" class="small ghost" onClick={() => setStep(null)}>
            {t.duck.close}
          </button>
        </div>
      </section>
    );

  const current = lines[step]!;
  const answer = talk.answers[step] ?? '';
  return (
    <section class="duck-panel open" aria-labelledby="duck-h">
      <h2 id="duck-h" class="panel-title">
        🦆 {t.duck.heading}
      </h2>
      <p class="muted small-text">{t.duck.lineOf(current.line, step + 1, lines.length)}</p>
      <pre class="duck-line">
        <code>{current.text}</code>
      </pre>
      <label for="duck-answer">{t.duck.question}</label>
      <textarea
        id="duck-answer"
        ref={answerRef}
        rows={2}
        maxLength={300}
        value={answer}
        onInput={(e) => setAnswer((e.target as HTMLTextAreaElement).value)}
      />
      <p class="muted small-text">{t.duck.private}</p>
      <div class="row">
        <button type="button" class="small ghost" disabled={step === 0} onClick={() => go(step - 1)}>
          ◀ {t.duck.back}
        </button>
        <button type="button" class="small" disabled={!answer.trim()} onClick={() => go(step + 1)}>
          {step === lines.length - 1 ? `${t.duck.finish} ✓` : `${t.duck.next} ▶`}
        </button>
        <button type="button" class="small ghost" onClick={() => setStep(null)}>
          {t.duck.close}
        </button>
      </div>
    </section>
  );
}
