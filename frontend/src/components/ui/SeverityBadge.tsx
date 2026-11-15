import React from 'react';
import { Severity } from '../../types';
import { Badge } from './Badge';
import { AlertOctagon, AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

export interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  showIcon = true
}) => {
  const config: Record<
    Severity,
    {
      label: string;
      variant: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'purple' | 'slate';
      icon: React.ReactNode;
    }
  > = {
    critical: {
      label: 'Critical',
      variant: 'danger',
      icon: <AlertOctagon className="w-3 h-3 text-rose-600" />
    },
    high: {
      label: 'High',
      variant: 'warning',
      icon: <AlertTriangle className="w-3 h-3 text-amber-600" />
    },
    medium: {
      label: 'Medium',
      variant: 'purple',
      icon: <AlertCircle className="w-3 h-3 text-purple-600" />
    },
    low: {
      label: 'Low',
      variant: 'brand',
      icon: <ShieldAlert className="w-3 h-3 text-brand-600" />
    },
    informational: {
      label: 'Info',
      variant: 'default',
      icon: <Info className="w-3 h-3 text-slate-500" />
    }
  };

  const item = config[severity] || {
    label: severity,
    variant: 'default',
    icon: null
  };

  return (
    <Badge variant={item.variant} size={size}>
      {showIcon && item.icon}
      <span className="capitalize">{item.label}</span>
    </Badge>
  );
};
