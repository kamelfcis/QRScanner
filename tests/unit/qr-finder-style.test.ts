import { describe, expect, it } from 'vitest';
import { decorateQrFinderEyes, parseQrViewBoxSize } from '@/lib/qr/finder-style';

describe('qr finder style', () => {
  it('parses viewBox size', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 33 33');
    expect(parseQrViewBoxSize(svg)).toBe(33);
  });

  it('skips decoration for square eyes', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 33 33');
    decorateQrFinderEyes(svg, {
      margin: 4,
      bgColor: '#07141F',
      eyeColor: '#2DD4BF',
      pupilColor: '#0B3A42',
      eyeStyle: 'square',
    });
    expect(svg.querySelectorAll('[data-qr-finder="true"]').length).toBe(0);
  });

  it('draws mixed eyes for the Ostol template', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 33 33');
    decorateQrFinderEyes(svg, {
      margin: 4,
      bgColor: '#07141F',
      eyeColor: '#2DD4BF',
      pupilColor: '#0B3A42',
      eyeStyle: 'circle',
    });
    expect(svg.querySelectorAll('circle[data-qr-finder="true"]').length).toBe(3);
    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
  });
});
