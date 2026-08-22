import { describe, it, expect } from 'vitest';
import {
  RECEIPT_PAGE_MARGIN_MM,
  RECEIPT_PRINT_PAGE_CSS,
  RECEIPT_WIDTH_MM,
  receiptDomId,
  receiptPdfFilename,
} from '@/lib/order/print-receipt';

describe('receipt helpers', () => {
  it('builds a stable DOM id from the order id', () => {
    expect(receiptDomId('abc-123')).toBe('order-receipt-abc-123');
  });

  it('sanitizes the PDF filename from the order number', () => {
    expect(receiptPdfFilename('AES-1042')).toBe('receipt-AES-1042.pdf');
    expect(receiptPdfFilename('طلب 12')).toBe('receipt-12.pdf');
    expect(receiptPdfFilename('***')).toBe('receipt-order.pdf');
  });

  it('uses an 80mm thermal page with a tight margin', () => {
    expect(RECEIPT_WIDTH_MM).toBe(80);
    expect(RECEIPT_PAGE_MARGIN_MM).toBe(4);
    expect(RECEIPT_PRINT_PAGE_CSS).toContain('size: 80mm auto');
    expect(RECEIPT_PRINT_PAGE_CSS).toContain('margin: 4mm');
  });
});
