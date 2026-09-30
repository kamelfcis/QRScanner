import { fetchThemeSettings } from '@/lib/settings/fetchRestaurantSettings';
import { DEFAULT_THEME, themeToCssVariables } from '@/lib/theme';

/** Injects DB theme as CSS variables on first paint (before BrandThemeProvider hydrates). */
export async function ServerBrandThemeStyles() {
  const theme = await fetchThemeSettings();
  const vars = themeToCssVariables({ ...DEFAULT_THEME, ...theme }, 'dark');
  const declarations = Object.entries(vars)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');

  return (
    <style
      id="brand-theme-vars"
      dangerouslySetInnerHTML={{ __html: `:root { ${declarations} }` }}
    />
  );
}
