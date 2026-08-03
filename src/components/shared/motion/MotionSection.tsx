'use client';

import { motion, type Variants } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeInUp, viewportConfig } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface MotionSectionProps {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
  once?: boolean;
}

export function MotionSection({
  children,
  className,
  variants = fadeInUp,
  delay = 0,
  once = true,
}: MotionSectionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{ ...viewportConfig, once }}
      variants={
        prefersReducedMotion
          ? undefined
          : {
              ...variants,
              visible: {
                ...(variants.visible as Record<string, unknown>),
                transition: {
                  ...((variants.visible as Record<string, unknown>)?.transition as Record<string, unknown>),
                  delay,
                },
              },
            }
      }
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
