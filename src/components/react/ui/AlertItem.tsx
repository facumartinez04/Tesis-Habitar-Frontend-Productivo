import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../../../lib/iconPaths';

const styles = {
  red: { border: 'border-[#F09595]', bg: 'bg-red-bg/10', iconBg: 'bg-red-bg', iconColor: 'text-red-text' },
  amber: { border: 'border-[#FAC775]', bg: 'bg-amber-bg/10', iconBg: 'bg-amber-bg', iconColor: 'text-amber-text' },
  green: { border: 'border-[#C0DD97]', bg: 'bg-green-bg/10', iconBg: 'bg-green-bg', iconColor: 'text-green-text' },
};

interface AlertItemProps {
  icon: IconName;
  variant: keyof typeof styles;
  title: string;
  desc?: ReactNode;
  date?: string;
  children?: ReactNode;
}

export function AlertItem({ icon, variant, title, desc, date, children }: AlertItemProps) {
  const s = styles[variant];
  return (
    <div className={`flex items-start gap-3 px-3.5 py-3 rounded-md border mb-2 ${s.border} ${s.bg}`}>
      <div className={`w-[34px] h-[34px] rounded-[6px] flex items-center justify-center shrink-0 ${s.iconBg}`}>
        <Icon name={icon} size={17} className={s.iconColor} />
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-medium mb-[3px]">{title}</div>
        {desc && <div className="text-[11.5px] text-text-sec">{desc}</div>}
        {date && <div className="text-[10.5px] text-text-ter mt-0.5">{date}</div>}
      </div>
      {children}
    </div>
  );
}
