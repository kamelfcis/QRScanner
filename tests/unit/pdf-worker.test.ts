import { describe, expect, it } from 'vitest';
import { ensurePdfWorkerConfigured } from '@/lib/import/pdf-worker';

describe('pdf worker configuration', () => {
  it('configures worker without throwing', () => {
    expect(() => ensurePdfWorkerConfigured()).not.toThrow();
  });

  it('is idempotent', () => {
    ensurePdfWorkerConfigured();
    expect(() => ensurePdfWorkerConfigured()).not.toThrow();
  });
});
