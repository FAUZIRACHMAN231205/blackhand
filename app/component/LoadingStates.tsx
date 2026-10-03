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
    // Mirrors DashboardView's layout so nothing jumps when the real page arrives.
    <div className="min-h-[100dvh] bg-white px-4 pb-16 pt-20 text-black transition-colors duration-300 dark:bg-slate-950 dark:text-white sm:px-6 md:px-10 md:pt-28">
      <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8 animate-pulse">
        <div className="h-5 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />

        {/* Header */}
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-2/3 rounded-xl bg-slate-200 dark:bg-slate-800 sm:h-11" />
        </div>

        {/* Profile */}
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-800/45 dark:bg-slate-900/40 sm:gap-6 sm:p-6">
          <div className="h-14 w-14 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800 sm:h-20 sm:w-20" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-1/3 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        {/* Account facts */}
        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200/70 p-3 dark:border-slate-800/50">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="mx-auto h-2.5 w-14 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mx-auto h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>

        {/* Shortcuts */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[76px] rounded-2xl border border-slate-200/70 bg-slate-50/50 dark:border-slate-800/50 dark:bg-slate-900/40" />
          ))}
        </div>
      </div>
    </div>
  );
}
