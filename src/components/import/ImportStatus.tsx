'use client';

import type { ImportJob } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Image, Clock, CheckCircle, XCircle, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLocaleDate } from '@/lib/dateLocale';
import { useI18n } from '@/components/providers/RootI18nProvider';

interface ImportStatusProps {
  job: ImportJob;
  onView: () => void;
  onDelete: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  uploading: { label: 'Uploading', color: 'bg-blue-500', icon: Loader2 },
  processing: { label: 'Extracting Text', color: 'bg-yellow-500', icon: Loader2 },
  parsing: { label: 'AI Analysis', color: 'bg-purple-500', icon: Loader2 },
  preview: { label: 'Ready for Review', color: 'bg-green-500', icon: Eye },
  importing: { label: 'Importing', color: 'bg-blue-500', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-green-500', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500', icon: XCircle },
};

function getProgress(status: ImportJob['status']): number {
  switch (status) {
    case 'uploading':
      return 10;
    case 'processing':
      return 30;
    case 'parsing':
      return 60;
    case 'preview':
      return 80;
    case 'importing':
      return 90;
    case 'completed':
      return 100;
    case 'failed':
      return 0;
    default:
      return 0;
  }
}

export function ImportStatus({ job, onView, onDelete }: ImportStatusProps) {
  const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.uploading;
  const Icon = config.icon;
  const progress = getProgress(job.status);
  const { locale } = useI18n();

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex-shrink-0">
          {job.file_type === 'pdf' ? (
            <FileText className="text-muted-foreground h-10 w-10" />
          ) : (
            <Image className="text-muted-foreground h-10 w-10" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <p className="truncate font-medium">{job.file_name}</p>
            <Badge className={config.color}>
              <Icon
                className={cn(
                  'mr-1 h-3 w-3',
                  (job.status === 'uploading' ||
                    job.status === 'processing' ||
                    job.status === 'parsing' ||
                    job.status === 'importing') &&
                    'animate-spin'
                )}
              />
              {config.label}
            </Badge>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3" />
            <span suppressHydrationWarning>
              {formatLocaleDate(job.created_at, 'MMM d, yyyy h:mm a', locale)}
            </span>
            {job.file_size && <span>• {(job.file_size / 1024 / 1024).toFixed(2)} MB</span>}
          </div>
          {job.error_message && (
            <p className="text-destructive mt-1 text-sm">{job.error_message}</p>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Progress value={progress} className="w-20" />
          {(job.status === 'preview' || job.status === 'completed') && (
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="mr-1 h-4 w-4" />
              View
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete import job">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
