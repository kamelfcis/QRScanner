export interface TextExtractionResult {
  text: string;
  pages: number;
  method: 'pdf-text' | 'ocr';
  confidence?: number;
}
