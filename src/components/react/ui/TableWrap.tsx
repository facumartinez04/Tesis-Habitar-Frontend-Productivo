import type { ReactNode } from 'react';

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1A1E29] border border-gray-border/80 rounded-xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">{children}</table>
      </div>
    </div>
  );
}
