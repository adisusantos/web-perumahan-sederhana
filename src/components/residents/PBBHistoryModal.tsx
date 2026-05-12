/**
 * PBBHistoryModal Component
 * 
 * Modal untuk melihat dan manage history pembayaran PBB.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { PBBPayment, PBBStatus } from '@/types';
import { validateTaxYear } from '@/lib/validation';

interface PBBHistoryModalProps {
  isOpen: boolean;
  houseId: string | null;
  houseAddress: string;
  isAdmin: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PBBHistoryModal({ isOpen, houseId, houseAddress, isAdmin, onClose, onSuccess }: PBBHistoryModalProps) {
  const [payments, setPayments] = useState<PBBPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState<PBBStatus>('belum');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && houseId) {
      fetchPayments();
    }
  }, [isOpen, houseId]);

  const fetchPayments = async () => {
    if (!houseId) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/residents/pbb-history?house_id=${houseId}`);
      
      if (!response.ok) {
        setError('Gagal mengambil data pembayaran PBB.');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setPayments(data.data || []);
      setIsLoading(false);
    } catch (err) {
      setError('Terjadi kesalahan jaringan.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateTaxYear(taxYear)) {
      setError('Tahun pajak harus antara 2000-2100.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/residents/pbb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house_id: houseId,
          tax_year: taxYear,
          status,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Terjadi kesalahan saat menyimpan data.');
        setIsSubmitting(false);
        return;
      }

      // Reset form
      setTaxYear(new Date().getFullYear());
      setStatus('belum');
      setNotes('');
      setIsAdding(false);
      fetchPayments();
      onSuccess();
    } catch (err) {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (paymentId: string, newStatus: PBBStatus) => {
    try {
      const response = await fetch('/api/admin/residents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pbb',
          id: paymentId,
          data: { status: newStatus },
        }),
      });

      if (!response.ok) {
        setError('Gagal mengupdate status PBB.');
        return;
      }

      fetchPayments();
      onSuccess();
    } catch (err) {
      setError('Terjadi kesalahan jaringan.');
    }
  };

  if (!isOpen || !houseId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                  History Pembayaran PBB
                </h3>
                <p className="mt-1 text-sm text-gray-500">Rumah: {houseAddress}</p>
              </div>
              {isAdmin && !isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  + Tambah Pembayaran
                </button>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Add Payment Form */}
            {isAdding && isAdmin && (
              <form onSubmit={handleSubmit} className="mt-4 rounded-md border border-gray-200 p-4">
                <h4 className="text-sm font-medium text-gray-900">Tambah Pembayaran Baru</h4>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="tax-year" className="block text-sm font-medium text-gray-700">
                      Tahun Pajak
                    </label>
                    <input
                      type="number"
                      id="tax-year"
                      value={taxYear}
                      onChange={(e) => setTaxYear(parseInt(e.target.value, 10))}
                      min="2000"
                      max="2100"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as PBBStatus)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="lunas">Lunas</option>
                      <option value="belum">Belum Lunas</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">&nbsp;</label>
                    <div className="mt-1 flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        disabled={isSubmitting}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Catatan (Opsional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </form>
            )}

            {/* Payment History Table */}
            <div className="mt-4">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 rounded bg-gray-200"></div>
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="rounded-md border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500">Belum ada data pembayaran PBB.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Tahun
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Tanggal Lapor
                        </th>
                        {isAdmin && (
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Aksi
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                            {payment.tax_year}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {payment.status === 'lunas' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
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
                                Belum Lunas
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                            {new Date(payment.reported_at).toLocaleDateString('id-ID')}
                          </td>
                          {isAdmin && (
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              <button
                                onClick={() =>
                                  handleUpdateStatus(
                                    payment.id,
                                    payment.status === 'lunas' ? 'belum' : 'lunas'
                                  )
                                }
                                className="text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                Ubah ke {payment.status === 'lunas' ? 'Belum Lunas' : 'Lunas'}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PBBHistoryModal;
