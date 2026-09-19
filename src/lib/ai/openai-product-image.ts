import OpenAI from 'openai';
import {
  ProductImageAiError,
  sanitizeErrorMessage,
  type GeneratedImageBytes,
  type SourceImageBytes,
} from '@/lib/ai/product-image';

const DEFAULT_IMAGE_MODEL = 'gpt-image-1';
const REQUEST_TIMEOUT_MS = 25_000;

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new ProductImageAiError('AI image generation is not configured', 'not_configured', 503);
  }
  return key;
}

export function getOpenAiImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}

function sourceImageToFile(sourceImage: SourceImageBytes): File {
  const buffer = Buffer.from(sourceImage.dataBase64, 'base64');
  const ext = sourceImage.mimeType.includes('png')
    ? 'png'
    : sourceImage.mimeType.includes('webp')
      ? 'webp'
      : 'jpg';
  return new File([buffer], `source.${ext}`, { type: sourceImage.mimeType });
}

function mapGeneratedImage(b64Json: string | undefined): GeneratedImageBytes {
  if (!b64Json) {
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }
  return { mimeType: 'image/png', data: Buffer.from(b64Json, 'base64') };
}

export async function generateOpenAiProductImageCandidate(
  prompt: string,
  sourceImage?: SourceImageBytes
): Promise<GeneratedImageBytes> {
  const apiKey = getApiKey();
  const model = getOpenAiImageModel();
  const client = new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS });

  try {
    if (sourceImage) {
      const response = await client.images.edit({
        model,
        image: sourceImageToFile(sourceImage),
        prompt,
        n: 1,
        size: '1024x1024',
      });
      return mapGeneratedImage(response.data?.[0]?.b64_json);
    }

    const response = await client.images.generate({
      model,
      prompt,
      n: 1,
      size: '1024x1024',
    });
    return mapGeneratedImage(response.data?.[0]?.b64_json);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const safe = sanitizeErrorMessage(raw, apiKey);
    console.error('[ai/openai-product-image]', safe);
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }
}
