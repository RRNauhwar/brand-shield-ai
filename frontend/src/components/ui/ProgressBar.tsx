import React from 'react';
import { clsx } from 'clsx';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'dynamic';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercent = true,
  size = 'md',
  variant = 'dynamic',
  className
}) => {
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const getDynamicColor = (p: number) => {
    if (p >= 85) return 'bg-emerald-500';
    if (p >= 70) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const variantColors = {
    brand: 'bg-brand-600',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    dynamic: getDynamicColor(percent)
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  return (
    <div className={clsx('w-full', className)}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs font-medium mb-1.5">
          {label && <span className="text-slate-600">{label}</span>}
          {showPercent && <span className="font-semibold text-slate-800">{percent}%</span>}
        </div>
      )}
      <div className={clsx('w-full bg-slate-100 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500 ease-out', variantColors[variant])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
