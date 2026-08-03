import { describe, it, expect } from 'vitest';
import { validateImageFile, generateStoragePath } from '@/lib/upload';

describe('validateImageFile', () => {
  function createFile(name: string, type: string, size: number): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], name, { type });
  }

  it('accepts valid JPEG', () => {
    const file = createFile('test.jpg', 'image/jpeg', 1024);
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('accepts valid PNG', () => {
    const file = createFile('test.png', 'image/png', 1024);
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('accepts valid WebP', () => {
    const file = createFile('test.webp', 'image/webp', 1024);
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('rejects GIF', () => {
    const file = createFile('test.gif', 'image/gif', 1024);
    expect(() => validateImageFile(file)).toThrow('Invalid file type');
  });

  it('rejects SVG', () => {
    const file = createFile('test.svg', 'image/svg+xml', 1024);
    expect(() => validateImageFile(file)).toThrow('Invalid file type');
  });

  it('rejects PDF', () => {
    const file = createFile('test.pdf', 'application/pdf', 1024);
    expect(() => validateImageFile(file)).toThrow('Invalid file type');
  });

  it('rejects file exceeding size limit', () => {
    const file = createFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024);
    expect(() => validateImageFile(file)).toThrow('exceeds limit');
  });

  it('accepts file at exact size limit', () => {
    const file = createFile('exact.jpg', 'image/jpeg', 5 * 1024 * 1024);
    expect(() => validateImageFile(file)).not.toThrow();
  });

  it('accepts custom size limit', () => {
    const file = createFile('small.jpg', 'image/jpeg', 2 * 1024 * 1024);
    expect(() => validateImageFile(file, 1)).toThrow('exceeds limit');
  });
});

describe('generateStoragePath', () => {
  it('generates path with bucket prefix', () => {
    const path = generateStoragePath('products', 'image.jpg');
    expect(path).toMatch(/^products\//);
  });

  it('preserves file extension', () => {
    const path = generateStoragePath('products', 'image.jpg');
    expect(path).toMatch(/\.jpg$/);
  });

  it('handles PNG extension', () => {
    const path = generateStoragePath('categories', 'photo.png');
    expect(path).toMatch(/\.png$/);
  });

  it('sanitizes special characters in filename', () => {
    const path = generateStoragePath('products', 'my photo (1).jpg');
    expect(path).not.toContain(' ');
    expect(path).not.toContain('(');
    expect(path).not.toContain(')');
  });

  it('generates unique paths for same filename', () => {
    const path1 = generateStoragePath('products', 'image.jpg');
    const path2 = generateStoragePath('products', 'image.jpg');
    expect(path1).not.toBe(path2);
  });

  it('handles filename without extension', () => {
    const path = generateStoragePath('products', 'noextension');
    expect(path).toMatch(/^products\/\d+-[a-z0-9]+\.noextension$/);
  });
});
