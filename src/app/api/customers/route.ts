import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/supabase/server';

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === 'unauthorized' ? 401 : 403 }
    );
  }

  const { data, error } = await auth.supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ customers: data || [] });
}
