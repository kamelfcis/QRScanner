'use client';

import { useEffect, useRef, useState } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 2000,
  suffix = '',
  prefix = '',
  className,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const { ref, isInView } = useIntersectionObserver({ threshold: 0.5 });
  const prefersReducedMotion = useReducedMotion();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    if (prefersReducedMotion) {
      setCount(value);
      hasAnimated.current = true;
      return;
    }

    hasAnimated.current = true;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value, duration, prefersReducedMotion]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}{count}{suffix}
    </span>
  );
}
