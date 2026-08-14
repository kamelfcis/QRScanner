import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ProductImageAiError,
  buildEnhancePrompt,
  buildGeneratePrompt,
  extensionForMime,
  fetchSourceImage,
  generateProductImageCandidates,
  sanitizeErrorMessage,
  type GeneratedImageBytes,
} from '@/lib/ai/product-image';

export const runtime = 'nodejs';
export const maxDuration = 60;

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

async function uploadCandidates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  images: GeneratedImageBytes[]
): Promise<Array<{ id: string; url: string }>> {
  const timestamp = Date.now();
  const uploaded = await Promise.all(
    images.map(async (image, index) => {
      const ext = extensionForMime(image.mimeType);
      const path = `ai-candidates/${userId}/${timestamp}-${index + 1}.${ext}`;
      const { data, error } = await supabase.storage.from('products').upload(path, image.data, {
        contentType: image.mimeType,
        cacheControl: '31536000',
        upsert: false,
      });
      if (error) {
        throw new Error(error.message);
      }
      const { data: urlData } = supabase.storage.from('products').getPublicUrl(data.path);
      return { id: data.path, url: urlData.publicUrl };
    })
  );
  return uploaded;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('Unauthorized', 401);
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      return jsonError('AI image generation is not configured', 503, 'not_configured');
    }

    const body = await request.json().catch(() => null);
    const mode =
      body?.mode === 'enhance' ? 'enhance' : body?.mode === 'generate' ? 'generate' : null;

    if (!mode) {
      return jsonError('mode must be generate or enhance', 400);
    }

    const name_ar = asTrimmedString(body?.name_ar);
    const name_en = asTrimmedString(body?.name_en);
    const description_ar = asTrimmedString(body?.description_ar);
    const description_en = asTrimmedString(body?.description_en);
    const category_name = asTrimmedString(body?.category_name);
    const source_image_url = asTrimmedString(body?.source_image_url);

    if (!name_ar && !name_en) {
      return jsonError('Product name is required', 400, 'name_required');
    }

    if (mode === 'enhance' && !source_image_url) {
      return jsonError('source_image_url is required to enhance', 400, 'source_image_required');
    }

    const promptInput = {
      name_ar,
      name_en,
      description_ar,
      description_en,
      category_name,
    };

    const prompt =
      mode === 'enhance' ? buildEnhancePrompt(promptInput) : buildGeneratePrompt(promptInput);
    const sourceImage = mode === 'enhance' ? await fetchSourceImage(source_image_url) : undefined;

    const images = await generateProductImageCandidates(prompt, sourceImage);
    const uploaded = await uploadCandidates(supabase, user.id, images);

    return NextResponse.json({ images: uploaded });
  } catch (err) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (err instanceof ProductImageAiError) {
      const message = sanitizeErrorMessage(err.message, apiKey);
      return jsonError(message, err.status, err.code);
    }
    const raw = err instanceof Error ? err.message : 'Failed to generate product image';
    const message = sanitizeErrorMessage(raw, apiKey);
    console.error('[ai/product-image]', message);
    return jsonError('Failed to generate product image', 500, 'generation_failed');
  }
}
