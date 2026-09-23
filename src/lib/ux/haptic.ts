export type HapticKind = 'light' | 'medium' | 'success' | 'error';

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 18,
  success: [12, 40, 20],
  error: [28, 36, 28],
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Short vibration. No-op when the API is missing or motion should stay still. */
export function triggerHaptic(kind: HapticKind): void {
  if (prefersReducedMotion()) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Unsupported or blocked — stay silent.
  }
}
