export function getScrollMetrics(element: HTMLElement) {
  const { scrollLeft, scrollWidth, clientWidth } = element;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);

  if (maxScroll <= 0) {
    return { canScrollStart: false, canScrollEnd: false };
  }

  const isRtl = document.documentElement.dir === 'rtl';
  let scrollPosition: number;

  if (isRtl) {
    if (scrollLeft <= 0) {
      scrollPosition = Math.abs(scrollLeft);
    } else {
      scrollPosition = maxScroll - scrollLeft;
    }
  } else {
    scrollPosition = scrollLeft;
  }

  return {
    canScrollStart: scrollPosition > 1,
    canScrollEnd: scrollPosition < maxScroll - 1,
  };
}

export function getInlineScrollDirection(): number {
  return document.documentElement.dir === 'rtl' ? -1 : 1;
}
