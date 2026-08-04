import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingPage, LoadingOverlay } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';

describe('LoadingSpinner accessibility', () => {
  it('has role="status"', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    render(<LoadingSpinner />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('has aria-label', () => {
    render(<LoadingSpinner />);
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });
});

describe('LoadingPage', () => {
  it('renders centered spinner', () => {
    const { container } = render(<LoadingPage />);
    expect(container.firstChild).toHaveClass('flex', 'min-h-[400px]');
  });
});

describe('LoadingOverlay', () => {
  it('renders full screen overlay', () => {
    const { container } = render(<LoadingOverlay />);
    expect(container.firstChild).toHaveClass('fixed', 'inset-0');
  });
});

describe('EmptyState', () => {
  it('renders default title', () => {
    render(<EmptyState />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<EmptyState icon={<span data-testid="custom-icon" />} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders default icon when no custom provided', () => {
    render(<EmptyState />);
    const icon = document.querySelector('.lucide-package-open');
    expect(icon).toBeInTheDocument();
  });

  it('action button calls onClick', () => {
    const onClick = vi.fn();
    render(<EmptyState action={{ label: 'Create', onClick }} />);
    screen.getByRole('button', { name: /create/i }).click();
    expect(onClick).toHaveBeenCalled();
  });

  it('no action button when not provided', () => {
    render(<EmptyState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('has role="alert"', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders error icon', () => {
    const { container } = render(<ErrorState />);
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('renders default title', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom description', () => {
    render(<ErrorState description="Custom desc" />);
    expect(screen.getByText('Custom desc')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<ErrorState error={new Error('Network error')} />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('retry button calls retry', () => {
    const retry = vi.fn();
    render(<ErrorState retry={retry} />);
    screen.getByRole('button', { name: /try again/i }).click();
    expect(retry).toHaveBeenCalled();
  });

  it('no retry button when not provided', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('renders title and description', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete Item"
        description="This cannot be undone"
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        onConfirm={() => {}}
      />
    );
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('confirm calls onConfirm', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        onConfirm={onConfirm}
      />
    );
    screen.getByRole('button', { name: /confirm/i }).click();
    expect(onConfirm).toHaveBeenCalled();
  });

  it('cancel calls onOpenChange with false', () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Delete"
        description="Sure?"
        onConfirm={() => {}}
      />
    );
    screen.getByRole('button', { name: /cancel/i }).click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows custom confirm label', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        confirmLabel="Yes, Delete"
        onConfirm={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeInTheDocument();
  });

  it('shows loading state with custom loadingLabel', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        loading={true}
        loadingLabel="Removing..."
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Removing...')).toBeInTheDocument();
  });

  it('default loading label is Processing...', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        loading={true}
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        loading={true}
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
