import type { ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-green-dark hover:bg-emerald-800 text-white shadow-sm hover:shadow-md active:scale-[0.98]',
  secondary: 'bg-white dark:bg-[#1A1E29] hover:bg-gray-50 dark:hover:bg-[#252B3B] text-text-pri border border-gray-200 dark:border-gray-700 shadow-sm hover:border-emerald-500/40',
  danger: 'bg-red-bg hover:bg-red-100 text-red-text border border-red/20 shadow-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
