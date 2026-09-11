import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function TextField({ label, className = '', id, ...rest }: TextFieldProps) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id} className="block text-[11px] text-text-sec mb-[5px] font-medium">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-2.5 py-[7px] border border-gray-border rounded-[6px] text-[12.5px] bg-white dark:bg-[#131620] text-text-pri ${className}`}
        {...rest}
      />
    </div>
  );
}
