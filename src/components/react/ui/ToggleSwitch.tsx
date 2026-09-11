import type { ChangeEvent } from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  id?: string;
  size?: 'sm' | 'md';
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  id,
  size = 'md',
}: ToggleSwitchProps) {
  const switchId = id || (label ? `switch-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);

  const trackSizes = size === 'sm' ? 'w-8 h-4.5' : 'w-10 h-5.5';
  const thumbSizes = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';
  const translateActive = size === 'sm' ? 'translate-x-3.5' : 'translate-x-4.5';

  return (
    <label
      htmlFor={switchId}
      className={`inline-flex items-center justify-between gap-3 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {(label || description) && (
        <div className="flex-1 min-w-0 pr-2">
          {label && <div className="text-xs font-semibold text-text-pri leading-snug">{label}</div>}
          {description && <div className="text-[11px] text-text-ter leading-tight">{description}</div>}
        </div>
      )}
      <div className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          id={switchId}
          checked={checked}
          disabled={disabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`rounded-full transition-colors duration-200 ease-in-out ${trackSizes} ${
            checked ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-700'
          }`}
        >
          <div
            className={`bg-white rounded-full shadow-xs transform transition-transform duration-200 ease-in-out m-0.5 ${thumbSizes} ${
              checked ? translateActive : 'translate-x-0'
            }`}
          />
        </div>
      </div>
    </label>
  );
}
