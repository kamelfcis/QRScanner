const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
const CANDIDATE_COUNT = 4;
const REQUEST_TIMEOUT_MS = 25_000;
const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

export type ProductImageMode = 'generate' | 'enhance';

export type ProductImageAiCode =
  'not_configured' | 'unsupported_model' | 'generation_failed' | 'source_fetch_failed';

export class ProductImageAiError extends Error {
  constructor(
    message: string,
    public readonly code: ProductImageAiCode,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ProductImageAiError';
  }
}

export interface ProductImagePromptInput {
  name_ar?: string | null;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  category_name?: string | null;
}

export interface GeneratedImageBytes {
  mimeType: string;
  data: Buffer;
}

export interface SourceImageBytes {
  mimeType: string;
  dataBase64: string;
}

function getApiKey(): string {
  if (typeof window !== 'undefined') {
    throw new ProductImageAiError(
      'AI image generation must run on the server',
      'generation_failed',
      500
    );
  }
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new ProductImageAiError('AI image generation is not configured', 'not_configured', 503);
  }
  return key;
}

export function getImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}

export function sanitizeErrorMessage(message: string, apiKey?: string): string {
  let out = message;
  if (apiKey) {
    out = out.split(apiKey).join('[redacted]');
  }
  out = out.replace(/key=[^&\s"'\\]+/gi, 'key=[redacted]');
  out = out.replace(/x-goog-api-key["'\s:=]+[^&\s"'\\]+/gi, 'x-goog-api-key=[redacted]');
  out = out.replace(/AIza[0-9A-Za-z_-]+/g, '[redacted]');
  out = out.replace(/AQ\.[0-9A-Za-z_-]+/g, '[redacted]');
  return out;
}

function isUnsupportedImageModelError(text: string): boolean {
  return /does not support image|IMAGE is not a valid|response.?modalit|not support.*image|unable to generate images|image generation is not supported|does not support.*response.*IMAGE/i.test(
    text
  );
}

function line(label: string, value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? `${label}: ${trimmed}` : '';
}

function productContext(input: ProductImagePromptInput): string {
  return [
    line('Dish name (English)', input.name_en),
    line('Dish name (Arabic)', input.name_ar),
    line('Description (English)', input.description_en),
    line('Description (Arabic)', input.description_ar),
    line('Category', input.category_name),
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildGeneratePrompt(input: ProductImagePromptInput): string {
  return `Create a photorealistic restaurant menu photograph of this dish.

${productContext(input)}

Requirements:
- Appetizing professional food photography, restaurant quality lighting
- Hero / menu shot of the plated dish, square-friendly composition
- No text, logos, watermarks, captions, labels, or UI
- No people or hands
- Natural, clean background that does not hide the food
- Photorealistic only, not illustration or cartoon`;
}

export function buildEnhancePrompt(input: ProductImagePromptInput): string {
  return `Enhance this existing food photo for a restaurant menu. Keep the SAME dish, ingredients, shape, and plating identity. Do not replace it with a different food.

Improve lighting, sharpness, color, and background cleanliness. Photorealistic. No text, watermarks, or logos.

${productContext(input)}`;
}

function sniffMime(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) {
    return 'image/png';
  }
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function allowedSourceHost(hostname: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    if (supabaseUrl && new URL(supabaseUrl).hostname === hostname) return true;
  } catch {
    // ignore invalid env URL
  }
  return hostname.endsWith('.supabase.co') || hostname.endsWith('.supabase.in');
}

export async function fetchSourceImage(url: string): Promise<SourceImageBytes> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ProductImageAiError('Invalid source image URL', 'source_fetch_failed', 400);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ProductImageAiError('Invalid source image URL', 'source_fetch_failed', 400);
  }

  if (!allowedSourceHost(parsed.hostname)) {
    throw new ProductImageAiError('Source image must be from storage', 'source_fetch_failed', 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new ProductImageAiError('Failed to load source image', 'source_fetch_failed', 400);
    }

    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_SOURCE_BYTES) {
      throw new ProductImageAiError(
        'Source image is empty or too large',
        'source_fetch_failed',
        400
      );
    }

    const headerType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    const mimeType = headerType.startsWith('image/') ? headerType : sniffMime(buf);
    return { mimeType, dataBase64: buf.toString('base64') };
  } catch (err) {
    if (err instanceof ProductImageAiError) throw err;
    throw new ProductImageAiError('Failed to load source image', 'source_fetch_failed', 400);
  } finally {
    clearTimeout(timer);
  }
}

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

function extractInlineImage(parts: GeminiPart[] | undefined): GeneratedImageBytes | null {
  if (!parts) return null;
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    const data = inline?.data;
    if (!data) continue;
    const mimeType =
      (inline && 'mimeType' in inline ? inline.mimeType : undefined) ??
      (inline && 'mime_type' in inline ? inline.mime_type : undefined) ??
      'image/png';
    return { mimeType, data: Buffer.from(data, 'base64') };
  }
  return null;
}

async function generateProductImageCandidate(
  prompt: string,
  sourceImage?: SourceImageBytes
): Promise<GeneratedImageBytes> {
  const apiKey = getApiKey();
  const model = getImageModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (sourceImage) {
    parts.push({
      inline_data: {
        mime_type: sourceImage.mimeType,
        data: sourceImage.dataBase64,
      },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
      signal: controller.signal,
    });

    const rawText = await response.text();
    const safeText = sanitizeErrorMessage(rawText, apiKey);

    if (!response.ok) {
      if (isUnsupportedImageModelError(safeText)) {
        throw new ProductImageAiError(
          'This AI model cannot generate images',
          'unsupported_model',
          500
        );
      }
      throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
    }

    let parsed: {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
    };
    try {
      parsed = JSON.parse(rawText) as typeof parsed;
    } catch {
      throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
    }

    const image = extractInlineImage(parsed.candidates?.[0]?.content?.parts);
    if (!image) {
      const joined = parsed.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join(' ');
      if (joined && isUnsupportedImageModelError(joined)) {
        throw new ProductImageAiError(
          'This AI model cannot generate images',
          'unsupported_model',
          500
        );
      }
      throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
    }

    return image;
  } catch (err) {
    if (err instanceof ProductImageAiError) throw err;
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  } finally {
    clearTimeout(timer);
  }
}

export async function generateProductImageCandidates(
  prompt: string,
  sourceImage?: SourceImageBytes,
  count = CANDIDATE_COUNT
): Promise<GeneratedImageBytes[]> {
  const results = await Promise.allSettled(
    Array.from({ length: count }, (_, index) =>
      generateProductImageCandidate(
        `${prompt}\n\nVariation ${index + 1} of ${count}: use a distinct camera angle, plating, and lighting.`,
        sourceImage
      )
    )
  );

  const images: GeneratedImageBytes[] = [];
  let unsupported = false;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      images.push(result.value);
      continue;
    }
    const reason = result.reason;
    if (reason instanceof ProductImageAiError && reason.code === 'not_configured') {
      throw reason;
    }
    if (reason instanceof ProductImageAiError && reason.code === 'unsupported_model') {
      unsupported = true;
    }
  }

  if (images.length === 0) {
    if (unsupported) {
      throw new ProductImageAiError(
        'This AI model cannot generate images',
        'unsupported_model',
        500
      );
    }
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }

  return images;
}

export function extensionForMime(mimeType: string): string {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}
