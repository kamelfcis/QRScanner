import { describe, expect, it } from 'vitest';
import { safeFormatMessage } from '@/lib/i18n/safeMessage';

describe('safeFormatMessage', () => {
  it('returns translated text when placeholders are provided', () => {
    const t = (key: string, values?: Record<string, string | number | Date>) => {
      if (key === 'copyright') return `© ${values?.year} ${values?.name}. All rights reserved.`;
      return key;
    };

    expect(safeFormatMessage(t, 'copyright', { year: 2026, name: 'MAZEN STORE' })).toBe(
      '© 2026 MAZEN STORE. All rights reserved.'
    );
  });

  it('falls back when FORMATTING_ERROR is thrown', () => {
    const t = (key: string, values?: Record<string, string | number | Date>) => {
      if (values) {
        const err = new Error('Missing value') as Error & { code: string };
        err.code = 'FORMATTING_ERROR';
        throw err;
      }
      return `© {year} {name}. All rights reserved.`;
    };

    expect(safeFormatMessage(t, 'copyright', { year: 2026, name: 'MAZEN STORE' })).toBe(
      '© 2026 MAZEN STORE. All rights reserved.'
    );
  });
});
