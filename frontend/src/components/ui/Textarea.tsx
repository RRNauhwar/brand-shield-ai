import React from 'react';
import { clsx } from 'clsx';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
  maxLength?: number;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      showCount = false,
      maxLength,
      className,
      id,
      value,
      fullWidth = true,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className={clsx(fullWidth ? 'w-full' : 'inline-block')}>
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {label}
            </label>
          )}
          {showCount && maxLength && (
            <span className="text-[11px] text-slate-400">
              {charCount} / {maxLength}
            </span>
          )}
        </div>
        <div className="relative rounded-xl shadow-xs">
          <textarea
            id={textareaId}
            ref={ref}
            rows={rows}
            value={value}
            maxLength={maxLength}
            disabled={disabled}
            className={clsx(
              'block w-full rounded-xl border text-sm transition-all duration-150 p-3',
              'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface-0',
              error
                ? 'border-rose-500/60 text-rose-300 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-950/20'
                : 'border-surface-border text-slate-100 bg-surface-2/90 hover:border-surface-borderLight focus:border-brand-500 focus:ring-brand-500/20',
              disabled && 'bg-surface-3 text-slate-500 cursor-not-allowed border-surface-border/50',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
