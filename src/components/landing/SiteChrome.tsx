'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { ENGAZ_LOGO_ALT, ENGAZ_LOGO_SRC, ILC_SOFT_LOGO_ALT, ILC_SOFT_LOGO_SRC } from '@/lib/brand';
import { buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/landing/ThemeToggle';
import { cn } from '@/lib/utils';

function EngazMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-xl bg-[#0b1220] p-1 dark:bg-transparent', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ENGAZ_LOGO_SRC} alt={ENGAZ_LOGO_ALT} className="h-9 w-auto max-w-[140px] object-contain sm:h-10" />
    </span>
  );
}

function IlcByline() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ILC_SOFT_LOGO_SRC}
        alt={ILC_SOFT_LOGO_ALT}
        className="size-8 shrink-0 rounded-full bg-white object-contain"
      />
      <span className="text-muted-foreground text-sm">{t.byline}</span>
    </div>
  );
}

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  const { t, locale, setLocale } = useI18n();

  return (
    <header className={cn('sticky top-0 z-40', solid ? 'bg-background/90 border-b' : 'glass-nav')}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center">
          <EngazMark />
        </Link>
        <nav className="text-muted-foreground hidden items-center gap-5 text-sm md:flex">
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
          <ThemeToggle />
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-xs"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          >
            {locale === 'ar' ? 'EN' : 'عر'}
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
    <footer className="border-border border-t py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <EngazMark className="opacity-90" />
          <IlcByline />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
            {t.footer.legal}
          </Link>
          <Link href="/terms" className="text-muted-foreground hover:text-foreground">
            {t.footer.terms}
          </Link>
          <a href="https://engazadmin.vercel.app/login" className="text-muted-foreground hover:text-foreground">
            {t.footer.login}
          </a>
        </div>
      </div>
      <p className="text-muted-foreground mx-auto mt-6 max-w-6xl px-4 text-xs">{t.footer.note}</p>
    </footer>
  );
}
