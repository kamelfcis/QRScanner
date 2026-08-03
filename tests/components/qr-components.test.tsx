import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QRPreview } from '@/components/qr/QRPreview';
import { TemplateSwitcher } from '@/components/qr/TemplateSwitcher';

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt as string} {...props} />
  ),
}));

describe('QRPreview', () => {
  it('renders QR code with URL', () => {
    render(<QRPreview url="https://wardashamya.com/menu" />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with template label when showTemplateLabel is true', () => {
    render(<QRPreview url="https://example.com" template="luxury" showTemplateLabel />);
    expect(screen.getByText('Luxury')).toBeInTheDocument();
  });

  it('does not render template label by default', () => {
    render(<QRPreview url="https://example.com" template="luxury" />);
    expect(screen.queryByText('Luxury')).not.toBeInTheDocument();
  });

  it('renders download buttons when showDownload is true', () => {
    render(<QRPreview url="https://example.com" showDownload />);
    expect(screen.getByText('PNG')).toBeInTheDocument();
    expect(screen.getByText('SVG')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('Print')).toBeInTheDocument();
  });

  it('does not render download buttons by default', () => {
    render(<QRPreview url="https://example.com" />);
    expect(screen.queryByText('PNG')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<QRPreview url="https://example.com" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('TemplateSwitcher', () => {
  it('renders all 5 templates', () => {
    render(<TemplateSwitcher value="classic" onChange={() => {}} />);
    expect(screen.getByText('Classic')).toBeInTheDocument();
    expect(screen.getByText('Luxury')).toBeInTheDocument();
    expect(screen.getByText('Minimal')).toBeInTheDocument();
    expect(screen.getByText('Golden')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it('calls onChange when template is clicked', () => {
    const onChange = vi.fn();
    render(<TemplateSwitcher value="classic" onChange={onChange} />);
    screen.getByText('Luxury').click();
    expect(onChange).toHaveBeenCalledWith('luxury');
  });

  it('marks active template', () => {
    render(<TemplateSwitcher value="golden" onChange={() => {}} />);
    const goldenBtn = screen.getByLabelText('Golden template');
    expect(goldenBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
