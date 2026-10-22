// Predict quests: read code, lock in a prediction, then run it to check (§9.2).
import { useState } from 'preact/hooks';
import type { InvestigateQuestion, PredictPrompt, PredictTwin } from '../../content/types';
import { predictionCorrect, twinCorrect } from './answers';
import { t } from '../../i18n/en';
import { RichText } from '../components/RichText';

/** Side by side: what the student predicted and what really happened. */
function Compare({ yours, real, realLabel }: { yours: string; real: string; realLabel: string }) {
  return (
    <div class="compare">
      <div>
        <p class="small-text">{t.predict.yourAnswer}</p>
        <pre>{yours}</pre>
      </div>
      <div>
        <p class="small-text">{realLabel}</p>
        <pre>{real}</pre>
      </div>
    </div>
  );
}

export function PredictPanel({
  prompts,
  answers,
  locked,
  revealed,
  output,
  onAnswer,
}: {
  prompts: PredictPrompt[];
  answers: (string | number | undefined)[];
  locked: boolean;
  revealed: boolean;
  output: string;
  onAnswer(i: number, value: string | number): void;
}) {
  return (
    <section class="predict" aria-label="Your predictions">
      {prompts.map((p, i) => {
        const correct = revealed && predictionCorrect(p, answers[i], output);
        return (
          <div key={i} class="prompt-wrap">
            <fieldset class="prompt" disabled={locked}>
              <legend>
                <RichText rich={p.question} inline />
              </legend>
              {p.kind === 'mcq' ? (
                <div class="options">
                  {p.options.map((opt, j) => (
                    <label key={j} class="option">
                      <input
                        type="radio"
                        name={`prompt-${i}`}
                        checked={answers[i] === j}
                        onChange={() => onAnswer(i, j)}
                      />
                      <code class="option-code">{opt}</code>
                      {revealed && j === p.answer && <span class="tag-ok"> ✓ correct</span>}
                    </label>
                  ))}
                </div>
              ) : (
                <>
                  <label class="sr-only" for={`prompt-${i}-text`}>
                    {t.predict.yourAnswer}
                  </label>
                  <textarea
                    id={`prompt-${i}-text`}
                    rows={3}
                    class="code-input"
                    value={String(answers[i] ?? '')}
                    onInput={(e) => onAnswer(i, (e.target as HTMLTextAreaElement).value)}
                  />
                </>
              )}
              {revealed && (
                <div class={`verdict ${correct ? 'ok' : 'different'}`} role="status">
                  <strong>{correct ? `✓ ${t.predict.correct}` : `◐ ${t.predict.different}`}</strong>
                  {p.kind === 'text' && !correct && (
                    <Compare
                      yours={String(answers[i] ?? '')}
                      real={output}
                      realLabel={t.predict.realAnswer}
                    />
                  )}
                  {p.kind === 'mcq' && !correct && (
                    <Compare
                      yours={p.options[Number(answers[i])] ?? ''}
                      real={p.options[p.answer] ?? ''}
                      realLabel={t.predict.rightAnswer}
                    />
                  )}
                  <RichText rich={p.explain} />
                </div>
              )}
            </fieldset>
            {revealed && !correct && p.twin && <TwinChallenge twin={p.twin} index={i} />}
          </div>
        );
      })}
    </section>
  );
}

/** A second, similar program to predict after a wrong prediction (F-QST-05). It sits
 *  outside the locked prompt, so its controls stay usable. */
