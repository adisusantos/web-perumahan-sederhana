/**
 * AddHouseModal Component
 * 
 * Modal untuk menambah rumah baru beserta penghuni.
 */

'use client';

import React, { useState } from 'react';
import { validateAddress, validateGang, validateName, validateEmail, validatePhone } from '@/lib/validation';

interface ResidentInput {
  name: string;
  phone: string;
  email: string;
  is_primary: boolean;
}

interface AddHouseModalProps {
  isOpen: boolean;
  gangs: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddHouseModal({ isOpen, gangs, onClose, onSuccess }: AddHouseModalProps) {
  const [address, setAddress] = useState('');
  const [gang, setGang] = useState('');
  const [customGang, setCustomGang] = useState('');
  const [isCustomGang, setIsCustomGang] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [residents, setResidents] = useState<ResidentInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAddResident = () => {
    setResidents([...residents, { name: '', phone: '', email: '', is_primary: false }]);
  };

  const handleRemoveResident = (index: number) => {
    setResidents(residents.filter((_, i) => i !== index));
  };

  const handleResidentChange = (index: number, field: keyof ResidentInput, value: string | boolean) => {
    const updated = [...residents];
    updated[index] = { ...updated[index], [field]: value };
    setResidents(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!validateAddress(address)) {
      setError('Alamat tidak boleh kosong.');
      return;
    }
    
    // Validate gang (either from dropdown or custom input)
    const finalGang = isCustomGang ? customGang : gang;
    if (!validateGang(finalGang)) {
      setError('Gang harus dipilih atau diisi.');
      return;
    }
    
    if (!validateName(ownerName)) {
      setError('Nama pemilik tidak boleh kosong.');
      return;
    }

    // Validate residents
    for (const resident of residents) {
      if (!validateName(resident.name)) {
        setError('Nama penghuni tidak boleh kosong.');
        return;
      }
      if (resident.email && !validateEmail(resident.email)) {
        setError('Format email tidak valid.');
        return;
      }
      if (resident.phone && !validatePhone(resident.phone)) {
        setError('Format nomor telepon tidak valid.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const finalGang = isCustomGang ? customGang : gang;
      
      const response = await fetch('/api/admin/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          gang: finalGang.trim(),
          owner_name: ownerName.trim(),
          residents: residents.map(r => ({
            name: r.name.trim(),
            phone: r.phone.trim() || null,
            email: r.email.trim() || null,
            is_primary: r.is_primary,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Terjadi kesalahan saat menyimpan data.');
        setIsSubmitting(false);
        return;
      }

      // Reset form
      setAddress('');
      setGang('');
      setCustomGang('');
      setIsCustomGang(false);
      setOwnerName('');
      setResidents([]);
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

  if (!isOpen) return null;

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

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                Tambah Rumah Baru
              </h3>

              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="mt-4 space-y-4">
                {/* Address */}
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Alamat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Contoh: A-12"
                    required
                    aria-required="true"
                    aria-describedby="address-hint"
                  />
                  <p id="address-hint" className="sr-only">Masukkan alamat rumah, contoh: A-12</p>
                </div>

                {/* Gang */}
                <div>
                  <label htmlFor="gang" className="block text-sm font-medium text-gray-700">
                    Gang <span className="text-red-500">*</span>
                  </label>
                  
                  {!isCustomGang ? (
                    <div className="space-y-2">
                      <select
                        id="gang"
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

                {/* Owner Name */}
                <div>
                  <label htmlFor="owner_name" className="block text-sm font-medium text-gray-700">
                    Nama Pemilik <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="owner_name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Residents */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Penghuni (Opsional)</label>
                    <button
                      type="button"
                      onClick={handleAddResident}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Tambah Penghuni
                    </button>
                  </div>

                  {residents.map((resident, index) => (
                    <div key={index} className="mt-3 rounded-md border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Penghuni {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveResident(index)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Hapus
                        </button>
                      </div>

                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Nama"
                          value={resident.name}
                          onChange={(e) => handleResidentChange(index, 'name', e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="tel"
                          placeholder="Nomor Telepon (08xxx)"
                          value={resident.phone}
                          onChange={(e) => handleResidentChange(index, 'phone', e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={resident.email}
                          onChange={(e) => handleResidentChange(index, 'email', e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={resident.is_primary}
                            onChange={(e) => handleResidentChange(index, 'is_primary', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Penghuni Utama</span>
                        </label>
                      </div>
                    </div>
                  ))}
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

export default AddHouseModal;
