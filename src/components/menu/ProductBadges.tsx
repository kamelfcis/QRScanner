'use client';

import { Flame, Sparkles, Star } from 'lucide-react';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/database';

export type ProductBadge = 'popular' | 'new' | 'bestseller' | 'spicy';

export function pickBadges(product: Product): ProductBadge[] {
  const badges: ProductBadge[] = [];
  if (product.is_bestseller) badges.push('bestseller');
  else if (product.is_popular) badges.push('popular');
  if (product.is_new && badges.length < 2) badges.push('new');
  if (product.is_spicy && badges.length < 2) badges.push('spicy');
  return badges.slice(0, 2);
}

const ICONS: Record<ProductBadge, typeof Star> = {
  bestseller: Star,
  popular: Star,
  new: Sparkles,
  spicy: Flame,
};

export function BadgePill({
  badge,
  className,
  tone = 'onImage',
}: {
  badge: ProductBadge;
  className?: string;
  tone?: 'onImage' | 'onPaper';
}) {
  const t = useTranslations('menu');
  const Icon = ICONS[badge];
  const label =
    badge === 'popular'
      ? t('popular')
      : badge === 'new'
        ? t('new')
        : badge === 'bestseller'
          ? t('bestseller')
          : t('spicy');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.08em]',
        tone === 'onImage'
          ? 'bg-[#FDF7F0]/94 text-[var(--menu-wine)] shadow-[0_1px_4px_rgba(33,29,24,0.18)] backdrop-blur-[2px]'
          : 'border border-[var(--menu-line-strong)] bg-[var(--menu-gold-wash)] text-[var(--menu-wine)]',
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
      {label}
    </span>
  );
}
