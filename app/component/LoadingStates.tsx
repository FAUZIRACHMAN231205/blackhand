'use client';

import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-300">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-slate-200 dark:border-slate-800 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm font-sans font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 animate-pulse ${className}`}
    >
      <div className="p-6 space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-2/3" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonGrid({
  count = 4,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-12 space-y-3">
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-1/2 animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3 animate-pulse" />
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl p-8 mb-12 border border-slate-200/60 dark:border-slate-800/45 flex flex-col md:flex-row items-center gap-6 animate-pulse">
          <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4 animate-pulse" />
          <SkeletonGrid count={4} />
        </div>
      </div>
    </div>
  );
}
