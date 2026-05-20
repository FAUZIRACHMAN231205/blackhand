'use client';

import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-gray-800 border-t-white rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-gray-900 rounded-lg border border-gray-800/50 animate-pulse ${className}`}
    >
      <div className="p-6 space-y-4">
        <div className="h-6 bg-gray-800 rounded w-1/3" />
        <div className="h-4 bg-gray-800 rounded w-2/3" />
        <div className="h-4 bg-gray-800 rounded w-1/2" />
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
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-black text-white pt-24 p-6 md:p-20">
      <div className="max-w-5xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-12">
          <div className="h-12 bg-gray-800 rounded w-1/2 mb-4 animate-pulse" />
          <div className="h-4 bg-gray-800 rounded w-1/3 animate-pulse" />
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-gray-900 rounded-lg p-8 mb-12 border border-gray-800/50 flex items-center gap-6 animate-pulse">
          <div className="w-24 h-24 rounded-full bg-gray-800" />
          <div className="flex-1">
            <div className="h-6 bg-gray-800 rounded w-1/3 mb-3" />
            <div className="h-4 bg-gray-800 rounded w-1/2 mb-3" />
            <div className="h-4 bg-gray-800 rounded w-1/4" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <SkeletonGrid count={4} className="mb-12" />
      </div>
    </div>
  );
}
