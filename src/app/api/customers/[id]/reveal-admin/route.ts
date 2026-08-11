import { NextResponse } from 'next/server';
import { decryptSecret } from '@/lib/crypto/secrets';
import { createServiceRoleClient, requireSuperAdmin } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === 'unauthorized' ? 401 : 403 }
    );
  }

  const { id } = await ctx.params;
  const db = createServiceRoleClient();
  const { data: admin, error } = await db
    .from('customer_admins')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !admin) {
    return NextResponse.json({ error: 'Admin credentials not found' }, { status: 404 });
  }

  const password = decryptSecret({
    ciphertext: admin.password_ciphertext,
    iv: admin.password_iv,
    authTag: admin.password_auth_tag,
  });

  return NextResponse.json({ email: admin.email, password });
}
