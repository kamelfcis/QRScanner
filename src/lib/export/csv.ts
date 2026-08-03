import type { ExportData } from '@/types/database';

export function exportToCSV(data: ExportData): void {
  const csvContent = [
    data.headers.join(','),
    ...data.rows.map((row) =>
      row.map((cell) => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${data.filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
