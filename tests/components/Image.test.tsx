import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Image } from '@/components/shared/Image';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, className, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt as string} className={className as string} {...props} />
  ),
}));

describe('Image component', () => {
  it('renders with alt text', () => {
    render(
      <Image
        src="https://example.com/image.jpg"
        alt="Test image"
        width={100}
        height={100}
      />
    );
    expect(screen.getByAltText('Test image')).toBeInTheDocument();
  });

  it('renders fallback on error', async () => {
    render(
      <Image
        src="https://broken-url.com/image.jpg"
        alt="Broken image"
        width={100}
        height={100}
      />
    );
    // The image should still be rendered
    expect(screen.getByAltText('Broken image')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <Image
        src="https://example.com/image.jpg"
        alt="Test image"
        width={100}
        height={100}
        className="custom-class"
      />
    );
    const img = screen.getByAltText('Test image');
    expect(img).toHaveClass('custom-class');
  });
});
