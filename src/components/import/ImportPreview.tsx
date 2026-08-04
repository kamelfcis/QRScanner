'use client';

import { useState } from 'react';
import type { ImportExtractedData, ImportExtractedCategory, ImportExtractedProduct } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Check, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface ImportPreviewProps {
  data: ImportExtractedData;
  onConfirm: (data: ImportExtractedData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function ConfidenceBadge({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  if (percentage >= 80) {
    return <Badge className="bg-green-500"><Check className="mr-1 h-3 w-3" />{percentage}%</Badge>;
  }
  if (percentage >= 50) {
    return <Badge className="bg-yellow-500"><AlertTriangle className="mr-1 h-3 w-3" />{percentage}%</Badge>;
  }
  return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />{percentage}%</Badge>;
}

export function ImportPreview({ data, onConfirm, onCancel, isLoading }: ImportPreviewProps) {
  const [editedData, setEditedData] = useState<ImportExtractedData>({ ...data });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const t = useTranslations('import');
  const tCommon = useTranslations('common');

  const validateData = (): string[] => {
    const errors: string[] = [];
    if (!editedData.categories?.length) {
      errors.push(t('atLeastOneCategory'));
    }
    editedData.categories?.forEach((cat, i) => {
      if (!cat.name_en?.trim()) {
        errors.push(t('englishNameRequired'));
      }
      cat.products?.forEach((prod, j) => {
        if (!prod.name_en?.trim()) {
          errors.push(t('englishNameRequired'));
        }
      });
    });
    return errors;
  };

  const updateRestaurant = (field: string, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      restaurant: { ...prev.restaurant, [field]: value },
    }));
  };

  const updateCategory = (index: number, field: string, value: string) => {
    setEditedData((prev) => {
      const categories = [...(prev.categories || [])];
      categories[index] = { ...categories[index], [field]: value };
      return { ...prev, categories };
    });
  };

  const updateProduct = (catIndex: number, prodIndex: number, field: string, value: string | number) => {
    setEditedData((prev) => {
      const categories = [...(prev.categories || [])];
      const products = [...categories[catIndex].products];
      products[prodIndex] = { ...products[prodIndex], [field]: value };
      categories[catIndex] = { ...categories[catIndex], products };
      return { ...prev, categories };
    });
  };

  const addCategory = () => {
    setEditedData((prev) => ({
      ...prev,
      categories: [
        ...(prev.categories || []),
        { name_en: '', name_ar: '', products: [], confidence: 1 },
      ],
    }));
  };

  const removeCategory = (index: number) => {
    setEditedData((prev) => ({
      ...prev,
      categories: prev.categories?.filter((_, i) => i !== index) || [],
    }));
  };

  const addProduct = (catIndex: number) => {
    setEditedData((prev) => {
      const categories = [...(prev.categories || [])];
      categories[catIndex] = {
        ...categories[catIndex],
        products: [...categories[catIndex].products, { name_en: '', name_ar: '', confidence: 1 }],
      };
      return { ...prev, categories };
    });
  };

  const removeProduct = (catIndex: number, prodIndex: number) => {
    setEditedData((prev) => {
      const categories = [...(prev.categories || [])];
      categories[catIndex] = {
        ...categories[catIndex],
        products: categories[catIndex].products.filter((_, i) => i !== prodIndex),
      };
      return { ...prev, categories };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('extractedDataPreview')}</h2>
          <p className="text-sm text-muted-foreground">{t('reviewBeforeImport')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>{tCommon('cancel')}</Button>
          <Button onClick={() => {
            const errors = validateData();
            setValidationErrors(errors);
            if (errors.length === 0) onConfirm(editedData);
          }} disabled={isLoading}>
            {isLoading ? t('importing') : t('confirmImport')}
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">{t('pleaseFix')}</p>
          <ul className="mt-1 list-disc list-inside">
            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {editedData.confidence && (
        <Card>
          <CardContent className="flex gap-4 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">{t('overall')}</span>
              <ConfidenceBadge value={editedData.confidence.overall} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">{t('restaurant')}</span>
              <ConfidenceBadge value={editedData.confidence.restaurant} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">{t('categories')}</span>
              <ConfidenceBadge value={editedData.confidence.categories} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">{t('products')}</span>
              <ConfidenceBadge value={editedData.confidence.products} />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="restaurant" className="w-full">
        <TabsList>
          <TabsTrigger value="restaurant">{t('restaurantInfo')}</TabsTrigger>
          <TabsTrigger value="categories">
            {t('categories')} ({editedData.categories?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('restaurantDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name_en">{tCommon('optional')} - Name (English)</Label>
                <Input
                  id="name_en"
                  value={editedData.restaurant?.name_en || ''}
                  onChange={(e) => updateRestaurant('name_en', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_ar">Name (Arabic)</Label>
                <Input
                  id="name_ar"
                  dir="rtl"
                  value={editedData.restaurant?.name_ar || ''}
                  onChange={(e) => updateRestaurant('name_ar', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editedData.restaurant?.phone || ''}
                  onChange={(e) => updateRestaurant('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={editedData.restaurant?.whatsapp || ''}
                  onChange={(e) => updateRestaurant('whatsapp', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={editedData.restaurant?.instagram || ''}
                  onChange={(e) => updateRestaurant('instagram', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={editedData.restaurant?.facebook || ''}
                  onChange={(e) => updateRestaurant('facebook', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_en">Address (English)</Label>
                <Textarea
                  id="address_en"
                  value={editedData.restaurant?.address_en || ''}
                  onChange={(e) => updateRestaurant('address_en', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_ar">Address (Arabic)</Label>
                <Textarea
                  id="address_ar"
                  dir="rtl"
                  value={editedData.restaurant?.address_ar || ''}
                  onChange={(e) => updateRestaurant('address_ar', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_color">{t('primaryColor')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={editedData.restaurant?.primary_color || '#B8860B'}
                    onChange={(e) => updateRestaurant('primary_color', e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={editedData.restaurant?.primary_color || ''}
                    onChange={(e) => updateRestaurant('primary_color', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color">{t('secondaryColor')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={editedData.restaurant?.secondary_color || '#8B0000'}
                    onChange={(e) => updateRestaurant('secondary_color', e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={editedData.restaurant?.secondary_color || ''}
                    onChange={(e) => updateRestaurant('secondary_color', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={addCategory}>
              <Plus className="mr-1 h-4 w-4" />
              {t('addCategory')}
            </Button>
          </div>

          {editedData.categories?.map((category, catIndex) => (
            <Card key={catIndex}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {t('categoryNumber', { number: String(catIndex + 1) })}
                  {category.confidence !== undefined && (
                    <ConfidenceBadge value={category.confidence} />
                  )}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => removeCategory(catIndex)} aria-label={t('removeCategory')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`cat-name-en-${catIndex}`}>Name (English) *</Label>
                    <Input
                      id={`cat-name-en-${catIndex}`}
                      value={category.name_en}
                      onChange={(e) => updateCategory(catIndex, 'name_en', e.target.value)}
                      aria-required="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cat-name-ar-${catIndex}`}>Name (Arabic)</Label>
                    <Input
                      id={`cat-name-ar-${catIndex}`}
                      dir="rtl"
                      value={category.name_ar || ''}
                      onChange={(e) => updateCategory(catIndex, 'name_ar', e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{t('products')} ({category.products.length})</h4>
                  <Button variant="outline" size="sm" onClick={() => addProduct(catIndex)}>
                    <Plus className="mr-1 h-3 w-3" />
                    {t('addProduct')}
                  </Button>
                </div>

                <div className="space-y-3">
                  {category.products.map((product, prodIndex) => (
                    <div key={prodIndex} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">{t('productNumber', { number: String(prodIndex + 1) })}</span>
                        <div className="flex items-center gap-2">
                          {product.confidence !== undefined && (
                            <ConfidenceBadge value={product.confidence} />
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeProduct(catIndex, prodIndex)} aria-label={t('removeProduct')}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          placeholder={t('productNameEn')}
                          aria-label={t('productNameEn')}
                          value={product.name_en}
                          onChange={(e) => updateProduct(catIndex, prodIndex, 'name_en', e.target.value)}
                        />
                        <Input
                          placeholder={t('productNameAr')}
                          aria-label={t('productNameAr')}
                          dir="rtl"
                          value={product.name_ar || ''}
                          onChange={(e) => updateProduct(catIndex, prodIndex, 'name_ar', e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder={t('diningPrice')}
                          aria-label={t('diningPrice')}
                          value={product.dining_price || ''}
                          onChange={(e) =>
                            updateProduct(catIndex, prodIndex, 'dining_price', parseFloat(e.target.value) || 0)
                          }
                        />
                        <Input
                          type="number"
                          placeholder={t('takeawayPrice')}
                          aria-label={t('takeawayPrice')}
                          value={product.takeaway_price || ''}
                          onChange={(e) =>
                            updateProduct(catIndex, prodIndex, 'takeaway_price', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
