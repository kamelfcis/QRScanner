'use client';

import { Flame, Sparkles, Star } from 'lucide-react';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/database';

type BadgeId = 'bestseller' | 'popular' | 'new' | 'spicy';

const ICONS = {
  bestseller: Star,
  popular: Star,
  new: Sparkles,
  spicy: Flame,
} as const;

/** At most two badges per card — beyond that they stop meaning anything. */
function pickBadges(product: Product): BadgeId[] {
  const badges: BadgeId[] = [];
  if (product.is_bestseller) badges.push('bestseller');
  else if (product.is_popular) badges.push('popular');
  if (product.is_new && badges.length < 2) badges.push('new');
  if (product.is_spicy && badges.length < 2) badges.push('spicy');
  return badges;
}

interface ProductBadgesProps {
  product: Product;
  /** Hide the second badge on the narrow phone grid. */
  compact?: boolean;
  className?: string;
}

export function ProductBadges({ product, compact = true, className }: ProductBadgesProps) {
  const t = useTranslations('menu');
  const badges = pickBadges(product);

  if (badges.length === 0) return null;

  return (
    <>
      {badges.map((badge, index) => {
        const Icon = ICONS[badge];
        return (
          <span
            key={badge}
            className={cn(
              'bg-aklet-grill/75 inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-semibold text-white backdrop-blur-sm',
              badge === 'bestseller' && 'text-aklet-coral',
              badge === 'spicy' && 'text-[#FF8A6B]',
              compact && index > 0 && 'hidden sm:inline-flex',
              className
            )}
          >
            <Icon className="h-2.5 w-2.5" aria-hidden />
            {t(badge)}
          </span>
        );
      })}
    </>
  );
}
