import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  _supabase = createClient();
  return _supabase;
}

type EventType =
  | 'page_view'
  | 'product_view'
  | 'category_view'
  | 'qr_scan'
  | 'dining_order'
  | 'takeaway_order'
  | 'search'
  | 'offer_click'
  | 'favorite_toggle'
  | 'add_to_cart'
  | 'cart_open'
  | 'checkout_start'
  | 'order_whatsapp';

interface TrackEventOptions {
  eventType: EventType;
  eventData?: Record<string, unknown>;
}

const THROTTLE_MS = 800;
const lastEventAt = new Map<string, number>();

function shouldThrottle(key: string): boolean {
  const now = Date.now();
  const prev = lastEventAt.get(key) ?? 0;
  if (now - prev < THROTTLE_MS) return true;
  lastEventAt.set(key, now);
  return false;
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export async function trackEvent({ eventType, eventData }: TrackEventOptions): Promise<void> {
  try {
    const throttleKey = `${eventType}:${JSON.stringify(eventData ?? {})}`;
    if (shouldThrottle(throttleKey)) return;

    const { error } = await getSupabase().rpc('track_analytics_event', {
      p_event_type: eventType,
      p_event_data: eventData || {},
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 512) : null,
      p_device_type: getDeviceType(),
    });

    // Fallback to direct insert if RPC missing/rejects event (e.g. pre-009)
    if (error) {
      const { error: insertError } = await getSupabase()
        .from('analytics')
        .insert({
          event_type: eventType,
          event_data: eventData || {},
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
        });
      if (insertError && process.env.NODE_ENV === 'development') {
        console.warn('analytics insert failed:', insertError.message);
      }
    }
  } catch {
    // Silently fail — tracking should never break UX
  }
}

export function trackPageView(page: string) {
  trackEvent({ eventType: 'page_view', eventData: { page } });
}

export function trackProductView(
  productId: string,
  productName: string,
  productNameAr?: string,
  categoryId?: string,
  categoryName?: string
) {
  trackEvent({
    eventType: 'product_view',
    eventData: {
      product_id: productId,
      product_name: productName,
      product_name_ar: productNameAr,
      category_id: categoryId,
      category_name: categoryName,
    },
  });
}

export function trackCategoryView(
  categoryId: string,
  categoryName: string,
  categoryNameAr?: string
) {
  trackEvent({
    eventType: 'category_view',
    eventData: {
      category_id: categoryId,
      category_name: categoryName,
      category_name_ar: categoryNameAr,
    },
  });
}

export function trackSearch(searchTerm: string, resultsCount: number, categoryId?: string) {
  trackEvent({
    eventType: 'search',
    eventData: { search_term: searchTerm, results_count: resultsCount, category_id: categoryId },
  });
  try {
    if (shouldThrottle(`search_analytics:${searchTerm}`)) return;
    void getSupabase()
      .rpc('track_search_event', {
        p_search_term: searchTerm.slice(0, 200),
        p_results_count: resultsCount,
        p_category_id: categoryId || null,
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 512) : null,
      })
      .then(({ error }) => {
        if (error) {
          void getSupabase()
            .from('search_analytics')
            .insert({
              search_term: searchTerm,
              results_count: resultsCount,
              category_id: categoryId || null,
              user_agent: navigator.userAgent,
            });
        }
      });
  } catch {
    // Silently fail
  }
}

export function trackQRScan(tableNumber?: number) {
  trackEvent({
    eventType: 'qr_scan',
    eventData: { table_number: tableNumber },
  });
}

export function trackDiningOrder() {
  trackEvent({ eventType: 'dining_order' });
}

export function trackTakeawayOrder() {
  trackEvent({ eventType: 'takeaway_order' });
}

export function trackOfferClick(offerId: string, offerTitle: string) {
  trackEvent({
    eventType: 'offer_click',
    eventData: { offer_id: offerId, offer_title: offerTitle },
  });
}

export function trackFavoriteToggle(productId: string, action: 'add' | 'remove') {
  trackEvent({
    eventType: 'favorite_toggle',
    eventData: { product_id: productId, action },
  });
}

export function trackAddToCart(productId: string, quantity: number, mode: string) {
  trackEvent({
    eventType: 'add_to_cart',
    eventData: { product_id: productId, quantity, mode },
  });
}

export function trackCartOpen(itemCount: number) {
  trackEvent({
    eventType: 'cart_open',
    eventData: { item_count: itemCount },
  });
}

export function trackCheckoutStart(itemCount: number, total: number) {
  trackEvent({
    eventType: 'checkout_start',
    eventData: { item_count: itemCount, total },
  });
}

export function trackOrderWhatsApp(mode: string, total: number, itemCount: number) {
  trackEvent({
    eventType: 'order_whatsapp',
    eventData: { mode, total, item_count: itemCount },
  });
}
