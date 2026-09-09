'use client';

import { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  description?: string;
  className?: string;
  themeColor?: 'emerald' | 'blue' | 'violet' | 'amber';
}

export default function StatsCard({
  icon,
  title,
  value,
  description,
  className = '',
  themeColor = 'violet',
}: StatsCardProps) {
  // Map warna tema untuk kontainer ikon
  const colorMaps = {
    emerald: 'bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/25',
    blue: 'bg-blue-50/80 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/25',
    violet: 'bg-violet-50/80 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/25',
    amber: 'bg-amber-50/80 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/25',
  };

  return (
    <div 
      className={`bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-md hover:border-black/20 dark:hover:border-white/20 transition-all duration-300 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMaps[themeColor]}`}>
          {icon}
        </div>
      </div>
      
      <p className="text-black/50 dark:text-white/50 text-xs font-sans font-semibold uppercase tracking-wider mb-1">{title}</p>
      <p 
        className={`text-black dark:text-white font-bold mb-1 break-all ${
          String(value).length > 20 
            ? 'text-base md:text-lg' 
            : String(value).length > 12 
              ? 'text-lg md:text-xl' 
              : 'text-xl md:text-2xl'
        }`}
        title={String(value)}
      >
        {value}
      </p>
      
      {description && (
        <p className="text-black/50 dark:text-white/40 text-xs font-sans">{description}</p>
      )}
    </div>
  );
}
