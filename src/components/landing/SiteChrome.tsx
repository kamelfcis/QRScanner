'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  const { t, locale, setLocale } = useI18n();

  return (
    <header className={cn('sticky top-0 z-40', solid ? 'bg-background/90 border-b' : 'glass-nav')}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/engaz-hero.png" alt="" className="size-9 rounded-md object-cover" />
          <span className="font-heading text-lg font-extrabold tracking-tight">{t.brand}</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <a href="/#features" className="hover:text-foreground">
            {t.nav.features}
          </a>
          <a href="/#how" className="hover:text-foreground">
            {t.nav.how}
          </a>
          <a href="/#faq" className="hover:text-foreground">
            {t.nav.faq}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-xs"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          >
            {locale === 'ar' ? 'EN' : 'عربي'}
          </button>
          <Link href="/login" className="text-muted-foreground hidden text-sm hover:text-foreground sm:inline">
            {t.nav.login}
          </Link>
          <Link href="/register" className={buttonVariants({ size: 'sm' })}>
            {t.nav.start}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-heading text-lg font-bold">{t.brand}</div>
          <div className="text-muted-foreground text-sm">{t.byline}</div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
            {t.footer.legal}
          </Link>
          <Link href="/terms" className="text-muted-foreground hover:text-foreground">
            {t.footer.terms}
          </Link>
          <a
            href="https://engazadmin.vercel.app/login"
            className="text-muted-foreground hover:text-foreground"
          >
            {t.footer.login}
          </a>
        </div>
      </div>
      <p className="text-muted-foreground mx-auto mt-6 max-w-6xl px-4 text-xs">{t.footer.note}</p>
    </footer>
  );
}
