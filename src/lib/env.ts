import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Warda Shamya'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required for server-side operations')
    .optional(),
  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY is required for menu import')
    .optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, value]) => `  ${key}: ${value?.join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${messages}`);
  }
  return parsed.data;
}

export const env = validateEnv();

export const isServer = typeof window === 'undefined';
export const isClient = typeof window !== 'undefined';

export function requireServerEnv(): typeof env {
  if (!isServer) {
    throw new Error('This function can only be called on the server');
  }
  return env;
}
