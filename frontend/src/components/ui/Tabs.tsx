import React from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className
}) => {
  return (
    <div
      className={clsx(
        variant === 'underline' ? 'border-b border-surface-border' : 'bg-surface-2/90 border border-surface-border p-1 rounded-xl',
        className
      )}
    >
      <nav className="flex space-x-1 sm:space-x-2" aria-label="Tabs">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          if (variant === 'pills') {
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                  isActive
                    ? 'bg-surface-3 text-white shadow-xs border border-surface-borderLight'
                    : 'text-slate-400 hover:text-white hover:bg-surface-3/50'
                )}
              >
                {tab.icon && <span className="w-3.5 h-3.5">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={clsx(
                      'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                      isActive ? 'bg-brand-500/20 text-brand-300' : 'bg-surface-border text-slate-400'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={clsx(
                'flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer',
                isActive
                  ? 'border-brand-500 text-brand-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-surface-border'
              )}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={clsx(
                    'ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold',
                    isActive ? 'bg-brand-500/20 text-brand-300' : 'bg-surface-2 text-slate-400'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
