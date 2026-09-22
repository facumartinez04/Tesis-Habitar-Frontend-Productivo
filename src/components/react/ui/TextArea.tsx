import type { TextareaHTMLAttributes } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, className = '', id, ...rest }: TextAreaProps) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id} className="block text-[11px] text-text-sec mb-[5px] font-medium">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full px-2.5 py-2 border border-gray-border rounded-[6px] text-xs bg-white dark:bg-[#131620] text-text-pri leading-relaxed resize-none ${className}`}
        {...rest}
      />
    </div>
  );
}
