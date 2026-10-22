// Sound (docs/specs.md §14.4): short effects and quiet background music, made with the Web
// Audio API (no sound files to download). Effects are off by default, for classrooms.
import type { Settings } from '../state/profile';

export type Effect = 'success' | 'error' | 'bonk' | 'pickup' | 'badge';

// Each effect is a few notes: [frequency in Hz, start in s, length in s].
const EFFECTS: Record<Effect, [number, number, number][]> = {
  success: [
    [523, 0, 0.12],
    [659, 0.1, 0.12],
    [784, 0.2, 0.2],
  ],
  error: [
    [330, 0, 0.15],
    [262, 0.12, 0.2],
  ],
  bonk: [[140, 0, 0.12]],
  pickup: [
    [880, 0, 0.08],
    [1175, 0.06, 0.1],
  ],
  badge: [
    [659, 0, 0.1],
    [784, 0.09, 0.1],
    [1047, 0.18, 0.25],
  ],
};

let context: AudioContext | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let volumes: Settings['audio'] = { master: 0.8, music: 0, effects: 0 };

function ctx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(freq: number, start: number, length: number, gain: number, type: OscillatorType = 'triangle') {
  const ac = ctx();
  if (!ac || gain <= 0) return;
  const at = ac.currentTime + start;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(gain, at + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(amp).connect(ac.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

export function playEffect(effect: Effect) {
  const gain = volumes.master * volumes.effects * 0.3;
  if (gain <= 0) return;
  for (const [freq, start, length] of EFFECTS[effect]) tone(freq, start, length, gain);
}

// A slow, quiet tune on a pentatonic scale.
const TUNE = [392, 440, 523, 587, 659, 587, 523, 440];

/** Applies the volume settings; music starts or stops to match. Browsers only allow sound
 *  after the player has clicked or pressed a key, which every setting change is. */
export function applyAudio(audio: Settings['audio']) {
  volumes = audio;
  const musicGain = audio.master * audio.music * 0.08;
  if (musicGain > 0 && !musicTimer) {
    let step = 0;
    musicTimer = setInterval(() => {
      const g = volumes.master * volumes.music * 0.08;
      if (g > 0) tone(TUNE[step++ % TUNE.length]!, 0, 0.9, g, 'sine');
    }, 700);
  } else if (musicGain <= 0 && musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
