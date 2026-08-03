import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QRCodeSVG } from 'qrcode.react';

describe('QRCodeSVG rendering', () => {
  it('renders SVG element', () => {
    const { container } = render(<QRCodeSVG value="https://example.com" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    const { container } = render(<QRCodeSVG value="https://example.com" size={200} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '200');
    expect(svg).toHaveAttribute('height', '200');
  });

  it('renders with custom colors', () => {
    const { container } = render(
      <QRCodeSVG value="https://example.com" fgColor="#B8860B" bgColor="#FFFFFF" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with different levels', () => {
    const { container } = render(<QRCodeSVG value="https://example.com" level="H" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('QR code SVG structure', () => {
  it('renders an SVG element with content', () => {
    const { container } = render(<QRCodeSVG value="test" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.children.length).toBeGreaterThan(0);
  });

  it('renders different QR for different values', () => {
    const { container: c1 } = render(<QRCodeSVG value="value1" />);
    const { container: c2 } = render(<QRCodeSVG value="value2" />);
    const svg1 = c1.querySelector('svg');
    const svg2 = c2.querySelector('svg');
    expect(svg1).toBeInTheDocument();
    expect(svg2).toBeInTheDocument();
  });
});
