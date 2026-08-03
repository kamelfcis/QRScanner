export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-[300px] animate-pulse rounded-lg border bg-muted/20" />
        <div className="h-[300px] animate-pulse rounded-lg border bg-muted/20" />
      </div>
      <div className="h-[300px] animate-pulse rounded-lg border bg-muted/20" />
    </div>
  );
}
