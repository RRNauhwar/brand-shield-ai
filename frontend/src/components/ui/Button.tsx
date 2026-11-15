import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface-0 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer';

    const variants = {
      primary:
        'bg-gradient-to-r from-brand-500 via-indigo-600 to-accent-violet hover:from-brand-600 hover:to-accent-violet text-white shadow-md shadow-brand-500/25 border border-brand-400/30 focus:ring-brand-500',
      secondary:
        'bg-surface-2 hover:bg-surface-3 text-slate-200 border border-surface-border hover:border-surface-borderLight focus:ring-slate-400',
      outline:
        'bg-surface-1/90 hover:bg-surface-2 text-slate-200 border border-surface-border hover:border-surface-borderLight focus:ring-brand-500 shadow-xs',
      ghost:
        'bg-transparent hover:bg-surface-2/80 text-slate-400 hover:text-white focus:ring-slate-400',
      danger:
        'bg-rose-600/90 hover:bg-rose-600 text-white shadow-md shadow-rose-900/40 border border-rose-500/30 focus:ring-rose-500'
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 font-medium',
      md: 'text-sm px-4 py-2 gap-2 font-medium',
      lg: 'text-base px-5 py-2.5 gap-2.5 font-semibold'
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
