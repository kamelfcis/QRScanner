import { isAllowedImageType } from '@/lib/upload-validation';

export function instapayImageNeedsConvert(file: { type: string; name: string }): boolean {
  const type = (file.type || '').toLowerCase();
  if (isAllowedImageType(type)) return false;

  const name = file.name.toLowerCase();
  const heicName = name.endsWith('.heic') || name.endsWith('.heif');
  if (
    type === '' ||
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'application/octet-stream' ||
    heicName
  ) {
    return true;
  }

  return type.startsWith('image/');
}

function jpegFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'instapay-proof';
  return `${base}.jpg`;
}

export async function convertImageFileToJpeg(file: File, quality = 0.9): Promise<File> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const converted = await canvasToJpegFile(bitmap, jpegFileName(file.name), quality);
      bitmap.close();
      return converted;
    } catch {
      // Safari/iOS may fail createImageBitmap on HEIC; try HTMLImageElement next.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadHtmlImage(objectUrl);
    return await canvasToJpegFile(image, jpegFileName(file.name), quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
  });
}

async function canvasToJpegFile(
  source: CanvasImageSource & { width: number; height: number },
  name: string,
  quality: number
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available');
  }
  context.drawImage(source, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error('JPEG encode failed'))),
      'image/jpeg',
      quality
    );
  });
  return new File([blob], name, { type: 'image/jpeg' });
}

export async function prepareInstapayUploadFile(file: File): Promise<File> {
  if (isAllowedImageType(file.type)) return file;
  if (!instapayImageNeedsConvert(file)) {
    throw new Error('unsupported-image-type');
  }
  return convertImageFileToJpeg(file);
}
