import { describe, it, expect } from 'vitest';
import {
  buildQRFilename,
  getLogoImageSettings,
  getLogoPixelSize,
  slugify,
  LOGO_SIZE_RATIO,
} from '@/lib/qr/logo-overlay';

describe('QR logo overlay helpers', () => {
  it('slugify normalizes restaurant names', () => {
    expect(slugify('Warda Shamya')).toBe('warda-shamya');
    expect(slugify('  Café #1! ')).toBe('caf-1');
  });

  it('buildQRFilename includes restaurant slug and table', () => {
    expect(
      buildQRFilename({
        restaurantName: 'Warda Shamya',
        tableNumber: 5,
      })
    ).toBe('warda-shamya-qr-table-5');
  });

  it('buildQRFilename falls back to qr name', () => {
    expect(
      buildQRFilename({
        qrName: 'Main Entrance',
      })
    ).toBe('main-entrance-qr');
  });

  it('getLogoPixelSize uses configured ratio', () => {
    expect(getLogoPixelSize(1000)).toBe(Math.floor(1000 * LOGO_SIZE_RATIO));
  });

  it('getLogoImageSettings enables excavation for scan reliability', () => {
    expect(getLogoImageSettings('data:image/png;base64,abc', 512)).toEqual({
      src: 'data:image/png;base64,abc',
      height: getLogoPixelSize(512),
      width: getLogoPixelSize(512),
      excavate: true,
    });
  });
});
