import { DEFAULT_QR_DOWNLOAD_SIZE } from './logo-overlay';

export interface QRDownloadOptions {
  svgElement: SVGSVGElement | null;
  canvasElement: HTMLCanvasElement | null;
  filename: string;
  size: number;
  targetSize?: number;
}

function triggerPngDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

function canvasToPngDataUrl(source: HTMLCanvasElement, exportSize: number): string {
  if (source.width === exportSize && source.height === exportSize) {
    return source.toDataURL('image/png');
  }

  const canvas = document.createElement('canvas');
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, exportSize, exportSize);
  return canvas.toDataURL('image/png');
}

export async function downloadQRAsPNG(
  svgElement: SVGSVGElement | null,
  canvasElement: HTMLCanvasElement | null,
  filename: string,
  size: number,
  targetSize: number = DEFAULT_QR_DOWNLOAD_SIZE
): Promise<void> {
  if (canvasElement) {
    triggerPngDownload(canvasToPngDataUrl(canvasElement, targetSize), filename);
    return;
  }

  if (!svgElement) throw new Error('No QR element found');

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, targetSize, targetSize);
        triggerPngDownload(canvas.toDataURL('image/png'), filename);
        resolve();
      } else {
        reject(new Error('Failed to get canvas context'));
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load QR image'));
    };
    img.src = url;
  });
}

export function downloadQRAsSVG(svgElement: SVGSVGElement | null, filename: string): void {
  if (!svgElement) throw new Error('No QR element found');

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const link = document.createElement('a');
  link.download = `${filename}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadQRAsPDF(
  svgElement: SVGSVGElement | null,
  canvasElement: HTMLCanvasElement | null,
  filename: string,
  size: number,
  targetSize: number = DEFAULT_QR_DOWNLOAD_SIZE
): Promise<void> {
  let dataUrl: string;

  if (canvasElement) {
    dataUrl = canvasToPngDataUrl(canvasElement, targetSize);
  } else if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, targetSize, targetSize);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load QR image'));
      };
      img.src = url;
    });
  } else {
    throw new Error('No QR element found');
  }

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [targetSize * 0.264583, targetSize * 0.264583],
  });

  pdf.addImage(dataUrl, 'PNG', 0, 0, targetSize * 0.264583, targetSize * 0.264583);
  pdf.save(`${filename}.pdf`);
}

export async function downloadQRPrint(
  svgElement: SVGSVGElement | null,
  canvasElement: HTMLCanvasElement | null,
  filename: string,
  size: number,
  targetSize: number = DEFAULT_QR_DOWNLOAD_SIZE
): Promise<void> {
  let dataUrl: string;

  if (canvasElement) {
    dataUrl = canvasToPngDataUrl(canvasElement, targetSize);
  } else if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, targetSize, targetSize);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load QR image'));
      };
      img.src = url;
    });
  } else {
    throw new Error('No QR element found');
  }

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head><title>${filename}</title></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
          <img src="${dataUrl}" width="${targetSize}" height="${targetSize}" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}
