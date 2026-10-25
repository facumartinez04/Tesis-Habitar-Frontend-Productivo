import { HelpTip } from './HelpTip';

interface MetricCardProps {
  value: string;
  label: string;
  color?: string;
  help?: string;
}

export function MetricCard({ value, label, color = 'var(--color-text-pri)', help }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-[#1A1E29] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div
        className="text-2xl sm:text-[28px] font-bold tracking-tight leading-none"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-2 leading-tight flex items-center gap-1.5">
        <span>{label}</span>
        {help && <HelpTip text={help} title={label} />}
      </div>
    </div>
  );
}
