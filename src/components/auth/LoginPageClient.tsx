'use client';

import { useRestaurantSettings, useThemeSettings } from '@/hooks/useSettings';
import { resolveLoginBrand } from '@/lib/login/resolve-login-brand';
import { PremiumLoginTemplate } from '@/components/auth/PremiumLoginTemplate';

export function LoginPageClient() {
  const { data: restaurant, isPending: restaurantPending } = useRestaurantSettings();
  const { data: theme, isPending: themePending } = useThemeSettings();
  const brandReady = !restaurantPending && !themePending;
  const brand = resolveLoginBrand({ restaurant, theme });

  return <PremiumLoginTemplate brand={brand} brandReady={brandReady} />;
}
