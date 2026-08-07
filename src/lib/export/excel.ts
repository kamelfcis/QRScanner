import type { ExportData } from '@/types/database';

export async function exportToExcel(data: ExportData): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${data.filename}.xlsx`);
}
