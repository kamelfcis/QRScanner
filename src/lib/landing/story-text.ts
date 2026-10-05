export type StoryTextPair = {
  ar?: string | null;
  en?: string | null;
};

function trimText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

/** Prefer a trimmed DB field for the locale, then i18n fallback, otherwise empty. */
export function pickStoryText(
  settings: StoryTextPair | null | undefined,
  locale: string,
  fallback?: string | null
): string {
  const fromDb = trimText(locale.startsWith('ar') ? settings?.ar : settings?.en);
  if (fromDb) return fromDb;
  return trimText(fallback);
}
