interface MetricCardProps {
  value: string;
  label: string;
  color?: string;
}

export function MetricCard({ value, label, color = 'var(--color-text-pri)' }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-[#1A1E29] border border-gray-border/80 rounded-xl p-4 text-center shadow-2xs hover:shadow-xs transition-all">
      <div className="text-[24px] sm:text-[26px] font-bold tracking-tight leading-none" style={{ color }}>{value}</div>
      <div className="text-[11px] text-text-sec font-medium mt-1.5 leading-tight">{label}</div>
    </div>
  );
}
