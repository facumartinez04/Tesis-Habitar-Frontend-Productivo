import { t, useI18n } from '../../../i18n';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  useI18n();
  return <div className={`skeleton-shimmer rounded-md ${className}`} style={style} />;
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  useI18n();
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => {
        const widths = ['w-full', 'w-5/6', 'w-3/4', 'w-2/3', 'w-4/5'];
        return <Skeleton key={i} className={`h-3 ${widths[i % widths.length]}`} />;
      })}
    </div>
  );
}

export function SkeletonMetricCard() {
  useI18n();
  return (
    <div className="bg-white border border-gray-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-6 rounded-full" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-2.5 w-36" />
    </div>
  );
}

export function SkeletonMetricCards({ count = 3 }: { count?: number }) {
  useI18n();
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${count} gap-3 mb-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMetricCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  useI18n();
  return (
    <div className="bg-white border border-gray-border rounded-xl overflow-hidden shadow-xs">
      <div className="px-4 py-3 border-b border-gray-border bg-surface flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-3.5 ${
                  c === 0 ? 'w-1/3' : c === cols - 1 ? 'w-16' : 'w-1/5'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  useI18n();
  return (
    <div className={`bg-white border border-gray-border rounded-xl p-5 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1.5 w-1/2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
      <div className="pt-2 flex justify-end">
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonKanban() {
  useI18n();
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[t('Por Hacer'), t('En Progreso'), t('En Revisión'), t('Completada')].map((col) => (
          <div key={col} className="bg-surface border border-gray-border rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
            <div className="space-y-2.5">
              {[1, 2, 3].map((card) => (
                <div key={card} className="bg-white border border-gray-border rounded-lg p-3 space-y-2.5 shadow-xs">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-3.5 w-5/6" />
                  <Skeleton className="h-2.5 w-full" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
