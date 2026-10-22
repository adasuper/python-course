// One playable unit: a quest, or one phase of a boss (docs/specs.md §9).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Quest, QuestBody } from '../../content/types';
import { narrate } from '../../game/narration';
import { ReplayEngine, type ReplayState, type ReplayView, type Speed } from '../../game/replay';
import { getWorldView } from '../../game/worldView';
import { t } from '../../i18n/en';
import type { RunRequest, RunResult } from '../../runtime/protocol';
import { recordAttempt, useHint, type Reward } from '../../state/progress';
import { announce, config, course, getRunner, getStorage, profile, toast, update } from '../../state/store';
import { LoadingPanel } from '../components/Common';
import { CodeSize, Editor } from '../components/Editor';
import { JarShelf, OutputScroll, type OutLine } from '../components/Output';
import { RichText } from '../components/RichText';
import { prefersReducedMotion } from '../flow';
import { errorTemplate, Feedback, type RewardView } from './Feedback';
import { Hints } from './Hints';
import { Parsons, programFrom, type Block } from './Parsons';
import {
  checkQuestion,
  InvestigatePanel,
  PredictPanel,
  predictionCorrect,
  type QuestionState,
} from './Predict';
import { ReplayControls } from './ReplayControls';

const NOOP_VIEW: ReplayView = { apply: async () => {}, reset: () => {} };

export interface UnitProps {
  quest: Quest;
  body: QuestBody;
  unitKey: string;
  outro: import('../../content/richtext').Rich | null;
  starter: string;
  onPassed(code: string): Reward;
  afterPass?: preact.ComponentChildren;
}

