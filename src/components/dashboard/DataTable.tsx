'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Table } from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import type { ExportData } from '@/types/database';
import { cn } from '@/lib/utils';

interface DataTableProps {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  filename: string;
  className?: string;
  maxRows?: number;
}

export function DataTable({ title, headers, rows, filename, className, maxRows = 50 }: DataTableProps) {
  const { exportCSV, exportExcel } = useExport();
  const displayRows = rows.slice(0, maxRows);
  const exportData: ExportData = { headers, rows, filename };

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => exportCSV(exportData)} className="h-7 text-xs">
            <Download className="mr-1 h-3 w-3" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportExcel(exportData)} className="h-7 text-xs">
            <Table className="mr-1 h-3 w-3" /> Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {headers.map((header, i) => (
                  <th key={i} className="p-2 text-left font-medium text-muted-foreground text-xs">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="p-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > maxRows && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing {maxRows} of {rows.length} rows
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
