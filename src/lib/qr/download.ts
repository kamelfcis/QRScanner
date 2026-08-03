import { jsPDF } from 'jspdf';

export interface QRDownloadOptions {
  svgElement: SVGSVGElement | null;
  canvasElement: HTMLCanvasElement | null;
  filename: string;
  size: number;
}

export async function downloadQRAsPNG(
  svgElement: SVGSVGElement | null,
  canvasElement: HTMLCanvasElement | null,
  filename: string,
  size: number
): Promise<void> {
  if (canvasElement) {
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvasElement.toDataURL('image/png');
    link.click();
    return;
  }

  if (!svgElement) throw new Error('No QR element found');

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export function downloadQRAsSVG(
  svgElement: SVGSVGElement | null,
  filename: string
): void {
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
  size: number
): Promise<void> {
  let dataUrl: string;

  if (canvasElement) {
    dataUrl = canvasElement.toDataURL('image/png');
  } else if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, size, size);
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

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [size * 0.264583, size * 0.264583],
  });

  pdf.addImage(dataUrl, 'PNG', 0, 0, size * 0.264583, size * 0.264583);
  pdf.save(`${filename}.pdf`);
}

export async function downloadQRPrint(
  svgElement: SVGSVGElement | null,
  canvasElement: HTMLCanvasElement | null,
  filename: string,
  size: number
): Promise<void> {
  let dataUrl: string;

  if (canvasElement) {
    dataUrl = canvasElement.toDataURL('image/png');
  } else if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size * 2;
        canvas.height = size * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, size * 2, size * 2);
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
          <img src="${dataUrl}" width="${size * 2}" height="${size * 2}" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}
