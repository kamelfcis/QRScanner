let audioCtx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
let ringActive = false;
let reducedMotion = false;

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

function scheduleBurst(ctx: AudioContext, when: number) {
  playTone(ctx, 800, when, 0.18);
  playTone(ctx, 1000, when + 0.2, 0.18);
}

function scheduleLoop() {
  if (!ringActive) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  scheduleBurst(ctx, now + 0.02);
  scheduleBurst(ctx, now + 0.45);

  ringTimer = setTimeout(scheduleLoop, 1400);
}

export function isOrderRingBlocked(): boolean {
  return Boolean(reducedMotion);
}

export async function resumeOrderRingAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  return ctx.state === 'running';
}

export function startOrderRing(options?: { prefersReducedMotion?: boolean }) {
  reducedMotion = options?.prefersReducedMotion === true;
  if (reducedMotion) return;

  ringActive = true;
  void resumeOrderRingAudio().then((ok) => {
    if (ok && ringActive) scheduleLoop();
  });
}

export function stopOrderRing() {
  ringActive = false;
  if (ringTimer) {
    clearTimeout(ringTimer);
    ringTimer = null;
  }
}

export function isOrderRingRunning(): boolean {
  return ringActive;
}
