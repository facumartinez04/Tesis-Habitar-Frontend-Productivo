import type { ReactNode } from 'react';

const colors: Record<string, string> = {
  green: 'bg-green-bg text-green-text',
  blue: 'bg-blue-bg text-blue',
  amber: 'bg-amber-bg text-amber-text',
  red: 'bg-red-bg text-red-text',
  gray: 'bg-gray-bg text-text-sec',
  teal: 'bg-green-light text-green-dark',
};

interface BadgeProps {
  color?: keyof typeof colors;
  className?: string;
  children: ReactNode;
}

export function Badge({ color = 'gray', className = '', children }: BadgeProps) {
  return (
    <span className={`inline-block text-[10.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}
