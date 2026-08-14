import {
  fetchRestaurantSettings,
  fetchThemeSettings,
} from '@/lib/settings/fetchRestaurantSettings';
import { resolveLoginBrand } from '@/lib/login/resolve-login-brand';
import { PremiumLoginTemplate } from '@/components/auth/PremiumLoginTemplate';

export default async function LoginPage() {
  const [restaurant, theme] = await Promise.all([fetchRestaurantSettings(), fetchThemeSettings()]);

  const brand = resolveLoginBrand({ restaurant, theme });

  return <PremiumLoginTemplate brand={brand} />;
}
