import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANTS: Record<string, string> = {
  primary: 'bg-amber-500 hover:bg-amber-400 text-slate-900 border-amber-300/50 shadow-amber-900/40',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-500/50 shadow-black/40',
  danger: 'bg-rose-700 hover:bg-rose-600 text-rose-50 border-rose-400/50 shadow-black/40',
  ghost: 'bg-transparent hover:bg-slate-700/50 text-slate-200 border-slate-600/60',
};

const SIZES: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({ children, variant = 'primary', size = 'md', className, disabled, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'rounded-lg border font-semibold tracking-wide shadow-lg transition-all duration-150',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-inherit',
        'active:scale-[0.97]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
