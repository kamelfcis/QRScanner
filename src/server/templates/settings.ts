import type { TemplateConfig, TemplateType } from '@/lib/engaz/types';
import { TEMPLATE_CONFIGS } from '@/lib/engaz/types';

export function getTemplateConfig(type: TemplateType): TemplateConfig {
  return TEMPLATE_CONFIGS[type];
}

export function buildRestaurantSettings(input: {
  templateType: TemplateType;
  displayNameAr: string;
  displayNameEn: string;
}) {
  const tpl = getTemplateConfig(input.templateType);
  return {
    name_ar: input.displayNameAr,
    name_en: input.displayNameEn,
    phone: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    address_ar: '',
    address_en: '',
    currency: 'EGP',
    tax_rate: 0,
    service_charge_rate: 0,
    qr_target_path: tpl.qrTargetPath,
  };
}

export function buildThemeSettings(templateType: TemplateType) {
  return getTemplateConfig(templateType).defaultTheme;
}

export function buildHoursSettings() {
  return {
    saturday: { open: '09:00', close: '23:00' },
    sunday: { open: '09:00', close: '23:00' },
    monday: { open: '09:00', close: '23:00' },
    tuesday: { open: '09:00', close: '23:00' },
    wednesday: { open: '09:00', close: '23:00' },
    thursday: { open: '09:00', close: '23:00' },
    friday: { closed: true },
  };
}

export function buildCustomerEnvExample(input: {
  slug: string;
  displayNameEn: string;
  templateType: TemplateType;
  supabaseUrl: string;
  productionUrl: string;
}) {
  const tpl = getTemplateConfig(input.templateType);
  const lines = [
    '# Customer env (set on Vercel — do not commit real secrets)',
    `NEXT_PUBLIC_SUPABASE_URL=${input.supabaseUrl}`,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key',
    'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key',
    `NEXT_PUBLIC_APP_NAME=${input.displayNameEn}`,
    `NEXT_PUBLIC_APP_URL=${input.productionUrl}`,
    `NEXT_PUBLIC_SITE_URL=${input.productionUrl}`,
    `NEXT_PUBLIC_QR_TARGET_PATH=${tpl.qrTargetPath}`,
  ];
  if (tpl.fulfillmentMode === 'delivery_only') {
    lines.push('NEXT_PUBLIC_FULFILLMENT_MODE=delivery_only');
  }
  return lines.join('\n') + '\n';
}

export function buildHandoffMarkdown(input: {
  slug: string;
  displayNameEn: string;
  displayNameAr: string;
  templateType: TemplateType;
  productionUrl: string;
  adminEmail: string;
  adminPassword: string;
  gitBranch: string;
}) {
  const tpl = getTemplateConfig(input.templateType);
  return `# Customer Handoff — ${input.displayNameEn}

| Field | Value |
|-------|-------|
| Arabic name | ${input.displayNameAr} |
| English name | ${input.displayNameEn} |
| Slug | \`${input.slug}\` |
| Template | ${tpl.label} |
| Git branch | \`${input.gitBranch}\` |
| Production URL | ${input.productionUrl} |
| Admin dashboard | ${input.productionUrl}/login |
| Admin email | \`${input.adminEmail}\` |
| Admin password | \`${input.adminPassword}\` |

## Notes

- Menu starts **empty** (no categories/products). Add content from the customer dashboard.
- Keep this repository **private**. Treat this file as confidential.
- Change the admin password after first login (Dashboard → Settings).
`;
}

/** Storage / theme keys to rewrite when cloning a template branch. */
export function brandingReplacements(slug: string, displayNameEn: string) {
  return [
    { from: /NEXT_PUBLIC_APP_NAME=.*/g, to: `NEXT_PUBLIC_APP_NAME=${displayNameEn}` },
    { from: /storageKey=["'][^"']+["']/g, to: `storageKey="${slug}-theme"` },
    { from: /aklet-cart-v1/g, to: `${slug}-cart-v1` },
    { from: /aklet-dining-mode/g, to: `${slug}-dining-mode` },
    { from: /aklet-table/g, to: `${slug}-table` },
    { from: /aklet-last-wa-url/g, to: `${slug}-last-wa-url` },
    { from: /warda-recent/g, to: `${slug}-recent` },
    { from: /warda-pwa-dismissed/g, to: `${slug}-pwa-dismissed` },
    { from: /warda-shamya-v1/g, to: `${slug}-v1` },
    { from: /harameen-theme/g, to: `${slug}-theme` },
    { from: /aklet-gambary-theme/g, to: `${slug}-theme` },
  ];
}
