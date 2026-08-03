import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  Cell: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/components/shared/motion/MotionCard', () => ({
  MotionCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: (string | undefined | false)[]) => args.filter(Boolean).join(' '),
}));

describe('ChartCard', () => {
  it('renders title', async () => {
    const { ChartCard } = await import('@/components/dashboard/charts/ChartCard');
    render(
      <ChartCard title="Test Chart">
        <div>Chart content</div>
      </ChartCard>
    );
    expect(screen.getByText('Test Chart')).toBeDefined();
  });

  it('renders description when provided', async () => {
    const { ChartCard } = await import('@/components/dashboard/charts/ChartCard');
    render(
      <ChartCard title="Test Chart" description="Test description">
        <div>Chart content</div>
      </ChartCard>
    );
    expect(screen.getByText('Test description')).toBeDefined();
  });

  it('renders children', async () => {
    const { ChartCard } = await import('@/components/dashboard/charts/ChartCard');
    render(
      <ChartCard title="Test Chart">
        <div>Child content</div>
      </ChartCard>
    );
    expect(screen.getByText('Child content')).toBeDefined();
  });

  it('renders action when provided', async () => {
    const { ChartCard } = await import('@/components/dashboard/charts/ChartCard');
    render(
      <ChartCard title="Test Chart" action={<button>Action</button>}>
        <div>Chart content</div>
      </ChartCard>
    );
    expect(screen.getByRole('button', { name: /action/i })).toBeDefined();
  });
});

describe('KPICard', () => {
  it('renders title and value', async () => {
    const { KPICard } = await import('@/components/dashboard/kpi/KPICard');
    render(
      <KPICard
        title="Total Products"
        value={42}
        icon={<span>icon</span>}
      />
    );
    expect(screen.getByText('Total Products')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
  });

  it('renders description when provided', async () => {
    const { KPICard } = await import('@/components/dashboard/kpi/KPICard');
    render(
      <KPICard
        title="Total Products"
        value={42}
        icon={<span>icon</span>}
        description="Menu items"
      />
    );
    expect(screen.getByText('Menu items')).toBeDefined();
  });

  it('renders string value', async () => {
    const { KPICard } = await import('@/components/dashboard/kpi/KPICard');
    render(
      <KPICard
        title="Revenue"
        value="$1,234"
        icon={<span>icon</span>}
      />
    );
    expect(screen.getByText('$1,234')).toBeDefined();
  });

  it('renders trend information', async () => {
    const { KPICard } = await import('@/components/dashboard/kpi/KPICard');
    render(
      <KPICard
        title="Orders"
        value={100}
        icon={<span>icon</span>}
        trend={{ value: 12, label: 'from last week' }}
      />
    );
    expect(screen.getByText(/12%/)).toBeDefined();
    expect(screen.getByText(/from last week/)).toBeDefined();
  });
});
