'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Menu, QrCode, Settings } from 'lucide-react';

const supabase = createClient();

function useStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [products, categories, qrCodes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('qr_codes').select('id', { count: 'exact', head: true }),
      ]);
      return {
        products: products.count ?? 0,
        categories: categories.count ?? 0,
        qrCodes: qrCodes.count ?? 0,
      };
    },
  });
}

export default function DashboardPage() {
  const { data: stats } = useStats();

  const statItems = [
    {
      title: 'Total Products',
      value: stats?.products ?? '—',
      icon: Menu,
      description: 'Menu items',
    },
    {
      title: 'Active QR Codes',
      value: stats?.qrCodes ?? '—',
      icon: QrCode,
      description: 'QR codes created',
    },
    {
      title: 'Categories',
      value: stats?.categories ?? '—',
      icon: LayoutDashboard,
      description: 'Menu categories',
    },
    {
      title: 'Settings',
      value: '—',
      icon: Settings,
      description: 'Configure restaurant',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Warda Shamya admin dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statItems.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
