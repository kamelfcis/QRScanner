import { describe, it, expect } from 'vitest';
import { qrCodeSchema, restaurantTableSchema } from '@/types/schema';

describe('qrCodeSchema', () => {
  const validQR = {
    name: 'Main Entrance',
    url: 'https://wardashamya.com/menu',
  };

  it('accepts valid QR code', () => {
    const result = qrCodeSchema.safeParse(validQR);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = qrCodeSchema.safeParse({ ...validQR, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL', () => {
    const result = qrCodeSchema.safeParse({ ...validQR, url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts valid template values', () => {
    for (const template of ['classic', 'luxury', 'minimal', 'golden', 'dark']) {
      const result = qrCodeSchema.safeParse({ ...validQR, template });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid template', () => {
    const result = qrCodeSchema.safeParse({ ...validQR, template: 'nonexistent' });
    expect(result.success).toBe(false);
  });

  it('rejects size below minimum', () => {
    const result = qrCodeSchema.safeParse({ ...validQR, size: 50 });
    expect(result.success).toBe(false);
  });

  it('rejects size above maximum', () => {
    const result = qrCodeSchema.safeParse({ ...validQR, size: 2000 });
    expect(result.success).toBe(false);
  });

  it('accepts valid rounded styles', () => {
    for (const rounded_style of ['square', 'rounded', 'circle']) {
      const result = qrCodeSchema.safeParse({ ...validQR, rounded_style });
      expect(result.success).toBe(true);
    }
  });

  it('accepts valid eye styles', () => {
    for (const eye_style of ['square', 'rounded', 'circle']) {
      const result = qrCodeSchema.safeParse({ ...validQR, eye_style });
      expect(result.success).toBe(true);
    }
  });

  it('accepts valid error correction levels', () => {
    for (const error_correction of ['L', 'M', 'Q', 'H']) {
      const result = qrCodeSchema.safeParse({ ...validQR, error_correction });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid error correction', () => {
    const result = qrCodeSchema.safeParse({ ...validQR, error_correction: 'X' });
    expect(result.success).toBe(false);
  });

  it('accepts valid colors', () => {
    const result = qrCodeSchema.safeParse({
      ...validQR,
      foreground_color: '#FF5733',
      background_color: '#FFFFFF',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid color format', () => {
    const result = qrCodeSchema.safeParse({
      ...validQR,
      foreground_color: 'red',
    });
    expect(result.success).toBe(false);
  });

  it('accepts table_id as valid UUID', () => {
    const result = qrCodeSchema.safeParse({
      ...validQR,
      table_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null table_id', () => {
    const result = qrCodeSchema.safeParse({
      ...validQR,
      table_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts margin range', () => {
    const result = qrCodeSchema.safeParse({ ...validQR, margin: 0 });
    expect(result.success).toBe(true);
    const result2 = qrCodeSchema.safeParse({ ...validQR, margin: 10 });
    expect(result2.success).toBe(true);
  });

  it('rejects margin out of range', () => {
    const result = qrCodeSchema.safeParse({ ...validQR, margin: 15 });
    expect(result.success).toBe(false);
  });

  it('defaults are applied correctly', () => {
    const result = qrCodeSchema.safeParse(validQR);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.template).toBe('classic');
      expect(result.data.size).toBe(300);
      expect(result.data.margin).toBe(4);
      expect(result.data.error_correction).toBe('M');
      expect(result.data.rounded_style).toBe('square');
      expect(result.data.eye_style).toBe('square');
      expect(result.data.is_active).toBe(true);
    }
  });
});

describe('restaurantTableSchema', () => {
  const validTable = {
    table_number: 1,
  };

  it('accepts valid table', () => {
    const result = restaurantTableSchema.safeParse(validTable);
    expect(result.success).toBe(true);
  });

  it('rejects zero table number', () => {
    const result = restaurantTableSchema.safeParse({ table_number: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative table number', () => {
    const result = restaurantTableSchema.safeParse({ table_number: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts all optional fields', () => {
    const result = restaurantTableSchema.safeParse({
      table_number: 5,
      internal_name: 'VIP Corner',
      description: 'Premium seating area',
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null optional fields', () => {
    const result = restaurantTableSchema.safeParse({
      table_number: 3,
      internal_name: null,
      description: null,
    });
    expect(result.success).toBe(true);
  });
});
