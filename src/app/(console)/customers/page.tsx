import Link from 'next/link';
import { CustomersView } from '@/components/engaz/CustomersView';
import { getRegistrationLogoPublicUrl } from '@/lib/engaz/customer-logo';
import { createServiceRoleClient, requireSuperAdmin } from '@/lib/supabase/server';
import { resolveLiveLogos } from '@/server/customers/resolve-live-logos';

export default async function CustomersPage() {
  await requireSuperAdmin();
  const db = createServiceRoleClient();
  const { data: customers } = await db
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  const customerList = customers || [];
  const liveLogos = await resolveLiveLogos(customerList.map((c) => c.id));

  const rows = customerList.map((c) => ({
    ...c,
    registration_logo_url: getRegistrationLogoPublicUrl(c.logo_path),
    live_logo_url: liveLogos.get(c.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live sites, drafts, and self-service applications waiting to be provisioned.
          </p>
        </div>
        <Link
          href="/customers/new"
          className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-medium"
        >
          New customer
        </Link>
      </div>

      <CustomersView customers={rows} />
    </div>
  );
}
