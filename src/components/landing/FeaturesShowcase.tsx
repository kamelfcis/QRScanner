'use client';

import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { FeatureLottie } from '@/components/landing/FeatureLottie';

const QrToMenuPlayer = dynamic(
  () => import('@/components/landing/QrToMenuPlayer').then((mod) => mod.QrToMenuPlayer),
  {
    ssr: false,
    loading: () => <div className="bg-muted/50 aspect-[4/3] w-full animate-pulse rounded-xl" />,
  },
);

const LOTTIE: Record<string, string> = {
  'qr-scan': '/lottie/qr-scan.json',
  globe: '/lottie/globe.json',
  food: '/lottie/food.json',
  whatsapp: '/lottie/whatsapp.json',
  charts: '/lottie/charts.json',
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
  children: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        'feature-bento-card surface-card group relative overflow-hidden rounded-2xl p-5',
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
    <div className="relative z-10">
      <h3 className="mb-2 text-lg font-semibold tracking-tight">{feature.title}</h3>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <BentoCard className="flex flex-col gap-4 sm:col-span-2 lg:col-span-8" delay={0}>
          <div className="bg-muted/40 aspect-[4/3] overflow-hidden rounded-xl">
            <QrToMenuPlayer />
          </div>
          <FeatureCopy feature={qr} />
        </BentoCard>

        <BentoCard className="flex flex-col justify-between sm:col-span-2 lg:col-span-4" delay={80}>
          <FeatureLottie src={LOTTIE.whatsapp} size="lg" />
          <FeatureCopy feature={whatsapp} />
        </BentoCard>

        <BentoCard className="flex flex-col gap-3 lg:col-span-6" delay={140}>
          <FeatureLottie src={LOTTIE.globe} />
          <FeatureCopy feature={bilingual} />
        </BentoCard>

        <BentoCard className="flex flex-col gap-3 lg:col-span-6" delay={180}>
          <FeatureLottie src={LOTTIE.charts} className="h-[160px] w-[220px]" />
          <FeatureCopy feature={analytics} />
        </BentoCard>

        <BentoCard className="flex flex-col gap-3 lg:col-span-3" delay={220}>
          <FeatureLottie src={LOTTIE.food} />
          <FeatureCopy feature={food} />
        </BentoCard>
        <BentoCard className="flex flex-col gap-3 lg:col-span-3" delay={260}>
          <FeatureLottie src={LOTTIE['ai-doc']} />
          <FeatureCopy feature={ai} />
        </BentoCard>
        <BentoCard className="flex flex-col gap-3 lg:col-span-3" delay={300}>
          <FeatureLottie src={LOTTIE.delivery} />
          <FeatureCopy feature={delivery} />
        </BentoCard>
        <BentoCard className="flex flex-col gap-3 lg:col-span-3" delay={340}>
          <FeatureLottie src={LOTTIE['qr-print']} />
          <FeatureCopy feature={qrPrint} />
        </BentoCard>
      </div>
    </section>
  );
}
