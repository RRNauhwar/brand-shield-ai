import React from 'react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse p-2 sm:p-4 max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-surface-2 rounded-lg" />
          <div className="h-4 w-72 bg-surface-2/60 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-surface-2 rounded-lg" />
          <div className="h-9 w-32 bg-surface-2 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(idx => (
          <div key={idx} className="p-4 rounded-xl border border-border-subtle bg-surface-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-surface-2 rounded" />
              <div className="h-6 w-6 rounded-md bg-surface-2" />
            </div>
            <div className="h-7 w-28 bg-surface-2 rounded-md" />
            <div className="h-3 w-36 bg-surface-2/60 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-xl border border-border-subtle bg-surface-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 bg-surface-2 rounded" />
            <div className="h-4 w-20 bg-surface-2/60 rounded" />
          </div>
          <div className="h-64 rounded-lg bg-surface-2/40 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border-subtle bg-surface-1 space-y-4">
          <div className="h-5 w-32 bg-surface-2 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="p-3 rounded-lg bg-surface-2/30 space-y-2">
                <div className="h-4 w-3/4 bg-surface-2 rounded" />
                <div className="h-3 w-1/2 bg-surface-2/60 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
