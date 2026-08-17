import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: boolean;
  children: ReactNode;
}

export function Card({ surface = false, className = '', children, ...rest }: CardProps) {
  const base = surface
    ? 'bg-surface rounded-md px-3.5 py-3'
    : 'bg-white border border-gray-border rounded-md p-4';
  return (
    <div className={`${base} ${className}`} {...rest}>
      {children}
    </div>
  );
}
