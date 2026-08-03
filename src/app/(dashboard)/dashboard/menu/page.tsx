import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Settings } from 'lucide-react';

const menuSections = [
  {
    title: 'Categories',
    description: 'Manage menu categories and their order.',
    href: '/dashboard/menu/categories',
  },
  {
    title: 'Products',
    description: 'Manage menu products, prices, and availability.',
    href: '/dashboard/menu/products',
  },
];

export default function MenuPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Menu Management</h1>
        <p className="text-muted-foreground">
          Organize your menu with categories and products.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {menuSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
