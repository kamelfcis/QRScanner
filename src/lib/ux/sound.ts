export type SoundKind = 'add' | 'checkout' | 'success' | 'error';

/** `1` on, `0` muted. Missing key means sounds are on. */
export const SOUND_STORAGE_KEY = 'engaz-ui-sound';

const MASTER_VOLUME = 0.25;

let audioCtx: AudioContext | null = null;

const soundListeners = new Set<() => void>();

export function subscribeSoundEnabled(listener: () => void): () => void {
  soundListeners.add(listener);
  return () => {
    soundListeners.delete(listener);
  };
}

function emitSoundChange() {
  soundListeners.forEach((listener) => listener());
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Private mode / quota — the toggle still notifies listeners for this tab.
  }
  emitSoundChange();
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new Ctx();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(MASTER_VOLUME, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function schedule(ctx: AudioContext, kind: SoundKind) {
  const now = ctx.currentTime + 0.01;
  if (kind === 'add') {
    tone(ctx, 880, now, 0.07);
    return;
  }
  if (kind === 'checkout') {
    tone(ctx, 523.25, now, 0.09);
    tone(ctx, 659.25, now + 0.08, 0.11);
    return;
  }
  if (kind === 'success') {
    tone(ctx, 523.25, now, 0.12);
    tone(ctx, 659.25, now + 0.1, 0.12);
    tone(ctx, 783.99, now + 0.2, 0.18);
    return;
  }
  tone(ctx, 220, now, 0.1, 'triangle');
  tone(ctx, 164.81, now + 0.09, 0.14, 'triangle');
}

/** Tiny UI chirp. Never throws, never autoplays on load. */
export function playSound(kind: SoundKind): void {
  if (!isSoundEnabled() || prefersReducedMotion()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    schedule(ctx, kind);
  } catch {
    // Autoplay policy or a missing AudioContext — stay silent.
  }
}
