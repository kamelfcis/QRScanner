'use client';

import { Utensils, ShoppingBag, Heart, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MenuHeaderProps {
  tableParam: string | null;
  diningMode: 'dining' | 'takeaway';
  onDiningModeChange: (mode: 'dining' | 'takeaway') => void;
  onSearchOpen: () => void;
  favoriteCount: number;
}

export function MenuHeader({
  tableParam,
  diningMode,
  onDiningModeChange,
  onSearchOpen,
  favoriteCount,
}: MenuHeaderProps) {
  const { data: settings } = useRestaurantSettings();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.header
      initial={prefersReducedMotion ? undefined : { y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'sticky top-0 z-40 border-b bg-background/95 backdrop-blur',
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-primary sm:text-xl">
            {settings?.name_en || 'Warda Shamya'}
          </h1>
          {tableParam && (
            <Badge variant="secondary" className="text-xs">
              Table {tableParam}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onSearchOpen}
            aria-label="Search menu"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label={`Favorites, ${favoriteCount} items`}
          >
            <Heart className="h-5 w-5" />
            {favoriteCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {favoriteCount}
              </span>
            )}
          </Button>

          <div className="flex items-center rounded-lg border" role="group" aria-label="Dining mode">
            <Button
              variant={diningMode === 'dining' ? 'default' : 'ghost'}
              size="icon-sm"
              onClick={() => onDiningModeChange('dining')}
              aria-pressed={diningMode === 'dining'}
              className="rounded-r-none"
            >
              <Utensils className="h-4 w-4" />
            </Button>
            <Button
              variant={diningMode === 'takeaway' ? 'default' : 'ghost'}
              size="icon-sm"
              onClick={() => onDiningModeChange('takeaway')}
              aria-pressed={diningMode === 'takeaway'}
              className="rounded-l-none"
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
