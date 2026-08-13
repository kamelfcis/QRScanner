'use client';

import { useEffect, useRef, useState } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { cn } from '@/lib/utils';

type FeatureLottieProps = {
  src: string;
  className?: string;
  size?: 'sm' | 'lg';
  tint?: 'green' | 'whatsapp' | 'navy' | 'amber' | 'sky';
};

const TINT: Record<NonNullable<FeatureLottieProps['tint']>, string> = {
  green: 'bg-[#51FE00]/10',
  whatsapp: 'bg-[#25D366]/10',
  navy: 'bg-[#0b1220]/8 dark:bg-white/10',
  amber: 'bg-amber-400/15',
  sky: 'bg-sky-500/12',
};

export function FeatureLottie({
  src,
  className,
  size = 'sm',
  tint = 'green',
}: FeatureLottieProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [data, setData] = useState<object | null>(null);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${src}`);
        return res.json();
      })
      .then((json: object) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);

    const node = wrapRef.current;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.35,
      rootMargin: '40px',
    });
    if (node) io.observe(node);

    return () => {
      mq.removeEventListener('change', sync);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    const inst = lottieRef.current;
    if (!inst || !data) return;
    if (reduced) {
      inst.goToAndStop(0, true);
      return;
    }
    if (inView || hover) {
      inst.play();
    } else {
      inst.goToAndStop(0, true);
    }
  }, [data, hover, inView, reduced]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={cn(
        'feature-lottie relative mx-auto flex items-center justify-center rounded-2xl',
        TINT[tint],
        size === 'lg' ? 'h-[220px] w-[220px]' : 'h-[140px] w-[140px]',
        className,
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {data ? (
        <Lottie
          lottieRef={lottieRef}
          animationData={data}
          loop={!reduced}
          autoplay={false}
          className="h-full w-full p-2"
        />
      ) : (
        <div className="h-full w-full animate-pulse rounded-2xl bg-[#51FE00]/10" />
      )}
    </div>
  );
}
