import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../../../lib/iconPaths';

const styles = {
  red: { border: 'border-rose-200 dark:border-rose-900/60', bg: 'bg-rose-50/40 dark:bg-rose-950/20', iconBg: 'bg-rose-100 dark:bg-rose-900/50', iconColor: 'text-rose-700 dark:text-rose-300' },
  amber: { border: 'border-amber-200 dark:border-amber-900/60', bg: 'bg-amber-50/40 dark:bg-amber-950/20', iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconColor: 'text-amber-700 dark:text-amber-300' },
  green: { border: 'border-emerald-200 dark:border-emerald-900/60', bg: 'bg-emerald-50/40 dark:bg-emerald-950/20', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-700 dark:text-emerald-300' },
};

interface AlertItemProps {
  icon: IconName;
  variant: keyof typeof styles;
  title: string;
  desc?: ReactNode;
  date?: string;
  children?: ReactNode;
}

export function AlertItem({ icon, variant, title, desc, date, children }: AlertItemProps) {
  const s = styles[variant];
  return (
    <div className={`flex items-start gap-3.5 p-4 rounded-xl border mb-3 shadow-2xs transition-all ${s.border} ${s.bg}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${s.iconBg}`}>
        <Icon name={icon} size={18} className={s.iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1">{title}</div>
        {desc && <div className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{desc}</div>}
        {date && <div className="text-[11px] text-stone-400 dark:text-stone-500 font-medium mt-1">{date}</div>}
      </div>
      {children}
    </div>
  );
}