function TwinChallenge({ twin, index }: { twin: PredictTwin; index: number }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<string | number | undefined>(undefined);
  const [checked, setChecked] = useState(false);
  const id = `twin-${index}`;
  if (!open)
    return (
      <button
        type="button"
        class="small"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => document.getElementById(`${id}-h`)?.focus());
        }}
      >
        🔁 {t.predict.tryTwin}
      </button>
    );
  const correct = checked && twinCorrect(twin, answer);
  const real = twin.kind === 'mcq' ? (twin.options[twin.answer] ?? '') : twin.answer;
  const yours = twin.kind === 'mcq' ? (twin.options[Number(answer)] ?? '') : String(answer ?? '');
  return (
    <section class="twin card" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} tabIndex={-1}>
        🔁 {t.predict.twinHeading}
      </h3>
      <pre class="code-block" aria-label={t.predict.twinCode}>
        <code>{twin.code}</code>
      </pre>
      <fieldset class="prompt" disabled={checked}>
        <legend>
          <RichText rich={twin.question} inline />
        </legend>
        {twin.kind === 'mcq' ? (
          <div class="options">
            {twin.options.map((opt, j) => (
              <label key={j} class="option">
                <input type="radio" name={id} checked={answer === j} onChange={() => setAnswer(j)} />
                <code class="option-code">{opt}</code>
              </label>
            ))}
          </div>
        ) : (
          <>
            <label class="sr-only" for={`${id}-text`}>
              {t.predict.yourAnswer}
            </label>
            <textarea
              id={`${id}-text`}
              rows={3}
              class="code-input"
              value={String(answer ?? '')}
              onInput={(e) => setAnswer((e.target as HTMLTextAreaElement).value)}
            />
          </>
        )}
      </fieldset>
      {!checked ? (
        <button
          type="button"
          class="primary small"
          disabled={answer === undefined || answer === ''}
          onClick={() => setChecked(true)}
        >
          {t.predict.twinCheck}
        </button>
      ) : (
        <div class={`verdict ${correct ? 'ok' : 'different'}`} role="status">
          <strong>{correct ? `✓ ${t.predict.correct}` : `◐ ${t.predict.different}`}</strong>
          {!correct && <Compare yours={yours} real={real} realLabel={t.predict.realAnswer} />}
          <RichText rich={twin.explain} />
        </div>
      )}
    </section>
  );
}

export type QuestionState = { value: string; status: 'unanswered' | 'right' | 'wrong' };

export function InvestigatePanel({
  questions,
  states,
  enabled,
  onChange,
  onCheck,
}: {
  questions: InvestigateQuestion[];
  states: QuestionState[];
  enabled: boolean;
  onChange(i: number, value: string): void;
  onCheck(i: number): void;
}) {
  return (
    <section class="investigate" aria-label="Questions about the code">
      {!enabled && <p class="banner info">▶ {t.investigate.runFirst}</p>}
      {questions.map((q, i) => {
        const s = states[i] ?? { value: '', status: 'unanswered' };
        return (
          <fieldset key={i} class="prompt" disabled={!enabled || s.status === 'right'}>
            <legend>
              {i + 1}. <RichText rich={q.question} inline />
            </legend>
            {q.kind === 'mcq' ? (
              <div class="options">
                {q.options.map((opt, j) => (
                  <label key={j} class="option">
                    <input
                      type="radio"
                      name={`q-${i}`}
                      checked={s.value === String(j)}
                      onChange={() => onChange(i, String(j))}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <>
                <label class="sr-only" for={`q-${i}-input`}>
                  Your answer
                </label>
                <input
                  id={`q-${i}-input`}
                  type={q.kind === 'number' ? 'number' : 'text'}
                  value={s.value}
                  onInput={(e) => onChange(i, (e.target as HTMLInputElement).value)}
                />
              </>
            )}
            {s.status !== 'right' && (
              <button type="button" class="small" disabled={!s.value} onClick={() => onCheck(i)}>
                {t.investigate.check}
              </button>
            )}
            {s.status === 'right' && (
              <div class="verdict ok" role="status">
                <strong>✓ {t.investigate.right}</strong> <RichText rich={q.explain} />
              </div>
            )}
            {s.status === 'wrong' && (
              <div class="verdict different" role="status">
                <strong>◐ {t.investigate.wrong}</strong> <RichText rich={q.hint} />
              </div>
            )}
          </fieldset>
        );
      })}
    </section>
  );
}
