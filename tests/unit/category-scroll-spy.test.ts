import { describe, expect, it } from 'vitest';
import { pickVisibleCategoryId } from '@/hooks/useCategoryScrollSpy';

function heading(id: string, top: number): HTMLElement {
  return {
    id: `category-${id}`,
    getBoundingClientRect: () => ({ top }) as DOMRect,
  } as HTMLElement;
}

describe('pickVisibleCategoryId', () => {
  const line = 120;

  it('stays on the section whose heading has passed the sticky bar', () => {
    const headings = [heading('grill', -400), heading('fry', 80), heading('salad', 900)];
    expect(pickVisibleCategoryId(headings, line, false)).toBe('fry');
  });

  it('returns null before the first heading reaches the bar', () => {
    const headings = [heading('grill', 400), heading('fry', 900)];
    expect(pickVisibleCategoryId(headings, line, false)).toBeNull();
  });

  it('selects the last section when the page is scrolled to the bottom', () => {
    const headings = [heading('grill', -800), heading('fry', -200)];
    expect(pickVisibleCategoryId(headings, line, true)).toBe('fry');
  });
});
