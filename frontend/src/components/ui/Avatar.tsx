import React from 'react';
import { clsx } from 'clsx';

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name = '', src, size = 'md', className }) => {
  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  // Consistent background color generation from name
  const getColorFromName = (str: string) => {
    const colors = [
      'bg-brand-600 text-white',
      'bg-indigo-600 text-white',
      'bg-purple-600 text-white',
      'bg-teal-600 text-white',
      'bg-emerald-600 text-white',
      'bg-amber-600 text-white',
      'bg-navy-800 text-white'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User'}
        className={clsx('rounded-full object-cover shrink-0 ring-1 ring-slate-200', sizes[size], className)}
        onError={e => {
          // If image fails to load, replace with initials
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-bold uppercase select-none shrink-0 shadow-xs',
        sizes[size],
        getColorFromName(name || 'User'),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};
