import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface DocxPagesProps {
  /** HTML del Word (ya convertido y limpio). */
  html: string;
  /** Ancho máximo de la hoja en píxeles; se achica si el lugar es menor (celulares). */
  maxWidth?: number;
}

/** Proporción de una hoja A4 (297 × 210 mm) y márgenes de unos 2 cm. */
const A4_RATIO = 297 / 210;
const MARGIN_RATIO = 0.09;

/** Estilos del contenido: iguales al medir y al mostrar, para que el corte de hojas coincida. */
const CONTENT_CLASS =
  'text-neutral-900 text-[13px] leading-relaxed break-words [&_p]:mb-3 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_img]:max-w-full [&_img]:h-auto [&_img]:my-2 [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-300 [&_td]:p-1.5 [&_th]:border [&_th]:border-neutral-300 [&_th]:p-1.5 [&_a]:text-emerald-800 [&_a]:underline';

/**
 * Muestra un Word en hojas A4, como en el procesador de texto: el contenido se mide y se reparte en hojas de alto
 * fijo, cortando entre párrafos. Un bloque más alto que una hoja (una tabla larga) ocupa la suya entera.
 */
export function DocxPages({ html, maxWidth = 640 }: DocxPagesProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pages, setPages] = useState<string[] | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.min(maxWidth, Math.floor(el.getBoundingClientRect().width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxWidth]);

  const pageHeight = Math.round(width * A4_RATIO);
  const margin = Math.round(width * MARGIN_RATIO);
  const contentHeight = pageHeight - margin * 2;

  useLayoutEffect(() => {
    const box = measureRef.current;
    if (!box || width === 0) return;
    let cancelled = false;
    box.innerHTML = html;
    const images = [...box.querySelectorAll('img')];
    Promise.all(images.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined)))).then(() => {
      if (cancelled) return;
      const blocks = [...box.children] as HTMLElement[];
      const result: string[] = [];
      let current: string[] = [];
      let pageTop = 0;
      for (const block of blocks) {
        const style = getComputedStyle(block);
        const top = block.offsetTop - parseFloat(style.marginTop || '0');
        const bottom = block.offsetTop + block.offsetHeight;
        if (current.length > 0 && bottom - pageTop > contentHeight) {
          result.push(current.join(''));
          current = [];
          pageTop = top;
        }
        current.push(block.outerHTML);
      }
      if (current.length > 0 || result.length === 0) result.push(current.join(''));
      setPages(result);
    });
    return () => {
      cancelled = true;
    };
  }, [html, width, contentHeight]);

  return (
    <div ref={wrapRef} className="w-full flex flex-col items-center">
      {/* Medición: mismo ancho y estilos que el contenido de una hoja, fuera de la vista. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className={`${CONTENT_CLASS} absolute -left-[10000px] top-0 invisible`}
        style={{ width: Math.max(0, width - margin * 2) }}
      />
      {pages?.map((page, i) => (
        <figure key={i} className="m-0 mb-3 flex flex-col items-center">
          <div
            data-keep-white="true"
            className="bg-white shadow-lg rounded-sm border border-neutral-200 overflow-hidden"
            style={{ width, minHeight: pageHeight, padding: margin }}
          >
            <div className={CONTENT_CLASS} dangerouslySetInnerHTML={{ __html: page }} />
          </div>
          <figcaption className="text-[10.5px] text-stone-400 mt-1 tabular-nums">
            Página {i + 1} de {pages.length}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
