'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  requestAiProductImages,
  type AiCandidate,
  type AiProductImageMode,
} from '@/components/dashboard/products/AiProductImageDialog';

export interface ProductAiImageInput {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  image_url?: string | null;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

interface ActiveAiContext {
  product: ProductAiImageInput;
  categoryName: string;
}

export function useProductAiImage(options: {
  t: Translate;
  applyImage: (productId: string, url: string) => Promise<void>;
}) {
  const { t, applyImage } = options;
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AiProductImageMode>('generate');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiImages, setAiImages] = useState<AiCandidate[]>([]);
  const [activeContext, setActiveContext] = useState<ActiveAiContext | null>(null);

  const runGeneration = useCallback(
    async (product: ProductAiImageInput, mode: AiProductImageMode, categoryName: string) => {
      const hasName = Boolean(product.name_ar?.trim() || product.name_en?.trim());
      const hasImage = Boolean(product.image_url?.trim());
      if (mode === 'generate' && !hasName) {
        toast.error(t('aiGenerateNeedsName'));
        return;
      }
      if (mode === 'enhance' && !hasImage) {
        toast.error(t('aiEnhanceNeedsImage'));
        return;
      }

      setActiveContext({ product, categoryName });
      setAiMode(mode);
      setAiOpen(true);
      setAiBusy(true);
      setAiLoading(true);
      setAiImages([]);

      try {
        const images = await requestAiProductImages(
          mode,
          {
            name_ar: product.name_ar,
            name_en: product.name_en,
            description_ar: product.description_ar,
            description_en: product.description_en,
            category_name: categoryName,
            source_image_url: product.image_url,
          },
          t
        );
        if (images) setAiImages(images);
      } finally {
        setAiLoading(false);
        setAiBusy(false);
      }
    },
    [t]
  );

  const handleUseImage = useCallback(
    async (url: string) => {
      if (!activeContext) return;
      await applyImage(activeContext.product.id, url);
      toast.success(t('imageSaved'));
    },
    [activeContext, applyImage, t]
  );

  const regenerateActive = useCallback(() => {
    if (!activeContext) return;
    void runGeneration(activeContext.product, aiMode, activeContext.categoryName);
  }, [activeContext, aiMode, runGeneration]);

  const isProductBusy = useCallback(
    (productId: string) => aiBusy && activeContext?.product.id === productId,
    [aiBusy, activeContext]
  );

  return {
    aiOpen,
    setAiOpen,
    aiMode,
    aiLoading,
    aiImages,
    aiBusy,
    activeProductId: activeContext?.product.id ?? null,
    runGeneration,
    handleUseImage,
    regenerateActive,
    isProductBusy,
  };
}
