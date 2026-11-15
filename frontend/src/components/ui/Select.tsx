import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className, id, fullWidth = true, disabled, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={clsx(fullWidth ? 'w-full' : 'inline-block')}>
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <div className="relative rounded-xl shadow-xs">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={clsx(
              'block w-full rounded-xl border text-sm transition-all duration-150 appearance-none bg-surface-2/90 text-slate-100 py-2.5 pl-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface-0',
              error
                ? 'border-rose-500/60 text-rose-300 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-950/20'
                : 'border-surface-border hover:border-surface-borderLight focus:border-brand-500 focus:ring-brand-500/20',
              disabled && 'bg-surface-3 text-slate-500 cursor-not-allowed border-surface-border/50',
              className
            )}
            {...props}
          >
            {options.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
