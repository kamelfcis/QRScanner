import { type Variants, type TargetAndTransition } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease } },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

export const slideIn: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } },
};

export const viewportConfig = {
  once: true,
  margin: '-80px',
};

export const hoverScale: TargetAndTransition = {
  scale: 1.03,
  transition: { duration: 0.3, ease },
};

export const tapScale: TargetAndTransition = {
  scale: 0.97,
};

export const blurFadeIn: Variants = {
  hidden: { opacity: 0, filter: 'blur(10px)' },
  visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease } },
};
