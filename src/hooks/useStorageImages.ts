'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { listStorageImages, type StorageBucket } from '@/lib/upload';

export const storageImageKeys = {
  all: ['storage-images'] as const,
  bucket: (bucket: StorageBucket) => [...storageImageKeys.all, bucket] as const,
};

export function useStorageImages(bucket: StorageBucket, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: storageImageKeys.bucket(bucket),
    queryFn: ({ pageParam = 0 }) => listStorageImages(bucket, { offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((count, page) => count + page.items.length, 0);
    },
    enabled,
  });
}
