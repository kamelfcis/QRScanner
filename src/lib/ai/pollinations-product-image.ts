import {
  ProductImageAiError,
  sanitizeErrorMessage,
  type GeneratedImageBytes,
  type SourceImageBytes,
} from '@/lib/ai/product-image';

export const POLLINATIONS_IMAGE_ORIGIN = 'https://gen.pollinations.ai';
export const DEFAULT_POLLINATIONS_IMAGE_MODEL = 'gptimage-large';

/** gptimage-large commonly takes 30–60s; stay under the route maxDuration. */
const REQUEST_TIMEOUT_MS = 90_000;

export function getPollinationsImageModel(): string {
  return process.env.POLLINATIONS_IMAGE_MODEL?.trim() || DEFAULT_POLLINATIONS_IMAGE_MODEL;
}

/**
 * Public image URL only. The API key is sent as Authorization: Bearer and must
 * never be added as a query parameter.
 */
export function buildPollinationsGenerateUrl(
  prompt: string,
  model = getPollinationsImageModel()
): URL {
  const url = new URL(`${POLLINATIONS_IMAGE_ORIGIN}/image/${encodeURIComponent(prompt)}`);
  url.searchParams.set('model', model);
  url.searchParams.set('quality', 'high');
  url.searchParams.set('width', '1024');
  url.searchParams.set('height', '1024');
  url.searchParams.delete('key');
  return url;
}

export function buildPollinationsAuthorization(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

function getApiKey(): string {
  if (typeof window !== 'undefined') {
    throw new ProductImageAiError(
      'AI image generation must run on the server',
      'generation_failed',
      500
    );
  }
  const key = process.env.POLLINATIONS_API_KEY?.trim();
  if (!key) {
    throw new ProductImageAiError('AI image generation is not configured', 'not_configured', 503);
  }
  return key;
}

function assertUrlHasNoSecret(url: URL, apiKey: string): void {
  const href = url.href;
  if (url.searchParams.has('key') || href.includes(apiKey) || /[?&]key=/i.test(href)) {
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }
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

function extensionForSource(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

function isEditUnsupported(status: number, body: string): boolean {
  if (status !== 400 && status !== 404 && status !== 415 && status !== 422 && status !== 501) {
    return false;
  }
  return /does not support|not support|unsupported|cannot edit|can't edit|image input|no image|edit.*not|not.*edit/i.test(
    body
  );
}

function imageFromBase64(b64: string | undefined): GeneratedImageBytes {
  if (!b64) {
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }
  const data = Buffer.from(b64, 'base64');
  if (data.length < 32) {
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }
  return { mimeType: sniffMime(data), data };
}

function imageFromBytes(buf: Buffer, headerType: string): GeneratedImageBytes {
  if (buf.length < 32) {
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }
  const mimeType = headerType.startsWith('image/') ? headerType : sniffMime(buf);
  return { mimeType, data: buf };
}

async function readGeneratedImage(
  response: Response,
  apiKey: string
): Promise<GeneratedImageBytes> {
  const headerType =
    response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';

  if (!response.ok) {
    const raw = await response.text();
    const safe = sanitizeErrorMessage(raw, apiKey);
    console.error('[ai/pollinations-product-image]', response.status, safe);
    if (isEditUnsupported(response.status, safe)) {
      throw new ProductImageAiError('This AI model cannot edit images', 'unsupported_model', 500);
    }
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }

  if (headerType.startsWith('image/')) {
    return imageFromBytes(Buffer.from(await response.arrayBuffer()), headerType);
  }

  const raw = await response.text();
  let parsed: {
    b64_json?: string;
    data?: Array<{ b64_json?: string }>;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }

  return imageFromBase64(parsed.data?.[0]?.b64_json ?? parsed.b64_json);
}

async function generateFromPrompt(prompt: string, apiKey: string): Promise<GeneratedImageBytes> {
  const safePrompt = sanitizeErrorMessage(prompt, apiKey);
  const url = buildPollinationsGenerateUrl(safePrompt);
  assertUrlHasNoSecret(url, apiKey);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: buildPollinationsAuthorization(apiKey),
      Accept: 'image/jpeg,image/png,image/webp,application/json',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return readGeneratedImage(response, apiKey);
}

async function editFromSource(
  prompt: string,
  sourceImage: SourceImageBytes,
  apiKey: string
): Promise<GeneratedImageBytes> {
  const safePrompt = sanitizeErrorMessage(prompt, apiKey);
  const model = getPollinationsImageModel();
  const bytes = Buffer.from(sourceImage.dataBase64, 'base64');
  const file = new File(
    [new Uint8Array(bytes)],
    `source.${extensionForSource(sourceImage.mimeType)}`,
    {
      type: sourceImage.mimeType || 'image/jpeg',
    }
  );

  const form = new FormData();
  form.set('prompt', safePrompt);
  form.set('model', model);
  form.set('size', '1024x1024');
  form.set('quality', 'high');
  form.set('image', file);

  const response = await fetch(`${POLLINATIONS_IMAGE_ORIGIN}/v1/images/edits`, {
    method: 'POST',
    headers: {
      Authorization: buildPollinationsAuthorization(apiKey),
      Accept: 'application/json,image/jpeg,image/png,image/webp',
    },
    body: form,
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return readGeneratedImage(response, apiKey);
}

export async function generatePollinationsProductImageCandidate(
  prompt: string,
  sourceImage?: SourceImageBytes
): Promise<GeneratedImageBytes> {
  const apiKey = getApiKey();

  try {
    if (!sourceImage) {
      return await generateFromPrompt(prompt, apiKey);
    }

    try {
      return await editFromSource(prompt, sourceImage, apiKey);
    } catch (err) {
      if (err instanceof ProductImageAiError && err.code === 'unsupported_model') {
        console.warn(
          '[ai/pollinations-product-image] model does not support edits; regenerating from the enhance prompt'
        );
        return await generateFromPrompt(prompt, apiKey);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof ProductImageAiError) throw err;
    const raw = err instanceof Error ? err.message : String(err);
    console.error('[ai/pollinations-product-image]', sanitizeErrorMessage(raw, apiKey));
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }
}
