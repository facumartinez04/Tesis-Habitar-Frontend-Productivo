/**
 * Documento original (PDF o Word) que el docente eligió en el asistente. Se guarda en el navegador (IndexedDB)
 * mientras arma la actividad, porque cada paso del asistente es una página distinta, y se sube al crearla para
 * que los alumnos lo lean tal cual.
 */
const DB = 'habitar_wizard';
const STORE = 'document';
const KEY = 'current';

export interface WizardDocument {
  name: string;
  mimeType: string;
  file: Blob;
  /** Páginas del PDF que eligió el docente; null = todas (o Word). */
  pages: number[] | null;
}

export const PDF_MIME = 'application/pdf';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Sólo el PDF y el Word se muestran como documento; un .txt ya es su texto. */
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
    // Sin IndexedDB (modo privado estricto): la actividad se crea igual y el alumno lee el texto.
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
