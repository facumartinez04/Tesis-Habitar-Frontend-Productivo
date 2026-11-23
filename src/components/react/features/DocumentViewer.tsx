import { useEffect, useRef, useState } from 'react';
import { HabitarLoader } from '../ui/HabitarLoader';
import { DocxPages } from '../ui/DocxPages';
import { PptxViewer } from '../ui/PptxViewer';
import { ExpandButton, ReaderOverlay, ZoomControls } from '../ui/ReaderOverlay';
import { PPTX_MIME } from '../../../lib/pptxDocument';
import { fetchActivityDocument, type ActivityDocumentMeta } from '../../../services/activityService';
import { openPdf, type PdfHandle } from '../../../lib/pdfDocument';
import { t, useI18n } from '../../../i18n';

interface DocumentViewerProps {
  code: string;
  document: ActivityDocumentMeta;
  onError: () => void;
}

function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, object, embed, form, link, meta').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return doc.body.innerHTML;
}

interface DocumentBodyProps {
  pdf: PdfHandle | null;
  html: string | null;
  pptx: ArrayBuffer | null;
  slides: number[] | null;
  zoom: number;
  onError: () => void;
}

function DocumentBody({ pdf, html, pptx, slides, zoom, onError }: DocumentBodyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(Math.floor(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pages = pdf ? (slides?.filter((p) => p <= pdf.numPages) ?? Array.from({ length: pdf.numPages }, (_, i) => i + 1)) : [];

  return (
    <div ref={containerRef} className="w-full">
      {pdf && width > 0 && (
        <div className="space-y-3">
          {pages.map((n, i) => (
            <PdfPage key={n} pdf={pdf} page={n} width={width} label={t('Página {value} de {pagesCount}', { value: i + 1, pagesCount: pages.length })} />
          ))}
        </div>
      )}
      {html !== null && <DocxPages html={html} maxWidth={Math.round(640 * zoom)} />}
      {pptx && <PptxViewer data={pptx} slides={slides} onError={onError} maxWidth={Math.round(960 * zoom)} />}
    </div>
  );
}

export function DocumentViewer({ code, document: meta, onError }: DocumentViewerProps) {
  useI18n();
  const [pdf, setPdf] = useState<PdfHandle | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [pptx, setPptx] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let handle: PdfHandle | null = null;
    setLoading(true);
    (async () => {
      try {
        const blob = await fetchActivityDocument(code);
        if (meta.mimeType === 'application/pdf') {
          handle = await openPdf(blob);
          if (cancelled) return handle.destroy();
          setPdf(handle);
        } else if (meta.mimeType === PPTX_MIME) {
          const data = await blob.arrayBuffer();
          if (!cancelled) setPptx(data);
        } else {
          const mammoth = await import('mammoth');
          const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
          if (!cancelled) setHtml(sanitizeHtml(result.value));
        }
      } catch {
        if (!cancelled) onErrorRef.current();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      handle?.destroy();
    };
  }, [code, meta.mimeType]);

  const ready = !loading && (pdf !== null || html !== null || pptx !== null);
  const body = (z: number) => (
    <DocumentBody pdf={pdf} html={html} pptx={pptx} slides={meta.pages} zoom={z} onError={() => onErrorRef.current()} />
  );

  return (
    <div className="w-full">
      {loading && (
        <div className="py-10">
          <HabitarLoader size="sm" message={t('Abriendo el documento…')} />
        </div>
      )}
      {ready && (
        <div className="flex flex-wrap items-center justify-end gap-2 mb-2">
          <ZoomControls zoom={zoom} onChange={setZoom} />
          <ExpandButton onClick={() => setExpanded(true)} />
        </div>
      )}
      {ready && !expanded && (
        <div className="overflow-x-auto">
          <div style={{ width: `${zoom * 100}%` }}>{body(zoom)}</div>
        </div>
      )}
      {ready && expanded && (
        <ReaderOverlay title={meta.fileName} onClose={() => setExpanded(false)} initialZoom={1}>
          {(z) => body(z * 1.4)}
        </ReaderOverlay>
      )}
    </div>
  );
}

function PdfPage({ pdf, page, width, label }: { pdf: PdfHandle; page: number; width: number; label: string }) {
  useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { rootMargin: '600px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    let cancelled = false;
    pdf
      .renderPage(page, canvasRef.current, width)
      .then(() => !cancelled && setDrawn(true))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, pdf, page, width]);

  return (
    <figure ref={wrapRef} className="m-0">
      <div
        className={`bg-white rounded-md shadow-sm border border-stone-200 overflow-hidden ${drawn ? '' : 'animate-pulse'}`}
        style={drawn ? undefined : { minHeight: Math.round(width * 1.3) }}
        data-keep-white="true"
      >
        <canvas ref={canvasRef} role="img" aria-label={label} className="block" />
      </div>
      <figcaption className="text-[10.5px] text-stone-400 text-center mt-1 tabular-nums">{label}</figcaption>
    </figure>
  );
}
