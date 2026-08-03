import { describe, it, expect } from 'vitest';
import { validateImageFile, generateStoragePath } from '@/lib/upload';

describe('validateImageFile', () => {
  it('accepts valid JPEG', () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('accepts valid PNG', () => {
    const file = new File([''], 'test.png', { type: 'image/png' });
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('accepts valid WebP', () => {
    const file = new File([''], 'test.webp', { type: 'image/webp' });
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('rejects GIF', () => {
    const file = new File([''], 'test.gif', { type: 'image/gif' });
    expect(() => validateImageFile(file)).toThrow('Invalid file type');
  });

  it('rejects SVG', () => {
    const file = new File([''], 'test.svg', { type: 'image/svg+xml' });
    expect(() => validateImageFile(file)).toThrow('Invalid file type');
  });

  it('rejects PDF', () => {
    const file = new File([''], 'test.pdf', { type: 'application/pdf' });
    expect(() => validateImageFile(file)).toThrow('Invalid file type');
  });

  it('rejects oversized file', () => {
    const file = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    expect(() => validateImageFile(file)).toThrow('exceeds limit');
  });

  it('accepts file at exact size limit', () => {
    const file = new File(['x'.repeat(5 * 1024 * 1024)], 'exact.jpg', { type: 'image/jpeg' });
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('accepts custom size limit', () => {
    const file = new File(['x'.repeat(10 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    expect(() => validateImageFile(file, 15)).not.toThrow();
  });
});

describe('generateStoragePath', () => {
  it('generates path with bucket prefix', () => {
    const path = generateStoragePath('logos', 'logo.jpg');
    expect(path).toMatch(/^logos\//);
  });

  it('preserves file extension', () => {
    const path = generateStoragePath('logos', 'logo.jpg');
    expect(path).toMatch(/\.jpg$/);
  });

  it('handles PNG extension', () => {
    const path = generateStoragePath('categories', 'cat.png');
    expect(path).toMatch(/\.png$/);
  });

  it('sanitizes special characters', () => {
    const path = generateStoragePath('products', 'my file (1).jpg');
    expect(path).not.toMatch(/[^a-zA-Z0-9._\-/]/);
  });

  it('generates unique paths for same filename', () => {
    const path1 = generateStoragePath('logos', 'logo.jpg');
    const path2 = generateStoragePath('logos', 'logo.jpg');
    expect(path1).not.toBe(path2);
  });

  it('handles filename without extension', () => {
    const path = generateStoragePath('logos', 'logo');
    expect(path).toMatch(/^logos\//);
  });

  it('handles very long filenames', () => {
    const longName = 'a'.repeat(100) + '.jpg';
    const path = generateStoragePath('logos', longName);
    expect(path.length).toBeLessThan(200);
  });
});

describe('StorageBucket type', () => {
  it('includes all required buckets', () => {
    const buckets = ['logos', 'covers', 'categories', 'products', 'gallery', 'qr', 'pdfs', 'assets'];
    expect(buckets).toHaveLength(8);
    expect(buckets).toContain('logos');
    expect(buckets).toContain('covers');
    expect(buckets).toContain('categories');
    expect(buckets).toContain('products');
    expect(buckets).toContain('gallery');
  });
});
