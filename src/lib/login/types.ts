export type LoginTenantId = 'harameen' | 'aklet' | 'warda' | 'custom';

export interface LoginThemeTokens {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  panelBackground: string;
  panelForeground: string;
}

export interface LoginBrandConfig {
  tenantId: LoginTenantId;
  nameAr: string;
  nameEn: string;
  taglineAr: string;
  taglineEn: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  tokens: LoginThemeTokens;
}
