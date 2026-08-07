'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import {
  Menu,
  Sun,
  Moon,
  Home,
  UtensilsCrossed,
  Info,
  Phone,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useTheme } from '@/components/providers/ThemeProvider';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { cn, getName } from '@/lib/utils';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';

type NavLink = {
  name: string;
  href: string;
  icon: LucideIcon;
};

const NAV_EASE = [0.22, 1, 0.36, 1] as const;

const sheetItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: NAV_EASE },
  }),
};

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { data: settings } = useRestaurantSettings();
  const { resolvedTheme, setTheme } = useTheme();
  const { dir, locale } = useI18n();
  const t = useTranslations('nav');
  const commonT = useTranslations('common');
  const accessibilityT = useTranslations('accessibility');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const name = getName(
    locale,
    settings?.name_en || commonT('appName'),
    settings?.name_ar || commonT('appName')
  );
  const isOverlay = !scrolled;

  const navLinks: NavLink[] = [
    { name: t('home'), href: '/', icon: Home },
    { name: t('menu'), href: '/welcome', icon: UtensilsCrossed },
    { name: t('about'), href: '#story', icon: Info },
    { name: t('contact'), href: '#contact', icon: Phone },
  ];

  const overlayText = 'text-white';
  const overlayMutedText = 'text-white/85 hover:text-white';
  const overlayGhost = 'text-white hover:bg-white/15 hover:text-white';
  const solidText = 'text-foreground';
  const solidMutedText = 'text-foreground/80 hover:text-foreground';
  const solidGhost = 'text-foreground hover:bg-muted hover:text-foreground';

  const isNavActive = (href: string) => {
    if (href.startsWith('#')) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 w-full max-w-full pt-[env(safe-area-inset-top,0px)] transition-all duration-300',
        scrolled
          ? 'border-border/60 bg-background/90 border-b shadow-sm backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-1.5 px-3 sm:h-16 sm:gap-2 sm:px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4 lg:px-8">
        <Link
          href="/"
          className={cn(
            'flex min-w-0 items-center gap-1.5 sm:gap-2 md:justify-self-start',
            isOverlay ? overlayText : solidText
          )}
        >
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={name}
              className="h-6 w-auto shrink-0 object-contain sm:h-8"
            />
          ) : null}
          <span
            className={cn(
              'font-heading min-w-0 truncate whitespace-nowrap text-sm font-bold transition-colors sm:text-base md:text-xl',
              isOverlay ? 'text-white' : 'text-primary'
            )}
          >
            {name}
          </span>
        </Link>

        <nav
          className="hidden items-center gap-6 justify-self-center md:flex lg:gap-8"
          aria-label="Main navigation"
        >
          {navLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'hover:text-brand-accent text-sm font-medium transition-colors',
                isOverlay ? overlayMutedText : solidMutedText
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-0 sm:gap-1.5 md:gap-4 md:justify-self-end">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className={cn(
              'size-11 shrink-0 transition-colors md:size-7',
              isOverlay ? overlayGhost : solidGhost
            )}
            aria-label={accessibilityT('toggleTheme')}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <LanguageSwitcher
            variant="ghost"
            size="sm"
            className={cn(isOverlay ? overlayGhost : solidGhost)}
          />

          <Link
            href="/welcome"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-brand-accent hover:bg-brand-accent/90 hidden shrink-0 px-4 text-black md:inline-flex'
            )}
          >
            {t('orderNow')}
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                'flex min-h-11 min-w-11 shrink-0 items-center justify-center md:hidden',
                isOverlay ? overlayText : solidText
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{accessibilityT('openMenu')}</span>
            </SheetTrigger>
            <SheetContent
              side={dir === 'rtl' ? 'left' : 'right'}
              showCloseButton
              className="border-border/40 bg-background/90 flex w-[min(320px,88vw)] flex-col gap-0 p-0 shadow-2xl backdrop-blur-2xl sm:max-w-sm"
            >
              <div
                className="from-brand-accent via-brand-accent/90 to-brand-accent/70 h-1 shrink-0 bg-gradient-to-r"
                aria-hidden
              />

              <div className="border-border/50 flex items-center gap-3 border-b px-5 py-4 pt-5">
                {settings?.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt={name}
                    className="ring-brand-accent/30 h-11 w-11 shrink-0 rounded-full object-contain ring-2"
                  />
                ) : (
                  <div className="bg-brand-accent/15 ring-brand-accent/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-2">
                    <UtensilsCrossed className="text-brand-accent h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-heading text-foreground truncate text-lg font-bold">{name}</p>
                  <p className="text-muted-foreground text-xs">{t('menu')}</p>
                </div>
              </div>

              <nav
                className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
                aria-label="Mobile navigation"
              >
                {navLinks.map((item, index) => {
                  const Icon = item.icon;
                  const active = isNavActive(item.href);

                  return (
                    <motion.div
                      key={item.name}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      variants={sheetItemVariants}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex min-h-12 items-center gap-3 rounded-lg px-4 text-base font-medium transition-colors',
                          'hover:bg-muted/60 border-s-[3px]',
                          active
                            ? 'border-brand-accent bg-brand-accent/10 text-foreground'
                            : 'text-muted-foreground hover:border-brand-accent/70 hover:text-foreground border-transparent'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5 shrink-0',
                            active ? 'text-brand-accent' : 'text-muted-foreground'
                          )}
                          aria-hidden
                        />
                        <span>{item.name}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              <div className="border-border/50 mx-5 border-t" />

              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <span className="text-muted-foreground text-sm">
                  {accessibilityT('toggleTheme')}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    className="size-11"
                    aria-label={accessibilityT('toggleTheme')}
                  >
                    {resolvedTheme === 'dark' ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                  <LanguageSwitcher variant="outline" size="sm" />
                </div>
              </div>

              <div className="border-border/50 border-t px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
                <Link
                  href="/welcome"
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'bg-brand-accent hover:bg-brand-accent/90 flex h-12 w-full items-center justify-center gap-2 text-base font-semibold text-black'
                  )}
                >
                  <ShoppingBag className="h-5 w-5" aria-hidden />
                  {t('orderNow')}
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
