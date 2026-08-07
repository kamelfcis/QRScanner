'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NextImage from 'next/image';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { cn, getName } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCartStore, type CartDiningMode } from '@/stores/cart-store';
import { buildMenuUrl, persistDiningMode, readStoredDiningMode } from '@/lib/dining-mode';
import {
  fadeInUp,
  scaleIn,
  staggerContainer,
  staggerItem,
  hoverScale,
  tapScale,
} from '@/lib/motion';

const WELCOME_HERO = '/hero/warda-storefront.jpg';

export default function WelcomePage() {
  return (
    <Suspense fallback={<WelcomeSkeleton />}>
      <WelcomeContent />
    </Suspense>
  );
}

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');
  const skipParam = searchParams.get('skip') === '1';
  const { data: settings } = useRestaurantSettings();
  const { locale } = useI18n();
  const t = useTranslations('welcome');
  const prefersReducedMotion = useReducedMotion();
  const setMeta = useCartStore((s) => s.setMeta);

  const [ready, setReady] = useState(() => !skipParam);
  const [redirecting] = useState(() => Boolean(skipParam));

  useEffect(() => {
    // Testing escape hatch only - QR table scans always show mode picker
    if (skipParam) {
      const mode = readStoredDiningMode();
      if (tableParam) localStorage.setItem('warda-table', tableParam);
      router.replace(buildMenuUrl(mode, tableParam));
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal UI after client hydration
    setReady(true);
  }, [skipParam, tableParam, router]);

  const isArabic = locale === 'ar';
  const restaurantName = getName(
    locale,
    settings?.name_en || 'Warda Shamya',
    settings?.name_ar || 'وردة الشامية'
  );

  const goToMenu = (mode: CartDiningMode) => {
    persistDiningMode(mode);
    if (tableParam) {
      localStorage.setItem('warda-table', tableParam);
    }
    setMeta({
      diningMode: mode,
      tableNumber: tableParam,
    });
    router.push(buildMenuUrl(mode, tableParam));
  };

  if (!ready || redirecting) {
    return <WelcomeSkeleton />;
  }

  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-end overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:justify-center sm:pb-[env(safe-area-inset-bottom)]">
      {/* Storefront hero — full bleed with subtle ken-burns */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={
            prefersReducedMotion ? undefined : { scale: [1, 1.06], x: [0, '-1%'], y: [0, '-0.5%'] }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : { duration: 22, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }
          }
        >
          <NextImage
            src={WELCOME_HERO}
            alt={t('heroAlt')}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </motion.div>

        {/* Layered overlays for readability + night-kitchen mood */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />
        <div className="via-brand-accent/30 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
      </div>

      <motion.div
        variants={prefersReducedMotion ? undefined : staggerContainer}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate="visible"
        className="relative z-10 flex w-full max-w-xl flex-col items-center px-4 py-6 text-center sm:max-w-2xl sm:px-6"
      >
        {/* Logo — gold ring + glass frame */}
        <motion.div
          variants={prefersReducedMotion ? undefined : scaleIn}
          className="border-brand-accent/35 mb-5 flex h-28 w-28 items-center justify-center rounded-[1.75rem] border bg-black/45 p-3 shadow-[0_0_40px_rgba(255,183,0,0.15)] backdrop-blur-xl sm:mb-6 sm:h-32 sm:w-32"
        >
          {settings?.logo_url ? (
            <NextImage
              src={settings.logo_url}
              alt={restaurantName}
              width={96}
              height={96}
              className="h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(255,183,0,0.25)]"
              priority
            />
          ) : (
            <span className="font-heading text-brand-accent text-5xl font-bold drop-shadow-[0_0_20px_rgba(255,183,0,0.4)]">
              W
            </span>
          )}
        </motion.div>

        <motion.p
          variants={prefersReducedMotion ? undefined : fadeInUp}
          className="font-heading text-brand-accent mb-2 text-xs font-medium uppercase tracking-[0.28em] sm:text-sm"
        >
          {restaurantName}
        </motion.p>

        <motion.h1
          variants={prefersReducedMotion ? undefined : fadeInUp}
          className="font-heading mb-2 max-w-md text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-lg sm:text-4xl"
        >
          {t('welcomeTo', { name: restaurantName })}
        </motion.h1>

        <motion.p
          variants={prefersReducedMotion ? undefined : fadeInUp}
          className="mb-1 max-w-sm text-sm leading-relaxed text-white/70"
        >
          {t('tagline')}
        </motion.p>

        {tableParam && (
          <motion.div variants={prefersReducedMotion ? undefined : fadeInUp}>
            <Badge
              variant="secondary"
              className="border-brand-accent/25 text-brand-accent mb-4 mt-3 border bg-black/50 px-4 py-1.5 text-sm backdrop-blur-md"
            >
              {t('tableLabel')} {tableParam}
            </Badge>
          </motion.div>
        )}
        {!tableParam && <div className="mb-4" />}

        <motion.h2
          variants={prefersReducedMotion ? undefined : fadeInUp}
          className="mb-6 text-base font-medium text-white/80 sm:mb-8 sm:text-lg"
        >
          {t('chooseOrderType')}
        </motion.h2>

        <motion.div
          variants={prefersReducedMotion ? undefined : staggerContainer}
          className="mb-5 grid w-full grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <ModeCard
            emoji="🍽️"
            labelEn={t('dineInEn')}
            labelAr={t('dineInAr')}
            subtitle={t('dineInDesc')}
            testId="welcome-dine-in"
            onSelect={() => goToMenu('dining')}
            prefersReducedMotion={prefersReducedMotion}
            isRtl={isArabic}
          />
          <ModeCard
            emoji="🛍️"
            labelEn={t('takeawayEn')}
            labelAr={t('takeawayAr')}
            subtitle={t('takeawayDesc')}
            testId="welcome-takeaway"
            onSelect={() => goToMenu('takeaway')}
            prefersReducedMotion={prefersReducedMotion}
            isRtl={isArabic}
          />
        </motion.div>

        <motion.p
          variants={prefersReducedMotion ? undefined : staggerItem}
          className="text-xs text-white/50"
        >
          {t('orChangeLater')}
        </motion.p>
      </motion.div>
    </div>
  );
}

function ModeCard({
  emoji,
  labelEn,
  labelAr,
  subtitle,
  testId,
  onSelect,
  prefersReducedMotion,
  isRtl,
}: {
  emoji: string;
  labelEn: string;
  labelAr: string;
  subtitle: string;
  testId: string;
  onSelect: () => void;
  prefersReducedMotion: boolean;
  isRtl: boolean;
}) {
  const ariaLabel = `${labelEn} / ${labelAr}`;

  return (
    <motion.button
      type="button"
      variants={prefersReducedMotion ? undefined : staggerItem}
      whileHover={prefersReducedMotion ? undefined : hoverScale}
      whileTap={prefersReducedMotion ? undefined : tapScale}
      onClick={onSelect}
      data-testid={testId}
      aria-label={ariaLabel}
      className={cn(
        'group relative flex min-h-[172px] flex-col items-center justify-center overflow-hidden rounded-3xl',
        'border border-white/15 bg-black/45 p-6 text-center shadow-lg backdrop-blur-xl',
        'transition-[border-color,box-shadow,background-color] duration-300',
        'hover:border-brand-accent/50 hover:bg-black/55 hover:shadow-[0_0_32px_rgba(255,183,0,0.18)]',
        'focus-visible:ring-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black'
      )}
    >
      {/* Animated gold edge glow */}
      <span
        className={cn(
          'via-brand-accent/60 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent',
          !prefersReducedMotion &&
            'opacity-60 transition-opacity duration-300 group-hover:opacity-100'
        )}
        aria-hidden
      />

      {!prefersReducedMotion && (
        <motion.span
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0"
          aria-hidden
          initial={false}
          whileHover={{
            opacity: 1,
            boxShadow: '0 0 24px rgba(255, 183, 0, 0.12), inset 0 1px 0 rgba(255, 183, 0, 0.2)',
          }}
          transition={{ duration: 0.3 }}
        />
      )}

      <span className="mb-3 text-4xl drop-shadow-md" role="img" aria-hidden>
        {emoji}
      </span>
      <div className={cn('mb-1 flex flex-col gap-0.5', isRtl ? 'items-center' : 'items-center')}>
        <span className="text-lg font-bold leading-tight text-white">{labelEn}</span>
        <span className="font-arabic text-brand-accent text-base font-semibold">{labelAr}</span>
      </div>
      <p className="max-w-[200px] text-xs leading-relaxed text-white/60">{subtitle}</p>

      <div
        className="from-brand-accent/10 pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
    </motion.button>
  );
}

function WelcomeSkeleton() {
  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-black px-4">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40"
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-4">
        <div className="h-28 w-28 animate-pulse rounded-[1.75rem] bg-white/10" />
        <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
        <div className="h-8 w-56 animate-pulse rounded-lg bg-white/10" />
        <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
        <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-44 animate-pulse rounded-3xl bg-white/10" />
          <div className="h-44 animate-pulse rounded-3xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}
