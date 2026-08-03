import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number');
export const urlSchema = z.string().url('Invalid URL');
export const uuidSchema = z.string().uuid('Invalid ID');

export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((e) => e.message).join(', '),
  };
}

export function validateFileUpload(
  file: File,
  options: { maxSizeMB?: number; allowedTypes?: string[] } = {},
): { valid: boolean; error?: string } {
  const {
    maxSizeMB = 10,
    allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ],
  } = options;

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true };
}
