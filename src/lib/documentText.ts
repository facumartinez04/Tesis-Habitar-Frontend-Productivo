export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.docx', '.pdf'] as const;

export const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
];

const MAX_BYTES = 15 * 1024 * 1024;

function extensionOf(name: string): string {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function pdfToText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
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
    pages.push(lines.join('\n'));
  }
  return pages.join('\n\n');
}

async function docxToText(data: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return result.value;
}

export async function extractText(file: Blob, name: string, mimeType = file.type): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('El archivo es demasiado grande (más de 15 MB).');
  const ext = extensionOf(name);
  let text: string;
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    text = await pdfToText(await file.arrayBuffer());
  } else if (ext === '.docx' || mimeType === SUPPORTED_MIME_TYPES[2]) {
    text = await docxToText(await file.arrayBuffer());
  } else if (ext === '.txt' || ext === '.md' || mimeType.startsWith('text/')) {
    text = await file.text();
  } else {
    throw new Error('Formato no admitido. Usá un Google Docs, Word (.docx), PDF o texto (.txt, .md).');
  }
  const normalized = normalizeText(text);
  if (!normalized) {
    throw new Error('No se encontró texto en el archivo. Si es un PDF escaneado (una imagen), no tiene texto para leer.');
  }
  return normalized;
}

export interface DocumentPreviewData {
  text: string;
  previewType: 'pdf' | 'docx' | 'text';
  docxHtml?: string;
}

export async function extractDocumentWithPreview(
  file: Blob,
  name: string,
  mimeType = file.type,
): Promise<DocumentPreviewData> {
  const ext = extensionOf(name);
  if (ext === '.docx' || mimeType === SUPPORTED_MIME_TYPES[2]) {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const [rawTextResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer }),
      mammoth.convertToHtml({ arrayBuffer }),
    ]);
    const text = normalizeText(rawTextResult.value);
    if (!text) throw new Error('No se encontró texto en el archivo Word.');
    return {
      text,
      previewType: 'docx',
      docxHtml: htmlResult.value,
    };
  }

  const text = await extractText(file, name, mimeType);
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    return {
      text,
      previewType: 'pdf',
    };
  }

  return {
    text,
    previewType: 'text',
  };
}
