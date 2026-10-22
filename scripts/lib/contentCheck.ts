// Runs every quest's solutions through the real Python runtime (docs/specs.md §18.3).
// Shared by `npm run validate-content` and tests/content/quests.test.ts.
import { SESSION_VALIDATOR_TYPES, type RegionFile, type WorkshopFile } from '../../src/content/schema';
import type { ParsonsSpec } from '../../src/content/types';
import type { BonusSpec, RunResult, SessionRun, StageSpec, ValidatorSpec } from '../../src/runtime/protocol';
import { blocksFor, checkOrder, orderFeedback } from '../../src/ui/quest/parsonsModel';
import { isCodeChecked, needsBaking, parsonsProgram, solutionCode, type Body, type Unit } from './content';
import type { PyHost } from './pyHost';

export function runBody(
  host: PyHost,
  body: Body,
  code: string,
  validators: ValidatorSpec[],
  session?: SessionRun[],
): RunResult {
  return host.run({
    code,
    stage: body.stage as StageSpec,
    inputs: body.inputs,
    seed: body.seed ?? 0,
    validators,
    mistakes: body.common_mistakes,
    bonus: [],
    coverage: body.track_coverage || validators.some((v) => v.type === 'branch_coverage'),
    ...(session ? { session } : {}),
  });
}

/** The Parsons block of a quest file, shaped as the game reads it. */
export function parsonsSpec(body: Body): ParsonsSpec {
  const p = body.parsons!;
  return {
    lines: p.lines,
    distractors: p.distractors,
    fixedTop: p.fixed_top,
    indent: p.indent,
    check: p.check,
    alternatives: p.alternatives,
  };
}

/** Hidden-test expectations come from running the solution (D11). */
export function bakeValidators(host: PyHost, body: Body): { validators: ValidatorSpec[]; problem?: string } {
  const validators = body.validators as ValidatorSpec[];
  if (!needsBaking(body)) return { validators };
  const baked = host.bake({
    code: solutionCode(body),
    stage: body.stage as StageSpec,
    inputs: body.inputs,
    seed: body.seed ?? 0,
    validators,
  });
  if (!baked.ok)
    return { validators, problem: `the solution fails to run (${baked.error?.key ?? baked.status})` };
  return { validators: baked.validators! };
}

function describe(result: RunResult): string {
  if (result.error) return `error ${result.error.key} on line ${result.error.line ?? '?'}`;
  const v = result.validation;
  if (!v) return result.status;
  const failing = v.results.filter((r) => !r.passed).map((r) => r.id);
  return `feedback=${v.feedback.source}${v.feedback.id ? `:${v.feedback.id}` : ''} failing=[${failing.join(', ')}]`;
}

const norm = (s: string) =>
  s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();

