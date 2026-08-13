'use client';

import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/landing/SiteChrome';
import { ProductMotion } from '@/components/landing/ProductMotion';
import { FeaturesShowcase } from '@/components/landing/FeaturesShowcase';
import { FeatureLottie } from '@/components/landing/FeatureLottie';
import { LiveDemosSection } from '@/components/landing/LiveDemosSection';
import { buttonVariants } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { t, locale } = useI18n();

  return (
    <div>
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div className="space-y-6">
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
              {t.hero.kicker}
            </p>
            <h1
              className={cn(
                'font-heading max-w-xl text-4xl font-bold sm:text-5xl lg:max-w-lg',
                locale === 'ar' ? 'leading-[1.15]' : 'leading-tight tracking-tight'
              )}
            >
              {t.hero.title}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg">{t.hero.subtitle}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ size: 'lg' })}>
                {t.hero.cta}
              </Link>
              <a href="#features" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                {t.hero.secondary}
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {t.hero.chips.map((chip) => (
                <span
                  key={chip}
                  className="border-border bg-card text-muted-foreground rounded-full border px-3 py-1 text-xs"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <ProductMotion />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <p className="text-muted-foreground mb-5 text-sm">{t.trust.title}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {t.trust.items.map((item) => (
              <div key={item} className="surface-card rounded-2xl px-4 py-5">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <h2 className="font-heading mb-10 text-balance text-3xl font-bold">{t.beforeAfter.title}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="surface-card rounded-2xl p-6">
              <h3 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
                {t.beforeAfter.before}
              </h3>
              <ul className="space-y-3 text-sm">
                {t.beforeAfter.beforeItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="surface-card rounded-2xl border-primary/30 bg-primary/5 p-6">
              <h3 className="text-primary mb-4 text-sm font-semibold tracking-wide uppercase">
                {t.beforeAfter.after}
              </h3>
              <ul className="space-y-3 text-sm">
                {t.beforeAfter.afterItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <FeaturesShowcase />

        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24">
          <h2 className="font-heading mb-10 text-balance text-3xl font-bold">{t.howTitle}</h2>
          <div className="how-snap feature-snap-row">
            {t.how.map((step, index) => (
              <article
                key={step.title}
                className="feature-bento-card surface-card relative min-h-[11rem] min-w-[42%] overflow-hidden rounded-[16px] p-5"
                style={{ ['--stagger' as string]: `${index * 80}ms` }}
              >
                <span className="feature-bento-accent" />
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#51FE00]/15 text-lg font-black text-[#0b1220] dark:text-[#51FE00]">
                    {step.n}
                  </div>
                  {index === 0 ? (
                    <FeatureLottie src="/lottie/check.json" tint="green" className="h-11 w-11" />
                  ) : null}
                </div>
                <h3 className="mb-2 font-semibold text-pretty">{step.title}</h3>
                <p className="text-muted-foreground text-sm text-pretty">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <LiveDemosSection />


        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-24 lg:grid-cols-2">
          <div>
            <h2 className="font-heading mb-4 text-balance text-3xl font-bold">{t.qrTitle}</h2>
            <p className="text-muted-foreground text-lg">{t.qrBody}</p>
          </div>
          <ProductMotion />
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-24">
          <h2 className="font-heading mb-10 text-balance text-3xl font-bold">{t.faqTitle}</h2>
          <div className="space-y-3">
            {t.faq.map((item) => (
              <details key={item.q} className="surface-card rounded-2xl px-5 py-4">
                <summary className="cursor-pointer font-medium">{item.q}</summary>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="surface-card rounded-3xl px-6 py-12 text-center">
            <h2 className="font-heading text-balance text-3xl font-bold">{t.cta.title}</h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-xl">{t.cta.body}</p>
            <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'mt-6 inline-flex')}>
              {t.cta.button}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
