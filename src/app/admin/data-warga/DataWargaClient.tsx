/**
 * DataWargaClient Component
 * 
 * Client component untuk Dashboard Data Warga dengan state management.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { HouseWithResidents, ResidentStats, House, Resident, PBBStatus } from '@/types';
import StatsCards from '@/components/residents/StatsCards';
import FilterBar from '@/components/residents/FilterBar';
import DataWargaTable from '@/components/residents/DataWargaTable';
import AddHouseModal from '@/components/residents/AddHouseModal';
import EditHouseModal from '@/components/residents/EditHouseModal';
import AddResidentModal from '@/components/residents/AddResidentModal';
import EditResidentModal from '@/components/residents/EditResidentModal';
import PBBHistoryModal from '@/components/residents/PBBHistoryModal';
import ExportButton from '@/components/residents/ExportButton';
import Toast from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, CONFIRM_MESSAGES } from '@/lib/messages';

interface DataWargaClientProps {
  isAdmin: boolean;
}

export default function DataWargaClient({ isAdmin }: DataWargaClientProps) {
  // Toast hook
  const { toasts, hideToast, success, error: showError } = useToast();

  // Data state
  const [houses, setHouses] = useState<HouseWithResidents[]>([]);
  const [stats, setStats] = useState<ResidentStats | null>(null);
  const [gangs, setGangs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [selectedGang, setSelectedGang] = useState<string | null>(null);
  const [selectedPBBStatus, setSelectedPBBStatus] = useState<'all' | PBBStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Modal state
  const [isAddHouseModalOpen, setIsAddHouseModalOpen] = useState(false);
  const [isEditHouseModalOpen, setIsEditHouseModalOpen] = useState(false);
  const [isAddResidentModalOpen, setIsAddResidentModalOpen] = useState(false);
  const [isEditResidentModalOpen, setIsEditResidentModalOpen] = useState(false);
  const [isPBBHistoryModalOpen, setIsPBBHistoryModalOpen] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedHouseForPBB, setSelectedHouseForPBB] = useState<{ id: string; address: string } | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (selectedGang) params.append('gang', selectedGang);
      if (selectedPBBStatus !== 'all') params.append('pbb_status', selectedPBBStatus);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/residents?${params.toString()}`);

      if (!response.ok) {
        showError(ERROR_MESSAGES.FETCH_FAILED);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setHouses(data.data.houses);
      setTotalPages(data.data.pagination.total_pages);
      setIsLoading(false);
    } catch (err) {
      showError(ERROR_MESSAGES.NETWORK_ERROR);
      setIsLoading(false);
    }
  }, [page, selectedGang, selectedPBBStatus, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedGang) params.append('gang', selectedGang);

      const response = await fetch(`/api/admin/residents/stats?${params.toString()}`);

      if (!response.ok) return;

      const data = await response.json();
      setStats(data.data);

      // Extract unique gangs
      const uniqueGangs = Object.keys(data.data.houses_by_gang).sort();
      setGangs(uniqueGangs);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [selectedGang]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handlers
  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleClearFilters = () => {
    setSelectedGang(null);
    setSelectedPBBStatus('all');
    setSearchQuery('');
    setPage(1);
  };

  const handleRefresh = () => {
    fetchData();
    fetchStats();
  };

  const handleEditHouse = (houseId: string) => {
    const house = houses.find((h) => h.id === houseId);
    if (house) {
      setSelectedHouse(house);
      setIsEditHouseModalOpen(true);
    }
  };

  const handleDeleteHouse = (houseId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: CONFIRM_MESSAGES.DELETE_HOUSE_TITLE,
      message: CONFIRM_MESSAGES.DELETE_HOUSE_MESSAGE,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/residents?type=house&id=${houseId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            showError(ERROR_MESSAGES.DELETE_FAILED);
            return;
          }

          success(SUCCESS_MESSAGES.HOUSE_DELETED);
          handleRefresh();
        } catch (err) {
          showError(ERROR_MESSAGES.NETWORK_ERROR);
        } finally {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
    });
  };

  const handleAddResident = (houseId: string) => {
    const house = houses.find((h) => h.id === houseId);
    if (house) {
      setSelectedHouseForPBB({ id: house.id, address: `${house.address} - Gang ${house.gang}` });
      setIsAddResidentModalOpen(true);
    }
  };

  const handleViewPBB = (houseId: string) => {
    const house = houses.find((h) => h.id === houseId);
    if (house) {
      setSelectedHouseForPBB({ id: house.id, address: `${house.address} - Gang ${house.gang}` });
      setIsPBBHistoryModalOpen(true);
    }
  };

  const handleEditResident = (resident: Resident) => {
    setSelectedResident(resident);
    setIsEditResidentModalOpen(true);
  };

  const handleDeleteResident = (residentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: CONFIRM_MESSAGES.DELETE_RESIDENT_TITLE,
      message: CONFIRM_MESSAGES.DELETE_RESIDENT_MESSAGE,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/residents?type=resident&id=${residentId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            showError(ERROR_MESSAGES.DELETE_FAILED);
            return;
          }

          success(SUCCESS_MESSAGES.RESIDENT_DELETED);
          handleRefresh();
        } catch (err) {
          showError(ERROR_MESSAGES.NETWORK_ERROR);
        } finally {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Data Warga</h1>
          <p className="mt-2 text-sm text-gray-600">
            Kelola data warga perumahan Bukit Pandawa
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-6">
          <StatsCards stats={stats || { total_houses: 0, houses_by_gang: {}, pbb_stats: { total_records: 0, lunas_count: 0, belum_count: 0, lunas_percentage: 0, belum_percentage: 0, by_year: [] } }} isLoading={!stats} />
        </div>

        {/* Filter Bar */}
        <div className="mb-6">
          <FilterBar
            gangs={gangs}
            selectedGang={selectedGang}
            selectedPBBStatus={selectedPBBStatus}
            searchQuery={searchQuery}
            onGangChange={setSelectedGang}
            onPBBStatusChange={setSelectedPBBStatus}
            onSearchChange={setSearchQuery}
            onSearch={handleSearch}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-3">
            {isAdmin && (
              <button
                onClick={() => setIsAddHouseModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Rumah
              </button>
            )}
          </div>

          {isAdmin && <ExportButton selectedGang={selectedGang} />}
        </div>

        {/* Data Table */}
        <DataWargaTable
          houses={houses}
          isAdmin={isAdmin}
          isLoading={isLoading}
          onEdit={handleEditHouse}
          onDelete={handleDeleteHouse}
          onAddResident={handleAddResident}
          onEditResident={handleEditResident}
          onViewPBB={handleViewPBB}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}

        {/* Modals */}
        <AddHouseModal
          isOpen={isAddHouseModalOpen}
          gangs={gangs}
          onClose={() => setIsAddHouseModalOpen(false)}
          onSuccess={() => {
            success(SUCCESS_MESSAGES.HOUSE_CREATED);
            handleRefresh();
          }}
        />

        <EditHouseModal
          isOpen={isEditHouseModalOpen}
          house={selectedHouse}
          gangs={gangs}
          onClose={() => {
            setIsEditHouseModalOpen(false);
            setSelectedHouse(null);
          }}
          onSuccess={() => {
            success(SUCCESS_MESSAGES.HOUSE_UPDATED);
            handleRefresh();
          }}
        />

        <AddResidentModal
          isOpen={isAddResidentModalOpen}
          houseId={selectedHouseForPBB?.id || null}
          houseAddress={selectedHouseForPBB?.address || ''}
          onClose={() => {
            setIsAddResidentModalOpen(false);
            setSelectedHouseForPBB(null);
          }}
          onSuccess={() => {
            success(SUCCESS_MESSAGES.RESIDENT_CREATED);
            handleRefresh();
          }}
        />

        <EditResidentModal
          isOpen={isEditResidentModalOpen}
          resident={selectedResident}
          onClose={() => {
            setIsEditResidentModalOpen(false);
            setSelectedResident(null);
          }}
          onSuccess={() => {
            success(SUCCESS_MESSAGES.RESIDENT_UPDATED);
            handleRefresh();
          }}
          onDelete={handleDeleteResident}
        />

        <PBBHistoryModal
          isOpen={isPBBHistoryModalOpen}
          houseId={selectedHouseForPBB?.id || null}
          houseAddress={selectedHouseForPBB?.address || ''}
          isAdmin={isAdmin}
          onClose={() => {
            setIsPBBHistoryModalOpen(false);
            setSelectedHouseForPBB(null);
          }}
          onSuccess={() => {
            success(SUCCESS_MESSAGES.PBB_UPDATED);
            handleRefresh();
          }}
        />

        {/* Toast Notifications */}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        ))}

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={CONFIRM_MESSAGES.CONFIRM_BUTTON}
          cancelText={CONFIRM_MESSAGES.CANCEL_BUTTON}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        />
      </div>
    </div>
  );
}
