/**
 * StatsCards Component
 * 
 * Menampilkan statistik ringkasan data warga dalam bentuk compact cards.
 * Digunakan di halaman Dashboard Data Warga.
 */

import React from 'react';
import type { ResidentStats } from '@/types';

interface StatsCardsProps {
  stats: ResidentStats;
  isLoading?: boolean;
}

/**
 * Component untuk menampilkan statistik cards (compact version)
 * 
 * Features:
 * - Compact horizontal layout
 * - Responsive design
 * - Loading state dengan skeleton
 * - Accessible dengan semantic HTML
 */
export function StatsCards({ stats, isLoading = false }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="h-3 w-16 rounded bg-gray-200"></div>
            <div className="mt-2 h-6 w-12 rounded bg-gray-200"></div>
          </div>
        ))}
      </div>
    );
  }

  // Get top 3 gangs by house count
  const gangEntries = Object.entries(stats.houses_by_gang)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {/* Total Rumah */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-600">Total Rumah</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_houses}</p>
          </div>
        </div>
      </div>

      {/* Top Gangs */}
      {gangEntries.map(([gang, count], index) => (
        <div
          key={gang}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${
                index === 0
                  ? 'bg-green-100'
                  : index === 1
                  ? 'bg-yellow-100'
                  : 'bg-orange-100'
              }`}
            >
              <svg
                className={`h-5 w-5 ${
                  index === 0
                    ? 'text-green-600'
                    : index === 1
                    ? 'text-yellow-600'
                    : 'text-orange-600'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600">Gang {gang}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          </div>
        </div>
      ))}

      {/* PBB Lunas */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-600">PBB Lunas</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.pbb_stats.lunas_percentage}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsCards;
