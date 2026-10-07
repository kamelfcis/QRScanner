'use client';

import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProductOptionGroup, ProductOptionSelectionType } from '@/types/database';

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export type ProductOptionItemDraft = {
  clientId: string;
  id?: string;
  name_ar: string;
  name_en: string;
  price_delta: number;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
};

export type ProductOptionGroupDraft = {
  clientId: string;
  id?: string;
  name_ar: string;
  name_en: string;
  selection_type: ProductOptionSelectionType;
  min_select: number;
  max_select: number;
  is_required: boolean;
  sort_order: number;
  items: ProductOptionItemDraft[];
};

function newClientId(): string {
  return `tmp-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyOptionGroup(sortOrder: number): ProductOptionGroupDraft {
  return {
    clientId: newClientId(),
    name_ar: '',
    name_en: '',
    selection_type: 'single',
    min_select: 0,
    max_select: 1,
    is_required: false,
    sort_order: sortOrder,
    items: [emptyOptionItem(0)],
  };
}

export function emptyOptionItem(sortOrder: number): ProductOptionItemDraft {
  return {
    clientId: newClientId(),
    name_ar: '',
    name_en: '',
    price_delta: 0,
    is_default: false,
    is_available: true,
    sort_order: sortOrder,
  };
}

export function groupsFromApi(groups: ProductOptionGroup[] | undefined): ProductOptionGroupDraft[] {
  return (groups ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((group, groupIndex) => ({
      clientId: group.id,
      id: group.id,
      name_ar: group.name_ar,
      name_en: group.name_en,
      selection_type: group.selection_type,
      min_select: group.min_select,
      max_select: group.max_select,
      is_required: group.is_required,
      sort_order: groupIndex,
      items: (group.items ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item, itemIndex) => ({
          clientId: item.id,
          id: item.id,
          name_ar: item.name_ar,
          name_en: item.name_en,
          price_delta: Number(item.price_delta) || 0,
          is_default: item.is_default,
          is_available: item.is_available,
          sort_order: itemIndex,
        })),
    }));
}

export function groupsToSavePayload(groups: ProductOptionGroupDraft[]) {
  return groups.map((group, groupIndex) => ({
    id: group.id,
    name_ar: group.name_ar.trim(),
    name_en: group.name_en.trim(),
    selection_type: group.selection_type,
    min_select: group.selection_type === 'single' ? 0 : group.min_select,
    max_select: group.selection_type === 'single' ? 1 : group.max_select,
    is_required: group.is_required,
    sort_order: groupIndex,
    items: group.items.map((item, itemIndex) => ({
      id: item.id,
      name_ar: item.name_ar.trim(),
      name_en: item.name_en.trim(),
      price_delta: Number(item.price_delta) || 0,
      is_default: item.is_default,
      is_available: item.is_available,
      sort_order: itemIndex,
    })),
  }));
}

interface ProductOptionGroupsEditorProps {
  groups: ProductOptionGroupDraft[];
  onChange: (groups: ProductOptionGroupDraft[]) => void;
  currency: string;
  t: TranslateFn;
}

export function ProductOptionGroupsEditor({
  groups,
  onChange,
  currency,
  t,
}: ProductOptionGroupsEditorProps) {
  const updateGroup = (clientId: string, patch: Partial<ProductOptionGroupDraft>) => {
    onChange(
      groups.map((group) => {
        if (group.clientId !== clientId) return group;
        const next = { ...group, ...patch };
        if (patch.selection_type === 'single') {
          next.max_select = 1;
          next.min_select = Math.min(next.min_select, 1);
          next.items = next.items.map((item, index) => ({
            ...item,
            is_default: index === 0 ? item.is_default : false,
          }));
        }
        return next;
      })
    );
  };

  const removeGroup = (clientId: string) => {
    onChange(
      groups
        .filter((group) => group.clientId !== clientId)
        .map((group, index) => ({ ...group, sort_order: index }))
    );
  };

  const moveGroup = (clientId: string, direction: -1 | 1) => {
    const index = groups.findIndex((group) => group.clientId === clientId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= groups.length) return;
    const next = [...groups];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next.map((group, sortIndex) => ({ ...group, sort_order: sortIndex })));
  };

  const updateItem = (
    groupClientId: string,
    itemClientId: string,
    patch: Partial<ProductOptionItemDraft>
  ) => {
    onChange(
      groups.map((group) => {
        if (group.clientId !== groupClientId) return group;
        return {
          ...group,
          items: group.items.map((item) => {
            if (item.clientId !== itemClientId) {
              if (patch.is_default && group.selection_type === 'single') {
                return { ...item, is_default: false };
              }
              return item;
            }
            return { ...item, ...patch };
          }),
        };
      })
    );
  };

  const addItem = (groupClientId: string) => {
    onChange(
      groups.map((group) => {
        if (group.clientId !== groupClientId) return group;
        return {
          ...group,
          items: [...group.items, emptyOptionItem(group.items.length)],
        };
      })
    );
  };

  const removeItem = (groupClientId: string, itemClientId: string) => {
    onChange(
      groups.map((group) => {
        if (group.clientId !== groupClientId) return group;
        const items = group.items.filter((item) => item.clientId !== itemClientId);
        return {
          ...group,
          items: items.length ? items : [emptyOptionItem(0)],
        };
      })
    );
  };

  return (
    <div className="space-y-4 rounded-lg border border-dashed p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{t('choicesSectionTitle')}</h3>
          <p className="text-muted-foreground text-xs">{t('choicesSectionHint')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...groups, emptyOptionGroup(groups.length)])}
        >
          <Plus className="me-1 h-4 w-4" aria-hidden="true" />
          {t('addChoiceGroup')}
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('choicesEmpty')}</p>
      ) : null}

      {groups.map((group, groupIndex) => (
        <div key={group.clientId} className="bg-muted/20 space-y-3 rounded-lg border p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">
              {t('choiceGroupNumber', { number: groupIndex + 1 })}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => moveGroup(group.clientId, -1)}
                disabled={groupIndex === 0}
                aria-label={t('moveGroupUp')}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => moveGroup(group.clientId, 1)}
                disabled={groupIndex === groups.length - 1}
                aria-label={t('moveGroupDown')}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive h-8 w-8"
                onClick={() => removeGroup(group.clientId)}
                aria-label={t('removeChoiceGroup')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('choiceGroupNameAr')}</Label>
              <Input
                dir="rtl"
                value={group.name_ar}
                onChange={(e) => updateGroup(group.clientId, { name_ar: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('choiceGroupNameEn')}</Label>
              <Input
                value={group.name_en}
                onChange={(e) => updateGroup(group.clientId, { name_en: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('choiceSelectionType')}</Label>
              <Select
                value={group.selection_type}
                onValueChange={(value) =>
                  updateGroup(group.clientId, {
                    selection_type: (value as ProductOptionSelectionType) ?? 'single',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">{t('choiceSingle')}</SelectItem>
                  <SelectItem value="multi">{t('choiceMulti')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-6">
              <div className="flex items-center gap-2">
                <Switch
                  id={`required-${group.clientId}`}
                  checked={group.is_required}
                  onCheckedChange={(checked) =>
                    updateGroup(group.clientId, { is_required: checked })
                  }
                />
                <Label htmlFor={`required-${group.clientId}`}>{t('choiceRequired')}</Label>
              </div>
            </div>
          </div>

          {group.selection_type === 'multi' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('choiceMinSelect')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={group.min_select}
                  onChange={(e) =>
                    updateGroup(group.clientId, { min_select: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('choiceMaxSelect')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={group.max_select}
                  onChange={(e) =>
                    updateGroup(group.clientId, {
                      max_select: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('choiceItems')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem(group.clientId)}
              >
                <Plus className="me-1 h-3.5 w-3.5" />
                {t('addChoiceItem')}
              </Button>
            </div>

            {group.items.map((item) => (
              <div
                key={item.clientId}
                className="bg-background grid gap-2 rounded-md border p-2 sm:grid-cols-12"
              >
                <Input
                  className="sm:col-span-3"
                  dir="rtl"
                  placeholder={t('choiceItemNameAr')}
                  value={item.name_ar}
                  onChange={(e) =>
                    updateItem(group.clientId, item.clientId, { name_ar: e.target.value })
                  }
                />
                <Input
                  className="sm:col-span-3"
                  placeholder={t('choiceItemNameEn')}
                  value={item.name_en}
                  onChange={(e) =>
                    updateItem(group.clientId, item.clientId, { name_en: e.target.value })
                  }
                />
                <Input
                  className="sm:col-span-2"
                  type="number"
                  step="0.01"
                  placeholder={t('choicePriceDelta', { currency })}
                  value={item.price_delta}
                  onChange={(e) =>
                    updateItem(group.clientId, item.clientId, {
                      price_delta: Number(e.target.value) || 0,
                    })
                  }
                />
                <div className="flex items-center gap-2 sm:col-span-3">
                  <Switch
                    id={`default-${item.clientId}`}
                    checked={item.is_default}
                    onCheckedChange={(checked) =>
                      updateItem(group.clientId, item.clientId, { is_default: checked })
                    }
                  />
                  <Label htmlFor={`default-${item.clientId}`} className="text-xs">
                    {t('choiceDefault')}
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive sm:col-span-1"
                  onClick={() => removeItem(group.clientId, item.clientId)}
                  aria-label={t('removeChoiceItem')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
