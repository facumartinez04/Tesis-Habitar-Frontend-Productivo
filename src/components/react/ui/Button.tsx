import type { ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-green-dark text-white',
  secondary: 'bg-white text-text-pri border border-gray-border',
  danger: 'bg-red-bg text-red-text border border-[#F09595]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-[6px] text-[12.5px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
