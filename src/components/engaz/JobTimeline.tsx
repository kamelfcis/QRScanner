'use client';

type Event = {
  id: string;
  step: string;
  level: string;
  message: string;
  created_at: string;
};

const levelColor: Record<string, string> = {
  info: 'border-slate-300 bg-slate-50',
  warn: 'border-amber-300 bg-amber-50',
  error: 'border-red-300 bg-red-50',
  success: 'border-emerald-300 bg-emerald-50',
};

export function JobTimeline({ events }: { events: Event[] }) {
  if (!events.length) {
    return <p className="text-muted-foreground text-sm">No events yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {events.map((ev) => (
        <li
          key={ev.id}
          className={`rounded-md border px-3 py-2 text-sm ${levelColor[ev.level] || levelColor.info}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium capitalize">{ev.step.replaceAll('_', ' ')}</span>
            <time className="text-muted-foreground text-xs">
              {new Date(ev.created_at).toLocaleString()}
            </time>
          </div>
          <p className="mt-1 text-[13px] leading-snug">{ev.message}</p>
        </li>
      ))}
    </ol>
  );
}
