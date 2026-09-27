/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  getAiImageProvider,
  getConfiguredImageApiKey,
  isAiImageGenerationConfigured,
} from '@/lib/ai/image-provider';
import { sanitizeErrorMessage } from '@/lib/ai/product-image';
import {
  buildPollinationsAuthorization,
  buildPollinationsGenerateUrl,
  DEFAULT_POLLINATIONS_IMAGE_MODEL,
  generatePollinationsProductImageCandidate,
  getPollinationsImageModel,
} from '@/lib/ai/pollinations-product-image';

const ENV_KEYS = [
  'AI_IMAGE_PROVIDER',
  'POLLINATIONS_API_KEY',
  'POLLINATIONS_IMAGE_MODEL',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('pollinations image provider', () => {
  it('stays on gemini unless pollinations or openai is selected', () => {
    delete process.env.AI_IMAGE_PROVIDER;
    expect(getAiImageProvider()).toBe('gemini');

    process.env.AI_IMAGE_PROVIDER = 'openai';
    expect(getAiImageProvider()).toBe('openai');

    process.env.AI_IMAGE_PROVIDER = 'pollinations';
    expect(getAiImageProvider()).toBe('pollinations');
  });

  it('uses POLLINATIONS_API_KEY only when that provider is selected', () => {
    process.env.AI_IMAGE_PROVIDER = 'pollinations';
    process.env.POLLINATIONS_API_KEY = 'sk_testkey123';
    process.env.GEMINI_API_KEY = 'gemini-test';
    process.env.OPENAI_API_KEY = 'sk-openai-test';

    expect(isAiImageGenerationConfigured()).toBe(true);
    expect(getConfiguredImageApiKey()).toBe('sk_testkey123');

    delete process.env.POLLINATIONS_API_KEY;
    expect(isAiImageGenerationConfigured()).toBe(false);

    process.env.AI_IMAGE_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'gemini-test';
    expect(getConfiguredImageApiKey()).toBe('gemini-test');
  });
});

describe('pollinations request builder', () => {
  it('builds the gen.pollinations.ai URL without putting the key in the query', () => {
    const apiKey = 'sk_testkey123';
    const url = buildPollinationsGenerateUrl('grilled shrimp & lemon', 'gptimage-large');

    expect(url.origin).toBe('https://gen.pollinations.ai');
    expect(url.pathname).toBe(`/image/${encodeURIComponent('grilled shrimp & lemon')}`);
    expect(url.searchParams.get('model')).toBe('gptimage-large');
    expect(url.searchParams.get('quality')).toBe('high');
    expect(url.searchParams.get('width')).toBe('1024');
    expect(url.searchParams.get('height')).toBe('1024');
    expect(url.searchParams.has('key')).toBe(false);
    expect(url.href.includes(apiKey)).toBe(false);
    expect(url.href).not.toMatch(/[?&]key=/i);
    expect(buildPollinationsAuthorization(apiKey)).toBe(`Bearer ${apiKey}`);
    expect(url.href.includes(buildPollinationsAuthorization(apiKey))).toBe(false);
  });

  it('defaults the model to gptimage-large and allows POLLINATIONS_IMAGE_MODEL', () => {
    delete process.env.POLLINATIONS_IMAGE_MODEL;
    expect(getPollinationsImageModel()).toBe(DEFAULT_POLLINATIONS_IMAGE_MODEL);
    expect(buildPollinationsGenerateUrl('shrimp').searchParams.get('model')).toBe('gptimage-large');

    process.env.POLLINATIONS_IMAGE_MODEL = 'gptimage';
    expect(getPollinationsImageModel()).toBe('gptimage');
    expect(buildPollinationsGenerateUrl('shrimp').searchParams.get('model')).toBe('gptimage');
  });
});

describe('sanitizeErrorMessage', () => {
  it('redacts pollinations sk_ keys and bearer tokens', () => {
    const secret = 'sk_TESTKEY123abcXYZ';
    const message = `request failed for ${secret} Authorization: Bearer ${secret}`;
    const safe = sanitizeErrorMessage(message, secret);

    expect(safe).not.toContain(secret);
    expect(safe).not.toContain('sk_TESTKEY');
    expect(safe).toContain('[redacted]');
    expect(safe).toContain('Bearer [redacted]');
  });

  it('still redacts OpenAI sk- keys', () => {
    const secret = 'sk-proj-abc123XYZ';
    expect(sanitizeErrorMessage(`bad ${secret}`)).not.toContain(secret);
  });
});

const live = process.env.POLLINATIONS_LIVE_TEST === '1';

describe.skipIf(!live)('pollinations live generation', () => {
  it('returns jpeg bytes from the server function', async () => {
    process.env.AI_IMAGE_PROVIDER = 'pollinations';
    const image = await generatePollinationsProductImageCandidate(
      'Photorealistic restaurant photo of grilled shrimp on a white plate, no text, no logo'
    );
    expect(image.data.length).toBeGreaterThan(1000);
    expect(image.data[0]).toBe(0xff);
    expect(image.data[1]).toBe(0xd8);
    expect(image.data[2]).toBe(0xff);
    expect(image.mimeType).toBe('image/jpeg');
  }, 90_000);
});
