export interface TextExtractionResult {
  text: string;
  pages: number;
  method: 'pdf-text' | 'ocr';
  confidence?: number;
}

export async function extractTextFromFile(file: File): Promise<TextExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === 'application/pdf') {
    return extractTextFromPDF(buffer);
  }

  if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return extractTextFromImage(buffer, file.type);
  }

  throw new Error(`Unsupported file type: ${file.type}`);
}

async function extractTextFromPDF(buffer: Buffer): Promise<TextExtractionResult> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
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

  return extractPDFPagesAsImages(buffer, infoResult.total);
}

async function extractPDFPagesAsImages(
  buffer: Buffer,
  pageCount: number
): Promise<TextExtractionResult> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng+ara');

  let fullText = '';
  let totalConfidence = 0;

  try {
    const result = await worker.recognize(buffer);
    fullText = result.data.text;
    totalConfidence = result.data.confidence;
  } finally {
    await worker.terminate();
  }

  return {
    text: fullText,
    pages: pageCount,
    method: 'ocr',
    confidence: totalConfidence / 100,
  };
}

async function extractTextFromImage(
  buffer: Buffer,
  mimeType: string
): Promise<TextExtractionResult> {
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
