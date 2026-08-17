const colors = {
  green: 'bg-green-mid',
  amber: 'bg-amber',
  red: 'bg-red',
};

interface ProgressBarProps {
  percent: number;
  color?: keyof typeof colors;
  className?: string;
}

export function ProgressBar({ percent, color = 'green', className = '' }: ProgressBarProps) {
  return (
    <div className={`bg-gray-border rounded-[3px] h-[5px] overflow-hidden my-1 ${className}`}>
      <div className={`h-full rounded-[3px] ${colors[color]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
