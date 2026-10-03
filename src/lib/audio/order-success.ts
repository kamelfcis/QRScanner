let audioCtx: AudioContext | null = null;
let reducedMotion = false;

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;

export const ORDER_SUCCESS_SOUND_KEY = 'warda-order-success-sound';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (reducedMotion) return null;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playTone(ctx: AudioContext, frequency: number, start: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function isOrderSuccessSoundBlocked(): boolean {
  return Boolean(reducedMotion);
}

export async function resumeOrderSuccessAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  return ctx.state === 'running';
}

export function playOrderSuccessSound(options?: { prefersReducedMotion?: boolean }): void {
  reducedMotion = options?.prefersReducedMotion === true;
  if (reducedMotion) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + 0.02;
  playTone(ctx, C5, now, 0.16);
  playTone(ctx, E5, now + 0.12, 0.16);
  playTone(ctx, G5, now + 0.24, 0.22);
}
