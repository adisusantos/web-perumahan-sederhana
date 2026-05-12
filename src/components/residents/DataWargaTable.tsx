/**
 * DataWargaTable Component
 * 
 * Tabel untuk menampilkan data warga dengan action menu.
 */

'use client';

import React, { useState } from 'react';
import type { HouseWithResidents } from '@/types';

interface DataWargaTableProps {
  houses: HouseWithResidents[];
  isAdmin: boolean;
  isLoading?: boolean;
  onEdit: (houseId: string) => void;
  onDelete: (houseId: string) => void;
  onAddResident: (houseId: string) => void;
  onEditResident?: (resident: any) => void;
  onViewPBB: (houseId: string) => void;
}

/**
 * DataWargaTable component dengan action menu per row
 */
export function DataWargaTable({
  houses,
  isAdmin,
  isLoading = false,
  onEdit,
  onDelete,
  onAddResident,
  onEditResident,
  onViewPBB,
}: DataWargaTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom');

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="animate-pulse p-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (houses.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada data</h3>
        <p className="mt-1 text-sm text-gray-500">
          Belum ada data warga yang sesuai dengan filter Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Alamat
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Gang
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Pemilik
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Penghuni
              </th>
              {isAdmin && (
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Kontak
                </th>
              )}
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                PBB
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {houses.map((house) => (
              <tr key={house.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {house.address}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {house.gang}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {house.owner_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {house.residents.length > 0 ? (
                    <div className="space-y-2">
                      {house.residents.map((resident) => (
                        <div key={resident.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <span>{resident.name}</span>
                            {resident.is_primary && (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                Utama
                              </span>
                            )}
                          </div>
                          {isAdmin && onEditResident && (
                            <button
                              onClick={() => onEditResident(resident)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Edit penghuni"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {house.residents.length > 0 ? (
                      <div className="space-y-1">
                        {house.residents.map((resident) => (
                          <div key={resident.id} className="text-xs">
                            {resident.phone && <div>{resident.phone}</div>}
                            {resident.email && <div className="text-gray-400">{resident.email}</div>}
                            {!resident.phone && !resident.email && <span className="text-gray-400">-</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )}
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {house.latest_pbb ? (
                    <div className="flex items-center gap-2">
                      {house.latest_pbb.status === 'lunas' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Belum
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{house.latest_pbb.tax_year}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="relative whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="relative inline-block text-left">
                    <button
                      onClick={(e) => {
                        const button = e.currentTarget;
                        const rect = button.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const spaceAbove = rect.top;
                        
                        // If less than 200px space below, show menu above
                        setMenuPosition(spaceBelow < 200 && spaceAbove > 200 ? 'top' : 'bottom');
                        setOpenMenuId(openMenuId === house.id ? null : house.id);
                      }}
                      className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Aksi"
                      aria-haspopup="true"
                      aria-expanded={openMenuId === house.id}
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {openMenuId === house.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                          aria-hidden="true"
                        ></div>
                        <div 
                          className={`absolute right-0 z-20 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${
                            menuPosition === 'top' 
                              ? 'bottom-full mb-2 origin-bottom-right' 
                              : 'mt-2 origin-top-right'
                          }`}
                        >
                          <div className="py-1" role="menu">
                            <button
                              onClick={() => {
                                onViewPBB(house.id);
                                setOpenMenuId(null);
                              }}
                              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                              role="menuitem"
                            >
                              Kelola PBB
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => {
                                    onEdit(house.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                  role="menuitem"
                                >
                                  Edit Rumah
                                </button>
                                <button
                                  onClick={() => {
                                    onAddResident(house.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                  role="menuitem"
                                >
                                  Tambah Penghuni
                                </button>
                                <button
                                  onClick={() => {
                                    onDelete(house.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                                  role="menuitem"
                                >
                                  Hapus Rumah
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataWargaTable;
