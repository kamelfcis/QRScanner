import { redirect } from 'next/navigation';
import { Shell } from '@/components/engaz/Shell';
import { requireSuperAdmin } from '@/lib/supabase/server';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireSuperAdmin();
  if (auth.error === 'unauthorized') redirect('/login');
  if (auth.error === 'forbidden') redirect('/login?error=forbidden');

  return <Shell email={auth.admin?.email || auth.user?.email}>{children}</Shell>;
}
