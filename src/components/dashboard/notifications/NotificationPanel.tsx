'use client';

import { useNotifications, useMarkAllNotificationsRead, useDeleteNotification } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Trash2, QrCode, FileUp, AlertCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  qr_scan: QrCode,
  import_completed: FileUp,
  error: AlertCircle,
  info: Info,
};

interface NotificationPanelProps {
  onClose?: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { data: notifications, isLoading } = useNotifications(20);
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  return (
    <Card className="w-80 max-h-96 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Notifications</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
        >
          <Check className="mr-1 h-3 w-3" /> Mark all read
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto max-h-72">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : !notifications?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
        ) : (
          <div className="divide-y">
            {notifications.map((notif) => {
              const Icon = iconMap[notif.type] || Info;
              return (
                <div
                  key={notif.id}
                  className={cn(
                    'flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors',
                    !notif.is_read && 'bg-brand-primary/5'
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5',
                    notif.type === 'error' ? 'bg-red-100 text-red-600' :
                    'bg-brand-primary/10 text-brand-primary'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', !notif.is_read && 'font-medium')}>{notif.title}</p>
                    {notif.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(notif.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => deleteNotification.mutate(notif.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
