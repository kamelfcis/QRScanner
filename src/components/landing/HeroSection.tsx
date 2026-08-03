'use client';

import { motion, type Variants } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export function HeroSection() {
  const { data: settings } = useRestaurantSettings();
  const prefersReducedMotion = useReducedMotion();

  const name = settings?.name_en || 'Warda Shamya';
  const tagline = 'A culinary journey through Lebanese & Syrian traditions';

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-secondary-dark to-brand-secondary" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,215,0,0.15)_0%,_transparent_60%)]" />

      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-brand-accent/10"
          style={{
            width: 80 + i * 40,
            height: 80 + i * 40,
            left: `${10 + i * 18}%`,
            top: `${15 + (i % 3) * 25}%`,
          }}
          animate={
            prefersReducedMotion
              ? undefined
              : { y: [0, -20, 0], transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const } }
          }
        />
      ))}

      <motion.div
        className="relative z-10 flex flex-col items-center px-4 text-center"
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate="visible"
      >
        <motion.div variants={prefersReducedMotion ? undefined : itemVariants}>
          <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full border-2 border-brand-accent/30 bg-white/10 backdrop-blur-sm md:h-40 md:w-40">
            <span className="text-4xl font-bold text-brand-accent font-heading md:text-5xl">
              {name.charAt(0)}
            </span>
          </div>
        </motion.div>

        <motion.h1
          className="mb-4 font-heading text-5xl font-bold text-white md:text-7xl"
          variants={prefersReducedMotion ? undefined : itemVariants}
        >
          {name}
        </motion.h1>

        <motion.p
          className="mb-8 max-w-xl text-xl text-brand-accent md:text-2xl"
          variants={prefersReducedMotion ? undefined : itemVariants}
        >
          {tagline}
        </motion.p>

        <motion.div
          className="flex flex-col gap-4 sm:flex-row"
          variants={prefersReducedMotion ? undefined : itemVariants}
        >
          <Button
            render={<Link href="/menu" />}
            size="lg"
            className="bg-brand-accent text-black hover:bg-brand-accent/90 px-8"
          >
            View Menu
          </Button>
          <Button
            render={<Link href="#story" />}
            size="lg"
            variant="outline"
            className="border-brand-accent/50 text-brand-accent hover:bg-brand-accent/10 px-8"
          >
            Our Story
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={prefersReducedMotion ? undefined : { y: [0, 10, 0] }}
        transition={prefersReducedMotion ? undefined : { duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="h-8 w-8 text-brand-accent/60" />
      </motion.div>
    </section>
  );
}
