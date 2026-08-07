#!/usr/bin/env node
/**
 * Clear menu data and import categories/products from a PDF menu.
 * Usage: node scripts/import-menu-pdf.mjs [path-to-pdf]
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getData } from 'pdf-parse/worker';
import { PDFParse } from 'pdf-parse';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_PDF = join(ROOT, 'Warda Shamya Menu(1).pdf');

function loadEnv() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) throw new Error('.env.local not found');
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
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
- For Arabic text, preserve the original Arabic characters
- Currency appears to be EGP (Egyptian Pounds) — extract numeric values only`;

function extractJsonText(content) {
  const trimmed = content.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return trimmed;
}

async function extractTextFromPDF(buffer) {
  PDFParse.setWorker(getData());
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();
    return {
      text: textResult.text || '',
      pages: infoResult.total,
      method: textResult.text?.trim().length > 50 ? 'pdf-text' : 'ocr-needed',
    };
  } finally {
    await parser.destroy();
  }
}

async function callGemini(apiKey, model, parts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 32000,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI extraction failed (${response.status}): ${error.slice(0, 500)}`);
  }

  const result = await response.json();
  const content = result.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!content) throw new Error('No content in AI response');
  return JSON.parse(extractJsonText(content));
}

async function extractMenuDataFromText(rawText, apiKey, model) {
  return callGemini(apiKey, model, [
    { text: `${EXTRACTION_PROMPT}\n\nExtract menu data from this text:\n\n${rawText.substring(0, 30000)}` },
  ]);
}

async function extractMenuDataFromPdf(pdfBuffer, apiKey, model) {
  const base64 = pdfBuffer.toString('base64');
  return callGemini(apiKey, model, [
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64,
      },
    },
    {
      text: `${EXTRACTION_PROMPT}\n\nThis is a scanned/image-based restaurant menu PDF (Warda Shamya). Read ALL pages carefully and extract every category and product with prices. Include Arabic names where visible.`,
    },
  ]);
}

async function getCounts(supabase) {
  const [products, categories, subcategories, gallery] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('subcategories').select('*', { count: 'exact', head: true }),
    supabase.from('product_gallery').select('*', { count: 'exact', head: true }),
  ]);
  return {
    products: products.count ?? 0,
    categories: categories.count ?? 0,
    subcategories: subcategories.count ?? 0,
    product_gallery: gallery.count ?? 0,
  };
}

async function clearMenuData(supabase) {
  // CASCADE: categories -> subcategories, products -> product_gallery
  const { error } = await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`Failed to clear categories: ${error.message}`);
}

async function insertMenuData(supabase, extracted) {
  const categories = extracted.categories || [];
  let categoryCount = 0;
  let productCount = 0;
  const errors = [];
  const samples = [];

  for (let catIdx = 0; catIdx < categories.length; catIdx++) {
    const cat = categories[catIdx];
    const { data: category, error: catError } = await supabase
      .from('categories')
      .insert({
        name_en: cat.name_en || 'Unknown Category',
        name_ar: cat.name_ar || cat.name_en || 'Unknown Category',
        description_en: cat.description_en || null,
        description_ar: cat.description_ar || null,
        image_url: cat.image_url || null,
        is_visible: true,
        sort_order: catIdx,
      })
      .select()
      .single();

    if (catError) {
      errors.push(`Category "${cat.name_en}": ${catError.message}`);
      continue;
    }
    categoryCount++;

    const products = cat.products || [];
    for (let prodIdx = 0; prodIdx < products.length; prodIdx++) {
      const prod = products[prodIdx];
      const dining = Number(prod.dining_price) || 0;
      const takeaway = Number(prod.takeaway_price) || dining;
      const { error: prodError } = await supabase.from('products').insert({
        category_id: category.id,
        name_en: prod.name_en || 'Unknown Product',
        name_ar: prod.name_ar || prod.name_en || 'Unknown Product',
        description_en: prod.description_en || null,
        description_ar: prod.description_ar || null,
        image_url: prod.image_url || null,
        dining_price: dining,
        takeaway_price: takeaway,
        is_available: true,
        is_popular: false,
        is_bestseller: false,
        is_new: false,
        is_spicy: false,
        sort_order: prodIdx,
      });

      if (prodError) {
        errors.push(`Product "${prod.name_en}" in "${cat.name_en}": ${prodError.message}`);
      } else {
        productCount++;
        if (samples.length < 8) {
          samples.push({
            category: cat.name_en,
            product: prod.name_en,
            name_ar: prod.name_ar,
            dining_price: dining,
            takeaway_price: takeaway,
          });
        }
      }
    }
  }

  return { categoryCount, productCount, errors, samples };
}

async function main() {
  const pdfPath = resolve(process.argv[2] || DEFAULT_PDF);
  if (!existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);

  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = env.GEMINI_API_KEY;
  const geminiModel = env.GEMINI_MODEL || 'gemini-3-flash-preview';

  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase URL or service role key');
  if (!geminiKey) throw new Error('Missing GEMINI_API_KEY');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('=== Warda Shamya Menu Import ===\n');
  console.log(`PDF: ${pdfPath}`);

  const beforeCounts = await getCounts(supabase);
  console.log('\n--- Before delete ---');
  console.log(JSON.stringify(beforeCounts, null, 2));

  console.log('\nClearing existing menu data...');
  await clearMenuData(supabase);

  const afterDeleteCounts = await getCounts(supabase);
  console.log('\n--- After delete ---');
  console.log(JSON.stringify(afterDeleteCounts, null, 2));

  console.log('\nExtracting text from PDF...');
  const buffer = readFileSync(pdfPath);
  console.log(`PDF size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  const textResult = await extractTextFromPDF(buffer);
  const textLen = textResult.text.trim().length;
  console.log(`Pages: ${textResult.pages}, method: ${textResult.method}, chars: ${textLen}`);

  // Save raw text for debugging
  const { writeFileSync } = await import('fs');
  const rawTextPath = join(ROOT, 'scripts', 'last-import-raw-text.txt');
  try {
    writeFileSync(rawTextPath, textResult.text, 'utf8');
    console.log(`Raw text saved to scripts/last-import-raw-text.txt`);
  } catch {
    /* ignore */
  }

  console.log(`\nRunning AI extraction (Gemini model: ${geminiModel})...`);
  let extracted;
  // Image-based menus have almost no extractable text — use Gemini vision on the PDF.
  const useVision = textLen < 500 || textResult.method === 'ocr-needed';
  if (useVision) {
    console.log('PDF is image-based — using Gemini vision on full PDF');
    extracted = await extractMenuDataFromPdf(buffer, geminiKey, geminiModel);
  } else {
    console.log('Using text-based extraction');
    extracted = await extractMenuDataFromText(textResult.text, geminiKey, geminiModel);
  }

  // Persist extraction before insert so a failed insert can be retried
  const jsonPath = join(ROOT, 'scripts', 'last-import-extracted.json');
  try {
    writeFileSync(jsonPath, JSON.stringify(extracted, null, 2), 'utf8');
    console.log(`Extracted JSON saved to scripts/last-import-extracted.json`);
  } catch {
    /* ignore */
  }

  const catCount = extracted.categories?.length ?? 0;
  const prodCount = extracted.categories?.reduce((n, c) => n + (c.products?.length ?? 0), 0) ?? 0;
  console.log(`Extracted: ${catCount} categories, ${prodCount} products`);
  console.log(`Confidence: ${JSON.stringify(extracted.confidence ?? {})}`);

  if (catCount === 0 || prodCount === 0) {
    throw new Error('AI extraction returned 0 categories/products — aborting insert');
  }

  console.log('\nInserting into Supabase...');
  const insertResult = await insertMenuData(supabase, extracted);

  const finalCounts = await getCounts(supabase);
  console.log('\n--- After import ---');
  console.log(JSON.stringify(finalCounts, null, 2));

  console.log('\n=== Import Summary ===');
  console.log(`Deleted: ${beforeCounts.categories} categories, ${beforeCounts.products} products`);
  console.log(`Imported: ${insertResult.categoryCount} categories, ${insertResult.productCount} products`);
  console.log(`Photos: PDF image extraction not performed — products imported without images`);
  if (extracted.restaurant?.name_en) {
    console.log(`Restaurant: ${extracted.restaurant.name_en} / ${extracted.restaurant.name_ar ?? '—'}`);
  }

  console.log('\nSample items:');
  for (const s of insertResult.samples) {
    console.log(`  [${s.category}] ${s.product} (${s.name_ar ?? '—'}) — ${s.dining_price} EGP`);
  }

  if (insertResult.errors.length) {
    console.log(`\nErrors (${insertResult.errors.length}):`);
    insertResult.errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
  }

  console.log(`\nExtracted JSON already saved to scripts/last-import-extracted.json`);
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