export function checkUnit(host: PyHost, unit: Unit): string[] {
  const problems: string[] = [];
  const body = unit.body;
  const { validators: all, problem } = bakeValidators(host, body);
  if (problem) return [problem];
  // One run can't satisfy a session validator (they look across many runs), so these
  // single-run checks leave them out; the shape of the solution is checked below.
  const validators = all.filter((v) => !SESSION_VALIDATOR_TYPES.includes(v.type));

  if (body.type === 'parsons' && body.parsons?.check === 'order') {
    const spec = parsonsSpec(body);
    for (const [i, wrong] of body.wrong_solutions.entries()) {
      const result = checkOrder(spec, blocksFor(spec, wrong.order ?? []));
      if (result.ok) problems.push(`wrong solution ${i + 1} is in a right order, but it should fail`);
      const needle = wrong.expect_feedback_contains;
      if (!result.ok && needle && !orderFeedback(result.rightPrefix).includes(needle))
        problems.push(
          `wrong solution ${i + 1} feedback should contain "${needle}" but got "${orderFeedback(result.rightPrefix)}"`,
        );
      if (wrong.expect_mistake)
        problems.push(
          `wrong solution ${i + 1}: a check: order puzzle has no mistakes; use expect_feedback_contains`,
        );
    }
    return problems;
  }

  if (isCodeChecked(body)) {
    const solution = runBody(host, body, solutionCode(body), validators);
    if (!solution.validation?.passed)
      problems.push(`the reference solution does not pass: ${describe(solution)}`);
    const coverage = all.filter((v) => v.type === 'branch_coverage');
    if (coverage.length) {
      const run = runBody(host, body, solutionCode(body), coverage, []);
      const lamps = (run.validation?.results[0]?.detail.lamps as unknown[] | undefined) ?? [];
      if (!lamps.length) problems.push('branch_coverage: the solution has no if/elif/else doors to light');
    }

    // A broken bonus check would stop the student's run, so try each one on the solution.
    for (const bonus of body.bonus) {
      try {
        host.run({
          code: solutionCode(body),
          stage: body.stage as StageSpec,
          inputs: body.inputs,
          validators,
          bonus: [bonus as BonusSpec],
        });
      } catch (error) {
        problems.push(
          `bonus "${bonus.id}": the check crashes (${String(error).split('\n').at(-2) ?? error})`,
        );
      }
    }

    for (const [i, wrong] of body.wrong_solutions.entries()) {
      const code = wrong.code ?? parsonsProgram(body, wrong.order ?? []);
      const result = runBody(host, body, code, validators);
      const v = result.validation;
      if (v?.passed) {
        problems.push(`wrong solution ${i + 1} passes, but it should fail`);
        continue;
      }
      if (
        wrong.expect_mistake &&
        !(v?.feedback.source === 'mistake' && v.feedback.id === wrong.expect_mistake)
      ) {
        problems.push(
          `wrong solution ${i + 1} should get mistake "${wrong.expect_mistake}" but got ${describe(result)}`,
        );
      }
      if (wrong.expect_feedback_contains) {
        const needle = wrong.expect_feedback_contains;
        const text = v?.feedback.text ?? '';
        if (!text.includes(needle) && result.error?.key !== needle) {
          problems.push(
            `wrong solution ${i + 1} feedback should contain "${needle}" but got ${describe(result)}`,
          );
        }
      }
    }

    const carry = 'carry_code' in body && body.carry_code;
    if (!carry && body.type !== 'parsons') {
      const starter = runBody(host, body, body.starter_code, validators);
      if (starter.validation?.passed)
        problems.push('the starter code already passes; students would have nothing to do');
    }
  }

  if (body.type === 'predict') {
    const run = runBody(host, body, body.starter_code, []);
    if (run.error) problems.push(`the predict code errors: ${describe(run)}`);
    for (const [i, p] of (body.prompts ?? []).entries()) {
      const twin = p.twin;
      if (!twin) continue;
      const tried = runBody(host, body, twin.code, []);
      const real = norm(tried.output);
      if (tried.error) problems.push(`prompt ${i + 1} twin: the code errors: ${describe(tried)}`);
      else if (twin.kind === 'text' && norm(twin.answer) !== real)
        problems.push(
          `prompt ${i + 1} twin: answer ${JSON.stringify(twin.answer)} ≠ real output ${JSON.stringify(tried.output)}`,
        );
      else if (twin.kind === 'mcq') {
        if (twin.answer >= twin.options.length)
          problems.push(`prompt ${i + 1} twin: answer index out of range`);
        else if (norm(twin.options[twin.answer]!) !== real)
          problems.push(
            `prompt ${i + 1} twin: the marked answer is not the real output ${JSON.stringify(tried.output)}`,
          );
        twin.options.forEach((o, j) => {
          if (j !== twin.answer && norm(o) === real)
            problems.push(`prompt ${i + 1} twin: option ${j + 1} is also correct`);
        });
      }
      if (norm(twin.code) === norm(body.starter_code))
        problems.push(`prompt ${i + 1} twin: use a different program from the quest's own code`);
    }
    for (const [i, p] of (body.prompts ?? []).entries()) {
      if (p.kind === 'text' && norm(p.answer) !== norm(run.output)) {
        problems.push(
          `prompt ${i + 1}: answer ${JSON.stringify(p.answer)} ≠ real output ${JSON.stringify(run.output)}`,
        );
      }
      if (p.kind === 'mcq' && p.verify.kind === 'output') {
        const wanted = norm(run.output);
        if (norm(p.options[p.answer] ?? '') !== wanted) {
          problems.push(
            `prompt ${i + 1}: the marked answer is not the real output ${JSON.stringify(run.output)}`,
          );
        }
        p.options.forEach((o, j) => {
          if (j !== p.answer && norm(o) === wanted)
            problems.push(`prompt ${i + 1}: option ${j + 1} is also correct`);
        });
      }
      if (p.kind === 'mcq' && p.verify.kind === 'hero_at') {
        const at = run.world?.hero;
        if (!at || at[0] !== p.verify.at[0] || at[1] !== p.verify.at[1]) {
          problems.push(
            `prompt ${i + 1}: the hero ends at ${JSON.stringify(at)}, not ${JSON.stringify(p.verify.at)}`,
          );
        }
      }
    }
  }

  if (body.type === 'investigate') {
    const run = runBody(host, body, body.starter_code, []);
    if (run.error) problems.push(`the investigate code errors: ${describe(run)}`);
    for (const [i, q] of (body.questions ?? []).entries()) {
      const v = q.verify;
      if (v?.kind === 'output_lines') {
        const lines = run.output.replace(/\n$/, '').split('\n').length;
        if (q.kind !== 'number')
          problems.push(`question ${i + 1}: output_lines only works for a number question`);
        else if (q.answer !== lines)
          problems.push(
            `question ${i + 1}: the program prints ${lines} line(s), but the answer is ${q.answer}`,
          );
      }
      if (v?.kind === 'try') {
        const tried = runBody(host, body, v.code, []);
        const outcome = tried.error ? 'error' : 'ok';
        if (outcome !== v.outcome)
          problems.push(`question ${i + 1}: the changed program ends with "${outcome}", not "${v.outcome}"`);
        if (v.output !== undefined && norm(v.output) !== norm(tried.output))
          problems.push(
            `question ${i + 1}: the changed program prints ${JSON.stringify(tried.output)}, not ${JSON.stringify(v.output)}`,
          );
      }
    }
  }
  return problems;
}

