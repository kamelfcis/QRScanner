import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasDailyOps } from '@/i18n/config';
import {
  isStaffRole,
  parsePermissionMap,
  type PermissionMap,
  type StaffRole,
} from '@/lib/staff/permissions';

export const runtime = 'nodejs';

type StaffRow = {
  user_id: string;
  role: StaffRole;
  full_name: string;
  permissions: PermissionMap;
  is_active: boolean;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data, error } = await supabase.rpc('is_staff_admin');
  let isAdmin = data === true;
  if (error) {
    const { data: row } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    isAdmin = row?.role === 'admin';
  }
  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 }) };
  }

  return { user, admin };
}

async function countActiveAdmins(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  exceptUserId?: string
) {
  let query = admin
    .from('staff_profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('is_active', true);
  if (exceptUserId) query = query.neq('user_id', exceptUserId);
  const { count, error } = await query;
  if (!error) return count ?? 0;
  const fallback = admin
    .from('staff_profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'admin');
  const retry = exceptUserId ? fallback.neq('user_id', exceptUserId) : fallback;
  const second = await retry;
  if (second.error) throw second.error;
  return second.count ?? 0;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  if (!hasDailyOps) {
    return jsonError('Not available', 404);
  }

  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { data: profiles, error } = await gate.admin
    .from('staff_profiles')
    .select('user_id, role, full_name, permissions, is_active, created_at')
    .order('created_at', { ascending: true });

  if (error) return jsonError(error.message, 500);

  const { data: usersData, error: usersError } = await gate.admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (usersError) return jsonError(usersError.message, 500);

  const emailById = new Map((usersData.users ?? []).map((u) => [u.id, u.email ?? '']));
  const rows = (profiles ?? []).map((row) => ({
    user_id: row.user_id,
    email: emailById.get(row.user_id) ?? '',
    role: isStaffRole(row.role) ? row.role : 'cashier',
    full_name: row.full_name ?? '',
    permissions: parsePermissionMap(row.permissions),
    is_active: row.is_active !== false,
  }));

  return NextResponse.json({ users: rows });
}

export async function POST(request: Request) {
  if (!hasDailyOps) return jsonError('Not available', 404);
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
  const requestedRole = body?.role;
  const role: StaffRole = isStaffRole(requestedRole) ? requestedRole : 'cashier';
  const permissions = role === 'custom' ? parsePermissionMap(body?.permissions) : {};

  if (!email || !email.includes('@')) return jsonError('Invalid email', 400);
  if (password.length < 8) return jsonError('Password must be at least 8 characters', 400);

  const { data: created, error: createError } = await gate.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return jsonError(createError?.message ?? 'Could not create user', 400);
  }

  const { error: upsertError } = await gate.admin.from('staff_profiles').upsert(
    {
      user_id: created.user.id,
      role,
      full_name: fullName,
      permissions,
      is_active: true,
    },
    { onConflict: 'user_id' }
  );

  if (upsertError) {
    await gate.admin.auth.admin.deleteUser(created.user.id);
    return jsonError(upsertError.message, 500);
  }

  return NextResponse.json({
    user: {
      user_id: created.user.id,
      email,
      role,
      full_name: fullName,
      permissions,
      is_active: true,
    } satisfies StaffRow & { email: string },
  });
}

export async function PATCH(request: Request) {
  if (!hasDailyOps) return jsonError('Not available', 404);
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => null);
  const userId = typeof body?.user_id === 'string' ? body.user_id : '';
  if (!userId) return jsonError('user_id is required', 400);

  const { data: existing, error: existingError } = await gate.admin
    .from('staff_profiles')
    .select('user_id, role, is_active')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) return jsonError(existingError.message, 500);
  if (!existing) return jsonError('User not found', 404);

  const nextRole = isStaffRole(body?.role) ? body.role : existing.role;
  const nextActive =
    typeof body?.is_active === 'boolean' ? body.is_active : existing.is_active !== false;
  const demotingLastAdmin =
    existing.role === 'admin' &&
    existing.is_active !== false &&
    (nextRole !== 'admin' || nextActive === false);

  if (demotingLastAdmin) {
    const remaining = await countActiveAdmins(gate.admin, userId);
    if (remaining < 1) return jsonError('Cannot remove the last admin', 400);
  }

  const patch: Record<string, unknown> = {
    role: nextRole,
    is_active: nextActive,
    updated_at: new Date().toISOString(),
  };
  if (typeof body?.full_name === 'string') patch.full_name = body.full_name.trim();
  if (nextRole === 'custom') patch.permissions = parsePermissionMap(body?.permissions);
  if (nextRole !== 'custom') patch.permissions = {};

  const { error: updateError } = await gate.admin
    .from('staff_profiles')
    .update(patch)
    .eq('user_id', userId);
  if (updateError) return jsonError(updateError.message, 500);

  if (typeof body?.password === 'string' && body.password.length > 0) {
    if (body.password.length < 8) return jsonError('Password must be at least 8 characters', 400);
    const { error: pwError } = await gate.admin.auth.admin.updateUserById(userId, {
      password: body.password,
    });
    if (pwError) return jsonError(pwError.message, 400);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!hasDailyOps) return jsonError('Not available', 404);
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => null);
  const userId = typeof body?.user_id === 'string' ? body.user_id : '';
  if (!userId) return jsonError('user_id is required', 400);
  if (userId === gate.user.id) return jsonError('Cannot delete your own account', 400);

  const { data: existing } = await gate.admin
    .from('staff_profiles')
    .select('role, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.role === 'admin' && existing.is_active !== false) {
    const remaining = await countActiveAdmins(gate.admin, userId);
    if (remaining < 1) return jsonError('Cannot remove the last admin', 400);
  }

  const { error: delError } = await gate.admin.auth.admin.deleteUser(userId);
  if (delError) return jsonError(delError.message, 400);
  return NextResponse.json({ ok: true });
}
