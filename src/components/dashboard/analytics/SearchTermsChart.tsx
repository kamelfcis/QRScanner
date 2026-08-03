'use client';

import { useSearchTerms } from '@/hooks/useAnalytics';
import { BarChart } from '@/components/dashboard/charts/BarChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import type { Period } from '@/components/dashboard/DateRangePicker';

interface SearchTermsChartProps {
  period: Period;
}

export function SearchTermsChart({ period }: SearchTermsChartProps) {
  const { data, isLoading } = useSearchTerms(period);

  if (isLoading) return <div className="h-[400px] bg-muted animate-pulse rounded-lg" />;

  const chartData = (data || []).map((term) => ({
    name: term.term,
    count: term.count,
  }));

  const tableRows = (data || []).map((term, i) => [
    i + 1,
    term.term,
    term.count,
    term.avgResults,
  ]);

  return (
    <div className="space-y-4">
      <ChartCard title="Top Search Terms" description="Most searched terms">
        <BarChart
          data={chartData}
          xKey="name"
          yKey="count"
          horizontal
          color="#8B0000"
          height={400}
        />
      </ChartCard>
      <DataTable
        title="Search Terms Data"
        headers={['#', 'Search Term', 'Count', 'Avg Results']}
        rows={tableRows}
        filename="search-terms"
      />
    </div>
  );
}
