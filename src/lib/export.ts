/**
 * Export functions untuk Dashboard Data Warga
 */

import type { HouseWithResidents } from '@/types';

/**
 * Escape special characters untuk CSV format
 * @param value - Value to escape
 * @returns Escaped value
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Jika mengandung koma, double quote, atau newline, wrap dengan double quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape double quotes dengan double double quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generate CSV dari data warga
 * @param data - Array of houses with residents
 * @returns CSV string
 */
export function generateCSV(data: HouseWithResidents[]): string {
  // CSV Headers
  const headers = [
    'Alamat',
    'Gang',
    'Pemilik',
    'Penghuni',
    'Telepon',
    'Email',
    'Status PBB Terakhir',
    'Tahun PBB',
  ];

  const rows: string[] = [headers.join(',')];

  // Data rows
  data.forEach((house) => {
    if (house.residents.length === 0) {
      // House tanpa penghuni
      rows.push([
        escapeCSV(house.address),
        escapeCSV(house.gang),
        escapeCSV(house.owner_name),
        escapeCSV(''),
        escapeCSV(''),
        escapeCSV(''),
        escapeCSV(house.latest_pbb?.status || ''),
        escapeCSV(house.latest_pbb?.tax_year || ''),
      ].join(','));
    } else {
      // House dengan penghuni (satu row per penghuni)
      house.residents.forEach((resident, index) => {
        rows.push([
          escapeCSV(house.address),
          escapeCSV(house.gang),
          escapeCSV(house.owner_name),
          escapeCSV(resident.name),
          escapeCSV(resident.phone),
          escapeCSV(resident.email),
          // PBB info hanya di row pertama
          index === 0 ? escapeCSV(house.latest_pbb?.status || '') : '',
          index === 0 ? escapeCSV(house.latest_pbb?.tax_year || '') : '',
        ].join(','));
      });
    }
  });

  return rows.join('\n');
}

/**
 * Generate filename untuk export dengan timestamp
 * @returns Filename string
 */
export function generateExportFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `data-warga-${year}-${month}-${day}.csv`;
}

/**
 * Trigger download file di browser
 * @param content - File content
 * @param filename - Filename
 * @param mimeType - MIME type (default: text/csv)
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/csv;charset=utf-8;'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
