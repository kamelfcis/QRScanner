import { describe, it, expect } from 'vitest';
import { instapayImageNeedsConvert } from '@/lib/payment/instapay-image';
import { ImageValidationError, validateImageFile } from '@/lib/upload-validation';

describe('instapayImageNeedsConvert', () => {
  it('skips JPEG PNG and WebP', () => {
    expect(instapayImageNeedsConvert({ type: 'image/jpeg', name: 'a.jpg' })).toBe(false);
    expect(instapayImageNeedsConvert({ type: 'image/png', name: 'a.png' })).toBe(false);
    expect(instapayImageNeedsConvert({ type: 'image/webp', name: 'a.webp' })).toBe(false);
  });

  it('converts HEIC empty type and unknown images', () => {
    expect(instapayImageNeedsConvert({ type: 'image/heic', name: 'photo.heic' })).toBe(true);
    expect(instapayImageNeedsConvert({ type: 'image/heif', name: 'photo.heif' })).toBe(true);
    expect(instapayImageNeedsConvert({ type: '', name: 'IMG_1234.HEIC' })).toBe(true);
    expect(instapayImageNeedsConvert({ type: 'application/octet-stream', name: 'img.heic' })).toBe(
      true
    );
    expect(instapayImageNeedsConvert({ type: 'image/gif', name: 'shot.gif' })).toBe(true);
  });

  it('does not convert non-image files', () => {
    expect(instapayImageNeedsConvert({ type: 'application/pdf', name: 'doc.pdf' })).toBe(false);
  });
});

describe('validateImageFile codes', () => {
  function createFile(name: string, type: string, size: number): File {
    return new File([new ArrayBuffer(size)], name, { type });
  }

  it('throws invalid_image_type for HEIC', () => {
    try {
      validateImageFile(createFile('photo.heic', 'image/heic', 1024));
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ImageValidationError);
      expect((err as ImageValidationError).code).toBe('invalid_image_type');
    }
  });

  it('throws image_too_large with stable code', () => {
    try {
      validateImageFile(createFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024));
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ImageValidationError);
      expect((err as ImageValidationError).code).toBe('image_too_large');
    }
  });
});
