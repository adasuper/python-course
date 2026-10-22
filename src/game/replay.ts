// Plays an action log back as animation, step by step (docs/specs.md §8).
// Pure TypeScript: the view (Phaser) and the UI plug in through callbacks.
import type { Action } from '../runtime/protocol';

export type Speed = 0.5 | 1 | 2 | 4 | 'instant';
export type ReplayState = 'idle' | 'playing' | 'paused' | 'done';

export interface ReplayView {
  /** Animate one action over `ms` milliseconds (0 = jump straight to the end state). */
  apply(action: Action, ms: number): Promise<void>;
  /** Put the stage back to its starting state. */
  reset(): void;
}

export interface ReplayCallbacks {
  onState?(state: ReplayState): void;
  onAction?(index: number, action: Action): void;
  onLine?(line: number | null): void;
  onOutput?(action: Extract<Action, { t: 'out' } | { t: 'input' }>): void;
  onReset?(): void;
  /** `allAtOnce`: these actions were shown instantly (Instant speed or Skip to end). */
  onNarrate?(actions: Action[], allAtOnce: boolean): void;
}

/** How long each action takes at 1× speed. */
export function baseDuration(action: Action): number {
  switch (action.t) {
    case 'move':
      return 180;
    case 'bonk':
      return 350;
    case 'say':
      return Math.min(3000, 800 + 30 * action.text.length);
    case 'out':
      return 100;
    case 'pickup':
      return 250;
    case 'chest':
      return 600;
    case 'look':
      return 150;
    case 'wait':
      return Math.min(3000, action.seconds * 1000);
    case 'input':
      return 600;
    case 'face':
      return 100;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class ReplayEngine {
  private actions: Action[] = [];
  private index = 0;
  private token = 0;
  private narrateBuffer: Action[] = [];
  private narrateAllAtOnce = false;
  state: ReplayState = 'idle';
  speed: Speed = 1;

  constructor(
    private view: ReplayView,
    private callbacks: ReplayCallbacks = {},
  ) {}

  get position() {
    return this.index;
  }

  get length() {
    return this.actions.length;
  }

  load(actions: Action[]) {
    this.cancel();
    this.actions = actions;
    this.index = 0;
    this.view.reset();
    this.callbacks.onReset?.();
    this.setState(actions.length ? 'paused' : 'done');
  }

  setSpeed(speed: Speed) {
    this.speed = speed;
  }

  /** Play from the current position to the end. Resolves when finished or interrupted. */
  async play(): Promise<void> {
    if (this.index >= this.actions.length) {
      this.finish();
      return;
    }
    const token = ++this.token;
    this.setState('playing');
    while (this.index < this.actions.length && token === this.token) {
      await this.playOne(this.speed);
    }
    if (token === this.token && this.index >= this.actions.length) this.finish();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.token++;
    this.flushNarration();
    this.setState('paused');
  }

  /** Play exactly one action, then pause. */
  async step(): Promise<void> {
    if (this.state === 'playing') this.pause();
    if (this.index >= this.actions.length) return;
    const token = ++this.token;
    await this.playOne(this.speed === 'instant' ? 1 : this.speed);
    this.flushNarration();
    if (token !== this.token) return;
    if (this.index >= this.actions.length) this.finish();
    else this.setState('paused');
  }

  /** Jump to the end instantly. */
  async skipToEnd(): Promise<void> {
    const token = ++this.token;
    while (this.index < this.actions.length && token === this.token) {
      await this.playOne('instant');
    }
    if (token === this.token) this.finish();
  }

  async restart(): Promise<void> {
    this.load(this.actions);
    await this.play();
  }

  cancel() {
    this.token++;
    this.narrateBuffer = [];
  }

  private async playOne(speed: Speed) {
    const action = this.actions[this.index]!;
    const at = this.index;
    this.index++;
    this.callbacks.onAction?.(at, action);
    this.callbacks.onLine?.(action.ln);
    const ms = speed === 'instant' ? 0 : baseDuration(action) / speed;
    if (action.t === 'out') {
      this.callbacks.onOutput?.(action);
      if (ms) await sleep(ms);
      return;
    }
    if (action.t === 'input') {
      // The answer shows on the Scroll, and on stage the character hands it over.
      this.callbacks.onOutput?.(action);
      this.narrateBuffer.push(action);
      await Promise.all([this.view.apply(action, ms), ms ? sleep(ms) : null]);
      return;
    }
    this.narrateBuffer.push(action);
    if (speed === 'instant') this.narrateAllAtOnce = true;
    if (speed !== 'instant' && this.narrateBuffer.length > 1 && this.narrateBuffer.at(-2)!.t !== action.t) {
      const last = this.narrateBuffer.pop()!;
      this.flushNarration();
      this.narrateBuffer.push(last);
    }
    await this.view.apply(action, ms);
  }

  private flushNarration() {
    if (this.narrateBuffer.length) this.callbacks.onNarrate?.(this.narrateBuffer, this.narrateAllAtOnce);
    this.narrateBuffer = [];
    this.narrateAllAtOnce = false;
  }

  private finish() {
    this.flushNarration();
    this.callbacks.onLine?.(null);
    this.setState('done');
  }

  private setState(state: ReplayState) {
    this.state = state;
    this.callbacks.onState?.(state);
  }
}
