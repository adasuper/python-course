// One playable unit: a quest, or one phase of a boss (docs/specs.md §9).
import type { EditorView } from '@codemirror/view';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Quest, QuestBody } from '../../content/types';
import { narration } from '../../game/narration';
import { ReplayEngine, type ReplayState, type ReplayView, type Speed } from '../../game/replay';
import { getWorldView } from '../../game/worldView';
import { t } from '../../i18n/en';
import type { RunRequest, RunResult, SessionRun } from '../../runtime/protocol';
import {
  awardBonus,
  bonusDone,
  hintsShown,
  recordAttempt,
  recordPredictions,
  useHint,
  type Reward,
} from '../../state/progress';
import { addRun, hasSessionValidators, sessionStatus } from '../../state/session';
import { announce, config, course, getRunner, getStorage, profile, toast, update } from '../../state/store';
import { LoadingPanel } from '../components/Common';
import { TabList } from '../components/Tabs';
import { CodeSize, Editor } from '../components/Editor';
import { selectNextGap } from '../components/gapEditor';
import { InputDialog } from '../components/InputDialog';
import { JarShelf, OutputScroll, type OutLine } from '../components/Output';
import { RichText } from '../components/RichText';
import { playEffect } from '../audio';
import { prefersReducedMotion } from '../flow';
import { runWithInput } from '../runWithInput';
import { ANNOTATE_FROM_REGION } from '../traceback';
import { BonusList, errorTemplate, Feedback, type RewardView } from './Feedback';
import { Hints } from './Hints';
import { Parsons } from './Parsons';
import { checkOrder, orderFeedback, programFrom, type Block } from './parsonsModel';
import { checkQuestion, predictionCorrect } from './answers';
import { InvestigatePanel, PredictPanel, type QuestionState } from './Predict';
import { panelProps, questTab, useNarrow, type QuestTab } from './questTabs';
import { ReplayControls } from './ReplayControls';
import { SessionPanel } from './SessionPanel';

const NOOP_VIEW: ReplayView = { apply: async () => {}, reset: () => {} };

export interface UnitProps {
  quest: Quest;
  body: QuestBody;
  unitKey: string;
  /** Set for a boss phase: hints are kept per phase. */
  phaseId?: string;
  outro: import('../../content/richtext').Rich | null;
  starter: string;
  onPassed(code: string): Reward;
  afterPass?: preact.ComponentChildren;
}

