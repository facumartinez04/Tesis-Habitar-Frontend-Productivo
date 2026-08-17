import type { ReactNode } from 'react';

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-gray-border rounded-md overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[12.5px]">{children}</table>
    </div>
  );
}
