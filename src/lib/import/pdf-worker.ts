import { getData } from 'pdf-parse/worker';
import { PDFParse } from 'pdf-parse';

let configured = false;

/** Configure pdfjs worker once for server-side pdf-parse (Vercel/serverless-safe). */
export function ensurePdfWorkerConfigured(): void {
  if (configured) return;
  PDFParse.setWorker(getData());
  configured = true;
}
