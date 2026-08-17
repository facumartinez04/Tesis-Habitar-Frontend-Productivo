interface MetricCardProps {
  value: string;
  label: string;
  color?: string;
}

export function MetricCard({ value, label, color = 'var(--color-text-pri)' }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-border rounded-md px-3.5 py-3 text-center">
      <div className="text-[22px] font-semibold" style={{ color }}>{value}</div>
      <div className="text-[10.5px] text-text-sec mt-0.5">{label}</div>
    </div>
  );
}
