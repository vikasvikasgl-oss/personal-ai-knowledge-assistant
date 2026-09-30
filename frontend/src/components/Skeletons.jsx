import React from 'react';

// Generic shimmer pulse skeleton block
const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />
);

// ── Stat Card Skeleton ──────────────────────────────────────────────────────
export const StatCardSkeleton = ({ count = 4 }) => (
  <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(count, 4)} gap-3`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
        <Shimmer className="w-11 h-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-6 w-14" />
          <Shimmer className="h-3 w-20" />
        </div>
      </div>
    ))}
  </div>
);

// ── Document Card Skeleton ──────────────────────────────────────────────────
export const DocumentCardSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-start gap-3">
          <Shimmer className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
        </div>
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-5/6" />
        <div className="flex gap-2 pt-1">
          <Shimmer className="h-5 w-16 rounded-full" />
          <Shimmer className="h-5 w-12 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// ── Table Row Skeleton ──────────────────────────────────────────────────────
export const TableRowSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
    <table className="w-full">
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j} className="px-4 py-3">
                <Shimmer className={`h-3 ${j === 0 ? 'w-6' : j === 1 ? 'w-3/4' : 'w-16'}`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Chart Skeleton ──────────────────────────────────────────────────────────
export const ChartSkeleton = ({ height = 220 }) => (
  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
    <Shimmer className="h-4 w-40 mb-2" />
    <Shimmer className="h-3 w-56 mb-5" />
    <Shimmer className={`w-full rounded-xl`} style={{ height }} />
  </div>
);

// ── Recommendation Card Skeleton ────────────────────────────────────────────
export const RecommendationCardSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <Shimmer className="h-5 w-24 rounded-full" />
          <Shimmer className="h-4 w-16 rounded-md" />
        </div>
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-4/5" />
        <div className="flex gap-2 pt-1">
          <Shimmer className="h-5 w-12 rounded-md" />
          <Shimmer className="h-5 w-16 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

// ── Graph Skeleton ──────────────────────────────────────────────────────────
export const GraphSkeleton = () => (
  <div className="w-full h-[520px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-3">
        {[60, 40, 55, 45].map((s, i) => (
          <Shimmer key={i} className={`rounded-full`} style={{ width: s, height: s }} />
        ))}
      </div>
      <div className="flex gap-5 mt-2">
        {[48, 72, 56].map((s, i) => (
          <Shimmer key={i} className="rounded-full" style={{ width: s, height: s }} />
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3 animate-pulse">Loading knowledge graph...</p>
    </div>
  </div>
);

// ── Page-level Full Skeleton ────────────────────────────────────────────────
export const PageSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
      <div className="space-y-2">
        <Shimmer className="h-7 w-56" />
        <Shimmer className="h-4 w-80" />
      </div>
      <Shimmer className="h-9 w-28 rounded-xl" />
    </div>
    <StatCardSkeleton count={4} />
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  </div>
);

export { Shimmer };
