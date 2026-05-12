/**
 * EditHouseModal Component
 * 
 * Modal untuk edit data rumah.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { House } from '@/types';
import { validateAddress, validateGang, validateName } from '@/lib/validation';

interface EditHouseModalProps {
  isOpen: boolean;
  house: House | null;
  gangs: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditHouseModal({ isOpen, house, gangs, onClose, onSuccess }: EditHouseModalProps) {
  const [address, setAddress] = useState('');
  const [gang, setGang] = useState('');
  const [customGang, setCustomGang] = useState('');
  const [isCustomGang, setIsCustomGang] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (house) {
      setAddress(house.address);
      setGang(house.gang);
      setOwnerName(house.owner_name);
      // Check if current gang is in the list
      if (!gangs.includes(house.gang)) {
        setIsCustomGang(true);
        setCustomGang(house.gang);
      }
    }
  }, [house, gangs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!house) return;

    // Validation
    if (!validateAddress(address)) {
      setError('Alamat tidak boleh kosong.');
      return;
    }
    
    const finalGang = isCustomGang ? customGang : gang;
    if (!validateGang(finalGang)) {
      setError('Gang harus dipilih atau diisi.');
      return;
    }
    
    if (!validateName(ownerName)) {
      setError('Nama pemilik tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/residents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'house',
          id: house.id,
          data: {
            address: address.trim(),
            gang: finalGang.trim(),
            owner_name: ownerName.trim(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Terjadi kesalahan saat mengupdate data.');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) {
      onClose();
    }
  };

  if (!isOpen || !house) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto" 
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                Edit Data Rumah
              </h3>

              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700">
                    Alamat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="edit-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="edit-gang" className="block text-sm font-medium text-gray-700">
                    Gang <span className="text-red-500">*</span>
                  </label>
                  
                  {!isCustomGang ? (
                    <div className="space-y-2">
                      <select
                        id="edit-gang"
                        value={gang}
                        onChange={(e) => setGang(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required={!isCustomGang}
                      >
                        <option value="">Pilih Gang</option>
                        {gangs.map((g) => (
                          <option key={g} value={g}>
                            Gang {g}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsCustomGang(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        + Tambah Gang Baru
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customGang}
                        onChange={(e) => setCustomGang(e.target.value)}
                        placeholder="Contoh: A, B, C"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required={isCustomGang}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomGang(false);
                          setCustomGang('');
                        }}
                        className="text-sm text-gray-600 hover:text-gray-700 hover:underline"
                      >
                        ← Kembali ke pilihan gang
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-owner-name" className="block text-sm font-medium text-gray-700">
                    Nama Pemilik <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="edit-owner-name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                    aria-required="true"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 sm:ml-3 sm:w-auto"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 sm:mt-0 sm:w-auto"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditHouseModal;