export function checkRegion(host: PyHost, region: RegionFile): string[] {
  const problems: string[] = [];
  const example = region.concept_scene.worked_example;
  const run = host.run({ code: example.code, stage: example.stage as StageSpec, mode: 'example' });
  if (run.error) problems.push(`concept scene worked example errors: ${describe(run)}`);
  region.knowledge_check.items.forEach((item, i) => {
    if (item.kind !== 'predict') return;
    const r = host.run({ code: item.code, mode: 'example' });
    if (norm(r.output) !== norm(item.answer)) {
      problems.push(
        `knowledge check item ${i + 1}: answer ${JSON.stringify(item.answer)} ≠ real output ${JSON.stringify(r.output)}`,
      );
    }
  });
  return problems;
}

/** Every Workshop map loads in the Python world, and every API example at least compiles. */
export function checkWorkshop(host: PyHost, workshop: WorkshopFile): string[] {
  const problems: string[] = [];
  for (const map of workshop.maps) {
    const run = host.run({
      code: 'from codeweald import hero\nhero.say("hi")',
      stage: map.stage as StageSpec,
      mode: 'example',
    });
    if (run.error) problems.push(`map "${map.id}": ${describe(run)}`);
  }
  for (const entry of workshop.api) {
    const run = host.run({ code: `if False:\n${entry.example.replace(/^/gm, '    ')}`, mode: 'example' });
    if (
      run.error?.type === 'SyntaxError' ||
      run.error?.key.startsWith('syntax.') ||
      run.error?.key.startsWith('indent.')
    )
      problems.push(`api "${entry.call}": the example is not valid Python (${describe(run)})`);
  }
  return problems;
}
