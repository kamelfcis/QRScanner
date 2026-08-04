'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, ShoppingBag, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';

type Mode = 'dining' | 'takeaway';

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
  const { data: settings } = useRestaurantSettings();
  const { locale } = useI18n();
  const t = useTranslations('welcome');

  const [selected, setSelected] = useState<Mode | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isArabic = locale === 'ar';

  const handleContinue = () => {
    if (!selected) return;
    localStorage.setItem('warda-dining-mode', selected);
    if (tableParam) {
      localStorage.setItem('warda-table', tableParam);
    }
    const params = new URLSearchParams({ mode: selected });
    if (tableParam) params.set('table', tableParam);
    router.push(`/menu?${params.toString()}`);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={mounted ? { opacity: 0, y: 30 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-md flex-col items-center text-center"
      >
        {/* Restaurant name */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-2"
        >
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">
            {settings?.name_en || 'Warda Shamya'}
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mb-1 text-sm text-muted-foreground"
        >
          {t('tagline')}
        </motion.p>

        {/* Table badge */}
        {tableParam && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mb-6"
          >
            <Badge variant="secondary" className="mt-1 text-sm">
              {t('tableLabel')} {tableParam}
            </Badge>
          </motion.div>
        )}

        {!tableParam && <div className="mb-6" />}

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mb-2 text-xl font-semibold sm:text-2xl"
        >
          {t('title')}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="mb-8 text-sm text-muted-foreground"
        >
          {t('subtitle')}
        </motion.p>

        {/* Mode selection cards */}
        <div className="mb-8 grid w-full grid-cols-2 gap-4">
          <ModeCard
            mode="dining"
            icon={<Utensils className="h-8 w-8" />}
            label={t('dineIn')}
            description={t('dineInDesc')}
            selected={selected === 'dining'}
            onClick={() => setSelected('dining')}
            delay={0.5}
            isArabic={isArabic}
          />
          <ModeCard
            mode="takeaway"
            icon={<ShoppingBag className="h-8 w-8" />}
            label={t('takeaway')}
            description={t('takeawayDesc')}
            selected={selected === 'takeaway'}
            onClick={() => setSelected('takeaway')}
            delay={0.6}
            isArabic={isArabic}
          />
        </div>

        {/* Continue button */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <Button
                size="lg"
                className="group h-14 w-full text-base font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
                onClick={handleContinue}
              >
                <Sparkles className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
                {t('continue')}
                <ChevronRight
                  className={cn(
                    'ml-2 h-5 w-5 transition-transform group-hover:translate-x-1',
                    isArabic && 'rotate-180 group-hover:-translate-x-1'
                  )}
                />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-6 text-xs text-muted-foreground/60"
        >
          {t('orChangeLater')}
        </motion.p>
      </motion.div>
    </div>
  );
}

function ModeCard({
  mode,
  icon,
  label,
  description,
  selected,
  onClick,
  delay,
  isArabic,
}: {
  mode: Mode;
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  delay: number;
  isArabic: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center rounded-2xl border-2 p-6 text-center transition-all duration-300',
        'hover:border-primary/50 hover:shadow-lg',
        selected
          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
          : 'border-border bg-card/50 hover:bg-card'
      )}
    >
      {/* Glow effect on selected */}
      {selected && (
        <motion.div
          layoutId="glow"
          className="absolute inset-0 rounded-2xl bg-primary/5"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}

      <div
        className={cn(
          'relative mb-3 flex h-16 w-16 items-center justify-center rounded-xl transition-all duration-300',
          selected
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
        )}
      >
        {icon}
      </div>

      <h3 className="relative mb-1 text-lg font-bold">{label}</h3>
      <p className="relative text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </motion.button>
  );
}

function WelcomeSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
    </div>
  );
}
