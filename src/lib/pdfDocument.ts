/**
 * PDF en el navegador: dibujar páginas para la vista previa, leer su texto y, si la página es una imagen
 * (escaneada), reconocerlo con OCR en español (Tesseract). Nada se sube al servidor.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { normalizeText } from './documentText';

/** Menos caracteres que esto en la capa de texto: la página es una imagen y necesita OCR. */
export const MIN_TEXT_CHARS = 40;

export interface PdfHandle {
  numPages: number;
  renderPage(pageNumber: number, canvas: HTMLCanvasElement, cssWidth: number): Promise<void>;
  pageText(pageNumber: number): Promise<string>;
  ocrPage(pageNumber: number, onProgress?: (progress: number) => void): Promise<string>;
  destroy(): void;
}

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let ocrWorker: Promise<any> | null = null;
let ocrProgress: ((p: number) => void) | undefined;

function getOcrWorker(): Promise<any> {
  if (!ocrWorker) {
    ocrWorker = import('tesseract.js')
      .then(({ createWorker }) =>
        createWorker('spa', 1, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'recognizing text') ocrProgress?.(m.progress);
          },
        }),
      )
      .catch((err) => {
        ocrWorker = null;
        throw err;
      });
  }
  return ocrWorker;
}

/** Texto de la página respetando los saltos de línea de la capa de texto del PDF. */
async function extractPageText(doc: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  let line = '';
  const lines: string[] = [];
  for (const item of content.items) {
    if (!('str' in item)) continue;
    line += item.str;
    if (item.hasEOL) {
      lines.push(line);
      line = '';
    } else if (!line.endsWith(' ')) {
      line += ' ';
    }
  }
  if (line.trim()) lines.push(line);
  return normalizeText(lines.join('\n'));
}

export async function openPdf(file: Blob): Promise<PdfHandle> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const doc = await loadingTask.promise;
  const textCache = new Map<number, string>();

  async function render(pageNumber: number, canvas: HTMLCanvasElement, cssWidth: number, ratio = window.devicePixelRatio || 1) {
    const page = await doc.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: (cssWidth / base.width) * ratio });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
    await page.render({ canvas, viewport }).promise;
  }

  return {
    numPages: doc.numPages,
    renderPage: (n, canvas, cssWidth) => render(n, canvas, cssWidth),
    async pageText(n) {
      if (!textCache.has(n)) textCache.set(n, await extractPageText(doc, n));
      return textCache.get(n)!;
    },
    async ocrPage(n, onProgress) {
      // Se dibuja a buena resolución (≈ 2000 px de ancho) para que el OCR lea bien letras chicas.
      const canvas = document.createElement('canvas');
      await render(n, canvas, 2000, 1);
      const worker = await getOcrWorker();
      ocrProgress = onProgress;
      try {
        const { data } = await worker.recognize(canvas);
        // Une las palabras cortadas con guion y las líneas cortadas a mitad de oración, como en el original.
        const raw = String(data.text ?? '')
          .replace(/-\n(?=[a-záéíóúñ])/g, '')
          .replace(/([^.!?:;\n])\n+(?=[a-záéíóúñ0-9])/g, '$1 ');
        return normalizeText(raw);
      } finally {
        ocrProgress = undefined;
      }
    },
    destroy() {
      void loadingTask.destroy();
    },
  };
}
