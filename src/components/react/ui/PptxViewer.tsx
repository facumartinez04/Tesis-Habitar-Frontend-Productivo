import { useEffect, useMemo, useRef, useState } from 'react';
import { readPptx, type PptxInfo } from '../../../lib/pptxDocument';
import { t, useI18n } from '../../../i18n';

interface PptxViewerProps {
  /** Contenido del .pptx tal cual lo subió el docente. */
  data: ArrayBuffer;
  /** Diapositivas a mostrar (1 = la primera). Sin esto, todas. */
  slides?: number[] | null;
  /** Posición actual dentro de las que se muestran (0 = la primera). Sin esto, el visor la maneja solo. */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** Se llama si no se pudo leer el archivo. */
  onError?: () => void;
  maxWidth?: number;
}

// Los botones propios reemplazan a los de la librería, que se ocultan.
const HIDE_BUILT_IN = '.habitar-pptx [class*="pptx-preview-wrapper-"]{display:none!important}.habitar-pptx .pptx-preview-wrapper{box-shadow:none!important}';

/**
 * Muestra una presentación de PowerPoint en el navegador, con su diseño. El archivo no se sube a ningún servicio:
 * se dibuja acá mismo. Si el diseño no se puede dibujar, se muestra el texto de las diapositivas.
 */
export function PptxViewer({ data, slides: only, index, onIndexChange, onError, maxWidth = 960 }: PptxViewerProps) {
  useI18n();
  const [info, setInfo] = useState<PptxInfo | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [inner, setInner] = useState(0);
  const [ready, setReady] = useState(false);
  const [boxWidth, setBoxWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<{ removeCurrentSlide: () => void; renderSingleSlide: (i: number) => void; destroy: () => void } | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const order = useMemo(() => {
    if (!info) return [];
    const all = info.slides.map((s) => s.n);
    return only?.length ? only.filter((n) => n >= 1 && n <= all.length) : all;
  }, [info, only]);
  const cur = Math.min(Math.max(index ?? inner, 0), Math.max(order.length - 1, 0));
  const go = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), order.length - 1);
    if (index === undefined) setInner(clamped);
    onIndexChange?.(clamped);
  };

  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    setRenderFailed(false);
    setReady(false);
    readPptx(data)
      .then((result) => !cancelled && setInfo(result))
      .catch(() => !cancelled && onErrorRef.current?.());
    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBoxWidth(Math.floor(el.getBoundingClientRect().width / 10) * 10);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const width = Math.min(boxWidth, maxWidth);
  const height = info ? Math.round((width * info.height) / info.width) : 0;

  // Se dibuja (de nuevo) cuando cambia el archivo o el ancho disponible.
  useEffect(() => {
    const holder = holderRef.current;
    if (!info || !holder || width < 120) return;
    let cancelled = false;
    setReady(false);
    holder.innerHTML = '';
    (async () => {
      try {
        const { init } = await import('pptx-preview');
        if (cancelled) return;
        const previewer = init(holder, { width, height, mode: 'slide' });
        await previewer.preview(data.slice(0));
        if (cancelled) {
          previewer.destroy();
          return;
        }
        previewerRef.current = previewer;
        setReady(true);
      } catch {
        if (!cancelled) setRenderFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      try {
        previewerRef.current?.destroy();
      } catch {
        /* ya estaba destruido */
      }
      previewerRef.current = null;
    };
  }, [info, data, width, height]);

  // Muestra la diapositiva que corresponde.
  useEffect(() => {
    const previewer = previewerRef.current;
    const slide = order[cur];
    if (!ready || !previewer || !slide) return;
    try {
      previewer.removeCurrentSlide();
      previewer.renderSingleSlide(slide - 1);
    } catch {
      setRenderFailed(true);
    }
  }, [ready, cur, order]);

  const label = order.length ? t('Diapositiva {value} de {total}', { value: cur + 1, total: order.length }) : '';

  return (
    <div ref={boxRef} className="habitar-pptx w-full">
      <style>{HIDE_BUILT_IN}</style>
      {!info && <div className="py-10 text-center text-[12px] text-text-sec">{t('Abriendo el documento…')}</div>}
      {info && renderFailed && (
        <div className="space-y-2" data-keep-white="true">
          <div className="text-[11.5px] text-text-sec">{t('No se pudo mostrar el diseño de la presentación: se muestra el texto de cada diapositiva.')}</div>
          {order.map((n) => (
            <div key={n} className="bg-white text-neutral-900 rounded-md border border-stone-200 p-4 text-[13px] whitespace-pre-wrap">
              <div className="text-[10.5px] text-stone-400 mb-1">{t('Diapositiva {value} de {total}', { value: n, total: info.slides.length })}</div>
              {info.slides[n - 1]?.text || t('(sin texto)')}
            </div>
          ))}
        </div>
      )}
      {info && !renderFailed && (
        <div
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(cur + 1);
            if (e.key === 'ArrowLeft') go(cur - 1);
          }}
          className="outline-none"
        >
          <div className="mx-auto overflow-hidden rounded-md border border-stone-200 shadow-sm bg-white" style={{ width, height }} data-keep-white="true">
            <div ref={holderRef} style={{ width, height }} />
          </div>
          {order.length > 1 && (
            <div className="flex items-center justify-center gap-3 mt-2 text-[11.5px] text-text-sec tabular-nums">
              <button
                type="button"
                onClick={() => go(cur - 1)}
                disabled={cur <= 0}
                aria-label={t('Diapositiva anterior')} title={t('Diapositiva anterior')}
                className="px-2.5 py-1 rounded-lg border border-gray-border disabled:opacity-40 cursor-pointer disabled:cursor-default"
              >
                ‹
              </button>
              <span aria-live="polite">{label}</span>
              <button
                type="button"
                onClick={() => go(cur + 1)}
                disabled={cur >= order.length - 1}
                aria-label={t('Diapositiva siguiente')} title={t('Diapositiva siguiente')}
                className="px-2.5 py-1 rounded-lg border border-gray-border disabled:opacity-40 cursor-pointer disabled:cursor-default"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
