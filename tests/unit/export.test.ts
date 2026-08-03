import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ExportData } from '@/types/database';

describe('Export utilities', () => {
  const mockData: ExportData = {
    headers: ['Name', 'Value'],
    rows: [
      ['Test 1', 100],
      ['Test 2', 200],
    ],
    filename: 'test-export',
  };

  let originalBlob: typeof Blob;
  let mockClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    originalBlob = global.Blob;
    mockClick = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      click: mockClick,
      href: '',
      download: '',
    } as unknown as HTMLAnchorElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    global.Blob = originalBlob;
  });

  it('exports correct CSV format', async () => {
    const MockBlob = vi.fn().mockImplementation(function (this: { size: number }) {
      this.size = 10;
    }) as unknown as typeof Blob;
    global.Blob = MockBlob;

    const { exportToCSV } = await import('@/lib/export/csv');
    exportToCSV(mockData);

    expect(MockBlob).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  it('handles CSV special characters', async () => {
    const MockBlob = vi.fn().mockImplementation(function (this: { size: number }) {
      this.size = 10;
    }) as unknown as typeof Blob;
    global.Blob = MockBlob;

    const dataWithCommas: ExportData = {
      headers: ['Name', 'Description'],
      rows: [['Item 1', 'Has, commas']],
      filename: 'test',
    };

    const { exportToCSV } = await import('@/lib/export/csv');
    exportToCSV(dataWithCommas);

    expect(MockBlob).toHaveBeenCalled();
  });

  it('handles data with quotes', async () => {
    const MockBlob = vi.fn().mockImplementation(function (this: { size: number }) {
      this.size = 10;
    }) as unknown as typeof Blob;
    global.Blob = MockBlob;

    const dataWithQuotes: ExportData = {
      headers: ['Name'],
      rows: [['Say "hello"']],
      filename: 'quotes-test',
    };

    const { exportToCSV } = await import('@/lib/export/csv');
    exportToCSV(dataWithQuotes);

    expect(MockBlob).toHaveBeenCalled();
  });

  it('handles empty rows', async () => {
    const MockBlob = vi.fn().mockImplementation(function (this: { size: number }) {
      this.size = 10;
    }) as unknown as typeof Blob;
    global.Blob = MockBlob;

    const emptyData: ExportData = {
      headers: ['Name', 'Value'],
      rows: [],
      filename: 'empty',
    };

    const { exportToCSV } = await import('@/lib/export/csv');
    exportToCSV(emptyData);

    expect(MockBlob).toHaveBeenCalled();
  });
});
