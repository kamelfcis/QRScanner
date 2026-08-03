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

  const validateData = (): string[] => {
    const errors: string[] = [];
    if (!editedData.categories?.length) {
      errors.push('At least one category is required.');
    }
    editedData.categories?.forEach((cat, i) => {
      if (!cat.name_en?.trim()) {
        errors.push(`Category ${i + 1}: English name is required.`);
      }
      cat.products?.forEach((prod, j) => {
        if (!prod.name_en?.trim()) {
          errors.push(`Category ${i + 1}, Product ${j + 1}: English name is required.`);
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
          <h2 className="text-xl font-bold">Extracted Data Preview</h2>
          <p className="text-sm text-muted-foreground">Review and edit the extracted menu data before importing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => {
            const errors = validateData();
            setValidationErrors(errors);
            if (errors.length === 0) onConfirm(editedData);
          }} disabled={isLoading}>
            {isLoading ? 'Importing...' : 'Confirm Import'}
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Please fix the following:</p>
          <ul className="mt-1 list-disc list-inside">
            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {editedData.confidence && (
        <Card>
          <CardContent className="flex gap-4 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Overall:</span>
              <ConfidenceBadge value={editedData.confidence.overall} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Restaurant:</span>
              <ConfidenceBadge value={editedData.confidence.restaurant} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Categories:</span>
              <ConfidenceBadge value={editedData.confidence.categories} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Products:</span>
              <ConfidenceBadge value={editedData.confidence.products} />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="restaurant" className="w-full">
        <TabsList>
          <TabsTrigger value="restaurant">Restaurant Info</TabsTrigger>
          <TabsTrigger value="categories">
            Categories ({editedData.categories?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name_en">Name (English)</Label>
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
                <Label htmlFor="primary_color">Primary Color</Label>
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
                <Label htmlFor="secondary_color">Secondary Color</Label>
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
              Add Category
            </Button>
          </div>

          {editedData.categories?.map((category, catIndex) => (
            <Card key={catIndex}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  Category {catIndex + 1}
                  {category.confidence !== undefined && (
                    <ConfidenceBadge value={category.confidence} />
                  )}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => removeCategory(catIndex)} aria-label="Remove category">
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
                  <h4 className="font-medium">Products ({category.products.length})</h4>
                  <Button variant="outline" size="sm" onClick={() => addProduct(catIndex)}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Product
                  </Button>
                </div>

                <div className="space-y-3">
                  {category.products.map((product, prodIndex) => (
                    <div key={prodIndex} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">Product {prodIndex + 1}</span>
                        <div className="flex items-center gap-2">
                          {product.confidence !== undefined && (
                            <ConfidenceBadge value={product.confidence} />
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeProduct(catIndex, prodIndex)} aria-label="Remove product">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          placeholder="Product name (English)"
                          aria-label="Product name (English)"
                          value={product.name_en}
                          onChange={(e) => updateProduct(catIndex, prodIndex, 'name_en', e.target.value)}
                        />
                        <Input
                          placeholder="Product name (Arabic)"
                          aria-label="Product name (Arabic)"
                          dir="rtl"
                          value={product.name_ar || ''}
                          onChange={(e) => updateProduct(catIndex, prodIndex, 'name_ar', e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Dining price"
                          aria-label="Dining price"
                          value={product.dining_price || ''}
                          onChange={(e) =>
                            updateProduct(catIndex, prodIndex, 'dining_price', parseFloat(e.target.value) || 0)
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Takeaway price"
                          aria-label="Takeaway price"
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
