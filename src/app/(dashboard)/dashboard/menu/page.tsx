'use client';

import Link from 'next/link';
import { MenuCommandHeader } from '@/components/dashboard/menu/MenuCommandHeader';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { productTerm } from '@/lib/i18n/product-terminology';
import { isEcommerceStore } from '@/lib/store-config';

function EcommerceMenuPage() {
  const tRaw = useTranslations('dashboard');
  const pt = (key: string) => productTerm(tRaw, key);
  const t = tRaw;

  const menuSections = [
    {
      titleKey: 'menuCategoriesTitle',
      descriptionKey: 'menuCategoriesDescription',
      href: '/dashboard/menu/categories',
    },
    {
      titleKey: 'menuProductsTitle',
      descriptionKey: 'menuProductsDescription',
      href: '/dashboard/menu/products',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t('menuManagement')}</h1>
        <p className="text-muted-foreground">{t('menuManagementDescription')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {menuSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle>
                  {section.titleKey === 'menuProductsTitle'
                    ? pt(section.titleKey)
                    : t(section.titleKey)}
                </CardTitle>
                <CardDescription>
                  {section.descriptionKey === 'menuProductsDescription'
                    ? pt(section.descriptionKey)
                    : t(section.descriptionKey)}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function MenuPage() {
  if (!isEcommerceStore) return <MenuCommandHeader />;
  return <EcommerceMenuPage />;
}
