import { describe, expect, it } from 'vitest';
import { pickStoryText } from '@/lib/landing/story-text';

describe('pickStoryText', () => {
  it('uses trimmed DB text for the active locale', () => {
    const settings = { ar: '  قصتنا  ', en: '  Our Story  ' };
    expect(pickStoryText(settings, 'ar', 'fallback-ar')).toBe('قصتنا');
    expect(pickStoryText(settings, 'en', 'fallback-en')).toBe('Our Story');
  });

  it('falls back to i18n when the DB field is empty', () => {
    expect(pickStoryText({ ar: '   ', en: null }, 'ar', '  قصتنا  ')).toBe('قصتنا');
    expect(pickStoryText({ ar: '', en: '  ' }, 'en', 'Our Story')).toBe('Our Story');
    expect(pickStoryText(null, 'ar', 'landing fallback')).toBe('landing fallback');
  });

  it('returns empty when both DB and fallback are blank', () => {
    expect(pickStoryText({ ar: ' ', en: '' }, 'ar', '   ')).toBe('');
    expect(pickStoryText(undefined, 'en', null)).toBe('');
  });
});
