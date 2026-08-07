/** Logo occupies ~22% of the QR code area (within scan-safe limits). */
export const LOGO_SIZE_RATIO = 0.22;

/** Inner padding between the white circle edge and the logo image. */
export const LOGO_PADDING_RATIO = 0.12;

export const DEFAULT_QR_DOWNLOAD_SIZE = 1024;

export interface LogoImageSettings {
  src: string;
  height: number;
  width: number;
  excavate: boolean;
}

export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'restaurant'
  );
}

export function buildQRFilename(options: {
  restaurantName?: string | null;
  qrName?: string | null;
  tableNumber?: number | null;
}): string {
  const slug = slugify(options.restaurantName || options.qrName || 'restaurant');
  const tablePart = options.tableNumber != null ? `-table-${options.tableNumber}` : '';
  return `${slug}-qr${tablePart}`;
}

export function getLogoPixelSize(qrPixelSize: number): number {
  return Math.floor(qrPixelSize * LOGO_SIZE_RATIO);
}

export function getLogoImageSettings(logoSrc: string, qrPixelSize: number): LogoImageSettings {
  const logoSize = getLogoPixelSize(qrPixelSize);
  return {
    src: logoSrc,
    height: logoSize,
    width: logoSize,
    excavate: true,
  };
}

export function loadCrossOriginImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Builds a circular white-backed logo suitable for QR center overlay.
 * Using a data URL avoids CORS issues when drawing to canvas for PNG export.
 */
export async function createLogoOverlayDataUrl(
  logoUrl: string,
  overlayPixelSize: number
): Promise<string> {
  const img = await loadCrossOriginImage(logoUrl);
  const canvas = document.createElement('canvas');
  canvas.width = overlayPixelSize;
  canvas.height = overlayPixelSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const radius = overlayPixelSize / 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, Math.PI * 2);
  ctx.fill();

  const padding = overlayPixelSize * LOGO_PADDING_RATIO;
  const innerSize = overlayPixelSize - padding * 2;
  ctx.drawImage(img, padding, padding, innerSize, innerSize);

  return canvas.toDataURL('image/png');
}
