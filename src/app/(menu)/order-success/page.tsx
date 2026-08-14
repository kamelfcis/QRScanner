'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeInUp, scaleIn } from '@/lib/motion';
import { openWhatsAppUrl } from '@/lib/order/build-order';
import { AkletThemeScope } from '@/components/menu/AkletThemeScope';

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          data-aklet-theme
          className="bg-aklet-paper flex min-h-[100svh] items-center justify-center"
        >
          <div className="bg-aklet-sand/70 h-8 w-48 animate-pulse rounded" />
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
      return sessionStorage.getItem('aklet-last-wa-url');
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
      sessionStorage.removeItem('aklet-last-wa-url');
    } catch {
      // ignore
    }
    router.push('/menu');
  };

  return (
    <div
      data-aklet-theme
      className="bg-aklet-paper text-aklet-ink flex min-h-[100svh] items-center justify-center px-4 pb-[env(safe-area-inset-bottom)]"
    >
      <AkletThemeScope />
      <motion.div
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate="visible"
        variants={fadeInUp}
        className="w-full max-w-md space-y-6 text-center"
      >
        <motion.div
          variants={prefersReducedMotion ? undefined : scaleIn}
          className="bg-aklet-ocean/10 text-aklet-ocean mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        >
          <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="font-heading text-aklet-ink text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="text-aklet-ink-soft text-sm">{description}</p>
        </div>

        <div className="flex flex-col gap-3">
          {waUrl && (
            <Button
              size="lg"
              className="bg-aklet-coral-cta hover:bg-aklet-coral-cta/90 h-12 w-full rounded-xl font-bold text-white"
              onClick={() => openWhatsAppUrl(waUrl)}
              data-testid="reopen-whatsapp"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {t('openWhatsApp')}
            </Button>
          )}

          <Button
            size="lg"
            variant="outline"
            className="border-aklet-line text-aklet-ink h-12 w-full rounded-xl"
            onClick={keepCart}
            data-testid="keep-cart"
          >
            {t('keepCart')}
          </Button>

          <Button
            size="lg"
            variant="ghost"
            className="text-aklet-ink-soft hover:text-aklet-ink h-12 w-full rounded-xl"
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
