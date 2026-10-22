// Quest sessions: the student's recent runs, for session validators (docs/specs.md §9.3).
// Python decides pass or fail; this mirrors its rules to show progress (lamps, run count)
// even before the next run.
import type { Lamp, SessionRun, ValidatorSpec } from '../runtime/protocol';

/** How many runs a session keeps (newest last). */
export const SESSION_LIMIT = 30;

export function addRun(history: SessionRun[], run: SessionRun): SessionRun[] {
  return [...history, run].slice(-SESSION_LIMIT);
}

export interface SessionStatus {
  /** branch_coverage: every door of the latest program, lit or not. */
  lamps: Lamp[] | null;
  lampsNeeded: number;
  /** runs_ok: finished runs of the latest program so far, and how many are needed. */
  okRuns: number | null;
  runsNeeded: number;
  distinctInputs: boolean;
}

export function sessionStatus(history: SessionRun[], validators: ValidatorSpec[]): SessionStatus {
  const coverage = validators.find((v) => v.type === 'branch_coverage');
  const runsOk = validators.find((v) => v.type === 'runs_ok');
  const last = history.at(-1);
  const status: SessionStatus = {
    lamps: null,
    lampsNeeded: 0,
    okRuns: null,
    runsNeeded: Number(runsOk?.min_runs ?? 3),
    distinctInputs: Boolean(runsOk?.distinct_inputs),
  };
  if (coverage) {
    const doors = last?.shape ? last.shape.split(',') : [];
    const lit = new Set(history.filter((r) => r.shape === last?.shape).flatMap((r) => r.lit));
    status.lamps = doors.map((door, i) => {
      const id = /^[\d.]+/.exec(door)![0];
      return { id, kind: door.slice(id.length) as Lamp['kind'], line: last!.lines[i] ?? 0, lit: lit.has(id) };
    });
    status.lampsNeeded =
      coverage.min === undefined || coverage.min === 'all' ? doors.length : Number(coverage.min);
  }
  if (runsOk) {
    const runs = history.filter((r) => r.program === last?.program && r.ok);
    status.okRuns = status.distinctInputs
      ? new Set(runs.map((r) => JSON.stringify(r.inputs))).size
      : runs.length;
  }
  return status;
}

export const hasSessionValidators = (validators: ValidatorSpec[]) =>
  validators.some((v) => v.type === 'branch_coverage' || v.type === 'runs_ok');
