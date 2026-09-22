import type { ReactNode } from 'react';

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="bg-white border border-gray-border rounded-[10px] text-[11px] text-text-sec px-2.5 py-[3px]">
      {children}
    </span>
  );
}
