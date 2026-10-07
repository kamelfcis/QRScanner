import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAlaKeefakTenant } from '@/i18n/config';

export const runtime = 'nodejs';

export async function POST() {
  if (!isAlaKeefakTenant) {
    return NextResponse.json({ error: 'Not available for this tenant' }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('restaurant-settings', 'seconds');
  revalidatePath('/');
  revalidatePath('/menu');

  return NextResponse.json({ revalidated: true });
}
