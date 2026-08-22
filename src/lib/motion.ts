import { type Variants, type TargetAndTransition } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

/** GPU-friendly fade + translate (no filter/blur) */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease } },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

export const slideIn: Variants = {
  hidden: { opacity: 0, x: 48 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease } },
};

export const viewportConfig = {
  once: true,
  margin: '-80px',
};

export const hoverScale: TargetAndTransition = {
  scale: 1.02,
  transition: { duration: 0.25, ease },
};

export const tapScale: TargetAndTransition = {
  scale: 0.97,
};

/**
 * @deprecated Use fadeInUp — blur filters are not compositor-friendly.
 * Kept as alias for any residual imports.
 */
export const blurFadeIn: Variants = fadeInUp;
