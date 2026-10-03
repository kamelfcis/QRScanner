export interface QRTemplate {
  name: string;
  label: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  fgColor: string;
  roundedStyle: 'square' | 'rounded' | 'circle';
  eyeStyle: 'square' | 'rounded' | 'circle';
}

/** Shared dashboard templates. Mazen defaults stay classic; this list is unchanged. */
export const QR_TEMPLATES: Record<string, QRTemplate> = {
  classic: {
    name: 'classic',
    label: 'Classic',
    primaryColor: '#000000',
    secondaryColor: '#B8860B',
    bgColor: '#FFFFFF',
    fgColor: '#000000',
    roundedStyle: 'square',
    eyeStyle: 'square',
  },
  luxury: {
    name: 'luxury',
    label: 'Luxury',
    primaryColor: '#B8860B',
    secondaryColor: '#8B0000',
    bgColor: '#1A1A2E',
    fgColor: '#B8860B',
    roundedStyle: 'rounded',
    eyeStyle: 'rounded',
  },
  minimal: {
    name: 'minimal',
    label: 'Minimal',
    primaryColor: '#333333',
    secondaryColor: '#666666',
    bgColor: '#FFFFFF',
    fgColor: '#333333',
    roundedStyle: 'circle',
    eyeStyle: 'circle',
  },
  golden: {
    name: 'golden',
    label: 'Golden',
    primaryColor: '#B8860B',
    secondaryColor: '#DAA520',
    bgColor: '#FFFBF0',
    fgColor: '#B8860B',
    roundedStyle: 'rounded',
    eyeStyle: 'circle',
  },
  dark: {
    name: 'dark',
    label: 'Dark',
    primaryColor: '#B8860B',
    secondaryColor: '#8B0000',
    bgColor: '#0D1117',
    fgColor: '#E6EDF3',
    roundedStyle: 'square',
    eyeStyle: 'rounded',
  },
};

export const OSTOL_LINKS_QR_TEMPLATE = 'ostolSeafood';

/** Ostol /links QR only — not a Mazen default and not listed in TemplateSwitcher. */
export const OSTOL_QR_TEMPLATES: Record<string, QRTemplate> = {
  [OSTOL_LINKS_QR_TEMPLATE]: {
    name: OSTOL_LINKS_QR_TEMPLATE,
    label: 'Ostol Seafood',
    primaryColor: '#2DD4BF',
    secondaryColor: '#0B3A42',
    bgColor: '#07141F',
    fgColor: '#5EEAD4',
    roundedStyle: 'rounded',
    eyeStyle: 'circle',
  },
};

export function getTemplate(name: string): QRTemplate {
  return QR_TEMPLATES[name] || OSTOL_QR_TEMPLATES[name] || QR_TEMPLATES.classic;
}

export function getTemplateNames(): string[] {
  return Object.keys(QR_TEMPLATES);
}
