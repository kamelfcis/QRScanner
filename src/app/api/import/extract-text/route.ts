import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractTextFromBuffer } from '@/lib/import/text-extraction-server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const ACCEPTED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await extractTextFromBuffer(buffer, file.type);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Text extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
