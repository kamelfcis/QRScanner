'use client';

import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export default function MenuPage() {
  const t = useTranslations('dashboard');

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
                <CardTitle>{t(section.titleKey)}</CardTitle>
                <CardDescription>{t(section.descriptionKey)}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
