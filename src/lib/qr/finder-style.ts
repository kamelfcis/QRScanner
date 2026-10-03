const DECORATION_ATTR = 'data-qr-finder';

export function parseQrViewBoxSize(svg: SVGSVGElement): number | null {
  const raw =
    svg
      .getAttribute('viewBox')
      ?.trim()
      .split(/[\s,]+/) ?? [];
  const size = Number(raw[2]);
  return Number.isFinite(size) && size > 0 ? size : null;
}

function finderPositions(numCells: number, margin: number): Array<[number, number]> {
  const dim = numCells - margin * 2;
  const finder = 7;
  return [
    [margin, margin],
    [margin + dim - finder, margin],
    [margin, margin + dim - finder],
  ];
}

function svgEl<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  el.setAttribute(DECORATION_ATTR, 'true');
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

/**
 * Cover the three finder patterns and redraw mixed/rounded eyes.
 * Coordinates are QR module units (same as qrcode.react viewBox).
 */
export function decorateQrFinderEyes(
  svg: SVGSVGElement,
  options: {
    margin: number;
    bgColor: string;
    eyeColor: string;
    pupilColor: string;
    eyeStyle: 'square' | 'rounded' | 'circle';
  }
): void {
  if (!svg.getAttribute('xmlns')) {
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  svg.querySelectorAll(`[${DECORATION_ATTR}="true"]`).forEach((node) => node.remove());

  if (options.eyeStyle === 'square') return;

  const numCells = parseQrViewBoxSize(svg);
  if (!numCells) return;

  const group = svgEl('g', { 'aria-hidden': 'true' });
  const outerRx = options.eyeStyle === 'circle' ? '3.2' : '1.35';
  const innerRx = options.eyeStyle === 'circle' ? '1.55' : '0.55';

  for (const [x, y] of finderPositions(numCells, options.margin)) {
    group.appendChild(
      svgEl('rect', {
        x: String(x),
        y: String(y),
        width: '7',
        height: '7',
        fill: options.bgColor,
      })
    );
    group.appendChild(
      svgEl('rect', {
        x: String(x + 0.35),
        y: String(y + 0.35),
        width: '6.3',
        height: '6.3',
        rx: outerRx,
        ry: outerRx,
        fill: 'none',
        stroke: options.eyeColor,
        'stroke-width': '1.05',
      })
    );
    if (options.eyeStyle === 'circle') {
      group.appendChild(
        svgEl('circle', {
          cx: String(x + 3.5),
          cy: String(y + 3.5),
          r: '1.45',
          fill: options.pupilColor,
        })
      );
    } else {
      group.appendChild(
        svgEl('rect', {
          x: String(x + 2),
          y: String(y + 2),
          width: '3',
          height: '3',
          rx: innerRx,
          ry: innerRx,
          fill: options.pupilColor,
        })
      );
    }
  }

  svg.appendChild(group);
}
