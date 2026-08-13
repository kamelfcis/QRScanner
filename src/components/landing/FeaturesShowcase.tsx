'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { FeatureLottie } from '@/components/landing/FeatureLottie';

const QrToMenuPlayer = dynamic(
  () => import('@/components/landing/QrToMenuPlayer').then((mod) => mod.QrToMenuPlayer),
  {
    ssr: false,
    loading: () => <div className="aspect-[4/3] w-full animate-pulse rounded-[16px] bg-[#51FE00]/10" />,
  },
);

const WhatsAppOrderPlayer = dynamic(
  () => import('@/components/landing/WhatsAppOrderPlayer').then((mod) => mod.WhatsAppOrderPlayer),
  {
    ssr: false,
    loading: () => <div className="aspect-[3/4] w-full animate-pulse rounded-[16px] bg-[#25D366]/10" />,
  },
);

const AnalyticsPulsePlayer = dynamic(
  () => import('@/components/landing/AnalyticsPulsePlayer').then((mod) => mod.AnalyticsPulsePlayer),
  {
    ssr: false,
    loading: () => <div className="aspect-[16/10] w-full animate-pulse rounded-[16px] bg-[#0b1220]/8" />,
  },
);

const LOTTIE: Record<string, string> = {
  globe: '/lottie/globe.json',
  food: '/lottie/food.json',
  'ai-doc': '/lottie/ai-doc.json',
  delivery: '/lottie/delivery.json',
  'qr-print': '/lottie/qr-print.json',
};

type Feature = { readonly id?: string; readonly title: string; readonly body: string };

function BentoCard({
  className,
  delay,
  children,
}: {
  className?: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        'feature-bento-card surface-card group relative overflow-hidden rounded-[16px] p-5',
        className,
      )}
      style={{ ['--stagger' as string]: `${delay}ms` }}
    >
      <span className="feature-bento-accent" />
      {children}
    </article>
  );
}

function FeatureCopy({ feature }: { feature: Feature }) {
  return (
    <div className="relative z-10 min-w-0">
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-pretty">{feature.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed text-pretty">{feature.body}</p>
    </div>
  );
}

export function FeaturesShowcase() {
  const { t } = useI18n();
  const features = t.features as readonly Feature[];
  const qr = features[0];
  const bilingual = features[1];
  const food = features[2];
  const whatsapp = features[3];
  const analytics = features[4];
  const ai = features[5];
  const delivery = features[6];
  const qrPrint = features[7];

  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24">
      <p className="text-muted-foreground mb-3 text-sm font-medium tracking-[0.22em] uppercase">
        {t.featuresKicker}
      </p>
      <h2 className="font-heading mb-10 max-w-2xl text-balance text-3xl font-bold">
        {t.featuresTitle}
      </h2>

      <div className="feature-bento">
        <div className="feature-snap-row">
          <BentoCard className="flex min-h-[20rem] min-w-[70%] flex-col gap-4 lg:col-span-8" delay={0}>
            <div className="aspect-[4/3] overflow-hidden rounded-[16px] bg-[#51FE00]/8">
              <QrToMenuPlayer />
            </div>
            <FeatureCopy feature={qr} />
          </BentoCard>
          <BentoCard
            className="flex min-h-[20rem] min-w-[46%] flex-col justify-between gap-4 lg:col-span-4"
            delay={80}
          >
            <div className="aspect-[3/4] max-h-[280px] overflow-hidden rounded-[16px] bg-[#25D366]/10">
              <WhatsAppOrderPlayer />
            </div>
            <FeatureCopy feature={whatsapp} />
          </BentoCard>
        </div>

        <div className="feature-snap-row">
          <BentoCard className="flex min-h-[16rem] min-w-[46%] flex-col gap-3 lg:col-span-6" delay={140}>
            <FeatureLottie src={LOTTIE.globe} tint="sky" />
            <FeatureCopy feature={bilingual} />
          </BentoCard>
          <BentoCard className="flex min-h-[16rem] min-w-[46%] flex-col gap-3 lg:col-span-6" delay={180}>
            <div className="aspect-[16/10] overflow-hidden rounded-[16px] bg-[#0b1220]/6">
              <AnalyticsPulsePlayer />
            </div>
            <FeatureCopy feature={analytics} />
          </BentoCard>
        </div>

        <div className="feature-snap-row">
          <BentoCard className="flex min-h-[14rem] min-w-[42%] flex-col gap-3 lg:col-span-3" delay={220}>
            <FeatureLottie src={LOTTIE.food} tint="amber" />
            <FeatureCopy feature={food} />
          </BentoCard>
          <BentoCard className="flex min-h-[14rem] min-w-[42%] flex-col gap-3 lg:col-span-3" delay={260}>
            <FeatureLottie src={LOTTIE['ai-doc']} tint="green" />
            <FeatureCopy feature={ai} />
          </BentoCard>
          <BentoCard className="flex min-h-[14rem] min-w-[42%] flex-col gap-3 lg:col-span-3" delay={300}>
            <FeatureLottie src={LOTTIE.delivery} tint="green" />
            <FeatureCopy feature={delivery} />
          </BentoCard>
          <BentoCard className="flex min-h-[14rem] min-w-[42%] flex-col gap-3 lg:col-span-3" delay={340}>
            <FeatureLottie src={LOTTIE['qr-print']} tint="navy" />
            <FeatureCopy feature={qrPrint} />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
