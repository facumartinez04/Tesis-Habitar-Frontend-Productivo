import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import type { IconName } from '../../../lib/iconPaths';

export interface DropdownItem {
  label: string;
  hint?: string;
  icon?: IconName;
  /** Acción destructiva: se muestra en rojo y separada del resto. */
  danger?: boolean;
  /** Si se indica, el ítem es un enlace. */
  href?: string;
  onSelect?: () => void;
}

interface DropdownMenuProps {
  /** Contenido del botón que abre el menú. */
  trigger: ReactNode;
  triggerClassName?: string;
  /** Encabezado opcional del menú. */
  title?: string;
  items: DropdownItem[];
  width?: number;
  align?: 'start' | 'end';
}

const GAP = 6;
const MARGIN = 8;

/**
 * Menú desplegable que se dibuja en un portal con posición fija, así no lo recortan
 * los contenedores con overflow (por ejemplo, las tablas con scroll horizontal).
 * Se abre hacia arriba si no entra debajo, se cierra con Escape, clic afuera o scroll,
 * y se recorre con las flechas.
 */
export function DropdownMenu({ trigger, triggerClassName = '', title, items, width = 208, align = 'end' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const h = menu?.offsetHeight ?? 0;
    const up = r.bottom + GAP + h > window.innerHeight - MARGIN && r.top - GAP - h > MARGIN;
    const rawLeft = align === 'end' ? r.right - width : r.left;
    const left = Math.min(Math.max(rawLeft, MARGIN), window.innerWidth - width - MARGIN);
    setPos({ top: up ? r.top - GAP - h : r.bottom + GAP, left, up });
  }, [align, width]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const opts = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      if (!opts.length) return;
      const i = opts.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? (i + 1) % opts.length : (i - 1 + opts.length) % opts.length;
      opts[next].focus();
    };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
            className={`z-50 rounded-xl border border-gray-border bg-card-bg p-1 shadow-xl ring-1 ring-black/5 dark:ring-white/5 ${
              pos ? (pos.up ? 'animate-menu-up' : 'animate-menu-down') : 'invisible'
            }`}
          >
            {title && (
              <div className="px-2.5 pt-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wide text-text-ter">{title}</div>
            )}
            {items.map((item, i) => {
              const cls = `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors focus:outline-none cursor-pointer ${
                item.danger
                  ? 'text-red-text hover:bg-red-bg focus:bg-red-bg'
                  : 'text-text-pri hover:bg-green-light focus:bg-green-light'
              }`;
              const body = (
                <>
                  {item.icon && <Icon name={item.icon} size={15} className={item.danger ? '' : 'text-text-ter'} />}
                  <span className="flex-1 font-medium">{item.label}</span>
                  {item.hint && <span className="text-[11.5px] text-text-ter">{item.hint}</span>}
                </>
              );
              return (
                <div key={item.label}>
                  {item.danger && i > 0 && <div className="my-1 h-px bg-gray-border" role="separator" />}
                  {item.href ? (
                    <a href={item.href} role="menuitem" className={cls} onClick={() => setOpen(false)}>
                      {body}
                    </a>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      className={cls}
                      onClick={() => {
                        setOpen(false);
                        item.onSelect?.();
                      }}
                    >
                      {body}
                    </button>
                  )}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
