'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChefHat } from 'lucide-react';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { KitchenCard } from '@/components/dashboard/kitchen/KitchenCard';
import {
  useAcknowledgeOrder,
  useMarkOrderReadyWhatsAppSent,
  useOrders,
  useUpdateOrderStatus,
} from '@/hooks/useOrders';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { openOrderReadyWhatsApp } from '@/lib/order/ready-whatsapp';
import type { MessageLocale } from '@/lib/order/whatsapp-message';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import type { OrderStatus, OrderWithItems } from '@/types/database';

function isUnacknowledged(order: OrderWithItems): boolean {
  return order.status === 'new' && !order.staff_acknowledged_at;
}

export default function KitchenPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = useTranslations('kitchen');
  const tOrders = useTranslations('orders');
  const tCommon = useTranslations('common');
  const { data: features, isLoading: featuresLoading } = useFeatureSettings();
  const { data: settings } = useRestaurantSettings();
  const { data: orders, isLoading, error, refetch } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const acknowledgeOrder = useAcknowledgeOrder();
  const markReadyWhatsApp = useMarkOrderReadyWhatsAppSent();

  useEffect(() => {
    if (featuresLoading) return;
    if (features?.dashboard_orders !== true) {
      router.replace('/dashboard');
    }
  }, [features, featuresLoading, router]);

  const tickets = useMemo(
    () => (orders ?? []).filter((order) => order.status === 'new' || order.status === 'preparing'),
    [orders]
  );

  const handleAcknowledge = useCallback(
    async (id: string) => {
      try {
        await acknowledgeOrder.mutateAsync(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon('error'));
      }
    },
    [acknowledgeOrder, tCommon]
  );

  const handleStatus = async (order: OrderWithItems, status: OrderStatus) => {
    try {
      if (status === 'preparing' && isUnacknowledged(order)) {
        await acknowledgeOrder.mutateAsync(order.id);
      }
      await updateStatus.mutateAsync({ id: order.id, status });
      if (status === 'ready' && settings) {
        const opened = openOrderReadyWhatsApp({
          order,
          locale: locale as MessageLocale,
          settings,
        });
        if (opened) {
          await markReadyWhatsApp.mutateAsync(order.id);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  if (featuresLoading || (features?.dashboard_orders !== true && !featuresLoading)) {
    return <LoadingPage />;
  }
  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const busy = updateStatus.isPending || acknowledgeOrder.isPending;

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={<ChefHat className="text-muted-foreground/50 h-12 w-12" aria-hidden="true" />}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tickets.map((order) => (
        <KitchenCard
          key={order.id}
          order={order}
          locale={locale}
          t={tOrders}
          busy={busy}
          onAcknowledge={handleAcknowledge}
          onStatus={handleStatus}
        />
      ))}
    </div>
  );
}
