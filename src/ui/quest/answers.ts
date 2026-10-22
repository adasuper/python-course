// Checking answers in predict and investigate quests (§9.2). Pure, so they can be tested.
import type { InvestigateQuestion, PredictPrompt, PredictTwin } from '../../content/types';

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

/** A twin's answer was checked against the real output when the content was built. */
export function twinCorrect(twin: PredictTwin, answer: string | number | undefined): boolean {
  if (answer === undefined) return false;
  if (twin.kind === 'mcq') return Number(answer) === twin.answer;
  return normalizeAnswer(String(answer)) === normalizeAnswer(twin.answer);
}

export function checkQuestion(q: InvestigateQuestion, value: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  if (q.kind === 'mcq') return Number(value) === q.answer;
  if (q.kind === 'number') return value.trim() !== '' && Math.abs(Number(value) - q.answer) < 1e-9;
  return q.accept.some((a) => norm(a) === norm(value));
}