export function QuestPlay({ quest, body, unitKey, outro, starter, onPassed, afterPass }: UnitProps) {
  const p = profile.value!;
  const runner = getRunner();
  const isPredict = body.type === 'predict';
  const isInvestigate = body.type === 'investigate';
  const hasStage = body.stage.kind !== 'none';

  const [code, setCode] = useState(starter);
  const [parsons, setParsons] = useState<{ scraps: Block[]; spell: Block[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [passed, setPassed] = useState(false);
  const [reward, setReward] = useState<RewardView | null>(null);
  const [out, setOut] = useState<OutLine[]>([]);
  const [replayState, setReplayState] = useState<ReplayState>('idle');
  const [replayPos, setReplayPos] = useState(0);
  const [replayLine, setReplayLine] = useState<number | null>(null);
  const [speed, setSpeed] = useState<Speed>(p.settings.replaySpeed);
  const [answers, setAnswers] = useState<(string | number | undefined)[]>([]);
  const [locked, setLocked] = useState(false);
  const [questions, setQuestions] = useState<QuestionState[]>(() =>
    (body.questions ?? []).map(() => ({ value: '', status: 'unanswered' })),
  );
  const [hasRun, setHasRun] = useState(false);
  const stageHolder = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const pendingCode = useRef('');
  const hintsRevealed = p.quests[quest.id]?.hintsUsed ?? 0;

  const engine = useMemo(
    () =>
      new ReplayEngine(hasStage ? getWorldView() : NOOP_VIEW, {
        onState: setReplayState,
        onAction: (i) => setReplayPos(i + 1),
        onLine: setReplayLine,
        onOutput: (a) =>
          setOut((lines) => [
            ...lines,
            a.t === 'out'
              ? { kind: a.stream, text: a.text }
              : { kind: 'input', text: a.prompt, value: a.value },
          ]),
        onReset: () => {
          setOut([]);
          setReplayPos(0);
        },
        onNarrate: (actions) => {
          const sentences = narrate(actions);
          if (sentences.length) announce(sentences.join(' '));
        },
      }),
    [hasStage],
  );

  // Stage and saved draft.
  useEffect(() => {
    if (hasStage) {
      const world = getWorldView();
      world.setReducedMotion(prefersReducedMotion());
      world.mount(stageHolder.current!);
      void world.showStage(body.stage, { avatar: p.avatarId, theme: p.themeId });
    }
    void getStorage()
      .draft(p.id, unitKey)
      .then((draft) => {
        if (draft === undefined) return;
        if (body.type === 'parsons') {
          try {
            setParsons(JSON.parse(draft) as { scraps: Block[]; spell: Block[] });
          } catch {
            /* ignore old drafts */
          }
        } else if (!isPredict) setCode(draft);
      });
    return () => engine.cancel();
  }, [unitKey]);

  // Save drafts (debounced).
  useEffect(() => {
    if (isPredict) return;
    const value = body.type === 'parsons' ? (parsons ? JSON.stringify(parsons) : null) : code;
    if (value === null) return;
    const timer = setTimeout(() => void getStorage().saveDraft(p.id, unitKey, value), 800);
    return () => clearTimeout(timer);
  }, [code, parsons]);

  // Time on task: active seconds while visible, focused and recently used (§9.1).
  useEffect(() => {
    let lastInput = Date.now();
    let pending = 0;
    const onInput = () => (lastInput = Date.now());
    document.addEventListener('keydown', onInput);
    document.addEventListener('pointerdown', onInput);
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus() && Date.now() - lastInput < 120_000)
        pending += 5;
      if (pending >= 30) {
        const add = pending;
        pending = 0;
        update((x) => {
          const rec = x.quests[quest.id];
          if (rec) rec.activeSeconds += add;
        });
      }
    }, 5000);
    return () => {
      clearInterval(tick);
      document.removeEventListener('keydown', onInput);
      document.removeEventListener('pointerdown', onInput);
    };
  }, [quest.id]);

  // When the replay finishes, Byte gives feedback (§8: see first, then be told).
  useEffect(() => {
    if (replayState !== 'done' || !result || revealed) return;
    reveal(result);
  }, [replayState, result]);

  const program = () =>
    body.type === 'parsons' && body.parsons ? programFrom(body.parsons, parsons?.spell ?? []) : code;

  const run = async () => {
    if (running) return;
    if (isPredict && !locked) return;
    const codeToRun = isPredict ? body.starterCode : program();
    pendingCode.current = codeToRun;
    setRunning(true);
    setRevealed(false);
    setResult(null);
    const checks = !isPredict && !isInvestigate;
    const exec = config.value.execution;
    const request: RunRequest = {
      mode: 'quest',
      code: codeToRun,
      stage: body.stage,
      inputs: body.inputs,
      interactiveInput: false,
      seed: body.seed,
      validators: checks ? body.validators : [],
      mistakes: checks ? body.mistakes : [],
      bonus: checks ? body.bonus : [],
      limits: {
        loopBudget: exec.loopBudget,
        maxActions: exec.maxActions,
        maxOutputChars: exec.maxOutputChars,
      },
    };
    runner.setTimeoutMs(exec.timeoutSeconds * 1000);
    const res = await runner.run(request);
    setRunning(false);
    setResult(res);
    engine.setSpeed(speed);
    engine.load(res.actions);
    if (speed === 'instant' || res.actions.length === 0) await engine.skipToEnd();
    else void engine.play();
  };

  const reveal = (res: RunResult) => {
    setRevealed(true);
    if (isInvestigate) {
      setHasRun(true);
      if (res.error) focusFeedback();
      return;
    }
    if (isPredict) {
      const correct = (body.prompts ?? []).map((pr, i) => predictionCorrect(pr, answers[i], res.output));
      update((x) => {
        const rec = (x.quests[quest.id] ??= {
          status: 'in_progress',
          attempts: 0,
          codeHashes: [],
          failedBeforePass: 0,
          hintsUsed: 0,
          activeSeconds: 0,
        });
        rec.attempts++;
        if (rec.predictionsTotal === undefined) {
          rec.predictionsTotal = correct.length;
          rec.predictionsCorrectFirstTry = correct.filter(Boolean).length;
        }
      });
      finishPass(pendingCode.current);
      return;
    }
    const ok = Boolean(res.validation?.passed);
    update((x) => recordAttempt(x, quest.id, pendingCode.current, ok));
    if (ok) finishPass(pendingCode.current);
    else {
      setPassed(false);
      announce(`${t.quest.notYet}. ${feedbackSummary(res)}`);
      focusFeedback();
    }
  };

  const finishPass = (finalCode: string) => {
    const r = onPassed(finalCode);
    const itemName = r.item ? (course.value!.items[r.item]?.name ?? r.item) : null;
    setReward({ xp: r.xp, itemName, levelUp: r.levelUp });
    setPassed(true);
    announce(
      [t.quest.passed, r.xp ? t.quest.xpGained(r.xp) : '', itemName ? t.quest.itemGained(itemName) : '']
        .filter(Boolean)
        .join(' '),
    );
    focusFeedback();
    toast('save-point', t.save.savePoint, 8000);
  };

  const focusFeedback = () => requestAnimationFrame(() => document.getElementById('feedback')?.focus());

  const feedbackSummary = (res: RunResult) => {
    const fb = res.validation?.feedback;
    if (fb?.text) return fb.text;
    if (res.error)
      return `${errorTemplate(res.error).title}${res.error.line ? `, ${t.quest.lineLabel(res.error.line)}` : ''}.`;
    return t.quest.generic;
  };

  const reveal3 = (tier: 1 | 2 | 3) => {
    update((x) => useHint(x, quest.id, tier));
    announce(`${t.quest.hintButton(tier)} shown.`);
  };

  const editorError =
    result?.error && revealed
      ? {
          line: result.error.line,
          col: result.error.col,
          endCol: result.error.endCol,
          message: errorTemplate(result.error).title,
        }
      : null;

  const allAnswered = (body.prompts ?? []).every((_, i) => answers[i] !== undefined && answers[i] !== '');
  const ready = runner.status.value === 'ready' || runner.status.value === 'running';

  return (
    <div class="quest-grid">
      <section class="quest-story card" aria-labelledby="story-h">
        <h2 id="story-h" class="sr-only">
          Story and goal
        </h2>
        <RichText rich={body.storyIntro} />
        <div class="goal">
          <strong>🎯 {t.quest.goal}:</strong> <RichText rich={body.goal} inline />
        </div>
        {passed && quest.conceptCard && (
          <details class="concept-card" open>
            <summary>📘 {t.quest.conceptCard}</summary>
            <RichText rich={quest.conceptCard} />
          </details>
        )}
        <Hints hints={body.hints} revealed={hintsRevealed} onReveal={reveal3} onCopy={(c) => setCode(c)} />
      </section>

      <section class="quest-work card" aria-label="Your work">
        {body.type === 'parsons' && body.parsons ? (
          <Parsons spec={body.parsons} seed={unitKey} state={parsons} onChange={setParsons} />
        ) : (
          <div class="editor-wrap">
            <Editor
              value={isPredict ? body.starterCode : code}
              readOnly={isPredict}
              onChange={setCode}
              onRun={() => void run()}
              fontSize={p.settings.editorFontSize}
              replayLine={replayLine}
              error={editorError}
              label={isPredict ? 'Code to read (read only)' : t.quest.editorLabel}
            />
            <div class="editor-tools">
              <p id="editor-help" class="muted small-text">
                ⌨️ {t.quest.editorHelp}
              </p>
              <CodeSize
                size={p.settings.editorFontSize}
                onChange={(n) => update((x) => void (x.settings.editorFontSize = n))}
              />
            </div>
          </div>
        )}

        {isPredict && body.prompts && (
          <PredictPanel
            prompts={body.prompts}
            answers={answers}
            locked={locked}
            revealed={revealed}
            output={result?.output ?? ''}
            onAnswer={(i, v) => setAnswers((a) => Object.assign([...a], { [i]: v }))}
          />
        )}

        <div class="run-bar">
          {isPredict && !locked ? (
            <button
              type="button"
              class="primary"
              disabled={!allAnswered}
              onClick={() => {
                setLocked(true);
                announce('Prediction locked in. Now run the code to check.');
                requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('button.run')?.focus());
              }}
            >
              🔒 {t.predict.lockIn}
            </button>
          ) : (
            <button
              type="button"
              class="primary run"
              disabled={running || !ready}
              onClick={() => void run()}
              aria-keyshortcuts="Control+Enter"
            >
              {running ? t.quest.running : `▶ ${isPredict ? t.predict.runToCheck : t.quest.run}`}
            </button>
          )}
          {!isPredict && body.type !== 'parsons' && (
            <button
              type="button"
              class="ghost"
              onClick={() => {
                if (confirm(t.quest.resetConfirm)) setCode(starter);
              }}
            >
              ↺ {t.quest.reset}
            </button>
          )}
          {!ready && runner.status.value !== 'failed' && <span class="muted small-text">{t.loading}</span>}
        </div>

        {!ready && <LoadingPanel runner={runner} />}

        <div ref={feedbackRef}>
          {revealed && !isInvestigate && (
            <Feedback result={result} passed={passed} outro={outro} reward={reward}>
              {passed && afterPass}
            </Feedback>
          )}
          {revealed && isInvestigate && result?.error && <Feedback result={result} passed={false} />}
        </div>

        {isInvestigate && body.questions && (
          <InvestigatePanel
            questions={body.questions}
            states={questions}
            enabled={hasRun}
            onChange={(i, value) =>
              setQuestions((qs) => qs.map((q, j) => (j === i ? { value, status: 'unanswered' } : q)))
            }
            onCheck={(i) => {
              const q = body.questions![i]!;
              const ok = checkQuestion(q, questions[i]!.value);
              const next = questions.map((s, j) =>
                j === i ? { ...s, status: ok ? ('right' as const) : ('wrong' as const) } : s,
              );
              setQuestions(next);
              update((x) => recordAttempt(x, quest.id, `${i}:${questions[i]!.value}`, ok));
              if (next.every((s) => s.status === 'right')) finishPass(code);
            }}
          />
        )}
        {isInvestigate && passed && (
          <Feedback result={result} passed outro={outro} reward={reward}>
            {afterPass}
          </Feedback>
        )}
      </section>

      <section class="quest-stage card" aria-label="Quest map and output">
        {hasStage && (
          <>
            <h2 class="panel-title">🗺️ {t.quest.stage}</h2>
            <div
              class="stage-holder"
              ref={stageHolder}
              role="img"
              aria-label={`${t.quest.stage}. Use “${t.hud.describe}” to hear what is around the hero.`}
            />
            <div class="row">
              <ReplayControls
                state={replayState}
                speed={speed}
                position={replayPos}
                length={engine.length}
                onPlay={() => void engine.play()}
                onPause={() => engine.pause()}
                onStep={() => void engine.step()}
                onRestart={() => void engine.restart()}
                onSkip={() => void engine.skipToEnd()}
                onSpeed={(s) => {
                  setSpeed(s);
                  engine.setSpeed(s);
                  update((x) => void (x.settings.replaySpeed = s));
                }}
              />
              <button
                type="button"
                class="small ghost"
                onClick={() => announce(getWorldView().describeStage())}
              >
                👂 {t.hud.describe}
              </button>
            </div>
          </>
        )}
        <OutputScroll lines={out} />
        {body.jarShelf && result && <JarShelf vars={result.vars} />}
      </section>
    </div>
  );
}
