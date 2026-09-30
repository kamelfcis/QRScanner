import { z } from 'zod';

const bodySchema = z.object({
  customerId: z.string().uuid().optional(),
  templateType: z.enum(['warda', 'aklet', 'harameen']),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/),
  displayNameAr: z.string().min(1),
  displayNameEn: z.string().min(1),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
  secrets: z.object({
    supabaseUrl: z.string().url(),
    supabaseAnonKey: z.string().min(20),
    supabaseServiceRoleKey: z.string().min(20),
    supabaseDbPassword: z.string().min(1),
    supabaseAccessToken: z.string().min(10),
    supabaseProjectRef: z.string().min(5),
  }),
});

export type ProvisionInput = z.infer<typeof bodySchema>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function stripSecretWhitespace(value: unknown): string {
  return cleanText(value)
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\s+/g, '');
}

export function normalizeSupabaseUrl(value: unknown): string {
  let text = cleanText(value).replace(/^['"]+|['"]+$/g, '');
  const embedded = text.match(/https?:\/\/[a-z0-9-]+\.supabase\.co\b/i);
  if (embedded) {
    text = embedded[0];
  } else if (/^[a-z0-9-]+\.supabase\.co\b/i.test(text)) {
    text = `https://${text}`;
  }
  return text.replace(/\/+$/, '');
}

export function normalizeProjectRef(value: unknown, supabaseUrl: string): string {
  const direct = stripSecretWhitespace(value).toLowerCase();
  if (/^[a-z0-9]{5,}$/.test(direct)) return direct;
  const fromUrl = supabaseUrl.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co$/i);
  return fromUrl?.[1]?.toLowerCase() ?? direct;
}

function normalizeEmail(value: unknown): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0];
}

function normalizePassword(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (text.trim().length < 8) return undefined;
  return text;
}

function normalizeSlug(value: unknown): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function validationMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'body';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

export function prepareProvisionInput(
  raw: unknown
): { ok: true; data: ProvisionInput } | { ok: false; error: string } {
  const body = asRecord(raw);
  if (!body) return { ok: false, error: 'Invalid provision request' };

  const secrets = asRecord(body.secrets) ?? {};
  const supabaseUrl = normalizeSupabaseUrl(secrets.supabaseUrl);
  const normalized = {
    customerId: cleanText(body.customerId) || undefined,
    templateType: cleanText(body.templateType).toLowerCase(),
    slug: normalizeSlug(body.slug),
    displayNameAr: cleanText(body.displayNameAr),
    displayNameEn: cleanText(body.displayNameEn),
    adminEmail: normalizeEmail(body.adminEmail),
    adminPassword: normalizePassword(body.adminPassword),
    secrets: {
      supabaseUrl,
      supabaseAnonKey: stripSecretWhitespace(secrets.supabaseAnonKey),
      supabaseServiceRoleKey: stripSecretWhitespace(secrets.supabaseServiceRoleKey),
      supabaseDbPassword: cleanText(secrets.supabaseDbPassword),
      supabaseAccessToken: stripSecretWhitespace(secrets.supabaseAccessToken),
      supabaseProjectRef: normalizeProjectRef(secrets.supabaseProjectRef, supabaseUrl),
    },
  };

  const parsed = bodySchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, error: validationMessage(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}
