'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollableChipRow } from '@/components/shared/ScrollableChipRow';
import { cn, getName } from '@/lib/utils';
import './orders.theme.css';
import {
  formatCurrencyAmount,
  getRestaurantCurrency,
  type CurrencyLocale,
} from '@/lib/order/format-currency';
import {
  Filter,
  Search,
  ArrowLeft,
  ChevronRight,
  MessageCircle,
  RefreshCcw,
  Keyboard,
  X,
} from 'lucide-react';

type OrderStatus = 'new' | 'in_prep' | 'ready' | 'done' | 'cancelled';
type DiningMode = 'dining' | 'takeaway';
type Fulfillment = 'pickup' | 'delivery' | null;

interface OrderLineItem {
  id: string;
  name_en: string;
  name_ar: string | null;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
}

interface OrderTicket {
  id: string;
  created_at: string; // ISO
  status: OrderStatus;
  diningMode: DiningMode;
  fulfillment: Fulfillment; // only for takeaway
  tableNumber: number | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  items: OrderLineItem[];
  subtotal: number;
  tax: number;
  service: number;
  total: number;
}

export default function OrdersPage() {
  const t = useTranslations('orders');
  const tSidebar = useTranslations('sidebar');
  const tCommon = useTranslations('common');
  const { locale } = useI18n();
  const { data: settings } = useRestaurantSettings();
  const tDash = useTranslations('dashboard');
  const { data: stats } = useDashboardStats();

  // Data source — no backend yet on this branch. Keep UI functional with empty state.
  const [orders] = useState<OrderTicket[]>([]);

  // Filters
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<
    'all' | 'dining' | 'pickup' | 'delivery'
  >('all');
  const [view, setView] = useState<'board' | 'table'>('board');
  const [topTab, setTopTab] = useState<'today' | 'cancelled'>('today');

  // Search shortcut: / or f focuses the search
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key.toLowerCase() === 'f') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale: CurrencyLocale = locale === 'ar' ? 'ar' : 'en';
  const restaurantName = getName(
    locale,
    settings?.name_en || tCommon('appName'),
    settings?.name_ar || tCommon('appName')
  );

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesTopTab = topTab === 'today' ? true : o.status === 'cancelled';
      const matchesQuery =
        !query ||
        o.id.toLowerCase().includes(query.toLowerCase()) ||
        (o.customerName && o.customerName.toLowerCase().includes(query.toLowerCase())) ||
        (o.customerPhone && o.customerPhone.toLowerCase().includes(query.toLowerCase()));
      const matchesStatus = statusFilter === 'all' ? true : o.status === statusFilter;
      const matchesFulfillment =
        fulfillmentFilter === 'all'
          ? true
          : fulfillmentFilter === 'dining'
            ? o.diningMode === 'dining'
            : o.diningMode === 'takeaway' && o.fulfillment === fulfillmentFilter;
      return matchesTopTab && matchesQuery && matchesStatus && matchesFulfillment;
    });
  }, [orders, query, statusFilter, fulfillmentFilter, topTab]);

  const kpiTodayOrders = stats?.todaysOrders ?? 0;
  const kpiDiningPercent = stats?.diningPercent ?? 0;
  const kpiTakeawayPercent = stats?.takeawayPercent ?? 0;

  return (
    <div data-orders-theme className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.18em]">
            {t('kitchenBoard')}
          </p>
          <h1 className="font-heading mt-1 flex items-center gap-2 text-2xl font-semibold">
            <span>{t('title')}</span>
            <span
              className="live-indicator inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
              aria-label={locale === 'ar' ? 'مباشر' : 'Live'}
              title={locale === 'ar' ? 'مباشر' : 'Live'}
            >
              <span className="relative inline-flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>{t('live')}</span>
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('noOrdersHint')}</p>
        </div>
        {/* Segmented control: Today / Cancelled */}
        <div
          className="segmented inline-flex items-center rounded-full p-1"
          role="tablist"
          aria-label={t('title')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={topTab === 'today'}
            className="segmented__btn inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
            onClick={() => {
              setTopTab('today');
              setStatusFilter('all');
            }}
          >
            {/* Calendar icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <span className="ltr:ml-0 rtl:mr-0">{t('today')}</span>
            <CountBadge count={orders.length} />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={topTab === 'cancelled'}
            className="segmented__btn inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
            onClick={() => {
              setTopTab('cancelled');
              setStatusFilter('all');
            }}
          >
            {/* Ban icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m4.9 4.9 14.2 14.2" />
            </svg>
            <span className="ltr:ml-0 rtl:mr-0">{t('cancelled')}</span>
            <CountBadge count={orders.filter((o) => o.status === 'cancelled').length} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <KPI title={t('ordersToday')} value={kpiTodayOrders} tone="info" suffix="" />
        <KPI title={t('diningOrders')} value={`${kpiDiningPercent}%`} tone="success" />
        <KPI title={t('takeawayOrders')} value={`${kpiTakeawayPercent}%`} tone="warning" />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-2 p-3 sm:p-4">
          {/* Professional filter bar — always visible */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold">
                <Search className="h-4 w-4" />
                <span>{tCommon('search')}</span>
              </div>
              <div className="relative">
                <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="pl-8 text-sm"
                  aria-label={t('searchPlaceholder')}
                />
              </div>
              {query ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery('')}
                  aria-label={tCommon('clear')}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  {tCommon('clear')}
                </Button>
              ) : null}
            </div>

            {/* Divider */}
            <div className="bg-border mx-1 h-5 w-px" aria-hidden />

            {/* Status */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold">
                <Filter className="h-4 w-4" />
                <span>{t('status')}</span>
              </div>
              <ScrollableChipRow
                className="gap-1"
                ariaLabel={t('status')}
                scrollPrevLabel={tDash('paginationPrevious')}
                scrollNextLabel={tDash('paginationNext')}
              >
                <Chip
                  icon={Filter}
                  label={t('allStatuses')}
                  selected={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                />
                <Chip
                  label={t('new')}
                  selected={statusFilter === 'new'}
                  onClick={() => setStatusFilter('new')}
                  tone="info"
                />
                <Chip
                  label={t('inPrep')}
                  selected={statusFilter === 'in_prep'}
                  onClick={() => setStatusFilter('in_prep')}
                  tone="warning"
                />
                <Chip
                  label={t('ready')}
                  selected={statusFilter === 'ready'}
                  onClick={() => setStatusFilter('ready')}
                  tone="success"
                />
                <Chip
                  label={t('done')}
                  selected={statusFilter === 'done'}
                  onClick={() => setStatusFilter('done')}
                  tone="muted"
                />
                <Chip
                  label={t('cancelled')}
                  selected={statusFilter === 'cancelled'}
                  onClick={() => setStatusFilter('cancelled')}
                  tone="danger"
                />
              </ScrollableChipRow>
            </div>

            {/* Divider */}
            <div className="bg-border mx-1 h-5 w-px" aria-hidden />

            {/* Fulfillment */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold">
                {/* reusing Filter icon to avoid extra imports */}
                <span>{t('fulfillment')}</span>
              </div>
              <ScrollableChipRow
                className="gap-1"
                ariaLabel={t('fulfillment')}
                scrollPrevLabel={tDash('paginationPrevious')}
                scrollNextLabel={tDash('paginationNext')}
              >
                <Chip
                  label={t('dining')}
                  selected={fulfillmentFilter === 'dining'}
                  onClick={() => setFulfillmentFilter('dining')}
                />
                <Chip
                  label={t('pickup')}
                  selected={fulfillmentFilter === 'pickup'}
                  onClick={() => setFulfillmentFilter('pickup')}
                />
                <Chip
                  label={t('delivery')}
                  selected={fulfillmentFilter === 'delivery'}
                  onClick={() => setFulfillmentFilter('delivery')}
                />
                <Chip
                  label={tCommon('all')}
                  selected={fulfillmentFilter === 'all'}
                  onClick={() => setFulfillmentFilter('all')}
                />
              </ScrollableChipRow>
            </div>

            {/* Actions — on the far edge */}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" aria-label={t('shortcuts')}>
                <Keyboard className="mr-2 h-4 w-4" />
                {t('shortcuts')}
              </Button>
              <Button variant="outline" size="sm" aria-label="Refresh">
                <RefreshCcw className="mr-2 h-4 w-4" />
                {tCommon('retry')}
              </Button>
            </div>
          </div>

          {/* Active filters summary */}
          <ActiveFiltersBar
            query={query}
            statusFilter={statusFilter}
            fulfillmentFilter={fulfillmentFilter}
            onClearAll={() => {
              setQuery('');
              setStatusFilter('all');
              setFulfillmentFilter('all');
            }}
            onClearQuery={() => setQuery('')}
            onClearStatus={() => setStatusFilter('all')}
            onClearFulfillment={() => setFulfillmentFilter('all')}
            t={t}
            tCommon={tCommon}
          />

          <Tabs value={view} onValueChange={(v) => setView(v as 'board' | 'table')}>
            <TabsList className="h-8">
              <TabsTrigger value="board">{t('boardView')}</TabsTrigger>
              <TabsTrigger value="table">{t('listView')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Content */}
      {view === 'board' ? (
        <OrderBoard
          orders={filtered}
          restaurantName={restaurantName}
          currency={currency}
          currencyLocale={currencyLocale}
          t={t}
        />
      ) : (
        <OrderTable
          orders={filtered}
          restaurantName={restaurantName}
          currency={currency}
          currencyLocale={currencyLocale}
          t={t}
        />
      )}
    </div>
  );
}

function CountBadge({ count }: { count?: number }) {
  if (typeof count !== 'number') return null;
  return (
    <span
      className="segmented__count ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] tabular-nums"
      aria-hidden="true"
    >
      {count}
    </span>
  );
}

function KPI({
  title,
  value,
  tone = 'info',
  suffix,
}: {
  title: string;
  value: number | string;
  tone?: 'success' | 'warning' | 'danger' | 'info';
  suffix?: string;
}) {
  const toneClasses =
    tone === 'success'
      ? 'kpi--success'
      : tone === 'warning'
        ? 'kpi--warning'
        : tone === 'danger'
          ? 'kpi--danger'
          : 'kpi--info';
  return (
    <Card>
      <CardHeader className="space-y-0 p-3 sm:p-4">
        <CardTitle className="text-muted-foreground text-xs font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        <div className={cn('rounded-md px-2 py-1 text-xl font-bold tabular-nums', toneClasses)}>
          <span dir="ltr">{value}</span>
          {suffix ? <span className="ml-1 text-sm">{suffix}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Chip({
  label,
  selected,
  onClick,
  tone,
  icon: Icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'muted';
  icon?: ComponentType<{ className?: string }>;
}) {
  const base =
    'chip inline-flex items-center gap-1 text-xs font-medium transition-colors focus-visible:outline-2';
  const toneClass =
    tone === 'success'
      ? 'chip--success'
      : tone === 'warning'
        ? 'chip--warning'
        : tone === 'danger'
          ? 'chip--danger'
          : tone === 'muted'
            ? 'chip--muted'
            : 'chip--info';
  return (
    <button type="button" className={cn(base, toneClass)} aria-pressed={selected} onClick={onClick}>
      {Icon ? <Icon className="mr-1 h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}

function SectionEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground flex items-center justify-between p-4">
        <p className="text-sm">{title}</p>
        <span className="text-xs">{hint}</span>
      </CardContent>
    </Card>
  );
}

function OrderBoard({
  orders,
  restaurantName,
  currency,
  currencyLocale,
  t,
}: {
  orders: OrderTicket[];
  restaurantName: string;
  currency: string;
  currencyLocale: CurrencyLocale;
  t: (k: string) => string;
}) {
  const columns: {
    key: OrderStatus;
    title: string;
    tone: 'info' | 'warning' | 'success' | 'muted' | 'danger';
  }[] = [
    { key: 'new', title: t('new'), tone: 'info' },
    { key: 'in_prep', title: t('inPrep'), tone: 'warning' },
    { key: 'ready', title: t('ready'), tone: 'success' },
    { key: 'done', title: t('done'), tone: 'muted' },
    { key: 'cancelled', title: t('cancelled'), tone: 'danger' },
  ];

  if (orders.length === 0) {
    return <SectionEmpty title={t('noOrders')} hint={t('noOrdersHint')} />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {columns.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.key);
        return (
          <Card key={col.key} className={cn('min-h-[200px]', 'col-accent', `col--${col.tone}`)}>
            <CardHeader className="p-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{col.title}</span>
                <Badge variant="outline" className="tabular-nums">
                  {colOrders.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="max-h-[60vh] pr-2">
                <ul className="space-y-2">
                  {colOrders.map((o) => (
                    <li key={o.id} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-xs tabular-nums">#{o.id.slice(0, 8)}</span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(o.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">
                          {o.diningMode === 'dining'
                            ? t('dining')
                            : o.fulfillment === 'delivery'
                              ? t('delivery')
                              : t('pickup')}
                        </Badge>
                        {o.tableNumber ? (
                          <Badge variant="outline">
                            {t('table')} {o.tableNumber}
                          </Badge>
                        ) : null}
                        <span className="font-medium">{o.customerName || restaurantName}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="tabular-nums">
                          {formatCurrencyAmount(o.total, currency, { locale: currencyLocale })}
                        </span>
                        <Button variant="outline" size="xs" className="h-7 text-xs">
                          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                          WhatsApp
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function OrderTable({
  orders,
  restaurantName,
  currency,
  currencyLocale,
  t,
}: {
  orders: OrderTicket[];
  restaurantName: string;
  currency: string;
  currencyLocale: CurrencyLocale;
  t: (k: string) => string;
}) {
  if (orders.length === 0) {
    return <SectionEmpty title={t('noOrders')} hint={t('noOrdersHint')} />;
  }
  return (
    <Card>
      <CardContent className="overflow-x-auto p-3 sm:p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left text-xs font-medium">{t('customer')}</th>
              <th className="p-2 text-left text-xs font-medium">{t('items')}</th>
              <th className="p-2 text-left text-xs font-medium">{t('fulfillment')}</th>
              <th className="p-2 text-left text-xs font-medium">{t('total')}</th>
              <th className="p-2 text-left text-xs font-medium">{t('placed')}</th>
              <th className="p-2 text-left text-xs font-medium">{t('status')}</th>
              <th className="p-2 text-left text-xs font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="p-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {o.customerName || restaurantName}{' '}
                        {o.tableNumber ? (
                          <span className="text-muted-foreground text-xs">
                            · {t('table')} {o.tableNumber}
                          </span>
                        ) : null}
                      </p>
                      {o.customerPhone ? (
                        <p className="text-muted-foreground text-xs" dir="ltr">
                          {o.customerPhone}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <span className="tabular-nums">
                    {o.items.reduce((n, i) => n + i.quantity, 0)}
                  </span>
                </td>
                <td className="p-2">
                  <span className="text-xs">
                    {o.diningMode === 'dining'
                      ? t('dining')
                      : o.fulfillment === 'delivery'
                        ? t('delivery')
                        : t('pickup')}
                  </span>
                </td>
                <td className="p-2">
                  <span className="tabular-nums" dir="ltr">
                    {formatCurrencyAmount(o.total, currency, { locale: currencyLocale })}
                  </span>
                </td>
                <td className="p-2">
                  <span className="font-mono text-xs tabular-nums">
                    {new Date(o.created_at).toLocaleTimeString()}
                  </span>
                </td>
                <td className="p-2">
                  <OrderStatusBadge status={o.status} t={t} />
                </td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button variant="outline" size="xs" className="h-7 text-xs">
                      {t('markInPrep')}
                    </Button>
                    <Button variant="outline" size="xs" className="h-7 text-xs">
                      {t('markReady')}
                    </Button>
                    <Button variant="outline" size="xs" className="h-7 text-xs">
                      {t('markDone')}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function OrderStatusBadge({ status, t }: { status: OrderStatus; t: (k: string) => string }) {
  const map: Record<
    OrderStatus,
    { label: string; tone: 'info' | 'warning' | 'success' | 'muted' | 'danger' }
  > = {
    new: { label: t('new'), tone: 'info' },
    in_prep: { label: t('inPrep'), tone: 'warning' },
    ready: { label: t('ready'), tone: 'success' },
    done: { label: t('done'), tone: 'muted' },
    cancelled: { label: t('cancelled'), tone: 'danger' },
  };
  const { label, tone } = map[status];
  return <span className={cn('status-badge', `status--${tone}`)}>{label}</span>;
}

function ActiveFiltersBar({
  query,
  statusFilter,
  fulfillmentFilter,
  onClearAll,
  onClearQuery,
  onClearStatus,
  onClearFulfillment,
  t,
  tCommon,
}: {
  query: string;
  statusFilter: OrderStatus | 'all';
  fulfillmentFilter: 'all' | 'dining' | 'pickup' | 'delivery';
  onClearAll: () => void;
  onClearQuery: () => void;
  onClearStatus: () => void;
  onClearFulfillment: () => void;
  t: (k: string, values?: Record<string, string | number | Date>) => string;
  tCommon: (k: string, values?: Record<string, string | number | Date>) => string;
}) {
  const active: { key: string; label: string; onClear: () => void }[] = [];
  if (query)
    active.push({ key: 'q', label: `${tCommon('search')}: "${query}"`, onClear: onClearQuery });
  if (statusFilter !== 'all')
    active.push({ key: 's', label: `${t('status')}: ${t(statusFilter)}`, onClear: onClearStatus });
  if (fulfillmentFilter !== 'all')
    active.push({
      key: 'f',
      label: `${t('fulfillment')}: ${
        fulfillmentFilter === 'dining'
          ? t('dining')
          : fulfillmentFilter === 'delivery'
            ? t('delivery')
            : t('pickup')
      }`,
      onClear: onClearFulfillment,
    });
  const count = active.length;
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold">
        <Filter className="h-4 w-4" />
        <span>{t('filtersLabel', { count })}</span>
        <Badge className="ml-1" variant="secondary">
          {count}
        </Badge>
      </div>
      <ul className="flex flex-wrap items-center gap-1">
        {active.map((f) => (
          <li key={f.key}>
            <button
              type="button"
              className="chip chip--info inline-flex items-center gap-1 text-xs"
              onClick={f.onClear}
              aria-label={tCommon('remove')}
              title={tCommon('remove')}
            >
              {f.label}
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" onClick={onClearAll} className="ml-auto h-7 text-xs">
        {t('clearFilters')}
      </Button>
    </div>
  );
}
