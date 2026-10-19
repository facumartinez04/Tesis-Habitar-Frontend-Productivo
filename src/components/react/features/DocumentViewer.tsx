import { useEffect, useRef, useState } from 'react';
import { HabitarLoader } from '../ui/HabitarLoader';
import { DocxPages } from '../ui/DocxPages';
import { fetchActivityDocument, type ActivityDocumentMeta } from '../../../services/activityService';
import { openPdf, type PdfHandle } from '../../../lib/pdfDocument';

interface DocumentViewerProps {
  code: string;
  document: ActivityDocumentMeta;
  /** Si el documento no se puede abrir, la pantalla vuelve a mostrar el texto. */
  onError: () => void;
}

/** El HTML del Word se limpia antes de mostrarlo: sin scripts, sin eventos y con enlaces que abren aparte. */
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

/**
 * El documento original de la actividad, tal como lo subió el docente: el PDF página por página (sólo las que
 * eligió) y el Word con su formato e imágenes. Las páginas se dibujan a medida que el alumno llega a ellas.
 */
export function DocumentViewer({ code, document: meta, onError }: DocumentViewerProps) {
  const [pdf, setPdf] = useState<PdfHandle | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
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

  // Ancho disponible: las páginas se adaptan a la pantalla (celular o computadora).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Se mide de entrada (no hace falta esperar al primer aviso del observador) y después en cada cambio.
    setWidth(Math.floor(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pages = pdf ? (meta.pages?.filter((p) => p <= pdf.numPages) ?? Array.from({ length: pdf.numPages }, (_, i) => i + 1)) : [];

  return (
    <div ref={containerRef} className="w-full">
      {loading && (
        <div className="py-10">
          <HabitarLoader size="sm" message="Abriendo el documento…" />
        </div>
      )}
      {pdf && width > 0 && (
        <div className="space-y-3">
          {pages.map((n, i) => (
            <PdfPage key={n} pdf={pdf} page={n} width={width} label={`Página ${i + 1} de ${pages.length}`} />
          ))}
        </div>
      )}
      {html !== null && <DocxPages html={html} />}
    </div>
  );
}

/** Una página del PDF; se dibuja recién cuando está por aparecer en pantalla. */
function PdfPage({ pdf, page, width, label }: { pdf: PdfHandle; page: number; width: number; label: string }) {
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
