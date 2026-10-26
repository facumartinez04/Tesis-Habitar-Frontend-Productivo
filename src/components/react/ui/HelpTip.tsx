import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t, useI18n } from '../../../i18n';

interface HelpTipProps {
  text: string;
  title?: string;
  className?: string;
}

const MARGIN = 8;
const GAP = 8;
const HEADER_SAFE_AREA = 64;

interface Position {
  left: number;
  top: number;
  side: 'top' | 'bottom';
  arrowLeft: number;
}

export function HelpTip({ text, title, className = '' }: HelpTipProps) {
  useI18n();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const bubble = bubbleRef.current;
    if (!anchor || !bubble) return;
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    const centerX = anchor.left + anchor.width / 2;
    const left = Math.min(Math.max(centerX - width / 2, MARGIN), window.innerWidth - width - MARGIN);
    const fitsAbove = anchor.top - GAP - height >= Math.max(MARGIN, HEADER_SAFE_AREA);
    const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - MARGIN;
    const side: Position['side'] = fitsAbove || !fitsBelow ? (fitsAbove ? 'top' : 'bottom') : 'bottom';
    const top = side === 'top' ? anchor.top - GAP - height : anchor.bottom + GAP;
    setPosition({ left, top: Math.max(MARGIN, top), side, arrowLeft: Math.min(Math.max(centerX - left, 12), width - 12) });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
    else setPosition(null);
  }, [open, place, text]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!anchorRef.current?.contains(target) && !bubbleRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = () => place();
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, place]);

  return (
    <span
      ref={anchorRef}
      className={`relative inline-flex align-middle normal-case tracking-normal ${className}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        aria-label={title ? t('Ayuda: {title}', { title }) : t('Ayuda')}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
        className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-stone-300 dark:border-stone-600 text-[10px] font-bold leading-none text-stone-500 dark:text-stone-400 hover:text-emerald-700 hover:border-emerald-500 dark:hover:text-emerald-300 cursor-help transition-colors"
      >
        ?
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            ref={bubbleRef}
            role="tooltip"
            id={id}
            style={{
              position: 'fixed',
              left: position?.left ?? -9999,
              top: position?.top ?? -9999,
              visibility: position ? 'visible' : 'hidden',
            }}
            className="z-[200] w-64 max-w-[calc(100vw-16px)] rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[11.5px] font-normal normal-case tracking-normal leading-snug text-left p-2.5 shadow-lg pointer-events-none"
          >
            {position && (
              <span
                aria-hidden="true"
                className="absolute w-2.5 h-2.5 rotate-45 bg-slate-900 dark:bg-slate-800"
                style={{
                  left: position.arrowLeft - 5,
                  ...(position.side === 'top' ? { bottom: -5 } : { top: -5 }),
                }}
              />
            )}
            {title && <span className="relative block font-semibold mb-0.5">{title}</span>}
            <span className="relative block">{text}</span>
          </span>,
          document.body,
        )}
    </span>
  );
}
