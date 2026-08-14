'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { MenuThemeScope } from '@/components/menu/MenuThemeScope';
import { useCartStore } from '@/stores/cart-store';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeInUp, scaleIn } from '@/lib/motion';
import { openWhatsAppUrl } from '@/lib/order/build-order';

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100svh] items-center justify-center">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sent = searchParams.get('sent') === '1';
  const t = useTranslations('orderSuccess');
  const prefersReducedMotion = useReducedMotion();
  const clear = useCartStore((s) => s.clear);
  const [returned, setReturned] = useState(false);
  const [waUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem('warda-last-wa-url');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!sent) return;

    const onFocus = () => setReturned(true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') setReturned(true);
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const timer = window.setTimeout(() => setReturned(true), 4000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(timer);
    };
  }, [sent]);

  const showThankYou = !sent || returned;
  const title = showThankYou ? t('thankYouTitle') : t('readyTitle');
  const description = showThankYou ? t('thankYouDescription') : t('readyDescription');

  const keepCart = () => {
    router.push('/menu');
  };

  const clearCart = () => {
    clear();
    try {
      sessionStorage.removeItem('warda-last-wa-url');
    } catch {
      // ignore
    }
    router.push('/menu');
  };

  return (
    <div
      data-menu-theme
      className="flex min-h-[100svh] items-center justify-center bg-[var(--menu-paper)] px-4 pb-[env(safe-area-inset-bottom)]"
    >
      <MenuThemeScope />
      <motion.div
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate="visible"
        variants={fadeInUp}
        className="w-full max-w-md space-y-6 text-center"
      >
        <motion.div
          variants={prefersReducedMotion ? undefined : scaleIn}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-surface)] text-[var(--menu-wine)]"
        >
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{title}</h1>
          <p className="mx-auto max-w-[38ch] text-sm leading-relaxed text-[var(--menu-ink-soft)]">
            {description}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {waUrl && (
            <Button
              size="lg"
              className="h-12 w-full rounded-full bg-[var(--menu-wine)] text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]"
              onClick={() => openWhatsAppUrl(waUrl)}
              data-testid="reopen-whatsapp"
            >
              <MessageCircle className="me-2 h-4 w-4" aria-hidden="true" />
              {t('openWhatsApp')}
            </Button>
          )}

          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-full"
            onClick={keepCart}
            data-testid="keep-cart"
          >
            {t('keepCart')}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-full text-[var(--menu-ink-soft)]"
            onClick={clearCart}
            data-testid="clear-cart"
          >
            {t('clearCart')}
          </Button>

          <Link href="/menu" className={buttonVariants({ variant: 'link' })}>
            {t('backToMenu')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
