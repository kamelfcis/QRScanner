import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { generateRestaurantSchema } from '@/lib/seo/structuredData';
import { defaultLocale, type Locale } from '@/i18n/config';
import type { RestaurantSettings } from '@/types/database';

export async function StructuredDataScript() {
  const headerStore = await headers();
  const locale = (headerStore.get('x-locale') || defaultLocale) as Locale;

  let settings: RestaurantSettings | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'restaurant')
      .single();
    settings = (data?.value as unknown as RestaurantSettings) ?? null;
  } catch {
    // Use defaults
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(generateRestaurantSchema(settings, locale)),
      }}
    />
  );
}
