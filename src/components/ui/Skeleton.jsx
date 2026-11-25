export const SkeletonBlock = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded bg-border/70 ${className}`}
  />
);

export const DashboardSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBlock className="h-7 w-56" />
        <SkeletonBlock className="h-4 w-72" />
      </div>
      <SkeletonBlock className="h-10 w-36" />
    </div>
    <div className="card grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-5 space-y-2.5">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-8 w-14" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
      ))}
    </div>
    <div className="card p-6 space-y-4">
      <SkeletonBlock className="h-5 w-40" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-2 border-t border-border first:border-t-0"
        >
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-3 w-64" />
          </div>
          <SkeletonBlock className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 6 }) => (
  <div
    className="card divide-y divide-border"
    aria-busy="true"
    aria-label="Loading records"
  >
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center justify-between gap-4 p-4">
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3.5 w-3/5" />
        </div>
        <SkeletonBlock className="h-6 w-24 rounded-full shrink-0" />
      </div>
    ))}
  </div>
);

export const DetailSkeleton = () => (
  <div
    className="max-w-4xl mx-auto space-y-6"
    aria-busy="true"
    aria-label="Loading ticket details"
  >
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBlock className="h-7 w-40" />
        <SkeletonBlock className="h-4 w-64" />
      </div>
      <SkeletonBlock className="h-10 w-28" />
    </div>
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card p-6 space-y-4">
        <SkeletonBlock className="h-5 w-32" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-14 w-full" />
          ))}
        </div>
        <SkeletonBlock className="h-28 w-full" />
      </div>
      <div className="card p-6 space-y-3">
        <SkeletonBlock className="h-5 w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export const CardGridSkeleton = ({ cards = 6 }) => (
  <div
    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    aria-busy="true"
    aria-label="Loading directory"
  >
    {Array.from({ length: cards }).map((_, i) => (
      <div key={i} className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-14 w-14 rounded-lg" />
          <div className="flex gap-1.5">
            <SkeletonBlock className="h-9 w-9" />
            <SkeletonBlock className="h-9 w-9" />
          </div>
        </div>
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-3 w-20" />
      </div>
    ))}
  </div>
);
