import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileUpload } from '@/components/import/FileUpload';
import { ImportStatus } from '@/components/import/ImportStatus';
import { ImportPreview } from '@/components/import/ImportPreview';
import type { ImportJob, ImportExtractedData } from '@/types/database';

describe('FileUpload', () => {
  it('renders upload area', () => {
    render(<FileUpload onUpload={async () => {}} />);
    expect(screen.getByText(/drop your menu file/i)).toBeInTheDocument();
  });

  it('shows accepted file types', () => {
    render(<FileUpload onUpload={async () => {}} />);
    expect(screen.getByText(/PDF, PNG, JPEG, or WebP/i)).toBeInTheDocument();
  });

  it('renders file input', () => {
    render(<FileUpload onUpload={async () => {}} />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
  });

  it('has keyboard accessible drop zone', () => {
    render(<FileUpload onUpload={async () => {}} />);
    const card = screen.getByRole('button', { name: /upload menu file/i });
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('shows custom max size', () => {
    render(<FileUpload onUpload={async () => {}} maxSizeMB={10} />);
    expect(screen.getByText(/max 10MB/i)).toBeInTheDocument();
  });
});

describe('ImportStatus', () => {
  const mockJob: ImportJob = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    status: 'preview',
    file_name: 'menu.pdf',
    file_url: 'https://example.com/menu.pdf',
    file_type: 'pdf',
    file_size: 1024000,
    extracted_data: null,
    raw_text: null,
    error_message: null,
    created_by: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  it('renders file name', () => {
    render(<ImportStatus job={mockJob} onView={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('menu.pdf')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<ImportStatus job={mockJob} onView={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Ready for Review')).toBeInTheDocument();
  });

  it('renders view button for preview status', () => {
    render(<ImportStatus job={mockJob} onView={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
  });

  it('renders file size', () => {
    render(<ImportStatus job={mockJob} onView={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/MB/)).toBeInTheDocument();
  });

  it('renders error message when present', () => {
    const jobWithError = { ...mockJob, status: 'failed' as const, error_message: 'OCR failed' };
    render(<ImportStatus job={jobWithError} onView={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('OCR failed')).toBeInTheDocument();
  });

  it('does not render view button for processing status', () => {
    const processingJob = { ...mockJob, status: 'processing' as const };
    render(<ImportStatus job={processingJob} onView={() => {}} onDelete={() => {}} />);
    expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument();
  });

  it('renders delete button with aria-label', () => {
    render(<ImportStatus job={mockJob} onView={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole('button', { name: /delete import job/i })).toBeInTheDocument();
  });
});

describe('ImportPreview', () => {
  const mockData: ImportExtractedData = {
    restaurant: { name_en: 'Test Restaurant', name_ar: 'مطعم تست' },
    categories: [
      {
        name_en: 'Appetizers',
        name_ar: 'مقبلات',
        products: [
          { name_en: 'Hummus', name_ar: 'حمص', dining_price: 15, confidence: 0.9 },
        ],
        confidence: 0.85,
      },
    ],
    confidence: { overall: 0.88, restaurant: 0.9, categories: 0.85, products: 0.8 },
  };

  it('renders preview title', () => {
    render(<ImportPreview data={mockData} onConfirm={async () => {}} onCancel={() => {}} />);
    expect(screen.getByText('Extracted Data Preview')).toBeInTheDocument();
  });

  it('renders confidence scores', () => {
    render(<ImportPreview data={mockData} onConfirm={async () => {}} onCancel={() => {}} />);
    expect(screen.getByText(/Overall/)).toBeInTheDocument();
    expect(screen.getAllByText(/Restaurant/).length).toBeGreaterThan(0);
  });

  it('renders restaurant info tab', () => {
    render(<ImportPreview data={mockData} onConfirm={async () => {}} onCancel={() => {}} />);
    expect(screen.getByText('Restaurant Info')).toBeInTheDocument();
  });

  it('renders categories tab with count', () => {
    render(<ImportPreview data={mockData} onConfirm={async () => {}} onCancel={() => {}} />);
    expect(screen.getByText(/Categories \(1\)/)).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons', () => {
    render(<ImportPreview data={mockData} onConfirm={async () => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /confirm import/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders restaurant name in form', () => {
    render(<ImportPreview data={mockData} onConfirm={async () => {}} onCancel={() => {}} />);
    expect(screen.getByDisplayValue('Test Restaurant')).toBeInTheDocument();
  });

  it('renders category count in tab', () => {
    render(<ImportPreview data={mockData} onConfirm={async () => {}} onCancel={() => {}} />);
    expect(screen.getByText(/Categories \(1\)/)).toBeInTheDocument();
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<ImportPreview data={mockData} onConfirm={async () => {}} onCancel={onCancel} />);
    screen.getByRole('button', { name: /cancel/i }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when isLoading is true', () => {
    render(<ImportPreview data={mockData} onConfirm={async () => {}} onCancel={() => {}} isLoading={true} />);
    expect(screen.getByText('Importing...')).toBeInTheDocument();
  });
});
