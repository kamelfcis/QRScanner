import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingPage, LoadingOverlay } from '@/components/shared/feedback/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders correctly', () => {
    render(<LoadingSpinner />);
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByLabelText(/loading/i)).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="md" />);
    expect(screen.getByLabelText(/loading/i)).toHaveClass('h-6', 'w-6');

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByLabelText(/loading/i)).toHaveClass('h-8', 'w-8');
  });
});

describe('LoadingPage', () => {
  it('renders a full page loading spinner', () => {
    render(<LoadingPage />);
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });
});

describe('LoadingOverlay', () => {
  it('renders a full screen overlay with loading spinner', () => {
    render(<LoadingOverlay />);
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });
});
