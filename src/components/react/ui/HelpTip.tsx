import { useEffect, useId, useRef, useState } from 'react';
import { t, useI18n } from '../../../i18n';

interface HelpTipProps {
  text: string;
  title?: string;
  align?: 'auto' | 'center' | 'start' | 'end';
  side?: 'top' | 'bottom';
  className?: string;
}

const ALIGN = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-0',
  end: 'right-0',
};

export function HelpTip({ text, title, align = 'auto', side = 'top', className = '' }: HelpTipProps) {
  useI18n();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'center' | 'start' | 'end'>('center');
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    if (align === 'auto' && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const room = 140;
      setPlacement(rect.left < room ? 'start' : window.innerWidth - rect.right < room ? 'end' : 'center');
    } else if (align !== 'auto') {
      setPlacement(align);
    }
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, align]);

  return (
    <span
      ref={ref}
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
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
        className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-stone-300 dark:border-stone-600 text-[10px] font-bold leading-none text-stone-500 dark:text-stone-400 hover:text-emerald-700 hover:border-emerald-500 dark:hover:text-emerald-300 cursor-help transition-colors"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={`absolute z-50 ${ALIGN[placement]} ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} w-64 max-w-[80vw] rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[11.5px] font-normal leading-snug text-left p-2.5 shadow-lg`}
        >
          {title && <span className="block font-semibold mb-0.5">{title}</span>}
          {text}
        </span>
      )}
    </span>
  );
}
