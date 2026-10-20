import { isOstolHost, isOstolTenant } from '@/lib/tenant-config';

/**
 * 58mm ZYQ receipts for Ostol.
 * Production still ships a stale NEXT_PUBLIC_TENANT, so the host check is required.
 * Mazen and ala-keefak do not match either flag.
 */
export const isOstolThermalReceipt = isOstolTenant || isOstolHost;

export const RECEIPT_WIDTH_MM = isOstolThermalReceipt ? 58 : 80;
export const RECEIPT_PAGE_MARGIN_MM = isOstolThermalReceipt ? 2 : 4;

export function receiptDomId(orderId: string): string {
  return `order-receipt-${orderId}`;
}

export function kitchenDomId(orderId: string): string {
  return `kitchen-ticket-${orderId}`;
}

export function receiptPdfFilename(orderNumber: string): string {
  const safe = orderNumber.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return `receipt-${safe || 'order'}.pdf`;
}

const STANDARD_PRINT_PAGE_CSS = `
@page { size: 80mm auto; margin: 4mm; }
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

const STANDARD_SLIP_CSS = `
.order-receipt-slip {
  box-sizing: border-box;
  width: 80mm;
  max-width: 80mm;
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
.order-receipt-slip .receipt-phone {
  direction: ltr;
  unicode-bidi: plaintext;
  text-align: left;
}
.order-receipt-slip .receipt-payment {
  margin-top: 6px;
  font-size: 11px;
}
`;

const OSTOL_PRINT_PAGE_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap");
@page { size: 58mm auto; margin: 2mm; }
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #000;
  direction: ltr;
}
body {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
`;

const OSTOL_SLIP_CSS = `
.order-receipt-slip {
  box-sizing: border-box;
  width: 58mm;
  max-width: 58mm;
  padding: 2mm 0 3mm;
  background: #ffffff;
  color: #000;
  direction: ltr;
  font-family: "Cairo", "Segoe UI", Tahoma, Arial, sans-serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}
.order-receipt-slip *,
.order-receipt-slip *::before,
.order-receipt-slip *::after {
  box-sizing: border-box;
  color: #000;
}
.order-receipt-slip .receipt-logo {
  display: block;
  width: 38mm;
  height: auto;
  max-height: 28mm;
  margin: 0 auto 2mm;
  object-fit: contain;
  filter: grayscale(1) contrast(2);
}
.order-receipt-slip .receipt-shop {
  margin: 0;
  text-align: center;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}
.order-receipt-slip .receipt-meta {
  margin: 2px 0 0;
  text-align: center;
  color: #000;
  font-size: 13px;
  font-weight: 700;
}
.order-receipt-slip .receipt-rule {
  border: 0;
  border-top: 1px solid #000;
  margin: 6px 0;
}
.order-receipt-slip .receipt-rule-double {
  border: 0;
  border-top: 2px solid #000;
  margin: 6px 0;
}
.order-receipt-slip .receipt-line {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  margin: 0 0 2px;
}
.order-receipt-slip .receipt-line td {
  vertical-align: baseline;
  padding: 0;
  font-size: 15px;
  font-weight: 700;
  color: #000;
}
.order-receipt-slip .receipt-line td:first-child {
  text-align: start;
  overflow-wrap: break-word;
  padding-inline-end: 2mm;
}
.order-receipt-slip .receipt-line td:last-child {
  width: 1%;
  text-align: right;
  direction: ltr;
  white-space: nowrap;
}
.order-receipt-slip .receipt-row {
  display: table;
  width: 100%;
  table-layout: auto;
  border-collapse: collapse;
  margin: 0 0 2px;
}
.order-receipt-slip .receipt-row > * {
  display: table-cell;
  vertical-align: baseline;
  font-size: 15px;
  font-weight: 700;
}
.order-receipt-slip .receipt-row > :first-child {
  text-align: start;
  overflow-wrap: break-word;
}
.order-receipt-slip .receipt-row > :last-child {
  width: 1%;
  text-align: right;
  direction: ltr;
  white-space: nowrap;
}
.order-receipt-slip .receipt-num {
  font-family: "Cairo", "Segoe UI", Tahoma, Arial, sans-serif;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  direction: ltr;
  unicode-bidi: isolate;
  white-space: nowrap;
}
.order-receipt-slip .receipt-order {
  margin: 0;
  text-align: center;
  font-family: "Cairo", "Segoe UI", Tahoma, Arial, sans-serif;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.04em;
}
.order-receipt-slip .receipt-item-name {
  font-size: 15px;
  font-weight: 700;
}
.order-receipt-slip .receipt-note {
  display: block;
  margin-top: 1px;
  color: #000;
  font-size: 13px;
  font-weight: 700;
}
.order-receipt-slip .receipt-unit {
  margin: 0 0 2px;
  text-align: right;
  direction: ltr;
  font-size: 13px;
  font-weight: 700;
}
.order-receipt-slip .receipt-total-label,
.order-receipt-slip .receipt-total-value {
  font-size: 16px;
  font-weight: 700;
}
.order-receipt-slip .receipt-thanks {
  margin: 8px 0 0;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
}
.order-receipt-slip .receipt-dots {
  margin: 4px 0 0;
  text-align: center;
  color: #000;
  letter-spacing: 0.35em;
}
.order-receipt-slip .receipt-phone {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: center;
}
.order-receipt-slip .receipt-payment {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
}
`;

export const RECEIPT_PRINT_PAGE_CSS = isOstolThermalReceipt
  ? OSTOL_PRINT_PAGE_CSS
  : STANDARD_PRINT_PAGE_CSS;

export const RECEIPT_SLIP_CSS = isOstolThermalReceipt ? OSTOL_SLIP_CSS : STANDARD_SLIP_CSS;

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

async function waitForOstolFont(doc: Document): Promise<void> {
  if (!isOstolThermalReceipt || !doc.fonts?.ready) return;
  await Promise.race([
    doc.fonts.ready.catch(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 2500);
    }),
  ]);
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

  const dir = isOstolThermalReceipt ? 'ltr' : element.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr';
  const markup = isOstolThermalReceipt
    ? element.outerHTML.replace(/\sdir="rtl"/g, ' dir="ltr"')
    : element.outerHTML;
  doc.open();
  doc.write(`<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"><title>Receipt</title>
<style>${RECEIPT_PRINT_PAGE_CSS}${RECEIPT_SLIP_CSS}</style></head>
<body>${markup}</body></html>`);
  doc.close();

  if (isOstolThermalReceipt) {
    doc.documentElement.setAttribute('dir', 'ltr');
    doc.querySelectorAll<HTMLElement>('.order-receipt-slip').forEach((slip) => {
      slip.setAttribute('dir', 'ltr');
    });
  }

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') {
      resolve();
      return;
    }
    iframe.addEventListener('load', () => resolve(), { once: true });
  });
  await waitForImages(doc);
  await waitForOstolFont(doc);

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
