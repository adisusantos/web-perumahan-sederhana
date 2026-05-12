/**
 * EditResidentModal Component
 * 
 * Modal untuk edit data penghuni.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { Resident } from '@/types';
import { validateName, validateEmail, validatePhone } from '@/lib/validation';

interface EditResidentModalProps {
  isOpen: boolean;
  resident: Resident | null;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (residentId: string) => void;
}

export function EditResidentModal({ isOpen, resident, onClose, onSuccess, onDelete }: EditResidentModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resident) {
      setName(resident.name);
      setPhone(resident.phone || '');
      setEmail(resident.email || '');
      setIsPrimary(resident.is_primary);
    }
  }, [resident]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!resident) return;

    // Validation
    if (!validateName(name)) {
      setError('Nama tidak boleh kosong.');
      return;
    }
    if (email && !validateEmail(email)) {
      setError('Format email tidak valid.');
      return;
    }
    if (phone && !validatePhone(phone)) {
      setError('Format nomor telepon tidak valid.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/residents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'resident',
          id: resident.id,
          data: {
            name: name.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
            is_primary: isPrimary,
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

  const handleDeleteClick = () => {
    if (resident && confirm('Apakah Anda yakin ingin menghapus penghuni ini?')) {
      onDelete(resident.id);
      onClose();
    }
  };

  if (!isOpen || !resident) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                  Edit Data Penghuni
                </h3>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="text-sm text-red-600 hover:text-red-700 hover:underline"
                >
                  Hapus Penghuni
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="edit-resident-name" className="block text-sm font-medium text-gray-700">
                    Nama <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="edit-resident-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-resident-phone" className="block text-sm font-medium text-gray-700">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    id="edit-resident-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xxx"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-resident-email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="edit-resident-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-resident-primary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="edit-resident-primary" className="ml-2 block text-sm text-gray-700">
                    Penghuni Utama
                  </label>
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

export default EditResidentModal;
