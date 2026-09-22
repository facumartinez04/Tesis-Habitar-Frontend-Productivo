import type { ReactNode } from 'react';

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1A1E29] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">{children}</table>
      </div>
    </div>
  );
}
