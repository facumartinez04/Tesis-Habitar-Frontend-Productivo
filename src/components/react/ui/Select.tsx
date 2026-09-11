import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className = '', id, children, ...rest }: SelectProps) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id} className="block text-[11px] text-text-sec mb-[5px] font-medium">
          {label}
        </label>
      )}
      <select id={id} className={`form-select w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white dark:bg-[#131620] text-text-pri ${className}`} {...rest}>
        {children}
      </select>
    </div>
  );
}
