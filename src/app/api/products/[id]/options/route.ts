import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAlaKeefakTenant } from '@/i18n/config';

export const runtime = 'nodejs';

const optionItemSchema = z.object({
  id: z.string().uuid().optional(),
  name_ar: z.string().min(1).max(255),
  name_en: z.string().min(1).max(255),
  price_delta: z.number().min(-9999).max(9999),
  is_default: z.boolean().default(false),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

const optionGroupSchema = z.object({
  id: z.string().uuid().optional(),
  name_ar: z.string().min(1).max(255),
  name_en: z.string().min(1).max(255),
  selection_type: z.enum(['single', 'multi']),
  min_select: z.number().int().min(0).default(0),
  max_select: z.number().int().min(1).default(1),
  is_required: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
  items: z.array(optionItemSchema).min(1),
});

const saveOptionsSchema = z.object({
  groups: z.array(optionGroupSchema).max(20),
  delete_group_ids: z.array(z.string().uuid()).optional(),
  delete_item_ids: z.array(z.string().uuid()).optional(),
});

async function requireMenuWrite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: allowed, error } = await supabase.rpc('staff_can', {
    p_resource: 'menu',
    p_action: 'update',
  });
  if (error || allowed !== true) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 }) };
  }

  return { admin };
}

function validateGroups(groups: z.infer<typeof saveOptionsSchema>['groups']) {
  for (const group of groups) {
    if (group.min_select > group.max_select) {
      return 'min_select cannot exceed max_select';
    }
    if (group.selection_type === 'single') {
      const defaults = group.items.filter((item) => item.is_default);
      if (defaults.length > 1) {
        return 'Single-select groups allow at most one default item';
      }
      if (group.max_select > 1 && group.is_required) {
        // still valid; max for single is typically 1
      }
    }
  }
  return null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAlaKeefakTenant) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const auth = await requireMenuWrite();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await context.params;
  const { data, error } = await auth
    .admin!.from('products')
    .select(
      `id, option_groups:product_option_groups(
        id, product_id, name_ar, name_en, selection_type, min_select, max_select, is_required, sort_order,
        items:product_option_items(
          id, group_id, name_ar, name_en, price_delta, is_default, is_available, sort_order
        )
      )`
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({ groups: data.option_groups ?? [] });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAlaKeefakTenant) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const auth = await requireMenuWrite();
  if ('error' in auth && auth.error) return auth.error;

  const { id: productId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = saveOptionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const validationError = validateGroups(parsed.data.groups);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const admin = auth.admin!;
  const { data: product, error: productError } = await admin
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const deleteGroupIds = parsed.data.delete_group_ids ?? [];
  const deleteItemIds = parsed.data.delete_item_ids ?? [];

  if (deleteItemIds.length > 0) {
    const { error } = await admin.from('product_option_items').delete().in('id', deleteItemIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (deleteGroupIds.length > 0) {
    const { error } = await admin.from('product_option_groups').delete().in('id', deleteGroupIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  for (const group of parsed.data.groups) {
    let groupId = group.id ?? null;

    if (groupId) {
      const { error } = await admin
        .from('product_option_groups')
        .update({
          name_ar: group.name_ar,
          name_en: group.name_en,
          selection_type: group.selection_type,
          min_select: group.min_select,
          max_select: group.max_select,
          is_required: group.is_required,
          sort_order: group.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId)
        .eq('product_id', productId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { data: inserted, error } = await admin
        .from('product_option_groups')
        .insert({
          product_id: productId,
          name_ar: group.name_ar,
          name_en: group.name_en,
          selection_type: group.selection_type,
          min_select: group.min_select,
          max_select: group.max_select,
          is_required: group.is_required,
          sort_order: group.sort_order,
        })
        .select('id')
        .single();
      if (error || !inserted) {
        return NextResponse.json(
          { error: error?.message ?? 'Failed to create group' },
          { status: 500 }
        );
      }
      groupId = inserted.id;
    }

    for (const item of group.items) {
      if (item.id) {
        const { error } = await admin
          .from('product_option_items')
          .update({
            name_ar: item.name_ar,
            name_en: item.name_en,
            price_delta: item.price_delta,
            is_default: item.is_default,
            is_available: item.is_available,
            sort_order: item.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
          .eq('group_id', groupId);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      } else {
        const { error } = await admin.from('product_option_items').insert({
          group_id: groupId,
          name_ar: item.name_ar,
          name_en: item.name_en,
          price_delta: item.price_delta,
          is_default: item.is_default,
          is_available: item.is_available,
          sort_order: item.sort_order,
        });
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }
  }

  const { data: refreshed, error: refreshError } = await admin
    .from('products')
    .select(
      `id, option_groups:product_option_groups(
        id, product_id, name_ar, name_en, selection_type, min_select, max_select, is_required, sort_order,
        items:product_option_items(
          id, group_id, name_ar, name_en, price_delta, is_default, is_available, sort_order
        )
      )`
    )
    .eq('id', productId)
    .single();

  if (refreshError) {
    return NextResponse.json({ error: refreshError.message }, { status: 500 });
  }

  return NextResponse.json({ groups: refreshed.option_groups ?? [] });
}
