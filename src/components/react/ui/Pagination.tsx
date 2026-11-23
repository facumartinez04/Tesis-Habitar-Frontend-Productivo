import { Icon } from './Icon';
import { t, useI18n } from '../../../i18n';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  label?: string;
  className?: string;
}

function pageList(page: number, totalPages: number): (number | '…')[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export function Pagination({ page, totalPages, total, pageSize, onChange, label = 'resultados', className = '' }: PaginationProps) {
  useI18n();
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    'min-w-8 h-8 px-2 rounded-lg text-xs font-semibold tabular-nums inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <nav className={`flex flex-wrap items-center justify-between gap-2 px-1 py-2 ${className}`} aria-label={t('Paginación')}>
      <span className="text-[11.5px] text-text-sec tabular-nums">
        {t('{from}–{to} de {total} {label}', { from, to, total, label })}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" className={`${btn} text-text-sec hover:bg-gray-100 dark:hover:bg-white/5`} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label={t('Página anterior')} title={t('Página anterior')}>
          <Icon name="arrowLeft" size={13} />
        </button>
        {pageList(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-text-ter">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`${btn} ${p === page ? 'bg-emerald-700 text-white' : 'text-text-pri hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" className={`${btn} text-text-sec hover:bg-gray-100 dark:hover:bg-white/5`} onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label={t('Página siguiente')} title={t('Página siguiente')}>
          <Icon name="arrowRight" size={13} />
        </button>
      </div>
    </nav>
  );
}
