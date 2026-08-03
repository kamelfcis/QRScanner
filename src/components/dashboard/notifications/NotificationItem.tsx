'use client';

import { QrCode, FileUp, AlertCircle, Info, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types/database';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  qr_scan: QrCode,
  import_completed: FileUp,
  error: AlertCircle,
  info: Info,
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  const Icon = iconMap[notification.type] || Info;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors',
        !notification.is_read && 'bg-brand-primary/5'
      )}
    >
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5',
        notification.type === 'error' ? 'bg-red-100 text-red-600' :
        'bg-brand-primary/10 text-brand-primary'
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notification.is_read && 'font-medium')}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(notification.created_at), 'MMM d, h:mm a')}
        </p>
      </div>
      {!notification.is_read && onMarkRead && (
        <button
          onClick={() => onMarkRead(notification.id)}
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
          aria-label="Mark as read"
        >
          <Check className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
