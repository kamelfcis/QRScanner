import * as XLSX from 'xlsx';
import type { ExportData } from '@/types/database';

export function exportToExcel(data: ExportData): void {
  const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${data.filename}.xlsx`);
}
