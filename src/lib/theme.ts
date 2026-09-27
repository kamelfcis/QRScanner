import type { ThemeSettings } from '@/types';

export const DEFAULT_THEME: ThemeSettings = {
  primary_color: '#FFB700',
  secondary_color: '#6B0F1A',
  accent_color: '#FFB700',
  background_color: '#FAF8F5',
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** Accepts #RRGGBB, RRGGBB, and malformed values like FFFAF0# */
export function normalizeHexColor(color: string | undefined | null): string | null {
  if (!color || typeof color !== 'string') return null;
  let hex = color.trim().replace(/#+$/, '').replace(/^#/, '');
  hex = hex.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
  if (hex.length !== 6) return null;
  return `#${hex}`;
}

export function isValidHexColor(color: string): boolean {
  return normalizeHexColor(color) !== null;
}

export function resolveThemeSettings(theme: Partial<ThemeSettings>): ThemeSettings {
  return {
    primary_color: normalizeHexColor(theme.primary_color) || DEFAULT_THEME.primary_color,
    secondary_color: normalizeHexColor(theme.secondary_color) || DEFAULT_THEME.secondary_color,
    accent_color: normalizeHexColor(theme.accent_color) || DEFAULT_THEME.accent_color,
    background_color: normalizeHexColor(theme.background_color) || DEFAULT_THEME.background_color,
  };
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

function isLightBackground(hex: string): boolean {
  return getContrastForeground(hex) === '#1A1814';
}

function getMenuInk(background: string): { ink: string; inkSoft: string } {
  return isLightBackground(background)
    ? { ink: '#1c1712', inkSoft: '#6e655c' }
    : { ink: '#f5f5f5', inkSoft: '#9a9a9a' };
}

function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function themeToCssVariables(
  theme: Partial<ThemeSettings>,
  mode: 'light' | 'dark'
): Record<string, string> {
  const resolved = resolveThemeSettings(theme);
  const {
    primary_color: primary,
    secondary_color: secondary,
    accent_color: accent,
    background_color: background,
  } = resolved;

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

/** Maps dashboard theme onto menu/landing CSS vars (overrides hardcoded tenant palettes). */
export function themeToMenuCssVariables(theme: Partial<ThemeSettings>): Record<string, string> {
  const {
    primary_color: primary,
    secondary_color: secondary,
    accent_color: accent,
    background_color: background,
  } = resolveThemeSettings(theme);
  const { ink, inkSoft } = getMenuInk(background);
  const lightPaper = isLightBackground(background);
  const paperDeep = lightPaper ? adjustDarkness(background, 4) : adjustBrightness(background, 6);
  const surface = lightPaper ? adjustBrightness(background, 3) : adjustBrightness(background, 8);
  const surfaceElevated = lightPaper ? '#ffffff' : adjustBrightness(background, 12);
  const onWine = lightPaper ? ink : background;
  const chip = lightPaper ? adjustBrightness(background, 3) : adjustBrightness(background, 12);
  const primaryLight = adjustBrightness(primary, 18);
  const primaryDark = adjustDarkness(primary, 22);
  const secondaryLight = adjustBrightness(secondary, 15);
  const secondaryDark = adjustDarkness(secondary, 35);

  return {
    '--menu-paper': background,
    '--menu-paper-deep': paperDeep,
    '--menu-surface': surface,
    '--menu-surface-elevated': surfaceElevated,
    '--menu-ink': ink,
    '--menu-ink-soft': inkSoft,
    '--menu-line': rgbaFromHex(ink, lightPaper ? 0.1 : 0.08),
    '--menu-line-strong': rgbaFromHex(ink, lightPaper ? 0.16 : 0.14),
    '--menu-gold': primary,
    '--menu-gold-soft': secondary,
    '--menu-gold-faint': rgbaFromHex(primary, 0.45),
    '--menu-gold-wash': rgbaFromHex(accent, 0.12),
    '--menu-gold-line': rgbaFromHex(primary, 0.55),
    '--menu-gold-line-strong': rgbaFromHex(accent, 0.75),
    '--menu-wine': accent,
    '--menu-wine-deep': adjustDarkness(accent, 12),
    '--menu-wine-wash': rgbaFromHex(accent, 0.14),
    '--menu-on-wine': onWine,
    '--menu-chip': chip,
    '--menu-on-wine-wash': rgbaFromHex(onWine, lightPaper ? 0.08 : 0.14),
    '--color-brand-primary': primary,
    '--color-brand-primary-light': primaryLight,
    '--color-brand-primary-dark': primaryDark,
    '--color-brand-secondary': secondary,
    '--color-brand-secondary-light': secondaryLight,
    '--color-brand-secondary-dark': secondaryDark,
    '--color-brand-accent': accent,
    '--color-brand-background': background,
    '--ak-ember': accent,
    '--ak-gold': primary,
    '--background': background,
    '--foreground': ink,
    '--card': surface,
    '--card-foreground': ink,
    '--popover': surfaceElevated,
    '--popover-foreground': ink,
    '--primary': primary,
    '--primary-foreground': getContrastForeground(primary),
    '--secondary': secondary,
    '--secondary-foreground': getContrastForeground(secondary),
    '--muted': paperDeep,
    '--muted-foreground': inkSoft,
    '--accent': accent,
    '--accent-foreground': getContrastForeground(accent),
    '--border': rgbaFromHex(ink, lightPaper ? 0.1 : 0.08),
    '--input': rgbaFromHex(ink, lightPaper ? 0.16 : 0.14),
    '--ring': accent,
  };
}

/**
 * Dashboard brand colors. In dark mode these are the only inline overrides;
 * paper, ink, card, muted, and border stay with the CSS shell.
 */
const MENU_BRAND_CSS_KEYS = new Set([
  '--menu-gold',
  '--menu-gold-soft',
  '--menu-gold-faint',
  '--menu-gold-wash',
  '--menu-gold-line',
  '--menu-gold-line-strong',
  '--menu-wine',
  '--menu-wine-deep',
  '--menu-wine-wash',
  '--ak-ember',
  '--ak-gold',
  '--color-brand-primary',
  '--color-brand-primary-light',
  '--color-brand-primary-dark',
  '--color-brand-secondary',
  '--color-brand-secondary-light',
  '--color-brand-secondary-dark',
  '--color-brand-accent',
]);

/** Surface keys the menu mapper writes. Dark mode clears them so the CSS shell returns. */
const MENU_SURFACE_CSS_KEYS = [
  '--menu-paper',
  '--menu-paper-deep',
  '--menu-surface',
  '--menu-surface-elevated',
  '--menu-ink',
  '--menu-ink-soft',
  '--menu-line',
  '--menu-line-strong',
  '--menu-on-wine',
  '--menu-chip',
  '--menu-on-wine-wash',
  '--ak-photo-scrim',
  '--color-brand-background',
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
  '--border',
  '--input',
  '--ring',
] as const;

export type MenuColorMode = 'light' | 'dark';

export function applyMenuBrandTheme(theme: Partial<ThemeSettings>, mode: MenuColorMode): void {
  if (typeof document === 'undefined') return;
  const vars = themeToMenuCssVariables(theme);
  const targets: HTMLElement[] = [];
  if (document.body) targets.push(document.body);
  document.querySelectorAll<HTMLElement>('[data-menu-theme]').forEach((node) => {
    if (!targets.includes(node)) targets.push(node);
  });

  const brandOnly = mode === 'dark';

  targets.forEach((node) => {
    if (brandOnly) {
      for (const key of MENU_SURFACE_CSS_KEYS) {
        node.style.removeProperty(key);
      }
    }
    Object.entries(vars).forEach(([key, value]) => {
      if (brandOnly && !MENU_BRAND_CSS_KEYS.has(key)) {
        node.style.removeProperty(key);
        return;
      }
      node.style.setProperty(key, value);
    });
  });
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
