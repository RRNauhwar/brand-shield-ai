import React from 'react';
import { ContentStatus } from '../../types';
import { Badge } from './Badge';
import { Clock, CheckCircle2, XCircle, AlertCircle, FileEdit, ShieldAlert } from 'lucide-react';

export interface StatusBadgeProps {
  status: ContentStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const config: Record<
    ContentStatus,
    {
      label: string;
      variant: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'purple' | 'slate';
      icon: React.ReactNode;
    }
  > = {
    draft: {
      label: 'Draft',
      variant: 'default',
      icon: <FileEdit className="w-3 h-3" />
    },
    audited: {
      label: 'Audited',
      variant: 'brand',
      icon: <ShieldAlert className="w-3 h-3" />
    },
    under_review: {
      label: 'Under Review',
      variant: 'warning',
      icon: <Clock className="w-3 h-3" />
    },
    changes_requested: {
      label: 'Changes Requested',
      variant: 'purple',
      icon: <AlertCircle className="w-3 h-3" />
    },
    approved: {
      label: 'Approved',
      variant: 'success',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    rejected: {
      label: 'Rejected',
      variant: 'danger',
      icon: <XCircle className="w-3 h-3" />
    }
  };

  const item = config[status] || {
    label: status,
    variant: 'default',
    icon: null
  };

  return (
    <Badge variant={item.variant} size={size}>
      {showIcon && item.icon}
      <span>{item.label}</span>
    </Badge>
  );
};
