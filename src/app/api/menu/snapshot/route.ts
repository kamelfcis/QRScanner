import { NextResponse } from 'next/server';
import { fetchCategoriesWithProducts } from '@/lib/catalog/fetchCatalog';
import { createClient } from '@/lib/supabase/server';
import type { RestaurantSettings, Settings } from '@/types';

export async function GET() {
  try {
    const supabase = await createClient();
    const [categories, settingsResult] = await Promise.all([
      fetchCategoriesWithProducts(supabase),
      supabase.from('settings').select('value').eq('key', 'restaurant').maybeSingle(),
    ]);

    const settings =
      settingsResult.error || !settingsResult.data
        ? null
        : ((settingsResult.data as Pick<Settings, 'value'>).value as unknown as RestaurantSettings);

    return NextResponse.json(
      {
        categories,
        settings,
        cachedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Snapshot unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
