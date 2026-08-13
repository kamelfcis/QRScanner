export const THEME_STORAGE_KEY = 'engaz-theme';

export type Theme = 'light' | 'dark';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
}
