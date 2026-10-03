type VibrationPattern = number | number[];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function canVibrate(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function' &&
    !prefersReducedMotion()
  );
}

/** Fire a short haptic when the Vibration API is available. No-op on iOS, desktop, or reduced motion. */
export function vibrateIfSupported(pattern: VibrationPattern): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Unsupported or blocked — stay silent.
  }
}

export const haptic = {
  tick: () => vibrateIfSupported(8),
  confirm: () => vibrateIfSupported(12),
  addToCart: () => vibrateIfSupported([10, 40, 15]),
  remove: () => vibrateIfSupported([18, 40, 18]),
  success: () => vibrateIfSupported([12, 50, 20]),
  error: () => vibrateIfSupported([30, 40, 30]),
};
