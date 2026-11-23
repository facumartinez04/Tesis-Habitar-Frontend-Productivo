import { Icon } from './Icon';
import type { IconName } from '../../../lib/iconPaths';
import type { ToastKind } from '../../../hooks/useToast';

interface ToastProps {
  message: string | null;
  kind?: ToastKind;
}

const STYLES: Record<ToastKind, { box: string; icon: string; iconName: IconName }> = {
  success: {
    box: 'bg-slate-900 text-white border-slate-900 dark:bg-stone-100 dark:text-slate-900 dark:border-stone-100',
    icon: 'text-emerald-400 dark:text-emerald-600',
    iconName: 'check',
  },
  error: {
    box: 'bg-rose-700 text-white border-rose-700 dark:bg-rose-200 dark:text-rose-950 dark:border-rose-200',
    icon: 'text-white dark:text-rose-700',
    iconName: 'alert-circle',
  },
};

export function Toast({ message, kind = 'success' }: ToastProps) {
  const style = STYLES[kind];
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)] border px-5 py-2.5 rounded-lg text-xs font-medium shadow-lg transition-all pointer-events-none z-50 flex items-center gap-2 ${style.box} ${
        message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      <Icon name={style.iconName} size={14} className={`shrink-0 ${style.icon}`} />
      <span>{message}</span>
    </div>
  );
}
