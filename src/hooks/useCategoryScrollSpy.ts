'use client';

import { useCallback, useEffect, useRef } from 'react';

interface UseCategoryScrollSpyOptions {
  categoryIds: string[];
  enabled: boolean;
  onActiveChange: (categoryId: string | null) => void;
}

/** Last heading that has reached the sticky category bar. Null when still above the menu. */
export function pickVisibleCategoryId(
  headings: HTMLElement[],
  activationLine: number,
  nearBottom: boolean
): string | null {
  if (headings.length === 0) return null;
  if (nearBottom) {
    const last = headings[headings.length - 1];
    return last?.id.replace(/^category-/, '') || null;
  }

  let current: string | null = null;
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= activationLine + 12) {
      const id = heading.id.replace(/^category-/, '');
      if (id) current = id;
    }
  }
  return current;
}

function activationLinePx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--menu-header-h').trim();
  const header = Number.parseFloat(raw);
  const headerPx = Number.isFinite(header) ? header : 64;
  return headerPx + 56;
}

function readHeadings(categoryIds: string[]): HTMLElement[] {
  const wanted = new Set(categoryIds);
  return Array.from(document.querySelectorAll<HTMLElement>('h2[id^="category-"]')).filter((el) =>
    wanted.has(el.id.replace(/^category-/, ''))
  );
}

/**
 * One observer on `#category-{id}` headings. Chip highlight follows the section
 * under the sticky bar. Tap guard ignores updates that would undo a chip jump.
 */
export function useCategoryScrollSpy({
  categoryIds,
  enabled,
  onActiveChange,
}: UseCategoryScrollSpyOptions) {
  const guardUntil = useRef(0);
  const tappedId = useRef<string | null>(null);
  const lastReported = useRef<string | null | undefined>(undefined);
  const onActiveChangeRef = useRef(onActiveChange);
  const categoryIdsRef = useRef(categoryIds);

  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
    categoryIdsRef.current = categoryIds;
  }, [onActiveChange, categoryIds]);

  const report = useCallback((next: string | null) => {
    if (lastReported.current === next) return;
    lastReported.current = next;
    onActiveChangeRef.current(next);
  }, []);

  const measure = useCallback(() => {
    const headings = readHeadings(categoryIdsRef.current);
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const nearBottom = maxScroll > 48 && window.scrollY >= maxScroll - 24;
    return pickVisibleCategoryId(headings, activationLinePx(), nearBottom);
  }, []);

  const setTapGuard = useCallback(
    (categoryId: string | null) => {
      tappedId.current = categoryId;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const phone = window.matchMedia('(max-width: 767px)').matches;
      const ms = reduce || phone ? 320 : 900;
      guardUntil.current = Date.now() + ms;
      window.setTimeout(() => {
        if (Date.now() < guardUntil.current) return;
        report(measure());
      }, ms);
    },
    [measure, report]
  );

  useEffect(() => {
    if (!enabled || categoryIds.length === 0) {
      lastReported.current = null;
      onActiveChangeRef.current(null);
      return;
    }

    let frame = 0;
    const apply = () => {
      const next = measure();
      if (Date.now() < guardUntil.current && next !== tappedId.current) return;
      if (next === tappedId.current) guardUntil.current = 0;
      report(next);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        apply();
      });
    };

    const offset = Math.round(activationLinePx());
    const observer = new IntersectionObserver(schedule, {
      root: null,
      rootMargin: `-${offset}px 0px -45% 0px`,
      threshold: [0, 0.01, 1],
    });

    for (const heading of readHeadings(categoryIds)) {
      observer.observe(heading);
    }

    schedule();

    const onScrollEnd = () => {
      const next = measure();
      if (Date.now() < guardUntil.current && next !== tappedId.current) return;
      guardUntil.current = 0;
      report(next);
    };
    window.addEventListener('scrollend', onScrollEnd);

    return () => {
      observer.disconnect();
      window.removeEventListener('scrollend', onScrollEnd);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [categoryIds, enabled, measure, report]);

  return { setTapGuard };
}
