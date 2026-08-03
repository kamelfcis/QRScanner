import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type EventType = 'page_view' | 'product_view' | 'category_view' | 'qr_scan' | 'dining_order' | 'takeaway_order' | 'search' | 'offer_click' | 'favorite_toggle';

interface TrackEventOptions {
  eventType: EventType;
  eventData?: Record<string, unknown>;
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
    await supabase.from('analytics').insert({
      event_type: eventType,
      event_data: eventData || {},
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
    });
  } catch {
    // Silently fail — tracking should never break UX
  }
}

export function trackPageView(page: string) {
  trackEvent({ eventType: 'page_view', eventData: { page } });
}

export function trackProductView(productId: string, productName: string, productNameAr?: string, categoryId?: string, categoryName?: string) {
  trackEvent({
    eventType: 'product_view',
    eventData: { product_id: productId, product_name: productName, product_name_ar: productNameAr, category_id: categoryId, category_name: categoryName },
  });
}

export function trackCategoryView(categoryId: string, categoryName: string, categoryNameAr?: string) {
  trackEvent({
    eventType: 'category_view',
    eventData: { category_id: categoryId, category_name: categoryName, category_name_ar: categoryNameAr },
  });
}

export function trackSearch(searchTerm: string, resultsCount: number, categoryId?: string) {
  trackEvent({
    eventType: 'search',
    eventData: { search_term: searchTerm, results_count: resultsCount, category_id: categoryId },
  });
  try {
    supabase.from('search_analytics').insert({
      search_term: searchTerm,
      results_count: resultsCount,
      category_id: categoryId || null,
      user_agent: navigator.userAgent,
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
