import type { RestaurantSettings } from '@/types';

export interface QrUrlConfig {
  siteUrl: string;
  targetPath: string;
}

/** Default QR landing path. Warda uses `/welcome`; Aklet Gambary uses `/`. */
export function getDefaultQrTargetPath(): string {
  return process.env.NEXT_PUBLIC_QR_TARGET_PATH ?? '/welcome';
}

export function resolveSiteUrl(override?: string | null): string {
  if (override?.trim()) {
    return override.trim().replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      window.location.origin
    ).replace(/\/$/, '');
  }

  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://engzqrmenu.vercel.app'
  ).replace(/\/$/, '');
}

export function resolveQrUrlConfig(
  settings?: Pick<RestaurantSettings, 'qr_site_url' | 'qr_target_path'> | null
): QrUrlConfig {
  return {
    siteUrl: resolveSiteUrl(settings?.qr_site_url),
    targetPath: settings?.qr_target_path?.trim() || getDefaultQrTargetPath(),
  };
}

function normalizeTargetPath(targetPath: string): string {
  if (targetPath === '/') return '';
  return targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
}

/** Build the customer-facing URL embedded in table QR codes. */
export function buildQrTargetUrl(config: QrUrlConfig, tableNumber?: number | null): string {
  const path = normalizeTargetPath(config.targetPath);
  const params = new URLSearchParams();
  if (tableNumber != null) {
    params.set('table', String(tableNumber));
  }
  const qs = params.toString();
  const url = `${config.siteUrl}${path}`;
  return qs ? `${url}?${qs}` : url;
}

/** @deprecated Prefer buildQrTargetUrl with resolveQrUrlConfig. */
export function buildWelcomeUrl(
  siteUrl: string,
  tableNumber?: number | null,
  targetPath?: string
): string {
  return buildQrTargetUrl(
    {
      siteUrl: siteUrl.replace(/\/$/, ''),
      targetPath: targetPath ?? getDefaultQrTargetPath(),
    },
    tableNumber
  );
}
