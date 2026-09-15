import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: boolean;
  children: ReactNode;
}

export function Card({ surface = false, className = '', children, ...rest }: CardProps) {
  const base = surface
    ? 'bg-surface rounded-xl p-4 sm:p-5 border border-gray-border/60 shadow-2xs'
    : 'bg-white dark:bg-[#1A1E29] border border-gray-border/80 rounded-xl p-4 sm:p-5 shadow-2xs transition-all';
  return (
    <div className={`${base} ${className}`} {...rest}>
      {children}
    </div>
  );
}
