'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Image } from '@/components/shared/Image';
import { Pencil, Trash2 } from 'lucide-react';
import type { Category, CategoryInput } from '@/types';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface CategoryCardProps {
  category: Category;
  onDelete: () => void;
  onUpdate?: (id: string, input: Partial<CategoryInput>) => void;
}

export function CategoryCard({ category, onDelete, onUpdate }: CategoryCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CategoryInput>>({
    name_en: category.name_en,
    name_ar: category.name_ar,
    description_en: category.description_en || '',
    description_ar: category.description_ar || '',
    is_visible: category.is_visible,
    sort_order: category.sort_order,
  });
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');

  const handleUpdate = () => {
    onUpdate?.(category.id, editForm);
    setEditOpen(false);
  };

  return (
    <Card className="relative overflow-hidden">
      {category.image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <Image
            src={category.image_url}
            alt={category.name_en}
            fill
            className="object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{category.name_en}</CardTitle>
            <p className="text-sm text-muted-foreground" dir="rtl">
              {category.name_ar}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {category.is_visible ? (
              <Badge variant="default" className="bg-green-500 text-white">{t('visible')}</Badge>
            ) : (
              <Badge variant="secondary">{tCommon('hidden')}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {category.description_en && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {category.description_en}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t('order', { order: String(category.sort_order) })}
          </span>
          <div className="flex items-center gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                <Pencil className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('editCategory')}</DialogTitle>
                  <DialogDescription>{t('updateCategoryDetails')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_en">{t('nameEn')}</Label>
                    <Input
                      id="name_en"
                      value={editForm.name_en || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, name_en: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_ar">{t('nameAr')}</Label>
                    <Input
                      id="name_ar"
                      dir="rtl"
                      value={editForm.name_ar || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, name_ar: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_en">{t('descriptionEn')}</Label>
                    <Textarea
                      id="description_en"
                      value={editForm.description_en || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          description_en: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_ar">{t('descriptionAr')}</Label>
                    <Textarea
                      id="description_ar"
                      dir="rtl"
                      value={editForm.description_ar || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          description_ar: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_visible">{t('visible')}</Label>
                    <Switch
                      id="is_visible"
                      checked={editForm.is_visible ?? true}
                      onCheckedChange={(checked) =>
                        setEditForm((prev) => ({ ...prev, is_visible: checked }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sort_order">{t('sortOrder')}</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      min="0"
                      value={editForm.sort_order ?? 0}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          sort_order: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>
                    {tCommon('cancel')}
                  </Button>
                  <Button onClick={handleUpdate}>{tCommon('saveChanges')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
