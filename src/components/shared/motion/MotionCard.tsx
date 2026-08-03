'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeInUp, hoverScale, viewportConfig } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

export function MotionCard({ children, className, delay = 0, hover = true }: MotionCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={viewportConfig}
      variants={
        prefersReducedMotion
          ? undefined
          : {
              hidden: { opacity: 0, y: 30 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
              },
            }
      }
      whileHover={hover && !prefersReducedMotion ? hoverScale : undefined}
      whileTap={{ scale: 0.98 }}
      className={cn('will-change-transform', className)}
    >
      {children}
    </motion.div>
  );
}
