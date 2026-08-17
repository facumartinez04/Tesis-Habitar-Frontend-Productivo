import { Icon } from './Icon';
import type { IntegrationStep } from '../../../types/oauth';

const dotColors: Record<IntegrationStep['state'], string> = {
  done: 'bg-green-mid',
  wait: 'bg-amber',
  todo: 'bg-gray-border',
};

export function Timeline({ items }: { items: IntegrationStep[] }) {
  return (
    <div className="relative pl-5">
      <div className="absolute left-[7px] top-1.5 bottom-1.5 w-[1.5px] bg-gray-border" />
      {items.map((item) => (
        <div key={item.id} className="relative mb-3.5">
          <div className={`absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${dotColors[item.state]}`} />
          <div className={`text-[12.5px] ${item.state === 'todo' ? 'text-text-ter' : 'text-text-pri'}`}>{item.label}</div>
          {item.note && (
            <div className="flex items-center gap-1 text-[11px] text-amber-text mt-0.5">
              <Icon name="clock" size={11} />
              {item.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
