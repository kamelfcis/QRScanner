import { ensurePdfWorkerConfigured } from './pdf-worker';

export interface TextExtractionResult {
  text: string;
  pages: number;
  method: 'pdf-text' | 'ocr';
  confidence?: number;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<TextExtractionResult> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(buffer);
  }

  if (['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
    return extractTextFromImage(buffer);
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

async function extractTextFromPDF(buffer: Buffer): Promise<TextExtractionResult> {
  ensurePdfWorkerConfigured();
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });

  try {
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();

    if (textResult.text && textResult.text.trim().length > 50) {
      return {
        text: textResult.text,
        pages: infoResult.total,
        method: 'pdf-text',
        confidence: 0.95,
      };
    }

    return extractPDFWithOcr(buffer, infoResult.total);
  } finally {
    await parser.destroy();
  }
}

async function extractPDFWithOcr(buffer: Buffer, pageCount: number): Promise<TextExtractionResult> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng+ara');

  try {
    const result = await worker.recognize(buffer);
    return {
      text: result.data.text,
      pages: pageCount,
      method: 'ocr',
      confidence: result.data.confidence / 100,
    };
  } finally {
    await worker.terminate();
  }
}

async function extractTextFromImage(buffer: Buffer): Promise<TextExtractionResult> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng+ara');

  try {
    const result = await worker.recognize(buffer);
    return {
      text: result.data.text,
      pages: 1,
      method: 'ocr',
      confidence: result.data.confidence / 100,
    };
  } finally {
    await worker.terminate();
  }
}
