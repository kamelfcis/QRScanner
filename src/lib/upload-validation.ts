export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_SIZE_MB = 5;

export type ImageValidationCode = 'invalid_image_type' | 'image_too_large';

export class ImageValidationError extends Error {
  readonly code: ImageValidationCode;

  constructor(code: ImageValidationCode, message: string) {
    super(message);
    this.name = 'ImageValidationError';
    this.code = code;
  }
}

export function isAllowedImageType(type: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function validateImageFile(file: File, maxSizeMB: number = MAX_IMAGE_SIZE_MB): void {
  if (!isAllowedImageType(file.type)) {
    throw new ImageValidationError(
      'invalid_image_type',
      `Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP.`
    );
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new ImageValidationError(
      'image_too_large',
      `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${maxSizeMB}MB.`
    );
  }
}
