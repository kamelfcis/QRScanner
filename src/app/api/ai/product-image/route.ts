import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ProductImageAiError,
  buildEnhancePrompt,
  buildGeneratePrompt,
  fetchSourceImage,
  generateProductImageCandidates,
  sanitizeErrorMessage,
} from '@/lib/ai/product-image';
import { uploadAiCandidates } from '@/lib/ai/product-image-storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

async function isAiProductImagesEnabled(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'features')
    .maybeSingle();

  if (error) return false;
  const value = data?.value as { ai_product_images?: boolean } | undefined;
  return value?.ai_product_images === true;
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

    if (!(await isAiProductImagesEnabled(supabase))) {
      return jsonError(
        'AI product images are not enabled for this restaurant',
        403,
        'feature_disabled'
      );
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
    const uploaded = await uploadAiCandidates(supabase, user.id, images);

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
