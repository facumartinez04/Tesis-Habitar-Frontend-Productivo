import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { HabitarLoader } from '../../ui/HabitarLoader';
import { DocxPages } from '../../ui/DocxPages';
import { PptxViewer } from '../../ui/PptxViewer';
import { isPptx, pptxText, readPptx, type PptxInfo } from '../../../../lib/pptxDocument';
import { MIN_TEXT_CHARS, openPdf, type PdfHandle } from '../../../../lib/pdfDocument';
import { extractDocumentWithPreview } from '../../../../lib/documentText';
import { cleanScannedPage, MAX_AI_PAGES, readDocumentWithAi, readingLength } from '../../../../services/aiService';
import { ApiError } from '../../../../lib/apiClient';
import { t, useI18n } from '../../../../i18n';

export interface ImportedDocument {
  name: string;
  origin: string;
  file: Blob;
  mimeType: string;
}

interface DocumentReviewModalProps {
  document: ImportedDocument | null;
  onClose: () => void;
  onUse: (text: string, label: string, pages: number[] | null) => void;
}

interface PageState {
  text: string | null;
  needsOcr: boolean;
  ocr: 'idle' | 'running' | 'done' | 'error';
  progress: number;
  /** Lo que leyó el OCR sin filtrar; es lo que se le pasa a la IA. */
  raw: string;
  /** El OCR solo no alcanza: hay que ordenar la página con IA. */
  unclear: boolean;
  ai: 'idle' | 'running' | 'done' | 'error';
}

const isPdf = (doc: ImportedDocument) => doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.name);

/** Desde cuántas páginas elegidas se avisa que leer con IA puede consumir mucho. */
const AI_HEAVY_PAGES = 10;
/** Desde cuántas páginas se considera grande un documento. */
const AI_BIG_DOC_PAGES = 20;

