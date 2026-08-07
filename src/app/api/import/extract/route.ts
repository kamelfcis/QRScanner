import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractMenuData } from '@/lib/import/ai-extraction';

export const runtime = 'nodejs';

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

    const body = await request.json().catch(() => null);
    const rawText = typeof body?.rawText === 'string' ? body.rawText : '';

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'rawText is required' }, { status: 400 });
    }

    const extracted = await extractMenuData(rawText);
    return NextResponse.json(extracted);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
