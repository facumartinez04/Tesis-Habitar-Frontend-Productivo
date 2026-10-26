import type { ReactNode } from 'react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { t, useI18n } from '../../../i18n';
import type { StudentResultRow } from '../../../types/result';

const AXES = [
  { key: 'literal', label: 'Literal', color: 'var(--color-green-mid)' },
  { key: 'inferencial', label: 'Inferencial', color: 'var(--color-amber)' },
  { key: 'critico', label: 'Crítico', color: 'var(--color-red)' },
] as const;

const AVATAR_TONE: Record<StudentResultRow['status'], { bg: string; color: string }> = {
  bien: { bg: 'var(--color-green-bg)', color: 'var(--color-green-text)' },
  regular: { bg: 'var(--color-amber-bg)', color: 'var(--color-amber-text)' },
  bajo: { bg: 'var(--color-red-bg)', color: 'var(--color-red-text)' },
  sin_datos: { bg: 'var(--color-surface, #EEEDE9)', color: 'var(--color-text-sec, #5F5E5A)' },
};

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

interface StudentCardProps {
  row: StudentResultRow;
  href: string;
  status: { label: ReactNode; color: 'green' | 'amber' | 'red' | 'gray' };
}

export function StudentCard({ row, href, status }: StudentCardProps) {
  useI18n();
  const tone = AVATAR_TONE[row.status];
  return (
    <a
      href={href}
      aria-label={t('Ver la ficha de {name}', { name: row.studentName })}
      className={`group flex flex-col gap-3 bg-white dark:bg-[#1A1E29] border rounded-2xl p-4 shadow-2xs hover:shadow-md hover:border-emerald-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 transition-all ${
        row.status === 'bajo' ? 'border-rose-200 dark:border-rose-900/60' : 'border-stone-200/80 dark:border-stone-800'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar initials={initialsOf(row.studentName)} bg={tone.bg} color={tone.color} size={38} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{row.studentName}</div>
          <div className="mt-1">
            <Badge color={status.color}>{status.label}</Badge>
          </div>
        </div>
        <Icon name="arrowRight" size={15} className="text-stone-400 group-hover:text-emerald-600 shrink-0 transition-colors" />
      </div>

      <div className="space-y-2">
        {AXES.map((axis) => {
          const pending = axis.key === 'critico' && row.criticoPending;
          const value = row.scores?.[axis.key] ?? null;
          return (
            <div key={axis.key} className="flex items-center gap-2.5">
              <span className="w-[74px] shrink-0 text-[11px] font-medium text-stone-500 dark:text-stone-400">{t(axis.label)}</span>
              <span className="flex-1 h-1.5 rounded-full bg-stone-100 dark:bg-white/10 overflow-hidden">
                {!pending && value !== null && (
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: axis.color }} />
                )}
              </span>
              <span className="w-[62px] shrink-0 text-right text-[11.5px] font-semibold tabular-nums text-slate-800 dark:text-stone-200">
                {pending ? <span className="text-amber-700 dark:text-amber-300 font-semibold">{t('pendiente')}</span> : value === null ? '—' : `${value}%`}
              </span>
            </div>
          );
        })}
      </div>
    </a>
  );
}
