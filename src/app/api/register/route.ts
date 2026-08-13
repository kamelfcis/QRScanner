import { NextResponse } from 'next/server';
import { z } from 'zod';
import { encryptJson, encryptSecret } from '@/lib/crypto/secrets';
import { requireRegisterSecrets } from '@/lib/env';
import { slugFromBusinessName, SLUG_RE } from '@/lib/register/slug';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MENU_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const LOGO_MAX = 5 * 1024 * 1024;
const MENU_MAX = 10 * 1024 * 1024;

const fieldsSchema = z.object({
  ownerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30),
  password: z.string().min(8).max(200),
  businessName: z.string().trim().min(2).max(160),
  businessType: z.enum(['restaurant', 'cafe', 'bakery', 'fast_food', 'cloud_kitchen', 'other']),
  address: z.string().trim().min(2).max(240),
  city: z.string().trim().min(2).max(80),
});

function friendlyError(code: string, status = 400) {
  return NextResponse.json({ error: 'request_failed', code }, { status });
}

function hasArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

export async function POST(request: Request) {
  const secrets = requireRegisterSecrets();
  if (!secrets.ok) {
    return friendlyError('generic', 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return friendlyError('generic');
  }

  const parsed = fieldsSchema.safeParse({
    ownerName: String(form.get('ownerName') || ''),
    email: String(form.get('email') || ''),
    phone: String(form.get('phone') || ''),
    password: String(form.get('password') || ''),
    businessName: String(form.get('businessName') || ''),
    businessType: String(form.get('businessType') || ''),
    address: String(form.get('address') || ''),
    city: String(form.get('city') || ''),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === 'email') return friendlyError('email');
    if (issue?.path[0] === 'password') return friendlyError('password');
    return friendlyError('generic');
  }

  const input = parsed.data;
  const logo = form.get('logo');
  const menu = form.get('menu');
  const logoFile = logo instanceof File && logo.size > 0 ? logo : null;
  const menuFile = menu instanceof File && menu.size > 0 ? menu : null;

  if (logoFile && (logoFile.size > LOGO_MAX || !LOGO_TYPES.has(logoFile.type))) {
    return friendlyError('upload');
  }
  if (menuFile && (menuFile.size > MENU_MAX || !MENU_TYPES.has(menuFile.type))) {
    return friendlyError('upload');
  }

  const db = createServiceRoleClient();
  const displayAr = hasArabic(input.businessName) ? input.businessName : input.businessName;
  const displayEn = hasArabic(input.businessName) ? input.businessName : input.businessName;

  let slug = slugFromBusinessName(input.businessName);
  if (!SLUG_RE.test(slug)) {
    slug = slugFromBusinessName('venue');
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: clash } = await db.from('customers').select('id').eq('slug', slug).maybeSingle();
    if (!clash) break;
    slug = slugFromBusinessName(input.businessName);
  }

  const fullRow = {
    slug,
    display_name_ar: displayAr,
    display_name_en: displayEn,
    template_type: 'warda',
    status: 'draft',
    registration_source: 'self_service',
    owner_name: input.ownerName,
    owner_email: input.email.toLowerCase(),
    owner_phone: input.phone,
    business_type: input.businessType,
    address: input.address,
    city: input.city,
  };

  let customer: { id: string; slug: string } | null = null;
  const { data: inserted, error: insertError } = await db
    .from('customers')
    .insert(fullRow)
    .select('id, slug')
    .single();

  if (insertError || !inserted) {
    const message = insertError?.message || '';
    if (/owner_email|unique/i.test(message) && /duplicate|unique/i.test(message)) {
      return friendlyError('duplicate', 409);
    }
    if (/column .* does not exist|schema cache/i.test(message)) {
      const { data: fallback, error: fallbackErr } = await db
        .from('customers')
        .insert({
          slug,
          display_name_ar: displayAr,
          display_name_en: displayEn,
          template_type: 'warda',
          status: 'draft',
        })
        .select('id, slug')
        .single();
      if (fallbackErr || !fallback) {
        if (/duplicate|unique/i.test(fallbackErr?.message || '')) return friendlyError('duplicate', 409);
        return friendlyError('generic', 500);
      }
      customer = fallback;
      const { password: _password, ...safeInput } = input;
      const extras = encryptJson({
        type: 'self_service_registration',
        ...safeInput,
      });
      await db.from('customer_secrets').upsert(
        {
          customer_id: customer.id,
          ciphertext: extras.ciphertext,
          iv: extras.iv,
          auth_tag: extras.authTag,
        },
        { onConflict: 'customer_id' }
      );
    } else {
      return friendlyError('generic', 500);
    }
  } else {
    customer = inserted;
  }

  if (!customer) {
    return friendlyError('generic', 500);
  }

  const encPass = encryptSecret(input.password);
  await db.from('customer_admins').insert({
    customer_id: customer.id,
    email: input.email.toLowerCase(),
    password_ciphertext: encPass.ciphertext,
    password_iv: encPass.iv,
    password_auth_tag: encPass.authTag,
  });

  let uploadWarning = false;
  const pathUpdates: { logo_path?: string; menu_path?: string } = {};

  if (logoFile) {
    const ext = logoFile.type === 'image/png' ? 'png' : logoFile.type === 'image/webp' ? 'webp' : 'jpg';
    const logoPath = `${customer.id}/logo.${ext}`;
    const { error } = await db.storage.from('registration-logos').upload(logoPath, logoFile, {
      contentType: logoFile.type,
      upsert: true,
    });
    if (error) uploadWarning = true;
    else pathUpdates.logo_path = logoPath;
  }

  if (menuFile) {
    const ext =
      menuFile.type === 'application/pdf'
        ? 'pdf'
        : menuFile.type === 'image/png'
          ? 'png'
          : menuFile.type === 'image/webp'
            ? 'webp'
            : 'jpg';
    const menuPath = `${customer.id}/menu.${ext}`;
    const { error } = await db.storage.from('registration-menus').upload(menuPath, menuFile, {
      contentType: menuFile.type,
      upsert: true,
    });
    if (error) uploadWarning = true;
    else pathUpdates.menu_path = menuPath;
  }

  if (Object.keys(pathUpdates).length) {
    const { error } = await db.from('customers').update(pathUpdates).eq('id', customer.id);
    if (error) uploadWarning = true;
  }

  return NextResponse.json({
    ok: true,
    slug: customer.slug,
    uploadWarning,
  });
}
