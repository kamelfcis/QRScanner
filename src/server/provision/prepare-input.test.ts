import { describe, expect, it } from 'vitest';
import { prepareProvisionInput } from './prepare-input';

const filled = {
  templateType: 'warda',
  slug: 'mazen-store-b1eb',
  displayNameAr: 'MAZEN STORE',
  displayNameEn: 'MAZEN STORE',
  adminEmail: 'mazenstore25@gmail.com',
  secrets: {
    supabaseUrl: 'https://mokijxmoxfbahncsfpzb.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
    supabaseServiceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service.signature',
    supabaseDbPassword: 'db-password',
    supabaseAccessToken: 'sbp_personal_access_token_value',
    supabaseProjectRef: 'mokijxmoxfbahncsfpzb',
  },
};

describe('prepareProvisionInput', () => {
  it('accepts a filled Mazen Store wizard payload', () => {
    const result = prepareProvisionInput(filled);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.slug).toBe('mazen-store-b1eb');
      expect(result.data.secrets.supabaseProjectRef).toBe('mokijxmoxfbahncsfpzb');
    }
  });

  it('repairs a host-only Supabase URL and a wrapped key', () => {
    const result = prepareProvisionInput({
      ...filled,
      adminPassword: 'short',
      secrets: {
        ...filled.secrets,
        supabaseUrl: 'mokijxmoxfbahncsfpzb.supabase.co/',
        supabaseAnonKey: '  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\n.payload.signature  ',
        supabaseProjectRef: 'https://mokijxmoxfbahncsfpzb.supabase.co',
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.secrets.supabaseUrl).toBe('https://mokijxmoxfbahncsfpzb.supabase.co');
      expect(result.data.secrets.supabaseAnonKey).toBe(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature'
      );
      expect(result.data.secrets.supabaseProjectRef).toBe('mokijxmoxfbahncsfpzb');
      expect(result.data.adminPassword).toBeUndefined();
    }
  });

  it('names the field when a key is still too short', () => {
    const result = prepareProvisionInput({
      ...filled,
      secrets: { ...filled.secrets, supabaseAnonKey: 'too-short' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('secrets.supabaseAnonKey');
      expect(result.error).not.toContain('too-short');
    }
  });
});
