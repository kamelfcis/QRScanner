'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  direction?: 'up' | 'down';
}

export function ParallaxSection({
  children,
  className,
  speed = 0.3,
  direction = 'up',
}: ParallaxSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const multiplier = direction === 'up' ? -1 : 1;
  const y = useTransform(scrollYProgress, [0, 1], [0, speed * 100 * multiplier]);

  if (prefersReducedMotion) {
    return <div ref={ref} className={cn(className)}>{children}</div>;
  }

  return (
    <div ref={ref} className={cn('overflow-hidden', className)}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
