import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { HabitarLoader } from '../../ui/HabitarLoader';
import { MIN_TEXT_CHARS, openPdf, type PdfHandle } from '../../../../lib/pdfDocument';
import { extractDocumentWithPreview } from '../../../../lib/documentText';
import { validateWordCount } from '../../../../services/aiService';

export interface ImportedDocument {
  name: string;
  origin: string;
  file: Blob;
  mimeType: string;
}

interface DocumentReviewModalProps {
  document: ImportedDocument | null;
  onClose: () => void;
  onUse: (text: string, label: string) => void;
}

interface PageState {
  text: string | null;
  needsOcr: boolean;
  ocr: 'idle' | 'running' | 'done' | 'error';
  progress: number;
}

const isPdf = (doc: ImportedDocument) => doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.name);

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Revisión del documento antes de usarlo: el PDF se ve página por página para elegir cuáles usar, con OCR en
 * español para las páginas escaneadas; Word y texto se ven al lado del texto que se va a usar, que es editable.
 */
export function DocumentReviewModal({ document: doc, onClose, onUse }: DocumentReviewModalProps) {
  const [pdf, setPdf] = useState<PdfHandle | null>(null);
  const [pages, setPages] = useState<PageState[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [active, setActive] = useState(1);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Abrir el documento
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    let handle: PdfHandle | null = null;
    setLoading(true);
    setError(null);
    setEdited(false);
    setPdf(null);
    setPages([]);
    setDocxHtml(null);
    (async () => {
      try {
        if (isPdf(doc)) {
          handle = await openPdf(doc.file);
          if (cancelled) return handle.destroy();
          const initial: PageState[] = [];
          for (let n = 1; n <= handle.numPages; n += 1) {
            const pageText = await handle.pageText(n);
            initial.push({ text: pageText, needsOcr: pageText.replace(/\s/g, '').length < MIN_TEXT_CHARS, ocr: 'idle', progress: 0 });
          }
          if (cancelled) return handle.destroy();
          setPdf(handle);
          setPages(initial);
          // Documento corto: todas las páginas. Largo (un libro, un cuadernillo): el docente elige.
          setSelected(handle.numPages <= 5 ? initial.map((_, i) => i + 1) : [1]);
          setActive(1);
        } else {
          const result = await extractDocumentWithPreview(doc.file, doc.name, doc.mimeType);
          if (cancelled) return;
          setDocxHtml(result.docxHtml ?? null);
          setText(result.text);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo abrir el documento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      handle?.destroy();
    };
  }, [doc]);

  // OCR automático de las páginas elegidas que son imágenes (escaneadas)
  useEffect(() => {
    if (!pdf) return;
    const next = selected.find((n) => pages[n - 1]?.needsOcr && pages[n - 1]?.ocr === 'idle');
    if (next && !pages.some((p) => p.ocr === 'running')) void runOcr(next);
  }, [pdf, selected, pages]);

  async function runOcr(n: number) {
    if (!pdf) return;
    setPages((prev) => prev.map((p, i) => (i === n - 1 ? { ...p, ocr: 'running', progress: 0 } : p)));
    try {
      const result = await pdf.ocrPage(n, (progress) =>
        setPages((prev) => prev.map((p, i) => (i === n - 1 ? { ...p, progress } : p))),
      );
      setPages((prev) => prev.map((p, i) => (i === n - 1 ? { ...p, text: result, ocr: 'done', progress: 1 } : p)));
    } catch {
      setPages((prev) => prev.map((p, i) => (i === n - 1 ? { ...p, ocr: 'error' } : p)));
    }
  }

  // Texto armado con las páginas elegidas (mientras el docente no lo edite a mano)
  const pdfText = useMemo(
    () =>
      selected
        .slice()
        .sort((a, b) => a - b)
        .map((n) => pages[n - 1]?.text ?? '')
        .filter(Boolean)
        .join('\n\n'),
    [selected, pages],
  );
  useEffect(() => {
    if (pdf && !edited) setText(pdfText);
  }, [pdf, pdfText, edited]);

  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.document.addEventListener('keydown', onKey);
    return () => window.document.removeEventListener('keydown', onKey);
  }, [doc, onClose]);

  if (!doc) return null;

  const words = countWords(text);
  const valid = validateWordCount(words);
  const ocrRunning = pages.find((p) => p.ocr === 'running');

  function togglePage(n: number) {
    setEdited(false);
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Revisar documento">
      <div className="bg-card-bg border border-gray-border rounded-2xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden">
        {/* Encabezado */}
        <div className="px-5 py-3 border-b border-gray-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-text-pri truncate">{doc.name}</div>
            <div className="text-[11.5px] text-text-sec">
              {doc.origin}
              {pdf && ` · ${pdf.numPages} ${pdf.numPages === 1 ? 'página' : 'páginas'} · elegí las que tienen la lectura`}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-text-ter hover:text-text-pri p-1.5 rounded-lg cursor-pointer">
            <Icon name="close" size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><HabitarLoader size="md" message="Abriendo el documento…" /></div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-sm text-red bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-md text-center">{error}</div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            {/* Páginas */}
            {pdf && (
              <div className="lg:w-[150px] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-border overflow-x-auto lg:overflow-y-auto flex lg:flex-col gap-2 p-3">
                {pages.map((p, i) => {
                  const n = i + 1;
                  const isSelected = selected.includes(n);
                  return (
                    <div key={n} className={`shrink-0 rounded-xl border-2 p-1.5 transition-colors ${active === n ? 'border-emerald-500' : 'border-transparent'}`}>
                      <button type="button" onClick={() => setActive(n)} className="block cursor-pointer" aria-label={`Ver página ${n}`}>
                        <PageCanvas pdf={pdf} page={n} width={104} />
                      </button>
                      <label className="flex items-center gap-1.5 mt-1.5 text-[11px] text-text-pri cursor-pointer">
                        <input type="checkbox" checked={isSelected} onChange={() => togglePage(n)} className="accent-emerald-600" />
                        Pág. {n}
                        {p.needsOcr && (
                          <span className="ml-auto text-[9.5px] font-bold uppercase text-amber-700 dark:text-amber-300" title="Página escaneada: se lee con OCR">
                            OCR
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vista previa */}
            <div className="flex-1 min-w-0 min-h-[220px] overflow-auto bg-gray-bg p-4 flex justify-center">
              {pdf ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="shadow-lg rounded bg-white" data-keep-white="true">
                    <PageCanvas key={active} pdf={pdf} page={active} width={560} />
                  </div>
                  <div className="flex items-center gap-2 text-[11.5px] text-text-sec">
                    <button type="button" disabled={active <= 1} onClick={() => setActive((a) => a - 1)} className="px-2 py-1 rounded-lg border border-gray-border disabled:opacity-40 cursor-pointer">‹</button>
                    Página {active} de {pdf.numPages}
                    <button type="button" disabled={active >= pdf.numPages} onClick={() => setActive((a) => a + 1)} className="px-2 py-1 rounded-lg border border-gray-border disabled:opacity-40 cursor-pointer">›</button>
                    {!selected.includes(active) && (
                      <button type="button" onClick={() => togglePage(active)} className="ml-1 text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer">
                        + Usar esta página
                      </button>
                    )}
                    {pages[active - 1]?.ocr !== 'running' && (
                      <button type="button" onClick={() => { setEdited(false); void runOcr(active); }} className="ml-1 underline cursor-pointer" title="Volver a leer la página como imagen">
                        Leer con OCR
                      </button>
                    )}
                  </div>
                </div>
              ) : docxHtml ? (
                <div
                  data-keep-white="true"
                  className="bg-white text-neutral-900 shadow-lg rounded w-full max-w-[640px] p-8 text-[13px] leading-relaxed [&_p]:mb-3 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              ) : (
                <pre className="bg-white text-neutral-900 shadow-lg rounded w-full max-w-[640px] p-8 text-[13px] whitespace-pre-wrap font-sans" data-keep-white="true">
                  {text}
                </pre>
              )}
            </div>

            {/* Texto que se va a usar */}
            <div className="lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-border flex flex-col min-h-[200px]">
              <div className="px-4 pt-3 pb-1.5 text-[12px] font-bold text-text-pri flex items-center justify-between">
                Texto que se va a usar
                {edited && pdf && (
                  <button type="button" onClick={() => setEdited(false)} className="text-[11px] font-semibold text-text-sec underline cursor-pointer">
                    Rearmar desde las páginas
                  </button>
                )}
              </div>
              {ocrRunning && (
                <div className="mx-4 mb-2 text-[11px] text-text-sec">
                  Leyendo página {pages.indexOf(ocrRunning) + 1} con OCR… {Math.round(ocrRunning.progress * 100)}%
                  <div className="h-1 rounded-full bg-gray-bg mt-1 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round(ocrRunning.progress * 100)}%` }} />
                  </div>
                </div>
              )}
              {pages.some((p) => p.ocr === 'error') && (
                <div className="mx-4 mb-2 text-[11px] text-red">No se pudo leer alguna página con OCR. Probá de nuevo con «Leer con OCR».</div>
              )}
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setEdited(true);
                }}
                placeholder={pdf ? 'Marcá las páginas que tienen el texto de la lectura.' : ''}
                className="flex-1 mx-4 mb-2 px-3 py-2 border border-gray-border rounded-xl text-[12.5px] leading-relaxed resize-none"
              />
              <div className="px-4 pb-3 flex items-center justify-between gap-2">
                <span className={`text-[11.5px] font-semibold ${valid ? 'text-green-mid' : 'text-red'}`}>
                  {words} palabras {valid ? '· listo' : '· tiene que tener entre 40 y 600'}
                </span>
                <button
                  type="button"
                  disabled={!text.trim() || Boolean(ocrRunning)}
                  onClick={() => onUse(text, pdf ? `${doc.name} (págs. ${selected.slice().sort((a, b) => a - b).join(', ')})` : doc.name)}
                  className="bg-green-dark hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  Usar este texto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Dibuja una página del PDF en un canvas (miniatura o vista grande). */
function PageCanvas({ pdf, page, width }: { pdf: PdfHandle; page: number; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) void pdf.renderPage(page, ref.current, width).catch(() => undefined);
  }, [pdf, page, width]);
  return <canvas ref={ref} className="block rounded bg-white" style={{ width }} />;
}