export function DocumentReviewModal({ document: doc, onClose, onUse }: DocumentReviewModalProps) {
  const { locale } = useI18n();
  const [pdf, setPdf] = useState<PdfHandle | null>(null);
  const [pages, setPages] = useState<PageState[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [active, setActive] = useState(1);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  // Presentación de PowerPoint: el texto sale de las diapositivas elegidas (sin OCR ni IA) y se ve con su diseño.
  const [pptx, setPptx] = useState<{ data: ArrayBuffer; info: PptxInfo } | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiBlocked, setAiBlocked] = useState<string | null>(null);
  // Lectura con IA (DeepSeek) de las páginas elegidas; si no está disponible se lee con OCR en el navegador.
  const [aiRead, setAiRead] = useState(true);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [aiFallback, setAiFallback] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    let handle: PdfHandle | null = null;
    setLoading(true);
    setError(null);
    setAiRead(true);
    setReading(false);
    setReadError(null);
    setAiFallback(null);
    setPdf(null);
    setPages([]);
    setDocxHtml(null);
    setPptx(null);
    setAiBlocked(null);
    (async () => {
      try {
        if (isPptx(doc.name, doc.mimeType)) {
          const data = await doc.file.arrayBuffer();
          const info = await readPptx(data);
          if (cancelled) return;
          // Se elige de entrada todo lo que entra en el largo máximo de la lectura. Las diapositivas sin texto
          // (portadas, imágenes) quedan elegidas: no suman texto pero el alumno las tiene que ver.
          const chosen: number[] = [];
          for (const slide of info.slides) {
            if (slide.text && readingLength(pptxText(info, [...chosen, slide.n])).tooLong) break;
            chosen.push(slide.n);
          }
          setPptx({ data, info });
          setSelected(chosen.length ? chosen : [1]);
          setActive(1);
        } else if (isPdf(doc)) {
          handle = await openPdf(doc.file);
          if (cancelled) return handle.destroy();
          const initial: PageState[] = [];
          for (let n = 1; n <= handle.numPages; n += 1) {
            const pageText = await handle.pageText(n);
            initial.push({ text: pageText, needsOcr: pageText.replace(/\s/g, '').length < MIN_TEXT_CHARS, ocr: 'idle', progress: 0, raw: '', unclear: false, ai: 'idle' });
          }
          if (cancelled) return handle.destroy();
          setPdf(handle);
          setPages(initial);
          setSelected(handle.numPages <= 5 ? initial.map((_, i) => i + 1) : [1]);
          setActive(1);
        } else {
          const result = await extractDocumentWithPreview(doc.file, doc.name, doc.mimeType);
          if (cancelled) return;
          setDocxHtml(result.docxHtml ?? null);
          setText(result.text);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('No se pudo abrir el documento.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      handle?.destroy();
    };
  }, [doc]);

  useEffect(() => {
    if (!pdf || aiRead || pages.some((p) => p.ocr === 'running' || p.ai === 'running')) return;
    const next = selected.find((n) => pages[n - 1]?.needsOcr && pages[n - 1]?.ocr === 'idle');
    if (next) {
      void runOcr(next);
      return;
    }
    if (aiBlocked) return;
    const unclear = selected.find((n) => pages[n - 1]?.ocr === 'done' && pages[n - 1]?.unclear && pages[n - 1]?.ai === 'idle');
    if (unclear) void runAi(unclear);
  }, [pdf, selected, pages, aiBlocked, aiRead]);

  const updatePage = (n: number, patch: Partial<PageState>) => setPages((prev) => prev.map((p, i) => (i === n - 1 ? { ...p, ...patch } : p)));

  async function runOcr(n: number) {
    if (!pdf) return;
    updatePage(n, { ocr: 'running', progress: 0, ai: 'idle' });
    try {
      const result = await pdf.ocrPage(n, (progress) => updatePage(n, { progress }));
      const hasLetters = /[a-záéíóúñ]{3,}/i.test(result.raw);
      updatePage(n, { text: result.text, raw: result.raw, unclear: result.unclear && hasLetters, ocr: 'done', progress: 1 });
    } catch {
      updatePage(n, { ocr: 'error' });
    }
  }

  async function runAi(n: number) {
    const raw = pages[n - 1]?.raw;
    if (!raw) return;
    updatePage(n, { ai: 'running' });
    try {
      const result = await cleanScannedPage(raw, locale);
      updatePage(n, result.legible ? { text: result.text, ai: 'done' } : { ai: 'done', unclear: true });
    } catch (err) {
      updatePage(n, { ai: 'error' });
      // Sin IA o sin presupuesto no tiene sentido seguir probando con las otras páginas.
      if (err instanceof ApiError && (err.status === 409 || err.status === 423)) setAiBlocked(err.message);
    }
  }

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
    if (pdf) setText(pdfText);
  }, [pdf, pdfText]);
  useEffect(() => {
    if (pptx) setText(pptxText(pptx.info, selected));
  }, [pptx, selected]);

  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.document.addEventListener('keydown', onKey);
    return () => window.document.removeEventListener('keydown', onKey);
  }, [doc, onClose]);

  if (!doc) return null;

  const length = readingLength(text);
  const words = length.words;
  const valid = length.valid;
  const ocrRunning = pages.find((p) => p.ocr === 'running');
  const aiRunning = pages.find((p) => p.ai === 'running');
  const aiCleaned = selected.filter((n) => pages[n - 1]?.ai === 'done' && !pages[n - 1]?.unclear).sort((a, b) => a - b);
  const unreadable = selected.filter((n) => pages[n - 1]?.ai === 'done' && pages[n - 1]?.unclear).sort((a, b) => a - b);
  const activePage = pages[active - 1];

  function togglePage(n: number) {
    setReadError(null);
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  // Con IA se leen las páginas elegidas; sin IA (o si falla) se usa el texto que armó el navegador.
  const aiMode = Boolean(pdf) && aiRead;
  const tooManyPages = aiMode && selected.length > MAX_AI_PAGES;
  const heavy = aiMode && selected.length >= AI_HEAVY_PAGES;
  const bigDoc = aiMode && Boolean(pdf) && (pdf?.numPages ?? 0) > AI_BIG_DOC_PAGES;

  // Páginas (PDF) o diapositivas (PowerPoint) del documento.
  const count = pdf?.numPages ?? pptx?.info.slides.length ?? 0;
  const paged = Boolean(pdf) || Boolean(pptx);

  async function handleUse() {
    if (!doc) return;
    const chosen = paged ? selected.slice().sort((a, b) => a - b) : null;
    const label = chosen ? `${doc.name} (${pptx ? 'diaps.' : 'págs.'} ${chosen.join(', ')})` : doc.name;
    const partial = chosen && chosen.length < count ? chosen : null;
    if (!aiMode || !chosen) {
      onUse(text, label, partial);
      return;
    }
    setReading(true);
    setReadError(null);
    try {
      const result = await readDocumentWithAi(doc.file, chosen);
      if (!result.legible) {
        setReadError(t('La IA no encontró texto de lectura en esas páginas. Probá con otras páginas.'));
        return;
      }
      const len = readingLength(result.text);
      if (!len.valid) {
        setReadError(
          len.tooShort
            ? t('El texto leído tiene {words} palabras y hacen falta al menos 40. Elegí más páginas.', { words: len.words })
            : t('El texto leído supera los {max} caracteres que permite tu institución. Elegí menos páginas.', { max: len.maxChars }),
        );
        return;
      }
      onUse(result.text, label, partial);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setReadError(err.message);
      } else {
        // Sin IA, sin presupuesto o error del servicio: se leen las páginas con OCR en el navegador.
        setAiFallback(err instanceof ApiError && (err.status === 409 || err.status === 423) ? `${err.message} ${t('Se leen las páginas con OCR en tu navegador.')}` : t('La IA no pudo leer el documento. Se leen las páginas con OCR en tu navegador.'));
        setAiRead(false);
      }
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-label={t('Revisar documento')}>
      <div className="bg-card-bg border border-gray-border rounded-2xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-text-pri truncate">{doc.name}</div>
            <div className="text-[11.5px] text-text-sec">
              {doc.origin}
              {pdf && t(' · {numPages} {value} · elegí las que tienen la lectura', { numPages: pdf.numPages, value: pdf.numPages === 1 ? t('página') : t('páginas') })}
              {pptx && t(' · {numPages} {value} · elegí las que tienen la lectura', { numPages: pptx.info.slides.length, value: pptx.info.slides.length === 1 ? t('diapositiva') : t('diapositivas') })}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Cerrar')} title={t('Cerrar')} className="text-text-ter hover:text-text-pri p-1.5 rounded-lg cursor-pointer">
            <Icon name="close" size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><HabitarLoader size="md" message={t('Abriendo el documento…')} /></div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-sm text-red bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-md text-center">{error}</div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            {pdf && (
              <div className="lg:w-[150px] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-border overflow-x-auto lg:overflow-y-auto flex lg:flex-col gap-2 p-3">
                {pages.map((p, i) => {
                  const n = i + 1;
                  const isSelected = selected.includes(n);
                  return (
                    <div key={n} className={`shrink-0 rounded-xl border-2 p-1.5 transition-colors ${active === n ? 'border-emerald-500' : 'border-transparent'}`}>
                      <button type="button" onClick={() => setActive(n)} className="block cursor-pointer" aria-label={t('Ver página {n}', { n })}>
                        <PageCanvas pdf={pdf} page={n} width={104} />
                      </button>
                      <label className="flex items-center gap-1.5 mt-1.5 text-[11px] text-text-pri cursor-pointer">
                        <input type="checkbox" checked={isSelected} onChange={() => togglePage(n)} className="accent-emerald-600" />
                        {t('Pág. {n}', { n })}
                        {aiMode ? null : p.ai === 'done' && !p.unclear ? (
                          <span className="ml-auto text-[9.5px] font-bold uppercase text-emerald-700 dark:text-emerald-300" title={t('La IA ordenó el texto que leyó el OCR')}>
                            {t('IA')}
                          </span>
                        ) : (
                          p.needsOcr && (
                            <span className="ml-auto text-[9.5px] font-bold uppercase text-amber-700 dark:text-amber-300" title={t('Página escaneada: se lee con OCR')}>
                              OCR
                            </span>
                          )
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            {pptx && (
              <div className="lg:w-[170px] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-border overflow-x-auto lg:overflow-y-auto flex lg:flex-col gap-1.5 p-3">
                {pptx.info.slides.map((slide) => (
                  <div
                    key={slide.n}
                    className={`shrink-0 w-[150px] lg:w-auto rounded-xl border-2 px-2 py-1.5 transition-colors ${active === slide.n ? 'border-emerald-500' : 'border-transparent'}`}
                  >
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-text-pri cursor-pointer">
                      <input type="checkbox" checked={selected.includes(slide.n)} onChange={() => togglePage(slide.n)} className="accent-emerald-600" />
                      {t('Diap. {n}', { n: slide.n })}
                    </label>
                    <button type="button" onClick={() => setActive(slide.n)} className="block w-full text-left text-[10.5px] leading-snug text-text-sec mt-1 line-clamp-2 cursor-pointer" aria-label={t('Ver diapositiva {n}', { n: slide.n })}>
                      {slide.title || t('(sin texto)')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 min-w-0 min-h-[220px] overflow-auto bg-gray-bg p-4 flex justify-center items-start">
              {pptx ? (
                <div className="w-full max-w-[960px]">
                  <PptxViewer data={pptx.data} index={active - 1} onIndexChange={(i) => setActive(i + 1)} />
                  {!selected.includes(active) && (
                    <div className="text-center mt-2">
                      <button type="button" onClick={() => togglePage(active)} className="text-[11.5px] text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer">
                        {t('+ Usar esta diapositiva')}
                      </button>
                    </div>
                  )}
                </div>
              ) : pdf ? (
                <div className="flex flex-col items-center gap-2 max-w-full min-w-0">
                  <div className="shadow-lg rounded bg-white max-w-full" data-keep-white="true">
                    <PageCanvas key={active} pdf={pdf} page={active} width={1000} fit />
                  </div>
                  <div className="flex items-center gap-2 text-[11.5px] text-text-sec">
                    <button type="button" disabled={active <= 1} onClick={() => setActive((a) => a - 1)} className="px-2 py-1 rounded-lg border border-gray-border disabled:opacity-40 cursor-pointer">‹</button>
                    {t('Página {active} de {numPages}', { active, numPages: pdf.numPages })}
                    <button type="button" disabled={active >= pdf.numPages} onClick={() => setActive((a) => a + 1)} className="px-2 py-1 rounded-lg border border-gray-border disabled:opacity-40 cursor-pointer">›</button>
                    {!selected.includes(active) && (
                      <button type="button" onClick={() => togglePage(active)} className="ml-1 text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer">
                        {t('+ Usar esta página')}
                      </button>
                    )}
                    {!aiMode && activePage?.ocr !== 'running' && activePage?.ai !== 'running' && (
                      <button type="button" onClick={() => void runOcr(active)} className="ml-1 underline cursor-pointer" title={t('Volver a leer la página como imagen')}>
                        {t('Leer con OCR')}
                      </button>
                    )}
                    {!aiMode && activePage?.ocr === 'done' && activePage.raw && activePage.ai !== 'running' && !aiBlocked && (
                      <button
                        type="button"
                        onClick={() => void runAi(active)}
                        className="ml-1 underline cursor-pointer"
                        title={t('La IA saca el ruido de las ilustraciones y corrige lo que el OCR leyó mal, sin agregar nada.')}
                      >
                        {t('Ordenar con IA')}
                      </button>
                    )}
                  </div>
                </div>
              ) : docxHtml ? (
                <div className="w-full max-w-[640px]">
                  <DocxPages html={docxHtml} />
                </div>
              ) : (
                <pre className="bg-white text-neutral-900 shadow-lg rounded w-full max-w-[640px] p-8 text-[13px] whitespace-pre-wrap font-sans" data-keep-white="true">
                  {text}
                </pre>
              )}
            </div>

            <div className="lg:w-[300px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-border flex flex-col min-h-[140px]">
              <div className="px-4 pt-3 pb-2 text-[12px] text-text-sec">
                {pdf ? t('Marcá las páginas que tienen el texto de la lectura.') : pptx ? t('Elegí las diapositivas que tienen la lectura.') : t('Revisá el documento y usalo cuando esté listo.')}
                {paged && (
                  <div className="mt-2 flex items-center gap-3 text-[11.5px] font-semibold">
                    <button
                      type="button"
                      disabled={selected.length === count}
                      onClick={() => {
                        setReadError(null);
                        setSelected(Array.from({ length: count }, (_, i) => i + 1));
                      }}
                      className="text-emerald-700 dark:text-emerald-300 underline disabled:opacity-40 disabled:no-underline cursor-pointer disabled:cursor-default"
                    >
                      {t('Seleccionar todas')}
                    </button>
                    <button
                      type="button"
                      disabled={selected.length === 0}
                      onClick={() => {
                        setReadError(null);
                        setSelected([]);
                      }}
                      className="text-text-sec underline disabled:opacity-40 disabled:no-underline cursor-pointer disabled:cursor-default"
                    >
                      {t('Quitar selección')}
                    </button>
                  </div>
                )}
              </div>
              {tooManyPages && (
                <div className="mx-4 mb-2 text-[11px] text-red">{t('Podés leer hasta {max} páginas a la vez. Desmarcá algunas.', { max: MAX_AI_PAGES })}</div>
              )}
              {!tooManyPages && heavy && (
                <div className="mx-4 mb-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 rounded-lg px-2.5 py-1.5">
                  {t('Elegiste {n} páginas: leerlas con IA puede consumir mucho. Marcá solo las páginas que tienen la lectura.', { n: selected.length })}
                </div>
              )}
              {!tooManyPages && !heavy && bigDoc && (
                <div className="mx-4 mb-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 rounded-lg px-2.5 py-1.5">
                  {t('Este documento tiene {n} páginas. Elegí cuáles leer: leerlo entero con IA puede consumir mucho.', { n: pdf?.numPages ?? 0 })}
                </div>
              )}
              {reading && (
                <div className="mx-4 mb-2 flex items-center gap-1.5 text-[11px] text-text-sec">
                  <Icon name="sparkles" size={12} className="text-emerald-600 animate-pulse" />
                  {t('La IA está leyendo las páginas elegidas…')}
                </div>
              )}
              {pptx && !text.trim() && (
                <div className="mx-4 mb-2 text-[11px] text-amber-800 dark:text-amber-300">
                  {t('Las diapositivas elegidas no tienen texto: para armar las preguntas hace falta texto que se pueda leer.')}
                </div>
              )}
              {readError && <div className="mx-4 mb-2 text-[11px] text-red">{readError}</div>}
              {aiFallback && <div className="mx-4 mb-2 text-[11px] text-amber-800 dark:text-amber-300">{aiFallback}</div>}
              {ocrRunning && (
                <div className="mx-4 mb-2 text-[11px] text-text-sec">
                  {t('Leyendo página {value} con OCR… {round}%', { value: pages.indexOf(ocrRunning) + 1, round: Math.round(ocrRunning.progress * 100) })}
                  <div className="h-1 rounded-full bg-gray-bg mt-1 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round(ocrRunning.progress * 100)}%` }} />
                  </div>
                </div>
              )}
              {aiRunning && (
                <div className="mx-4 mb-2 flex items-center gap-1.5 text-[11px] text-text-sec">
                  <Icon name="sparkles" size={12} className="text-emerald-600 animate-pulse" />
                  {t('El OCR no se entendía bien en la página {value}: la IA está ordenando el texto…', { value: pages.indexOf(aiRunning) + 1 })}
                </div>
              )}
              {aiCleaned.length > 0 && !aiRunning && (
                <div className="mx-4 mb-2 text-[11px] text-text-sec bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                  {t('La IA ordenó el texto de {pages}. Revisalo antes de usarlo: puede haber palabras que no se leían en la página.', {
                    pages: aiCleaned.length === 1 ? t('la página {n}', { n: aiCleaned[0] }) : t('las páginas {list}', { list: aiCleaned.join(', ') }),
                  })}
                </div>
              )}
              {unreadable.length > 0 && !aiRunning && (
                <div className="mx-4 mb-2 text-[11px] text-amber-800 dark:text-amber-300">
                  {t('En {pages} no se encontró texto de lectura: puede ser sólo una ilustración. Si tiene texto, copialo a mano.', {
                    pages: unreadable.length === 1 ? t('la página {n}', { n: unreadable[0] }) : t('las páginas {list}', { list: unreadable.join(', ') }),
                  })}
                </div>
              )}
              {aiBlocked && <div className="mx-4 mb-2 text-[11px] text-amber-800 dark:text-amber-300">{aiBlocked}</div>}
              {pages.some((p) => p.ai === 'error') && !aiBlocked && !aiRunning && (
                <div className="mx-4 mb-2 text-[11px] text-red">{t('La IA no pudo ordenar alguna página. Probá de nuevo con «Ordenar con IA».')}</div>
              )}
              {pages.some((p) => p.ocr === 'error') && (
                <div className="mx-4 mb-2 text-[11px] text-red">{t('No se pudo leer alguna página con OCR. Probá de nuevo con «Leer con OCR».')}</div>
              )}
              <div className="mt-auto px-4 pb-3 pt-2 flex flex-col gap-2">
                {aiMode ? (
                  <span className={`text-[11.5px] font-semibold ${selected.length === 0 || tooManyPages ? 'text-red' : 'text-text-sec'}`}>
                    {selected.length === 1 ? t('1 página elegida') : t('{n} páginas elegidas', { n: selected.length })}
                  </span>
                ) : (
                  <span className={`text-[11.5px] font-semibold ${valid ? 'text-green-mid' : 'text-red'}`}>
                    {t('{words} palabras · {chars} caracteres', { words, chars: length.chars })}{' '}{valid ? t('· listo') : length.tooShort ? t('· tiene que tener al menos 40 palabras') : t('· supera los {max} caracteres', { max: length.maxChars })}
                  </span>
                )}
                <button
                  type="button"
                  disabled={aiMode ? selected.length === 0 || tooManyPages || reading : !text.trim() || Boolean(ocrRunning) || Boolean(aiRunning)}
                  onClick={() => void handleUse()}
                  className="w-full bg-green-dark hover:opacity-90 text-white text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {reading ? t('Leyendo con IA…') : aiMode ? t('Leer y usar') : t('Usar este texto')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Dibuja una página del PDF. Con `fit` se ajusta al espacio disponible (ancho y alto) conservando la proporción,
 * así una diapositiva horizontal o una hoja vertical se ven enteras sin cortarse.
 */
function PageCanvas({ pdf, page, width, fit = false }: { pdf: PdfHandle; page: number; width: number; fit?: boolean }) {
  useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    void pdf
      .renderPage(page, canvas, width)
      .then(() => {
        if (fit) {
          // renderPage fija el tamaño en píxeles: se libera para que mande el espacio disponible.
          canvas.style.width = 'auto';
          canvas.style.height = 'auto';
        }
      })
      .catch(() => undefined);
  }, [pdf, page, width, fit]);
  return fit ? (
    <canvas ref={ref} className="block rounded bg-white max-w-full" style={{ maxHeight: 'calc(94vh - 220px)' }} />
  ) : (
    <canvas ref={ref} className="block rounded bg-white" style={{ width }} />
  );
}
