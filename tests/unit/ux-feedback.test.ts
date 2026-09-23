import { afterEach, describe, expect, it, vi } from 'vitest';
import { triggerHaptic } from '@/lib/ux/haptic';
import { SOUND_STORAGE_KEY, isSoundEnabled, playSound, setSoundEnabled } from '@/lib/ux/sound';

function mockMotion(reduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) =>
      ({
        matches: reduced && query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  });
}

describe('triggerHaptic', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('calls navigator.vibrate for each kind', () => {
    mockMotion(false);
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });

    triggerHaptic('light');
    triggerHaptic('medium');
    triggerHaptic('success');
    triggerHaptic('error');

    expect(vibrate).toHaveBeenNthCalledWith(1, 10);
    expect(vibrate).toHaveBeenNthCalledWith(2, 18);
    expect(vibrate).toHaveBeenNthCalledWith(3, [12, 40, 20]);
    expect(vibrate).toHaveBeenNthCalledWith(4, [28, 36, 28]);
  });

  it('skips vibration when reduced motion is requested', () => {
    mockMotion(true);
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });

    triggerHaptic('success');

    expect(vibrate).not.toHaveBeenCalled();
  });

  it('stays silent when vibrate is missing', () => {
    expect(() => triggerHaptic('light')).not.toThrow();
  });
});

describe('sound mute flag', () => {
  afterEach(() => {
    localStorage.removeItem(SOUND_STORAGE_KEY);
    vi.restoreAllMocks();
  });

  it('defaults on and persists mute in localStorage', () => {
    localStorage.removeItem(SOUND_STORAGE_KEY);
    expect(isSoundEnabled()).toBe(true);

    setSoundEnabled(false);
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('0');
    expect(isSoundEnabled()).toBe(false);

    setSoundEnabled(true);
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('1');
    expect(isSoundEnabled()).toBe(true);
  });

  it('does not play while muted', () => {
    setSoundEnabled(false);
    const Ctx = vi.fn();
    vi.stubGlobal('AudioContext', Ctx);

    playSound('add');

    expect(Ctx).not.toHaveBeenCalled();
  });
});
