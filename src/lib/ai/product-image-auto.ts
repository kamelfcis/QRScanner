import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAiImageProvider } from '@/lib/ai/image-provider';
import {
  ProductImageAiError,
  buildGeneratePrompt,
  generateProductImageCandidates,
  sanitizeErrorMessage,
  type GeneratedImageBytes,
  type ProductImagePromptInput,
} from '@/lib/ai/product-image';
import { uploadAiProductImage } from '@/lib/ai/product-image-storage';

const DEFAULT_GEMINI_VISION_MODEL = 'gemini-2.5-flash';
const DEFAULT_OPENAI_VISION_MODEL = 'gpt-4o-mini';
const RANKING_TIMEOUT_MS = 25_000;

export interface PickBestResult {
  bestIndex: number;
  scores: number[];
}

export interface AutoAssignProductInput {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  image_url?: string | null;
}

export type AutoAssignResult =
  | { skipped: true; productId: string; reason: 'already_has_image' }
  | {
      skipped: false;
      productId: string;
      imageUrl: string;
      pickedIndex: number;
      scores: number[];
    };

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new ProductImageAiError('AI image generation is not configured', 'not_configured', 503);
  }
  return key;
}

function getOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new ProductImageAiError('AI image generation is not configured', 'not_configured', 503);
  }
  return key;
}

function getGeminiVisionModel(): string {
  return process.env.GEMINI_VISION_MODEL?.trim() || DEFAULT_GEMINI_VISION_MODEL;
}

function getOpenAiVisionModel(): string {
  return process.env.OPENAI_VISION_MODEL?.trim() || DEFAULT_OPENAI_VISION_MODEL;
}

