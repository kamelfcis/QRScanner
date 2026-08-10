'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import type { PageSizeOption } from '@/hooks/usePagination';

type PaginationProps = {
  page: number;
  totalPages: number;
  pageSize: PageSizeOption;
  pageSizeOptions: readonly PageSizeOption[];
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
  className?: string;
};

function getVisiblePages(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const t = useTranslations('dashboard');

  if (totalItems === 0) {
    return null;
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <nav
      aria-label={t('paginationLabel')}
      className={cn(
        'border-border/60 flex flex-col gap-3 border-t px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4',
        className
      )}
    >
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm">
        <p className="tabular-nums">
          {t('paginationShowingRange', { start: rangeStart, end: rangeEnd, total: totalItems })}
        </p>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">{t('paginationRowsPerPage')}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value) as PageSizeOption)}
          >
            <SelectTrigger
              className="border-border/60 h-8 w-[4.5rem]"
              aria-label={t('paginationRowsPerPage')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        <p className="text-muted-foreground text-xs tabular-nums sm:hidden">
          {t('paginationPageOf', { page, total: totalPages })}
        </p>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t('paginationPrevious')}
          >
            <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          </Button>

          <div className="hidden items-center gap-1 sm:flex">
            {visiblePages.map((visiblePage, index) =>
              visiblePage === 'ellipsis' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="text-muted-foreground px-1.5 text-sm"
                  aria-hidden
                >
                  ...
                </span>
              ) : (
                <Button
                  key={visiblePage}
                  type="button"
                  variant={visiblePage === page ? 'default' : 'outline'}
                  size="icon-sm"
                  onClick={() => onPageChange(visiblePage)}
                  aria-label={t('paginationGoToPage', { page: visiblePage })}
                  aria-current={visiblePage === page ? 'page' : undefined}
                  className="min-w-8 tabular-nums"
                >
                  {visiblePage}
                </Button>
              )
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label={t('paginationNext')}
          >
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </Button>
        </div>
      </div>
    </nav>
  );
}
