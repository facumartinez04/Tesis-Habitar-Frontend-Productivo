import type { ReactNode } from 'react';

const colors: Record<string, string> = {
  green: 'bg-green-bg text-green-text border border-green-mid/20',
  blue: 'bg-blue-bg text-blue border border-blue/20',
  amber: 'bg-amber-bg text-amber-text border border-amber/20',
  red: 'bg-red-bg text-red-text border border-red/20',
  gray: 'bg-gray-bg text-text-sec border border-gray-border/60',
  teal: 'bg-green-light text-green-dark border border-green-mid/30',
};

interface BadgeProps {
  color?: keyof typeof colors;
  className?: string;
  children: ReactNode;
}

export function Badge({ color = 'gray', className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-2xs ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}