export function QuestPlay({ quest, body, unitKey, phaseId, outro, starter, onPassed, afterPass }: UnitProps) {
  const p = profile.value!;
  const runner = getRunner();
  const isPredict = body.type === 'predict';
  const isInvestigate = body.type === 'investigate';
  const isFill = body.type === 'fill';
  // A comment-only plan is checked by its order, not by running it (§9.2).
  const byOrder = body.type === 'parsons' && body.parsons?.check === 'order';
  const usesSession = hasSessionValidators(body.validators);
  const hasStage = body.stage.kind !== 'none';
  const regionNumber = course.value!.regions.find((r) => r.id === quest.region)?.number ?? 0;
  const annotate = regionNumber >= ANNOTATE_FROM_REGION;
  const narrow = useNarrow();

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
  // Mode B input: the player types the answers when the program asks (§6.5).
  const [typeOwn, setTypeOwn] = useState(true);
  const asking = body.interactiveInput && (typeOwn || body.inputs.length === 0);
  const [inputRequest, setInputRequest] = useState<{
    prompt: string;
    output: string;
    resolve(value: string | null): void;
  } | null>(null);
  const [runNote, setRunNote] = useState<string | null>(null);
  // Session validators look at every run in this quest session (§9.3).
  const [session, setSession] = useState<SessionRun[]>([]);
  const sessionRef = useRef<SessionRun[]>([]);
  const [lockedNote, setLockedNote] = useState(false);
  const editorView = useRef<EditorView | null>(null);
  const stageHolder = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const pendingCode = useRef('');
  const hintsRevealed = hintsShown(p, quest.id, phaseId);

  const engine = useMemo(
    () =>
      new ReplayEngine(hasStage ? getWorldView() : NOOP_VIEW, {
        onState: setReplayState,
        onAction: (i, action) => {
          setReplayPos(i + 1);
          if (action.t === 'bonk') playEffect('bonk');
          else if (action.t === 'pickup' && action.item) playEffect('pickup');
        },
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
        onNarrate: (actions, allAtOnce) => {
          const text = narration(actions, allAtOnce);
          if (text) announce(text);
        },
      }),
    [hasStage],
  );

  // Stage and saved draft.
  useEffect(() => {
    questTab.value = 'work';
    if (hasStage) {
      const world = getWorldView();
      world.setReducedMotion(prefersReducedMotion());
      world.mount(stageHolder.current!);
      void world.showStage(body.stage, { avatar: p.avatarId, theme: p.themeId });
    }
    void getStorage()
      .draftWithSession(p.id, unitKey)
      .then((draft) => {
        if (draft === undefined) return;
        sessionRef.current = draft.session;
        setSession(draft.session);
        if (body.type === 'parsons') {
          try {
            setParsons(JSON.parse(draft.code) as { scraps: Block[]; spell: Block[] });
          } catch {
            /* ignore old drafts */
          }
        } else if (!isPredict) setCode(draft.code);
      });
    return () => engine.cancel();
  }, [unitKey]);

  // Save drafts: 1 s after the last change, and at once when the page is hidden or left
  // (F-EDT-04, F-SAV-01).
  const unsavedDraft = useRef<string | null>(null);
  const saveDraftNow = () => {
    if (unsavedDraft.current === null) return;
    void getStorage().saveDraft(p.id, unitKey, unsavedDraft.current, sessionRef.current);
    unsavedDraft.current = null;
  };
  const draftValue = () => (body.type === 'parsons' ? (parsons ? JSON.stringify(parsons) : null) : code);
  useEffect(() => {
    if (isPredict) return;
    const value = draftValue();
    if (value === null) return;
    unsavedDraft.current = value;
    const timer = setTimeout(saveDraftNow, 1000);
    return () => clearTimeout(timer);
  }, [code, parsons]);
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && saveDraftNow();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', saveDraftNow);
    return () => {
      saveDraftNow();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', saveDraftNow);
    };
  }, [unitKey]);

  // Time on task: active seconds while visible, focused and recently used (§9.1).
  useEffect(() => {
    let lastInput = Date.now();
    let pending = 0;
    const onInput = () => (lastInput = Date.now());
    document.addEventListener('keydown', onInput);
    document.addEventListener('pointerdown', onInput);
    const flush = () => {
      const add = pending;
      pending = 0;
      if (add) update((x) => void (x.quests[quest.id] && (x.quests[quest.id]!.activeSeconds += add)));
    };
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus() && Date.now() - lastInput < 120_000)
        pending += 5;
      if (pending >= 30) flush();
    }, 5000);
    return () => {
      flush();
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
    announce(t.quest.runningAnnounce);
    setRunning(true);
    setRevealed(false);
    setResult(null);
    setRunNote(null);
    const checks = !isPredict && !isInvestigate && !byOrder;
    const exec = config.value.execution;
    const request: RunRequest = {
      mode: 'quest',
      code: codeToRun,
      stage: body.stage,
      inputs: asking ? [] : body.inputs,
      interactiveInput: asking,
      // A fixed seed, or a new one every Run; answering input() questions keeps it (§6.7).
      seed: body.seed ?? Math.floor(Math.random() * 2 ** 31),
      validators: checks ? body.validators : [],
      mistakes: checks ? body.mistakes : [],
      bonus: checks ? body.bonus : [],
      limits: {
        loopBudget: exec.loopBudget,
        maxActions: exec.maxActions,
        maxOutputChars: exec.maxOutputChars,
      },
      coverage: body.trackCoverage,
      ...(usesSession ? { session: sessionRef.current } : {}),
    };
    runner.setTimeoutMs(exec.timeoutSeconds * 1000);
    const outcome = await runWithInput((req) => runner.run(req), request, ask);
    if ('stopped' in outcome) {
      setRunning(false);
      // Shown in a role="status" banner, which announces it.
      setRunNote(outcome.stopped === 'cancelled' ? t.quest.inputStopped : t.quest.inputTooMany);
      return;
    }
    let res = outcome.result;
    if (byOrder) res = withOrderCheck(res);
    const summary = res.validation?.session;
    if (summary) {
      sessionRef.current = addRun(sessionRef.current, summary);
      setSession(sessionRef.current);
      unsavedDraft.current = draftValue();
      saveDraftNow();
    }
    setRunning(false);
    setResult(res);
    engine.setSpeed(speed);
    engine.load(res.actions);
    if (speed === 'instant' || res.actions.length === 0) await engine.skipToEnd();
    else {
      // On a narrow screen, show the replay; Byte's feedback brings the editor back.
      questTab.value = 'stage';
      void engine.play();
    }
  };

  const ask = (prompt: string, output: string) =>
    new Promise<string | null>((resolve) => setInputRequest({ prompt, output, resolve }));

  /** `check: order`: right or wrong comes from the order of the lines, not the run. */
  const withOrderCheck = (res: RunResult): RunResult => {
    const { ok, rightPrefix } = checkOrder(body.parsons!, parsons?.spell ?? []);
    return {
      ...res,
      // A half-built plan may not even be valid Python; that's not what's being checked.
      error: ok ? res.error : null,
      validation: {
        passed: ok,
        results: [],
        feedback: ok
          ? { source: 'success' }
          : { source: 'validator', id: 'order', text: orderFeedback(rightPrefix) },
        bonus: [],
      },
    };
  };

  const reveal = (res: RunResult) => {
    setRevealed(true);
    questTab.value = 'work';
    if (isInvestigate) {
      setHasRun(true);
      if (res.error) announceError(res);
      return;
    }
    if (isPredict) {
      const correct = (body.prompts ?? []).map((pr, i) => predictionCorrect(pr, answers[i], res.output));
      update((x) => recordPredictions(x, quest.id, correct));
      finishPass(pendingCode.current);
      return;
    }
    const ok = Boolean(res.validation?.passed);
    update((x) => recordAttempt(x, quest.id, pendingCode.current, ok));
    if (ok) finishPass(pendingCode.current, res.validation?.bonus ?? []);
    else if (res.error) {
      setPassed(false);
      announceError(res);
    } else {
      setPassed(false);
      announce(`${t.quest.notYet}. ${feedbackSummary(res)}`);
      focusFeedback();
    }
  };

  // A run error keeps focus where it is (usually the editor, so the student can fix the
  // marked line) and is announced politely instead (F-EDT-05).
  const announceError = (res: RunResult) => {
    playEffect('error');
    const fb = res.validation?.feedback;
    const title = errorTemplate(res.error!).title;
    announce(`${t.quest.errorOnLine(res.error!.line, title)}${fb?.text ? ` ${fb.text}` : ''}`);
  };

  const finishPass = (finalCode: string, bonusIds: string[] = []) => {
    playEffect('success');
    if (hasStage) getWorldView().cheer();
    const r = onPassed(finalCode);
    const itemName = r.item ? (course.value!.items[r.item]?.name ?? r.item) : null;
    // Bonus challenges are checked on a passing run; their XP is given once (§9.4).
    const earned = body.bonus.filter((b) => bonusIds.includes(b.id));
    let bonus = { xp: 0, ids: [] as string[], levelUp: null as number | null };
    if (earned.length) update((x) => (bonus = awardBonus(x, quest.id, earned, phaseId)));
    const bonusText = bonus.xp ? t.quest.bonusGained(bonus.ids.length, bonus.xp) : '';
    setReward({ xp: r.xp, itemName, levelUp: bonus.levelUp ?? r.levelUp, bonusText });
    setPassed(true);
    announce([t.quest.passed, bonusText].filter(Boolean).join(' '));
    // XP and items get a toast too (F-PRG-08); the toast's own announcement says them.
    const gained = [r.xp ? t.quest.xpGained(r.xp) : '', itemName ? t.quest.itemGained(itemName) : '']
      .filter(Boolean)
      .join(' · ');
    if (gained) toast('reward', gained, 6000, itemName ? '🎒' : '✨');
    focusFeedback();
    toast('save-point', t.save.savePoint, 8000);
  };

  const focusFeedback = () => requestAnimationFrame(() => document.getElementById('feedback')?.focus());

  // When only session validators are left, say how far along the student is (§9.3).
  const progress = sessionStatus(session, body.validators);
  const sessionNote = (res: RunResult | null) => {
    const failing = res?.validation?.results.filter((r) => !r.passed) ?? [];
    if (!failing.length || failing.some((r) => r.type !== 'branch_coverage' && r.type !== 'runs_ok'))
      return null;
    const notes: string[] = [t.quest.sessionNotYet];
    if (progress.lamps)
      notes.push(t.quest.lampsLit(progress.lamps.filter((l) => l.lit).length, progress.lampsNeeded));
    if (progress.okRuns !== null) notes.push(t.quest.runsOk(progress.okRuns, progress.runsNeeded));
    return notes.join(' ');
  };

  const feedbackSummary = (res: RunResult) => {
    const fb = res.validation?.feedback;
    if (fb?.text) return fb.text;
    const note = sessionNote(res);
    if (note) return note;
    if (res.error)
      return `${errorTemplate(res.error).title}${res.error.line ? `, ${t.quest.lineLabel(res.error.line)}` : ''}.`;
    return t.quest.generic;
  };

  const reveal3 = (tier: 1 | 2 | 3) => {
    update((x) => useHint(x, quest.id, tier, phaseId));
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

  const unitDone = phaseId
    ? Boolean(p.quests[quest.id]?.phasesDone?.includes(phaseId))
    : p.quests[quest.id]?.status === 'completed';

  // Typing on a locked line does nothing, so say why (briefly).
  const lockedTimer = useRef<ReturnType<typeof setTimeout>>();
  const showLocked = () => {
    setLockedNote(true);
    clearTimeout(lockedTimer.current);
    lockedTimer.current = setTimeout(() => setLockedNote(false), 3000);
  };

  const allAnswered = (body.prompts ?? []).every((_, i) => answers[i] !== undefined && answers[i] !== '');
  const ready = runner.status.value === 'ready' || runner.status.value === 'running';

  const runBar = (
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
      {body.interactiveInput && body.inputs.length > 0 && (
        <label class="check-label">
          <input
            type="checkbox"
            checked={typeOwn}
            onChange={(e) => setTypeOwn((e.target as HTMLInputElement).checked)}
          />{' '}
          ✍️ {t.quest.typeAnswers}
        </label>
      )}
      {!ready && runner.status.value !== 'failed' && <span class="muted small-text">{t.loading}</span>}
    </div>
  );

  const tabs: { key: QuestTab; label: string }[] = [
    { key: 'quest', label: t.quest.tabQuest },
    { key: 'work', label: t.quest.tabWork },
    { key: 'stage', label: t.quest.tabStage },
  ];

  return (
    <>
      {narrow && (
        <TabList
          id="quest"
          label={t.quest.panels}
          tabs={tabs}
          current={questTab.value}
          onSelect={(key) => (questTab.value = key)}
          panelId={(key) => `quest-panel-${key}`}
        />
      )}
      <div class={`quest-grid${narrow ? ' narrow' : ''}`}>
        <section class="quest-story card" aria-labelledby="story-h" {...panelProps('quest', narrow)}>
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
          {(passed || unitDone) && body.bonus.length > 0 && (
            <BonusList bonus={body.bonus} done={(id) => bonusDone(p, quest.id, id, phaseId)} />
          )}
          <Hints
            hints={body.hints}
            revealed={hintsRevealed}
            onReveal={reveal3}
            // Copying a whole example would undo the locked lines of a locked fill quest.
            onCopy={body.locked ? undefined : (c) => setCode(c)}
          />
        </section>

        <section class="quest-work card" aria-label="Your work" {...panelProps('work', narrow)}>
          {body.type === 'parsons' && body.parsons ? (
            <Parsons spec={body.parsons} seed={unitKey} state={parsons} onChange={setParsons} />
          ) : (
            <div class="editor-wrap">
              <Editor
                value={isPredict ? body.starterCode : code}
                readOnly={isPredict}
                onChange={setCode}
                onRun={() => void run()}
                id="code-editor"
                fontSize={p.settings.editorFontSize}
                replayLine={replayLine}
                error={editorError}
                label={isPredict ? 'Code to read (read only)' : t.quest.editorLabel}
                fill={isFill ? { starter: body.starterCode, locked: body.locked } : null}
                onBlocked={showLocked}
                viewRef={editorView}
              />
              <div class="editor-tools">
                <p id="editor-help" class="muted small-text">
                  ⌨️ {t.quest.editorHelp}
                  {isFill && ` ${t.quest.gapHelp}`}
                  {body.locked && ` ${t.quest.lockedHelp}`}
                </p>
                {isFill && (
                  <button
                    type="button"
                    class="small"
                    onClick={() => {
                      const line = editorView.current ? selectNextGap(editorView.current) : null;
                      announce(line ? t.quest.gapAt(line) : t.quest.noGaps);
                    }}
                  >
                    ⇥ {t.quest.nextGap}
                  </button>
                )}
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

          {!narrow && runBar}
          {lockedNote && (
            <p class="small-text note-locked" role="status">
              🔒 {t.quest.lockedLine}
            </p>
          )}
          {runNote && (
            <p class="banner info" role="status">
              {runNote}
            </p>
          )}
          {usesSession && <SessionPanel status={progress} />}

          {!ready && <LoadingPanel runner={runner} />}

          <div ref={feedbackRef}>
            {revealed && !isInvestigate && (
              <Feedback
                result={result}
                passed={passed}
                outro={outro}
                reward={reward}
                note={sessionNote(result)}
                annotate={annotate}
              >
                {passed && afterPass}
              </Feedback>
            )}
            {revealed && isInvestigate && result?.error && (
              <Feedback result={result} passed={false} annotate={annotate} />
            )}
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

        <section class="quest-stage card" aria-label="Quest map and output" {...panelProps('stage', narrow)}>
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
          <OutputScroll
            lines={out}
            tall={!hasStage}
            onShowAll={
              replayState === 'playing' || replayState === 'paused'
                ? () => void engine.skipToEnd()
                : undefined
            }
          />
          {body.jarShelf && result && <JarShelf vars={result.vars} />}
        </section>
        {inputRequest && (
          <InputDialog
            prompt={inputRequest.prompt}
            output={inputRequest.output}
            onAnswer={(value) => {
              inputRequest.resolve(value);
              setInputRequest(null);
            }}
            onCancel={() => {
              inputRequest.resolve(null);
              setInputRequest(null);
            }}
          />
        )}
      </div>
      {narrow && <div class="sticky-run">{runBar}</div>}
    </>
  );
}
