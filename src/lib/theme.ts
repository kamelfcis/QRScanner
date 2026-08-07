import type { ThemeSettings } from '@/types';

export const DEFAULT_THEME: ThemeSettings = {
  primary_color: '#0E7490',
  secondary_color: '#155E75',
  accent_color: '#F97316',
  background_color: '#F0FDFA',
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR.test(color);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = percent / 100;
  return rgbToHex(
    rgb[0] + (255 - rgb[0]) * factor,
    rgb[1] + (255 - rgb[1]) * factor,
    rgb[2] + (255 - rgb[2]) * factor
  );
}

function adjustDarkness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 - percent / 100;
  return rgbToHex(rgb[0] * factor, rgb[1] * factor, rgb[2] * factor);
}

function getContrastForeground(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.55 ? '#1A1814' : '#FFFFFF';
}

export function themeToCssVariables(
  theme: Partial<ThemeSettings>,
  mode: 'light' | 'dark'
): Record<string, string> {
  const primary = theme.primary_color || DEFAULT_THEME.primary_color;
  const secondary = theme.secondary_color || DEFAULT_THEME.secondary_color;
  const accent = theme.accent_color || DEFAULT_THEME.accent_color;
  const background = theme.background_color || DEFAULT_THEME.background_color;

  const primaryLight = adjustBrightness(primary, 18);
  const primaryDark = adjustDarkness(primary, 22);
  const secondaryLight = adjustBrightness(secondary, 15);
  const secondaryDark = adjustDarkness(secondary, 35);

  const brandVars: Record<string, string> = {
    '--color-brand-primary': primary,
    '--color-brand-primary-light': primaryLight,
    '--color-brand-primary-dark': primaryDark,
    '--color-brand-secondary': secondary,
    '--color-brand-secondary-light': secondaryLight,
    '--color-brand-secondary-dark': secondaryDark,
    '--color-brand-accent': accent,
    '--color-brand-background': background,
  };

  if (mode === 'light') {
    return {
      ...brandVars,
      '--primary': primaryDark,
      '--primary-foreground': '#FFFFFF',
      '--secondary': secondary,
      '--secondary-foreground': '#FFFFFF',
      '--accent': accent,
      '--accent-foreground': getContrastForeground(accent),
      '--ring': primaryDark,
      '--chart-1': accent,
      '--sidebar-primary': primaryDark,
      '--sidebar-primary-foreground': '#FFFFFF',
      '--sidebar-ring': primaryDark,
    };
  }

  return {
    ...brandVars,
    '--primary': accent,
    '--primary-foreground': getContrastForeground(accent),
    '--secondary': secondaryLight,
    '--secondary-foreground': '#FFFFFF',
    '--accent': accent,
    '--accent-foreground': getContrastForeground(accent),
    '--ring': accent,
    '--chart-1': accent,
    '--sidebar-primary': accent,
    '--sidebar-primary-foreground': getContrastForeground(accent),
    '--sidebar-ring': accent,
  };
}

export function applyBrandTheme(theme: Partial<ThemeSettings>, mode: 'light' | 'dark'): void {
  const root = document.documentElement;
  const vars = themeToCssVariables(theme, mode);

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function clearBrandTheme(): void {
  const root = document.documentElement;
  const keys = [
    '--color-brand-primary',
    '--color-brand-primary-light',
    '--color-brand-primary-dark',
    '--color-brand-secondary',
    '--color-brand-secondary-light',
    '--color-brand-secondary-dark',
    '--color-brand-accent',
    '--color-brand-background',
    '--primary',
    '--primary-foreground',
    '--secondary',
    '--secondary-foreground',
    '--accent',
    '--accent-foreground',
    '--ring',
    '--chart-1',
    '--sidebar-primary',
    '--sidebar-primary-foreground',
    '--sidebar-ring',
  ];

  keys.forEach((key) => root.style.removeProperty(key));
}
