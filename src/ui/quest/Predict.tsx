// Predict quests: read code, lock in a prediction, then run it to check (§9.2).
import type { InvestigateQuestion, PredictPrompt } from '../../content/types';
import { t } from '../../i18n/en';
import { RichText } from '../components/RichText';

export const normalizeAnswer = (s: string) =>
  s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();

export function predictionCorrect(
  prompt: PredictPrompt,
  answer: string | number | undefined,
  output: string,
): boolean {
  if (answer === undefined) return false;
  if (prompt.kind === 'mcq') return Number(answer) === prompt.answer;
  return (
    normalizeAnswer(String(answer)) === normalizeAnswer(output) ||
    normalizeAnswer(String(answer)) === normalizeAnswer(prompt.answer)
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
          <fieldset key={i} class="prompt" disabled={locked}>
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
                  <div class="compare">
                    <div>
                      <p class="small-text">{t.predict.yourAnswer}</p>
                      <pre>{String(answers[i] ?? '')}</pre>
                    </div>
                    <div>
                      <p class="small-text">{t.predict.realAnswer}</p>
                      <pre>{output}</pre>
                    </div>
                  </div>
                )}
                <RichText rich={p.explain} />
              </div>
            )}
          </fieldset>
        );
      })}
    </section>
  );
}

export type QuestionState = { value: string; status: 'unanswered' | 'right' | 'wrong' };

export function checkQuestion(q: InvestigateQuestion, value: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  if (q.kind === 'mcq') return Number(value) === q.answer;
  if (q.kind === 'number') return value.trim() !== '' && Math.abs(Number(value) - q.answer) < 1e-9;
  return q.accept.some((a) => norm(a) === norm(value));
}

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
