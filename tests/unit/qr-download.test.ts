import { describe, it, expect } from 'vitest';
import {
  downloadQRAsSVG,
  downloadQRAsPNG,
  downloadQRAsPDF,
  downloadQRPrint,
} from '@/lib/qr/download';

describe('QR download utilities', () => {
  it('exports all download functions', () => {
    expect(typeof downloadQRAsSVG).toBe('function');
    expect(typeof downloadQRAsPNG).toBe('function');
    expect(typeof downloadQRAsPDF).toBe('function');
    expect(typeof downloadQRPrint).toBe('function');
  });

  it('downloadQRAsSVG throws when no element', () => {
    expect(() => downloadQRAsSVG(null, 'test')).toThrow('No QR element found');
  });

  it('downloadQRAsPNG throws when no elements', async () => {
    await expect(downloadQRAsPNG(null, null, 'test', 300)).rejects.toThrow('No QR element found');
  });

  it('downloadQRAsPDF throws when no elements', async () => {
    await expect(downloadQRAsPDF(null, null, 'test', 300)).rejects.toThrow('No QR element found');
  });

  it('downloadQRPrint throws when no elements', async () => {
    await expect(downloadQRPrint(null, null, 'test', 300)).rejects.toThrow('No QR element found');
  });
});
