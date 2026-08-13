'use client';

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Demo = {
  readonly name: string;
  readonly url: string;
  readonly preview: string;
};

const DEMO_THEMES: Record<string, { gradient: string; ring: string }> = {
  'https://harameen.vercel.app/': {
    gradient: 'from-amber-100/90 via-orange-50 to-white',
    ring: 'group-hover:ring-amber-300/40',
  },
  'https://engaz-qr-menu.vercel.app/': {
    gradient: 'from-emerald-100/90 via-green-50 to-white',
    ring: 'group-hover:ring-emerald-300/40',
  },
  'https://aklet-gambary.vercel.app/': {
    gradient: 'from-sky-100/90 via-blue-50 to-white',
    ring: 'group-hover:ring-sky-300/40',
  },
};

function demoHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function LiveDemosSection() {
  const { t } = useI18n();
  const demos = t.demos;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24">
      <h2 className="font-heading mb-10 text-balance text-3xl font-bold">{t.demosTitle}</h2>
      <div className="grid gap-5 md:grid-cols-3">
        {demos.map((demo, index) => {
          const theme = DEMO_THEMES[demo.url] ?? {
            gradient: 'from-muted/80 via-background to-white',
            ring: 'group-hover:ring-primary/25',
          };

          return (
            <a
              key={demo.url}
              href={demo.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'demo-card surface-card group block rounded-2xl p-4 transition duration-300',
                'hover:border-primary/35 hover:-translate-y-1',
              )}
              style={{ ['--stagger' as string]: `${index * 80}ms` }}
            >
              <div
                className={cn(
                  'relative aspect-[4/3] overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br ring-1 ring-transparent transition duration-300',
                  theme.gradient,
                  theme.ring,
                )}
              >
                <div className="absolute inset-x-0 top-0 flex h-9 items-center gap-1.5 border-b border-black/5 bg-white/70 px-3 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-red-400/90" aria-hidden />
                  <span className="h-2 w-2 rounded-full bg-amber-400/90" aria-hidden />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/90" aria-hidden />
                  <span className="text-muted-foreground ms-2 truncate text-[10px] font-medium">
                    {demoHost(demo.url)}
                  </span>
                </div>

                <div className="flex h-full items-center justify-center px-6 pt-9 pb-5">
                  <Image
                    src={demo.preview}
                    alt=""
                    width={240}
                    height={240}
                    className="max-h-[7.5rem] w-auto object-contain drop-shadow-md transition duration-300 group-hover:scale-[1.04]"
                    sizes="(max-width: 768px) 80vw, 240px"
                  />
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 to-transparent" />
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold tracking-tight">{demo.name}</div>
                  <div className="text-muted-foreground mt-0.5 truncate text-xs">{demo.url}</div>
                </div>
                <ExternalLink
                  className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0 transition group-hover:text-primary"
                  aria-hidden
                />
              </div>

              <p className="text-primary mt-3 inline-flex items-center gap-1.5 text-sm font-medium opacity-80 transition group-hover:opacity-100">
                {t.demosVisit}
                <span aria-hidden>&rarr;</span>
              </p>
            </a>
          );
        })}
      </div>
    </section>
  );
}
