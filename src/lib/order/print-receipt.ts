export const RECEIPT_WIDTH_MM = 80;
export const RECEIPT_PAGE_MARGIN_MM = 4;

export function receiptDomId(orderId: string): string {
  return `order-receipt-${orderId}`;
}

export function receiptPdfFilename(orderNumber: string): string {
  const safe = orderNumber.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return `receipt-${safe || 'order'}.pdf`;
}

export const RECEIPT_PRINT_PAGE_CSS = `
@page { size: ${RECEIPT_WIDTH_MM}mm auto; margin: ${RECEIPT_PAGE_MARGIN_MM}mm; }
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #141414;
}
body {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
`;

export const RECEIPT_SLIP_CSS = `
.order-receipt-slip {
  box-sizing: border-box;
  width: ${RECEIPT_WIDTH_MM}mm;
  max-width: ${RECEIPT_WIDTH_MM}mm;
  padding: 6mm 4mm 8mm;
  background: #ffffff;
  color: #141414;
  font-family: "Segoe UI", Tahoma, "Noto Naskh Arabic", Arial, sans-serif;
  font-size: 11px;
  line-height: 1.35;
}
.order-receipt-slip *,
.order-receipt-slip *::before,
.order-receipt-slip *::after {
  box-sizing: border-box;
}
.order-receipt-slip .receipt-logo {
  display: block;
  width: 64px;
  height: 64px;
  margin: 0 auto 8px;
  object-fit: contain;
}
.order-receipt-slip .receipt-shop {
  margin: 0;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
}
.order-receipt-slip .receipt-meta {
  margin: 4px 0 0;
  text-align: center;
  color: #5c5c5c;
  font-size: 10px;
}
.order-receipt-slip .receipt-rule {
  border: 0;
  border-top: 1px dashed #1a1a1a;
  margin: 8px 0;
}
.order-receipt-slip .receipt-rule-double {
  border: 0;
  border-top: 2px dashed #141414;
  margin: 8px 0;
}
.order-receipt-slip .receipt-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}
.order-receipt-slip .receipt-num {
  font-family: ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, "Courier New", monospace;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.order-receipt-slip .receipt-order {
  margin: 0;
  text-align: center;
  font-family: ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, "Courier New", monospace;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.order-receipt-slip .receipt-item-name {
  min-width: 0;
}
.order-receipt-slip .receipt-note {
  display: block;
  margin-top: 1px;
  color: #5c5c5c;
  font-size: 10px;
}
.order-receipt-slip .receipt-total-label,
.order-receipt-slip .receipt-total-value {
  font-size: 14px;
  font-weight: 700;
}
.order-receipt-slip .receipt-thanks {
  margin: 10px 0 0;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
}
.order-receipt-slip .receipt-dots {
  margin: 6px 0 0;
  text-align: center;
  color: #5c5c5c;
  letter-spacing: 0.35em;
}
`;

function waitForImages(root: ParentNode): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  return Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    })
  ).then(() => undefined);
}

function mountUntransformedReceiptClone(element: HTMLElement): {
  host: HTMLElement;
  clone: HTMLElement;
} {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-2000px';
  host.style.top = '0';
  host.style.width = `${RECEIPT_WIDTH_MM}mm`;
  host.style.background = '#ffffff';
  host.style.transform = 'none';
  host.style.backfaceVisibility = 'visible';
  host.style.pointerEvents = 'none';

  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.style.transform = 'none';
  clone.style.backfaceVisibility = 'visible';
  host.appendChild(clone);
  document.body.appendChild(host);
  return { host, clone };
}

export async function printReceiptElement(element: HTMLElement): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'print');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error('print_unavailable');
  }

  const dir = element.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr';
  doc.open();
  doc.write(`<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"><title>Receipt</title>
<style>${RECEIPT_PRINT_PAGE_CSS}${RECEIPT_SLIP_CSS}</style></head>
<body>${element.outerHTML}</body></html>`);
  doc.close();

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') {
      resolve();
      return;
    }
    iframe.addEventListener('load', () => resolve(), { once: true });
  });
  await waitForImages(doc);

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      iframe.remove();
      resolve();
    };
    win.addEventListener('afterprint', finish, { once: true });
    win.focus();
    win.print();
    window.setTimeout(finish, 60_000);
  });
}

export async function downloadReceiptPdf(element: HTMLElement, orderNumber: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const { host, clone } = mountUntransformedReceiptClone(element);
  try {
    await waitForImages(clone);

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: clone.scrollWidth,
      windowWidth: clone.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/png');
    const pageHeightMm = Math.max((canvas.height * RECEIPT_WIDTH_MM) / canvas.width, 40);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [RECEIPT_WIDTH_MM, pageHeightMm],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, RECEIPT_WIDTH_MM, pageHeightMm);
    pdf.save(receiptPdfFilename(orderNumber));
  } finally {
    host.remove();
  }
}
