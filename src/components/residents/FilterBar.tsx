/**
 * FilterBar Component
 * 
 * Component untuk filter dan search controls di Dashboard Data Warga.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { PBBStatus } from '@/types';

interface FilterBarProps {
  gangs: string[];
  selectedGang: string | null;
  selectedPBBStatus: 'all' | PBBStatus;
  searchQuery: string;
  onGangChange: (gang: string | null) => void;
  onPBBStatusChange: (status: 'all' | PBBStatus) => void;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onClearFilters: () => void;
}

/**
 * FilterBar component dengan debounced search
 */
export function FilterBar({
  gangs,
  selectedGang,
  selectedPBBStatus,
  searchQuery,
  onGangChange,
  onPBBStatusChange,
  onSearchChange,
  onSearch,
  onClearFilters,
}: FilterBarProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        onSearchChange(localSearchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchQuery, searchQuery, onSearchChange]);

  const hasActiveFilters = selectedGang !== null || selectedPBBStatus !== 'all' || searchQuery !== '';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Gang Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="gang-filter" className="text-sm font-medium text-gray-700">
              Gang:
            </label>
            <select
              id="gang-filter"
              value={selectedGang || ''}
              onChange={(e) => onGangChange(e.target.value || null)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Semua Gang</option>
              {gangs.map((gang) => (
                <option key={gang} value={gang}>
                  Gang {gang}
                </option>
              ))}
            </select>
          </div>

          {/* PBB Status Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="pbb-filter" className="text-sm font-medium text-gray-700">
              PBB:
            </label>
            <select
              id="pbb-filter"
              value={selectedPBBStatus}
              onChange={(e) => onPBBStatusChange(e.target.value as 'all' | PBBStatus)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="lunas">Lunas</option>
              <option value="belum">Belum Lunas</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              type="button"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-64">
            <input
              type="text"
              placeholder="Cari nama pemilik atau penghuni..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch();
                }
              }}
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Cari data warga"
            />
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            onClick={onSearch}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            type="button"
          >
            Cari
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterBar;
