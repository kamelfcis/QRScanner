type MessageValues = Record<string, string | number | Date | undefined>;

/**
 * Translate with ICU placeholders; on FORMATTING_ERROR, substitute literals so
 * production never crashes when a `{name}` / `{year}` value is missing.
 */
export function safeFormatMessage(
  translate: (key: string, values?: Record<string, string | number | Date>) => string,
  key: string,
  values?: MessageValues
): string {
  const normalized = values
    ? (Object.fromEntries(
        Object.entries(values).map(([name, value]) => [
          name,
          value instanceof Date ? value.getFullYear() : (value ?? ''),
        ])
      ) as Record<string, string | number>)
    : undefined;

  try {
    return translate(key, normalized);
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';

    if (code !== 'FORMATTING_ERROR') {
      throw error;
    }

    try {
      const template = translate(key);
      if (!normalized) return template;
      return Object.entries(normalized).reduce(
        (text, [name, value]) => text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
        template
      );
    } catch {
      return key;
    }
  }
}
