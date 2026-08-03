'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { viewportConfig } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface MotionTextProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
}

export function MotionText({
  children,
  className,
  delay = 0,
  as: Tag = 'p',
}: MotionTextProps) {
  const prefersReducedMotion = useReducedMotion();

  const MotionTag = motion.create(Tag);

  return (
    <MotionTag
      initial={prefersReducedMotion ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={viewportConfig}
      variants={
        prefersReducedMotion
          ? undefined
          : {
              hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
              visible: {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
              },
            }
      }
      className={cn(className)}
    >
      {children}
    </MotionTag>
  );
}