function buildRankingPrompt(input: ProductImagePromptInput, candidateCount: number): string {
  const context = [
    input.name_en?.trim() ? `Dish name (English): ${input.name_en.trim()}` : '',
    input.name_ar?.trim() ? `Dish name (Arabic): ${input.name_ar.trim()}` : '',
    input.description_en?.trim() ? `Description (English): ${input.description_en.trim()}` : '',
    input.description_ar?.trim() ? `Description (Arabic): ${input.description_ar.trim()}` : '',
    input.category_name?.trim() ? `Category: ${input.category_name.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `You are evaluating AI-generated food photos for a restaurant menu.

${context}

There are ${candidateCount} candidate images attached in order (indexed 0 to ${candidateCount - 1}).

Score each image from 0 to 10 based on:
- Dish identity: does the photo match the named dish and category?
- Photorealism: realistic food photography, not illustration or cartoon
- Menu suitability: appetizing, clean background, square-friendly composition

Penalize heavily (score near 0): visible text, watermarks, logos, wrong food, people or hands, cluttered backgrounds.

Respond with ONLY valid JSON in this exact shape:
{"bestIndex": number, "scores": [number, ...]}
The scores array must have exactly ${candidateCount} numbers, one per candidate in order.
bestIndex must be the index of the best overall candidate.`;
}

function parseRankingResponse(text: string, candidateCount: number): PickBestResult {
  const fallback: PickBestResult = { bestIndex: 0, scores: [] };
  try {
    const parsed = JSON.parse(text) as { bestIndex?: unknown; scores?: unknown };
    const scores = Array.isArray(parsed.scores)
      ? parsed.scores.slice(0, candidateCount).map((value) => {
          const n = Number(value);
          return Number.isFinite(n) ? n : 0;
        })
      : [];

    let bestIndex = Number(parsed.bestIndex);
    if (!Number.isInteger(bestIndex) || bestIndex < 0 || bestIndex >= candidateCount) {
      if (scores.length > 0) {
        bestIndex = scores.indexOf(Math.max(...scores));
      } else {
        bestIndex = 0;
      }
    }

    return { bestIndex, scores };
  } catch {
    return fallback;
  }
}

async function pickBestWithGeminiVision(
  input: ProductImagePromptInput,
  candidates: GeneratedImageBytes[]
): Promise<PickBestResult> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiVisionModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const parts: Array<Record<string, unknown>> = [
    { text: buildRankingPrompt(input, candidates.length) },
    ...candidates.map((candidate) => ({
      inline_data: {
        mime_type: candidate.mimeType,
        data: candidate.data.toString('base64'),
      },
    })),
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RANKING_TIMEOUT_MS);

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
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    const rawText = await response.text();
    if (!response.ok) {
      console.warn(
        '[ai/product-image-auto] Gemini ranking failed, using first candidate:',
        sanitizeErrorMessage(rawText, apiKey)
      );
      return { bestIndex: 0, scores: [] };
    }

    let parsed: {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    try {
      parsed = JSON.parse(rawText) as typeof parsed;
    } catch {
      return { bestIndex: 0, scores: [] };
    }

    const text = parsed.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();
    if (!text) {
      return { bestIndex: 0, scores: [] };
    }

    return parseRankingResponse(text, candidates.length);
  } catch (err) {
    console.warn('[ai/product-image-auto] Gemini ranking error, using first candidate:', err);
    return { bestIndex: 0, scores: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function pickBestWithOpenAiVision(
  input: ProductImagePromptInput,
  candidates: GeneratedImageBytes[]
): Promise<PickBestResult> {
  const apiKey = getOpenAiApiKey();
  const model = getOpenAiVisionModel();
  const client = new OpenAI({ apiKey, timeout: RANKING_TIMEOUT_MS });

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildRankingPrompt(input, candidates.length) },
            ...candidates.map(
              (candidate) =>
                ({
                  type: 'image_url',
                  image_url: {
                    url: `data:${candidate.mimeType};base64,${candidate.data.toString('base64')}`,
                  },
                }) as const
            ),
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      return { bestIndex: 0, scores: [] };
    }

    return parseRankingResponse(text, candidates.length);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.warn(
      '[ai/product-image-auto] OpenAI ranking failed, using first candidate:',
      sanitizeErrorMessage(raw, apiKey)
    );
    return { bestIndex: 0, scores: [] };
  }
}

export async function pickBestProductImageCandidate(
  input: ProductImagePromptInput,
  candidates: GeneratedImageBytes[]
): Promise<PickBestResult> {
  if (candidates.length === 0) {
    throw new ProductImageAiError('Failed to generate product image', 'generation_failed', 500);
  }
  if (candidates.length === 1) {
    return { bestIndex: 0, scores: [10] };
  }

  if (getAiImageProvider() === 'openai') {
    return pickBestWithOpenAiVision(input, candidates);
  }
  return pickBestWithGeminiVision(input, candidates);
}

export async function autoAssignProductImage(
  supabase: SupabaseClient,
  product: AutoAssignProductInput,
  categoryName: string,
  options?: { force?: boolean }
): Promise<AutoAssignResult> {
  if (!options?.force && product.image_url?.trim()) {
    return { skipped: true, productId: product.id, reason: 'already_has_image' };
  }

  if (!product.name_ar?.trim() && !product.name_en?.trim()) {
    throw new ProductImageAiError('Product name is required', 'generation_failed', 400);
  }

  const promptInput: ProductImagePromptInput = {
    name_ar: product.name_ar,
    name_en: product.name_en,
    description_ar: product.description_ar,
    description_en: product.description_en,
    category_name: categoryName,
  };

  const prompt = buildGeneratePrompt(promptInput);
  const candidates = await generateProductImageCandidates(prompt);
  const { bestIndex, scores } = await pickBestProductImageCandidate(promptInput, candidates);
  const picked = candidates[bestIndex] ?? candidates[0];

  const uploaded = await uploadAiProductImage(supabase, product.id, picked);

  const { error: updateError } = await supabase
    .from('products')
    .update({ image_url: uploaded.url, updated_at: new Date().toISOString() })
    .eq('id', product.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    skipped: false,
    productId: product.id,
    imageUrl: uploaded.url,
    pickedIndex: bestIndex,
    scores,
  };
}
