'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useTheme } from '@/components/providers/ThemeProvider';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: settings } = useRestaurantSettings();
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations('nav');
  const commonT = useTranslations('common');
  const accessibilityT = useTranslations('accessibility');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const name = settings?.name_en || commonT('appName');

  const navLinks = [
    { name: t('home'), href: '/' },
    { name: t('menu'), href: '/menu' },
    { name: t('about'), href: '#story' },
    { name: t('contact'), href: '#contact' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'border-b bg-background/90 backdrop-blur-md shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={name}
              className="h-8 w-auto object-contain"
            />
          ) : null}
          <span
            className={cn(
              'text-xl font-bold font-heading transition-colors',
              scrolled ? 'text-primary' : 'text-white'
            )}
          >
            {name}
          </span>
        </Link>

        <nav className="hidden md:flex md:items-center md:space-x-6" aria-label="Main navigation">
          {navLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-brand-accent',
                scrolled ? 'text-foreground' : 'text-white/80'
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher
            variant="ghost"
            size="icon-sm"
            className={cn(
              scrolled ? 'text-foreground hover:bg-muted' : 'text-white hover:bg-white/10'
            )}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className={cn(
              'transition-colors',
              scrolled
                ? 'text-foreground hover:bg-muted'
                : 'text-white hover:bg-white/10'
            )}
            aria-label={accessibilityT('toggleTheme')}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Button
            render={<Link href="/menu" />}
            size="sm"
            className="hidden bg-brand-accent text-black hover:bg-brand-accent/90 md:inline-flex"
          >
            {t('orderNow')}
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                'md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center',
                scrolled ? 'text-foreground' : 'text-white'
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{accessibilityT('openMenu')}</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <nav className="mt-8 flex flex-col space-y-4" aria-label="Mobile navigation">
                {navLinks.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.name}
                  </Link>
                ))}
                <Button
                  render={<Link href="/menu" onClick={() => setOpen(false)} />}
                  className="mt-4 bg-brand-accent text-black hover:bg-brand-accent/90"
                >
                  {t('orderNow')}
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
