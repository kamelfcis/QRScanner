export type AiImageProvider = 'gemini' | 'openai' | 'pollinations';

export function getAiImageProvider(): AiImageProvider {
  const provider = process.env.AI_IMAGE_PROVIDER?.trim().toLowerCase();
  if (provider === 'openai') return 'openai';
  if (provider === 'pollinations') return 'pollinations';
  return 'gemini';
}

export function getConfiguredImageApiKey(): string | null {
  const provider = getAiImageProvider();
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY?.trim() || null;
  }
  if (provider === 'pollinations') {
    return process.env.POLLINATIONS_API_KEY?.trim() || null;
  }
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function isAiImageGenerationConfigured(): boolean {
  return Boolean(getConfiguredImageApiKey());
}
