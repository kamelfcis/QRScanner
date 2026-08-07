import type { ImportExtractedData } from '@/types/database';

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

function getApiKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('AI extraction must run on the server');
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured');
  return key;
}

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

const EXTRACTION_PROMPT = `You are a restaurant menu data extractor. Analyze the following text extracted from a restaurant menu PDF or image.

Extract ALL of the following information and return a valid JSON object. If information is not found, use null.

Return EXACTLY this JSON structure:
{
  "restaurant": {
    "name_ar": "string or null",
    "name_en": "string or null",
    "phone": "string or null",
    "whatsapp": "string or null",
    "instagram": "string or null",
    "facebook": "string or null",
    "address_ar": "string or null",
    "address_en": "string or null",
    "primary_color": "hex color or null",
    "secondary_color": "hex color or null"
  },
  "categories": [
    {
      "name_en": "category name",
      "name_ar": "arabic name or null",
      "description_en": "description or null",
      "description_ar": "arabic description or null",
      "products": [
        {
          "name_en": "product name",
          "name_ar": "arabic name or null",
          "description_en": "description or null",
          "description_ar": "arabic description or null",
          "dining_price": number or null,
          "takeaway_price": number or null
        }
      ]
    }
  ],
  "confidence": {
    "overall": 0.0 to 1.0,
    "restaurant": 0.0 to 1.0,
    "categories": 0.0 to 1.0,
    "products": 0.0 to 1.0
  }
}

Rules:
- Extract prices as numbers (e.g., 25.00, not "25 SAR")
- If only one price is listed, use it for both dining_price and takeaway_price
- Category names should be in English when available
- Include ALL menu items found
- Return ONLY valid JSON, no markdown or explanation
- For Arabic text, preserve the original Arabic characters`;

function extractJsonText(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

export async function extractMenuData(rawText: string): Promise<ImportExtractedData> {
  const apiKey = getApiKey();
  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${EXTRACTION_PROMPT}\n\nExtract menu data from this text:\n\n${rawText.substring(0, 8000)}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4000,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI extraction failed: ${error}`);
  }

  const result = await response.json();
  const content = result.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('');

  if (!content) {
    throw new Error('No content in AI response');
  }

  try {
    const parsed = JSON.parse(extractJsonText(content)) as ImportExtractedData;
    return validateExtractedData(parsed);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}

function validateExtractedData(data: ImportExtractedData): ImportExtractedData {
  if (!data.restaurant) {
    data.restaurant = {};
  }
  if (!Array.isArray(data.categories)) {
    data.categories = [];
  }
  if (!data.confidence) {
    data.confidence = {
      overall: 0.5,
      restaurant: 0.5,
      categories: 0.5,
      products: 0.5,
    };
  }

  for (const cat of data.categories) {
    if (!cat.name_en) cat.name_en = 'Unknown Category';
    if (!Array.isArray(cat.products)) cat.products = [];
    for (const prod of cat.products) {
      if (!prod.name_en) prod.name_en = 'Unknown Product';
    }
  }

  return data;
}
