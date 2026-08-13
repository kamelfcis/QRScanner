'use client';

import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/landing/SiteChrome';
import { buttonVariants } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const { t } = useI18n();
  const l = t.login;

  return (
    <div>
      <SiteHeader solid />
      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-16 md:grid-cols-2">
        <h1 className="font-heading col-span-full text-3xl font-bold">{l.title}</h1>
        <article className="surface-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold">{l.ownerTitle}</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{l.ownerBody}</p>
        </article>
        <article className="surface-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold">{l.staffTitle}</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{l.staffBody}</p>
          <a
            href="https://engazadmin.vercel.app/login"
            className={cn(buttonVariants({ size: 'lg' }), 'mt-6 inline-flex')}
          >
            {l.staffCta}
          </a>
        </article>
        <Link href="/" className="text-muted-foreground col-span-full text-sm underline">
          {l.back}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
