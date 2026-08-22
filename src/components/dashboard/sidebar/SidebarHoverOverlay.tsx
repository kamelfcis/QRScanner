'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getSidebarPeekPanelVariants } from '@/lib/motion';

type SidebarHoverOverlayProps = {
  open: boolean;
  slideFrom: '-100%' | '100%';
  prefersReducedMotion: boolean;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  children: React.ReactNode;
};

const overlayPanelClassName =
  'bg-background fixed inset-y-0 start-0 z-50 hidden w-64 border-r shadow-xl md:block will-change-transform';

export function SidebarHoverOverlay({
  open,
  slideFrom,
  prefersReducedMotion,
  onHoverEnter,
  onHoverLeave,
  children,
}: SidebarHoverOverlayProps) {
  if (prefersReducedMotion) {
    if (!open) return null;

    return (
      <aside
        aria-expanded
        className={overlayPanelClassName}
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
      >
        {children}
      </aside>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="sidebar-peek-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-0 z-40 hidden bg-black/5 md:block"
            aria-hidden="true"
          />
          <motion.aside
            key="sidebar-peek-panel"
            aria-expanded
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={getSidebarPeekPanelVariants(slideFrom)}
            className={overlayPanelClassName}
            onMouseEnter={onHoverEnter}
            onMouseLeave={onHoverLeave}
          >
            {children}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
