import type { ThemeSettings } from '@/types';

export const DEFAULT_THEME: ThemeSettings = {
  primary_color: '#0E7490',
  secondary_color: '#155E75',
  accent_color: '#F97316',
  background_color: '#F0FDFA',
};

/** Deep ocean charcoal — night-kitchen base for Aklet Gambary dark mode */
const NIGHT_KITCHEN_BASE = '#080C0E';

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

function mixHex(hex1: string, hex2: string, weight: number): string {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return hex1;
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex(
    rgb1[0] * (1 - w) + rgb2[0] * w,
    rgb1[1] * (1 - w) + rgb2[1] * w,
    rgb1[2] * (1 - w) + rgb2[2] * w
  );
}

function getContrastForeground(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.55 ? '#0A1012' : '#FFFFFF';
}

/** Derive night-kitchen surfaces from brand secondary (teal) + charcoal base */
function deriveDarkSurfaces(secondary: string) {
  const tintedBase = mixHex(adjustDarkness(secondary, 78), NIGHT_KITCHEN_BASE, 0.62);
  const background = tintedBase;
  const card = adjustBrightness(background, 5);
  const popover = adjustBrightness(background, 7);
  const muted = adjustBrightness(background, 11);
  const border = mixHex(adjustBrightness(background, 16), adjustDarkness(secondary, 40), 0.35);
  const input = border;

  return { background, card, popover, muted, border, input };
}

const MANAGED_THEME_KEYS = [
  '--brand-primary',
  '--brand-primary-light',
  '--brand-primary-dark',
  '--brand-secondary',
  '--brand-secondary-light',
  '--brand-secondary-dark',
  '--brand-accent',
  '--brand-background',
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--border',
  '--input',
  '--ring',
  '--chart-1',
  '--chart-2',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
] as const;

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
    '--brand-primary': primary,
    '--brand-primary-light': primaryLight,
    '--brand-primary-dark': primaryDark,
    '--brand-secondary': secondary,
    '--brand-secondary-light': secondaryLight,
    '--brand-secondary-dark': secondaryDark,
    '--brand-accent': accent,
    '--brand-background': background,
  };

  if (mode === 'light') {
    const foreground = '#1A1814';
    const muted = mixHex(background, '#E8E4DE', 0.55);
    const border = mixHex(background, '#D8D2C8', 0.45);

    return {
      ...brandVars,
      '--background': background,
      '--foreground': foreground,
      '--card': '#FFFFFF',
      '--card-foreground': foreground,
      '--popover': '#FFFFFF',
      '--popover-foreground': foreground,
      '--primary': primaryDark,
      '--primary-foreground': '#FFFFFF',
      '--secondary': secondary,
      '--secondary-foreground': '#FFFFFF',
      '--muted': muted,
      '--muted-foreground': '#5C6569',
      '--accent': accent,
      '--accent-foreground': getContrastForeground(accent),
      '--destructive': '#DC2626',
      '--border': border,
      '--input': border,
      '--ring': primaryDark,
      '--chart-1': accent,
      '--chart-2': secondary,
      '--sidebar': mixHex(background, '#EDE8E0', 0.35),
      '--sidebar-foreground': foreground,
      '--sidebar-primary': primaryDark,
      '--sidebar-primary-foreground': '#FFFFFF',
      '--sidebar-accent': mixHex(background, '#E5DFD6', 0.4),
      '--sidebar-accent-foreground': foreground,
      '--sidebar-border': border,
      '--sidebar-ring': primaryDark,
    };
  }

  const surfaces = deriveDarkSurfaces(secondary);
  const foreground = '#F2F6F8';
  const mutedForeground = mixHex(adjustBrightness(secondary, 35), '#8B9BA8', 0.5);
  const accentFg = getContrastForeground(accent);
  const primaryOnDark = accent;

  return {
    ...brandVars,
    '--brand-background': surfaces.background,
    '--background': surfaces.background,
    '--foreground': foreground,
    '--card': surfaces.card,
    '--card-foreground': foreground,
    '--popover': surfaces.popover,
    '--popover-foreground': foreground,
    '--primary': primaryOnDark,
    '--primary-foreground': accentFg,
    '--secondary': secondaryLight,
    '--secondary-foreground': '#FFFFFF',
    '--muted': surfaces.muted,
    '--muted-foreground': mutedForeground,
    '--accent': accent,
    '--accent-foreground': accentFg,
    '--destructive': '#EF4444',
    '--border': surfaces.border,
    '--input': surfaces.input,
    '--ring': accent,
    '--chart-1': accent,
    '--chart-2': secondaryLight,
    '--sidebar': mixHex(surfaces.background, '#000000', 0.15),
    '--sidebar-foreground': foreground,
    '--sidebar-primary': accent,
    '--sidebar-primary-foreground': accentFg,
    '--sidebar-accent': surfaces.muted,
    '--sidebar-accent-foreground': foreground,
    '--sidebar-border': surfaces.border,
    '--sidebar-ring': accent,
  };
}

export function themeToCssText(theme: Partial<ThemeSettings>, mode: 'light' | 'dark'): string {
  const vars = themeToCssVariables(theme, mode);
  return `:root{${Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(';')}}`;
}

export function applyBrandTheme(theme: Partial<ThemeSettings>, mode: 'light' | 'dark'): void {
  const root = document.documentElement;

  MANAGED_THEME_KEYS.forEach((key) => root.style.removeProperty(key));

  const vars = themeToCssVariables(theme, mode);
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function clearBrandTheme(): void {
  const root = document.documentElement;
  MANAGED_THEME_KEYS.forEach((key) => root.style.removeProperty(key));
}
