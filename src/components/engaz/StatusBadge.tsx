import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { statusLabel } from '@/lib/engaz/status';

const styles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  provisioning: 'bg-amber-100 text-amber-800',
  live: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  archived: 'bg-zinc-100 text-zinc-600',
  offline: 'bg-zinc-100 text-zinc-600',
  queued: 'bg-slate-100 text-slate-700',
  cloning: 'bg-sky-100 text-sky-800',
  migrating: 'bg-sky-100 text-sky-800',
  seeding: 'bg-sky-100 text-sky-800',
  creating_admin: 'bg-sky-100 text-sky-800',
  configuring_git: 'bg-sky-100 text-sky-800',
  deploying: 'bg-indigo-100 text-indigo-800',
  done: 'bg-emerald-100 text-emerald-800',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn('border-0 font-medium capitalize', styles[status] || '')}
    >
      {statusLabel(status)}
    </Badge>
  );
}
