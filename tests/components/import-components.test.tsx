import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileUpload } from '@/components/import/FileUpload';
import { ImportPreview } from '@/components/import/ImportPreview';
import { ImportStatus } from '@/components/import/ImportStatus';
import type { ImportJob, ImportExtractedData } from '@/types/database';

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt as string} {...props} />
  ),
}));

describe('FileUpload', () => {
  it('renders upload area', () => {
    render(<FileUpload onUpload={vi.fn()} />);
    expect(screen.getByText(/Drop your menu file here/)).toBeInTheDocument();
  });

  it('shows accepted file types', () => {
    render(<FileUpload onUpload={vi.fn()} />);
    expect(screen.getByText(/PDF, PNG, JPEG, or WebP/)).toBeInTheDocument();
  });

  it('renders file input', () => {
    render(<FileUpload onUpload={vi.fn()} />);
    expect(screen.getByLabelText('Upload menu file')).toBeInTheDocument();
  });
});

describe('ImportPreview', () => {
  const mockData: ImportExtractedData = {
    restaurant: {
      name_en: 'Warda Restaurant',
      name_ar: 'مطعم وردة',
      phone: '+966501234567',
    },
    categories: [
      {
        name_en: 'Appetizers',
        name_ar: 'مقبلات',
        products: [
          { name_en: 'Hummus', name_ar: 'حمص', dining_price: 15 },
          { name_en: 'Falafel', name_ar: 'فلافل', dining_price: 12 },
        ],
      },
    ],
    confidence: { overall: 0.85, restaurant: 0.9, categories: 0.8, products: 0.75 },
  };

  it('renders preview title', () => {
    render(<ImportPreview data={mockData} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Extracted Data Preview')).toBeInTheDocument();
  });

  it('renders confidence scores', () => {
    render(<ImportPreview data={mockData} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Overall:')).toBeInTheDocument();
    expect(screen.getByText('Restaurant:')).toBeInTheDocument();
  });

  it('renders restaurant info tab', () => {
    render(<ImportPreview data={mockData} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Restaurant Info')).toBeInTheDocument();
  });

  it('renders categories tab with count', () => {
    render(<ImportPreview data={mockData} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Categories (1)')).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons', () => {
    render(<ImportPreview data={mockData} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Confirm Import')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders restaurant name in form', () => {
    render(<ImportPreview data={mockData} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByDisplayValue('Warda Restaurant')).toBeInTheDocument();
  });
});

describe('ImportStatus', () => {
  const mockJob: ImportJob = {
    id: 'test-id',
    status: 'preview',
    file_name: 'menu.pdf',
    file_url: 'https://example.com/menu.pdf',
    file_type: 'pdf',
    file_size: 1024000,
    raw_text: null,
    extracted_data: null,
    error_message: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('renders file name', () => {
    render(<ImportStatus job={mockJob} onView={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('menu.pdf')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<ImportStatus job={mockJob} onView={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Ready for Review')).toBeInTheDocument();
  });

  it('renders view button for preview status', () => {
    render(<ImportStatus job={mockJob} onView={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('renders file size', () => {
    render(<ImportStatus job={mockJob} onView={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/MB/)).toBeInTheDocument();
  });

  it('renders error message when present', () => {
    const jobWithError = { ...mockJob, status: 'failed' as const, error_message: 'AI extraction failed' };
    render(<ImportStatus job={jobWithError} onView={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('AI extraction failed')).toBeInTheDocument();
  });
});
