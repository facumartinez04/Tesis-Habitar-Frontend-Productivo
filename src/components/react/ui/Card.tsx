import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: boolean;
  children: ReactNode;
}

export function Card({ surface = false, className = '', children, ...rest }: CardProps) {
  const base = surface
    ? 'bg-surface rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-800'
    : 'bg-white dark:bg-[#1A1E29] border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-200';
  return (
    <div className={`${base} ${className}`} {...rest}>
      {children}
    </div>
  );
}
