// Knowledge check: 3–5 low-stakes, retakeable review questions (§9.7).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '../../i18n/en';
import { completeCheck } from '../../state/progress';
import { go, profile, regions, update } from '../../state/store';
import { RichText } from '../components/RichText';
import { shuffledOrder } from '../order';
import { normalizeAnswer } from '../quest/answers';
import { Hud } from './Overworld';

export function CheckScreen({ regionId }: { regionId: string }) {
  const region = regions.value[regionId]!;
  const items = region.knowledgeCheck.items;
  const [answers, setAnswers] = useState<string[]>(() => items.map(() => ''));
  const [submitted, setSubmitted] = useState(false);
  const [round, setRound] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [round]);
  // Options come in a new order on every attempt (F-BOS-04). Answers keep the original index.
  const attempt = useMemo(() => profile.value?.checks[regionId]?.attempts ?? 0, [round]);

  const correct = items.map((it, i) =>
    it.kind === 'mcq'
      ? answers[i] === String(it.answer)
      : normalizeAnswer(answers[i]!) === normalizeAnswer(it.answer),
  );
  const score = correct.filter(Boolean).length;
  const submit = (e: Event) => {
    e.preventDefault();
    setSubmitted(true);
    update((p) => void completeCheck(p, regionId, score, items.length));
    requestAnimationFrame(() => document.getElementById('check-score')?.focus());
  };

  return (
    <div class="screen check-screen">
      <Hud regionName={region.name} />
      <main id="main">
        <h1 ref={heading} tabIndex={-1}>
          {t.check.heading(region.name)}
        </h1>
        <p class="muted">{t.check.intro}</p>
        <form onSubmit={submit} key={round}>
          {items.map((it, i) => (
            <fieldset key={i} class="prompt card" disabled={submitted}>
              <legend>
                {i + 1}. <RichText rich={it.question} inline />
              </legend>
              {it.code && <pre class="code-block">{it.code}</pre>}
              {it.kind === 'mcq' ? (
                <div class="options">
                  {shuffledOrder(it.options.length, `${regionId}:${attempt}:${i}`).map((j) => (
                    <label key={j} class="option">
                      <input
                        type="radio"
                        name={`c-${i}`}
                        checked={answers[i] === String(j)}
                        onChange={() => setAnswers((a) => a.map((x, k) => (k === i ? String(j) : x)))}
                      />
                      <span>{it.options[j]}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <>
                  <label for={`c-${i}-t`}>{t.check.yourAnswer}</label>
                  <textarea
                    id={`c-${i}-t`}
                    rows={3}
                    class="code-input"
                    value={answers[i]}
                    onInput={(e) =>
                      setAnswers((a) =>
                        a.map((x, k) => (k === i ? (e.target as HTMLTextAreaElement).value : x)),
                      )
                    }
                  />
                </>
              )}
              {submitted && (
                <div class={`verdict ${correct[i] ? 'ok' : 'different'}`}>
                  <strong>{correct[i] ? '✓ Right!' : '◐ Not this time.'}</strong>
                  {!correct[i] && it.kind === 'predict' && <pre>{it.answer}</pre>}
                  <RichText rich={it.explain} />
                </div>
              )}
            </fieldset>
          ))}
          {!submitted ? (
            <button type="submit" class="primary">
              {t.check.submit}
            </button>
          ) : (
            <div class="card">
              <p id="check-score" tabIndex={-1} role="status">
                <strong>{t.check.score(score, items.length)}</strong>
              </p>
              <div class="row">
                <button
                  type="button"
                  onClick={() => {
                    setAnswers(items.map(() => ''));
                    setSubmitted(false);
                    setRound(round + 1);
                  }}
                >
                  {t.check.retake}
                </button>
                <button type="button" class="primary" onClick={() => go({ name: 'overworld' })}>
                  {t.quest.continue}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
