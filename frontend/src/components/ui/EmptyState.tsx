import React from 'react';
import { Button } from './Button';
import { Inbox } from 'lucide-react';
import { clsx } from 'clsx';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionLabel,
  onAction,
  actionIcon,
  className
}) => {
  const btnLabel = actionText || actionLabel;
  return (
    <div
      className={clsx(
        'text-center py-12 px-6 rounded-2xl border-2 border-dashed border-surface-border bg-surface-1/40 flex flex-col items-center justify-center text-slate-100',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-surface-border flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        {icon || <Inbox className="w-7 h-7 text-slate-400" />}
      </div>
      <h4 className="text-base font-semibold text-white mb-1 tracking-tight">{title}</h4>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      {btnLabel && onAction && (
        <Button onClick={onAction} leftIcon={actionIcon} size="md">
          {btnLabel}
        </Button>
      )}
    </div>
  );
};
