'use client';

import { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  description?: string;
  className?: string;
}

export default function StatsCard({
  icon,
  title,
  value,
  description,
  className = '',
}: StatsCardProps) {
  return (
    <div className={`bg-white border border-black/10 rounded-lg p-6 hover:border-black/20 transition-colors shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-black/60">{icon}</div>
      </div>
      
      <p className="text-black/60 text-sm mb-2">{title}</p>
      <p className="text-black text-2xl font-bold mb-2">{value}</p>
      
      {description && (
        <p className="text-black/50 text-xs">{description}</p>
      )}
    </div>
  );
}
