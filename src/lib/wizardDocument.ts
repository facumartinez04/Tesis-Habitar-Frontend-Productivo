const DB = 'habitar_wizard';
const STORE = 'document';
const KEY = 'current';

export interface WizardDocument {
  name: string;
  mimeType: string;
  file: Blob;
  pages: number[] | null;
}

export const PDF_MIME = 'application/pdf';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function documentKind(name: string, mimeType: string): 'pdf' | 'docx' | null {
  if (mimeType === PDF_MIME || /\.pdf$/i.test(name)) return 'pdf';
  if (mimeType === DOCX_MIME || /\.docx$/i.test(name)) return 'docx';
  return null;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise<T | null>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export function saveWizardDocument(doc: WizardDocument): Promise<unknown> {
  return run('readwrite', (s) => s.put(doc, KEY));
}

export function loadWizardDocument(): Promise<WizardDocument | null> {
  return run<WizardDocument>('readonly', (s) => s.get(KEY));
}

export function clearWizardDocument(): Promise<unknown> {
  return run('readwrite', (s) => s.delete(KEY));
}
