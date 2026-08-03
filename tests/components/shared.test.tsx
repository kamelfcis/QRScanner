import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';

describe('LoadingSpinner', () => {
  it('renders with aria-label', () => {
    render(<LoadingSpinner />);
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('applies sm size classes', () => {
    render(<LoadingSpinner size="sm" />);
    expect(screen.getByLabelText(/loading/i)).toHaveClass('h-4', 'w-4');
  });

  it('applies md size classes', () => {
    render(<LoadingSpinner size="md" />);
    expect(screen.getByLabelText(/loading/i)).toHaveClass('h-6', 'w-6');
  });

  it('applies lg size classes', () => {
    render(<LoadingSpinner size="lg" />);
    expect(screen.getByLabelText(/loading/i)).toHaveClass('h-8', 'w-8');
  });
});

describe('LoadingPage', () => {
  it('renders a full page loading spinner', () => {
    render(<LoadingPage />);
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders default title and description', () => {
    render(<EmptyState />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
    expect(screen.getByText('There is nothing to display yet.')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <EmptyState
        title="Custom Title"
        description="Custom description"
      />
    );
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        action={{ label: 'Add Item', onClick }}
      />
    );
    const button = screen.getByRole('button', { name: /add item/i });
    expect(button).toBeInTheDocument();
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when not provided', () => {
    render(<EmptyState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('renders default error message', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom error message', () => {
    render(<ErrorState title="Custom Error" />);
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
  });

  it('renders retry button when retry is provided', () => {
    const retry = vi.fn();
    render(<ErrorState retry={retry} />);
    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();
    button.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when retry is not provided', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('renders error message when error is provided', () => {
    const error = new Error('Network failure');
    render(<ErrorState error={error} />);
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('renders when open', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={() => {}}
      />
    );
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    );
    screen.getByRole('button', { name: /confirm/i }).click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange with false when cancel is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Confirm Action"
        description="Are you sure?"
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
        description="Are you sure?"
        confirmLabel="Delete"
        onConfirm={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
});
