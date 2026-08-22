import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProductImageAiError, sanitizeErrorMessage } from '@/lib/ai/product-image';
import { autoAssignProductImage } from '@/lib/ai/product-image-auto';
import { categoryRelationNameFields } from '@/lib/catalog/keys';
import { getName } from '@/lib/utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function jsonError(error: string, status: number, code?: string, productId?: string) {
  return NextResponse.json(
    code
      ? { error, code, ...(productId ? { productId } : {}) }
      : { error, ...(productId ? { productId } : {}) },
    { status }
  );
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
  let productId = '';

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
    productId = asTrimmedString(body?.productId);
    if (!productId) {
      return jsonError('productId is required', 400, 'product_id_required');
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select(
        `id, name_ar, name_en, description_ar, description_en, image_url, category:categories(${categoryRelationNameFields})`
      )
      .eq('id', productId)
      .maybeSingle();

    if (productError) {
      return jsonError(productError.message, 500, 'product_load_failed', productId);
    }
    if (!product) {
      return jsonError('Product not found', 404, 'product_not_found', productId);
    }

    const categoryRaw = product.category as
      | { name_en: string; name_ar: string; name_fr?: string | null; name_nl?: string | null }
      | Array<{
          name_en: string;
          name_ar: string;
          name_fr?: string | null;
          name_nl?: string | null;
        }>
      | null
      | undefined;
    const category = Array.isArray(categoryRaw) ? (categoryRaw[0] ?? null) : (categoryRaw ?? null);
    const categoryName = category
      ? getName('en', category.name_en, category.name_ar, category.name_fr, category.name_nl)
      : '';

    const result = await autoAssignProductImage(supabase, product, categoryName);

    if (result.skipped) {
      return NextResponse.json({
        productId: result.productId,
        skipped: true,
        reason: result.reason,
        image_url: product.image_url,
      });
    }

    return NextResponse.json({
      productId: result.productId,
      image_url: result.imageUrl,
      pickedIndex: result.pickedIndex,
      scores: result.scores,
    });
  } catch (err) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (err instanceof ProductImageAiError) {
      const message = sanitizeErrorMessage(err.message, apiKey);
      return jsonError(message, err.status, err.code, productId || undefined);
    }
    const raw = err instanceof Error ? err.message : 'Failed to auto-assign product image';
    const message = sanitizeErrorMessage(raw, apiKey);
    console.error('[ai/product-image/auto]', message);
    return jsonError(
      'Failed to auto-assign product image',
      500,
      'generation_failed',
      productId || undefined
    );
  }
}
