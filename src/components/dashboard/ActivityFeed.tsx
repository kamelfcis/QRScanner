'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, QrCode, FileUp, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/components/providers/RootI18nProvider';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  qr_scan: QrCode,
  import_completed: FileUp,
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
};

export function ActivityFeed() {
  const { data: notifications, isLoading } = useNotifications(10);
  const t = useTranslations('dashboard');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{t('recentActivity')}</CardTitle>
        <Bell className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-2 w-1/4 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !notifications?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('noRecentActivity')}</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const Icon = iconMap[notif.type] || Info;
              return (
                <div key={notif.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      notif.type === 'error'
                        ? 'bg-red-100 text-red-600'
                        : notif.type === 'success'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-brand-primary/10 text-brand-primary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{notif.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notif.created_at), 'MMM d, h:mm a')}
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
