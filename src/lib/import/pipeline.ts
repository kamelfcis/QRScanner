import { createClient } from '@/lib/supabase/client';
import { extractTextFromFile } from './text-extraction';
import { extractMenuData } from './ai-extraction';
import type { ImportJob, ImportExtractedData } from '@/types/database';
import type { StorageBucket } from '@/lib/upload';

const supabase = createClient();

export interface PipelineResult {
  job: ImportJob;
  error?: string;
}

export async function startImportPipeline(file: File): Promise<ImportJob> {
  const fileType = getFileType(file);
  const filePath = `imports/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('imports' as StorageBucket)
    .upload(filePath, file);

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from('imports' as StorageBucket)
    .getPublicUrl(filePath);

  const { data: job, error: jobError } = await supabase
    .from('import_jobs')
    .insert({
      status: 'processing',
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: fileType,
      file_size: file.size,
    })
    .select()
    .single();

  if (jobError) throw new Error(`Failed to create import job: ${jobError.message}`);

  processImportJob(job.id, file).catch((err) => {
    console.error('Import pipeline error:', err);
    supabase
      .from('import_jobs')
      .update({ status: 'failed', error_message: String(err) })
      .eq('id', job.id);
  });

  return job as ImportJob;
}

async function processImportJob(jobId: string, file: File): Promise<void> {
  await updateJobStatus(jobId, 'processing');

  const extractionResult = await extractTextFromFile(file);

  await supabase
    .from('import_jobs')
    .update({ raw_text: extractionResult.text })
    .eq('id', jobId);

  await updateJobStatus(jobId, 'parsing');

  let extractedData: ImportExtractedData;
  try {
    extractedData = await extractMenuData(extractionResult.text);
  } catch (err) {
    extractedData = {
      restaurant: {},
      categories: [],
      confidence: { overall: 0, restaurant: 0, categories: 0, products: 0 },
    };
    await supabase
      .from('import_jobs')
      .update({
        status: 'failed',
        error_message: `AI extraction failed: ${String(err)}. Raw text is available for manual review.`,
        extracted_data: extractedData,
      })
      .eq('id', jobId);
    return;
  }

  await supabase
    .from('import_jobs')
    .update({ status: 'preview', extracted_data: extractedData })
    .eq('id', jobId);
}

export async function updateJobStatus(
  jobId: string,
  status: ImportJob['status']
): Promise<void> {
  const { error } = await supabase
    .from('import_jobs')
    .update({ status })
    .eq('id', jobId);

  if (error) throw error;
}

export async function updateJobData(
  jobId: string,
  data: Partial<ImportJob>
): Promise<void> {
  const { error } = await supabase
    .from('import_jobs')
    .update(data)
    .eq('id', jobId);

  if (error) throw error;
}

export async function confirmImport(jobId: string): Promise<void> {
  await updateJobStatus(jobId, 'importing');

  const { data: job, error: fetchError } = await supabase
    .from('import_jobs')
    .select('extracted_data')
    .eq('id', jobId)
    .single();

  if (fetchError) throw fetchError;

  const extracted = job.extracted_data as ImportExtractedData;
  if (!extracted) throw new Error('No extracted data found');

  if (extracted.categories) {
    for (const cat of extracted.categories) {
      const { data: category, error: catError } = await supabase
        .from('categories')
        .insert({
          name_en: cat.name_en,
          name_ar: cat.name_ar || cat.name_en,
          description_en: cat.description_en,
          description_ar: cat.description_ar,
          image_url: cat.image_url,
          is_visible: true,
          sort_order: 0,
        })
        .select()
        .single();

      if (catError) {
        console.error('Failed to create category:', catError);
        continue;
      }

      for (const prod of cat.products) {
        const { error: prodError } = await supabase.from('products').insert({
          category_id: category.id,
          name_en: prod.name_en,
          name_ar: prod.name_ar || prod.name_en,
          description_en: prod.description_en,
          description_ar: prod.description_ar,
          dining_price: prod.dining_price || 0,
          takeaway_price: prod.takeaway_price || prod.dining_price || 0,
          is_available: true,
          is_popular: false,
          is_bestseller: false,
          is_new_item: false,
          is_spicy: false,
          sort_order: 0,
        });

        if (prodError) {
          console.error('Failed to create product:', prodError);
        }
      }
    }
  }

  await updateJobStatus(jobId, 'completed');
}

export async function deleteImportJob(jobId: string): Promise<void> {
  const { error } = await supabase.from('import_jobs').delete().eq('id', jobId);
  if (error) throw error;
}

function getFileType(file: File): ImportJob['file_type'] {
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'png':
      return 'png';
    case 'jpg':
    case 'jpeg':
      return 'jpeg';
    case 'webp':
      return 'webp';
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
