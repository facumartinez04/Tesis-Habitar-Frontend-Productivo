import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { t, useI18n } from '../../../i18n';

export const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2, 3] as const;

export function nextZoom(current: number, direction: 1 | -1): number {
  const i = ZOOM_STEPS.findIndex((z) => z >= current - 0.001);
  const at = i === -1 ? ZOOM_STEPS.length - 1 : i;
  return ZOOM_STEPS[Math.min(Math.max(at + direction, 0), ZOOM_STEPS.length - 1)];
}

const btn =
  'inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-lg border border-gray-border bg-white dark:bg-[#1A1E29] text-text-pri text-[11.5px] font-semibold hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-default cursor-pointer';

export function ZoomControls({ zoom, onChange }: { zoom: number; onChange: (zoom: number) => void }) {
  useI18n();
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={t('Tamaño del documento')}>
      <button type="button" className={btn} onClick={() => onChange(nextZoom(zoom, -1))} disabled={zoom <= ZOOM_STEPS[0]} aria-label={t('Achicar')} title={t('Achicar')}>
        <Icon name="minus" size={13} />
      </button>
      <button type="button" className={`${btn} tabular-nums w-[52px]`} onClick={() => onChange(1)} aria-label={t('Tamaño original')} title={t('Tamaño original')}>
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" className={btn} onClick={() => onChange(nextZoom(zoom, 1))} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} aria-label={t('Agrandar')} title={t('Agrandar')}>
        <Icon name="plus" size={13} />
      </button>
    </div>
  );
}

export function ExpandButton({ onClick }: { onClick: () => void }) {
  useI18n();
  return (
    <button type="button" className={`${btn} gap-1 px-2`} onClick={onClick} title={t('Ver a pantalla completa, para leer más cómodo')}>
      <Icon name="maximize" size={13} />
      {t('Modo lectura')}
    </button>
  );
}

interface ReaderOverlayProps {
  title: string;
  onClose: () => void;
  children: (zoom: number) => ReactNode;
  footer?: ReactNode;
  initialZoom?: number;
}

export function ReaderOverlay({ title, onClose, children, footer, initialZoom = 1 }: ReaderOverlayProps) {
  useI18n();
  const [zoom, setZoom] = useState(initialZoom);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === '+' || e.key === '=') setZoom((z) => nextZoom(z, 1));
      else if (e.key === '-') setZoom((z) => nextZoom(z, -1));
      else if (e.key === '0') setZoom(1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[400] bg-stone-100 dark:bg-[#0f1219] flex flex-col" role="dialog" aria-modal="true" aria-label={t('Modo lectura: {title}', { title })}>
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2 border-b border-gray-border bg-card-bg">
        <div className="min-w-0 text-[12.5px] font-semibold text-text-pri truncate">{title}</div>
        <div className="flex items-center gap-2 shrink-0">
          <ZoomControls zoom={zoom} onChange={setZoom} />
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('Cerrar')} title={t('Cerrar (Esc)')} className={`${btn} px-2`}>
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-4">
        <div style={{ width: `calc(min(100%, 1100px) * ${zoom})` }} className="mx-auto">
          {children(zoom)}
        </div>
      </div>
      {footer && <div className="border-t border-gray-border bg-card-bg px-3 py-2 flex items-center justify-center gap-3 text-[11.5px] text-text-sec">{footer}</div>}
    </div>,
    document.body,
  );
}
