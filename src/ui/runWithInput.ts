// Mode B input (docs/specs.md §6.5), shared by quests and the Workshop: when the program asks
// and no answer is queued, ask the player, then run again from the top with the answer added.
// The seed stays the same, so the program reaches the same point and carries on.
import type { RunRequest, RunResult } from '../runtime/protocol';

/** At most this many typed answers per run. */
export const MAX_TYPED_INPUTS = 20;

/** Shows the question; resolves with the answer, or null when the player stops the run. */
export type Ask = (prompt: string, output: string) => Promise<string | null>;

export type InputRun = { result: RunResult } | { stopped: 'cancelled' | 'too-many' };

export async function runWithInput(
  run: (request: RunRequest) => Promise<RunResult>,
  request: RunRequest,
  ask: Ask,
): Promise<InputRun> {
  let req = request;
  let result = await run(req);
  while (result.status === 'needs-input') {
    if (req.inputs.length >= MAX_TYPED_INPUTS) return { stopped: 'too-many' };
    const value = await ask(result.needsInput?.prompt ?? '', result.output);
    if (value === null) return { stopped: 'cancelled' };
    req = { ...req, inputs: [...req.inputs, value] };
    result = await run(req);
  }
  return { result };
}
