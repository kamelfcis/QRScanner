'use client';

import { ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCartCount } from '@/hooks/useCartCount';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface CartButtonProps {
  onClick: () => void;
}

export function CartButton({ onClick }: CartButtonProps) {
  const cartCount = useCartCount();
  const prefersReducedMotion = useReducedMotion();
  const tCart = useTranslations('cart');

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tCart('cartCount', { count: cartCount })}
      data-testid="cart-button"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--hm-radius)] border border-[var(--hm-line-strong)] bg-[var(--hm-surface)] text-[var(--hm-ink)] transition-colors hover:border-[var(--hm-primary)] hover:text-[var(--hm-primary)]"
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      <span className="sr-only" aria-live="polite">
        {tCart('cartCount', { count: cartCount })}
      </span>
      {cartCount > 0 && (
        <motion.span
          key={cartCount}
          initial={prefersReducedMotion ? undefined : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--hm-accent)] px-1 text-[10px] font-bold tabular-nums text-[var(--hm-on-accent)]"
          data-testid="cart-badge"
        >
          {cartCount > 99 ? '99+' : cartCount}
        </motion.span>
      )}
    </button>
  );
}
