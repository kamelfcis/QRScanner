export type TemplateType = 'warda' | 'aklet' | 'harameen';

export type CustomerStatus = 'draft' | 'provisioning' | 'live' | 'failed' | 'archived';

export type ProvisionJobStatus =
  | 'queued'
  | 'cloning'
  | 'migrating'
  | 'seeding'
  | 'creating_admin'
  | 'configuring_git'
  | 'deploying'
  | 'done'
  | 'failed';

export type CustomerSecrets = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  supabaseDbPassword: string;
  supabaseAccessToken: string;
  supabaseProjectRef: string;
};

export type TemplateConfig = {
  id: TemplateType;
  label: string;
  sourceBranch: string;
  businessType: 'restaurant' | 'supermarket';
  fulfillmentMode: 'full' | 'delivery_only';
  qrTargetPath: '/' | '/welcome';
  defaultTheme: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
  };
};

export type ProvisionWizardInput = {
  templateType: TemplateType;
  slug: string;
  displayNameAr: string;
  displayNameEn: string;
  adminEmail: string;
  adminPassword?: string;
  secrets: CustomerSecrets;
};

export const TEMPLATE_CONFIGS: Record<TemplateType, TemplateConfig> = {
  warda: {
    id: 'warda',
    label: 'Warda (restaurant)',
    sourceBranch: 'warda',
    businessType: 'restaurant',
    fulfillmentMode: 'full',
    qrTargetPath: '/welcome',
    defaultTheme: {
      primary_color: '#9F1239',
      secondary_color: '#881337',
      accent_color: '#D97706',
      background_color: '#FFF7ED',
    },
  },
  aklet: {
    id: 'aklet',
    label: 'Aklet Gambary (restaurant)',
    sourceBranch: 'aklet-gambary',
    businessType: 'restaurant',
    fulfillmentMode: 'full',
    qrTargetPath: '/welcome',
    defaultTheme: {
      primary_color: '#0E7490',
      secondary_color: '#155E75',
      accent_color: '#F97316',
      background_color: '#F0FDFA',
    },
  },
  harameen: {
    id: 'harameen',
    label: 'Harameen (supermarket)',
    sourceBranch: 'harameen',
    businessType: 'supermarket',
    fulfillmentMode: 'delivery_only',
    qrTargetPath: '/',
    defaultTheme: {
      primary_color: '#0F766E',
      secondary_color: '#115E59',
      accent_color: '#F59E0B',
      background_color: '#F0FDFA',
    },
  },
};

export const JOB_STEPS: ProvisionJobStatus[] = [
  'queued',
  'cloning',
  'migrating',
  'seeding',
  'creating_admin',
  'configuring_git',
  'deploying',
  'done',
];
