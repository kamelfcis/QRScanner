export type AiImageProvider = 'gemini' | 'openai';

export function getAiImageProvider(): AiImageProvider {
  const provider = process.env.AI_IMAGE_PROVIDER?.trim().toLowerCase();
  return provider === 'openai' ? 'openai' : 'gemini';
}

export function getConfiguredImageApiKey(): string | null {
  if (getAiImageProvider() === 'openai') {
    return process.env.OPENAI_API_KEY?.trim() || null;
  }
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function isAiImageGenerationConfigured(): boolean {
  return Boolean(getConfiguredImageApiKey());
}
