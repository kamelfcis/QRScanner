'use client';

import { useRecentActivity } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bell,
  QrCode,
  Eye,
  ShoppingBag,
  Search,
  UtensilsCrossed,
  MessageCircle,
  Package,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/components/providers/RootI18nProvider';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  qr_scan: QrCode,
  page_view: Eye,
  product_view: Package,
  category_view: Eye,
  dining_order: UtensilsCrossed,
  takeaway_order: ShoppingBag,
  order_whatsapp: MessageCircle,
  add_to_cart: ShoppingBag,
  checkout_start: ShoppingBag,
  search: Search,
  offer_click: Info,
  favorite_toggle: Info,
};

export function ActivityFeed() {
  const { data: activity, isLoading, error } = useRecentActivity(10);
  const t = useTranslations('dashboard');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{t('recentActivity')}</CardTitle>
        <Bell className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
                  <div className="bg-muted h-2 w-1/4 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('noRecentActivity')}</p>
        ) : !activity?.length ? (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('noRecentActivity')}</p>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => {
              const Icon = iconMap[item.type] || Info;
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      'bg-brand-primary/10 text-brand-primary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(item.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
