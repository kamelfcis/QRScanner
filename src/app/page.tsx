'use client';

import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/landing/SiteChrome';
import { ProductMotion } from '@/components/landing/ProductMotion';
import { buttonVariants } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div>
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
              {t.hero.kicker}
            </p>
            <h1 className="font-heading text-4xl leading-tight font-extrabold sm:text-5xl">
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
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <ProductMotion />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <p className="text-muted-foreground mb-4 text-sm">{t.trust.title}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {t.trust.items.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="font-heading mb-8 text-3xl font-bold">{t.beforeAfter.title}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
                {t.beforeAfter.before}
              </h3>
              <ul className="space-y-3 text-sm">
                {t.beforeAfter.beforeItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="glow-ring rounded-2xl border border-[#51fe00]/30 bg-[#51fe00]/5 p-6">
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

        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20">
          <h2 className="font-heading mb-8 text-3xl font-bold">{t.featuresTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.features.map((f) => (
              <article key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20">
          <h2 className="font-heading mb-8 text-3xl font-bold">{t.howTitle}</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {t.how.map((step) => (
              <article key={step.title} className="rounded-2xl border border-white/10 bg-[#0e1422] p-5">
                <div className="text-primary mb-3 text-2xl font-black">{step.n}</div>
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="font-heading mb-8 text-3xl font-bold">{t.demosTitle}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {t.demos.map((demo) => (
              <a
                key={demo.url}
                href={demo.url}
                target="_blank"
                rel="noreferrer"
                className="hover:border-primary/40 rounded-2xl border border-white/10 bg-white/5 p-5 transition"
              >
                <div className="font-semibold">{demo.name}</div>
                <div className="text-muted-foreground mt-1 truncate text-xs">{demo.url}</div>
                <div className="bg-muted mt-4 overflow-hidden rounded-xl border border-white/10">
                  <iframe
                    src={demo.url}
                    title={demo.name}
                    className="h-56 w-full bg-black"
                    loading="lazy"
                  />
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-20 lg:grid-cols-2">
          <div>
            <h2 className="font-heading mb-4 text-3xl font-bold">{t.qrTitle}</h2>
            <p className="text-muted-foreground text-lg">{t.qrBody}</p>
          </div>
          <ProductMotion />
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-20">
          <h2 className="font-heading mb-8 text-3xl font-bold">{t.faqTitle}</h2>
          <div className="space-y-3">
            {t.faq.map((item) => (
              <details
                key={item.q}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
              >
                <summary className="cursor-pointer font-medium">{item.q}</summary>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="glow-ring rounded-3xl bg-[#0e1422] px-6 py-12 text-center">
            <h2 className="font-heading text-3xl font-bold">{t.cta.title}</h2>
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
