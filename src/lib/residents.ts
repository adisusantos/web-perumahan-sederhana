/**
 * Helper functions untuk Dashboard Data Warga
 */

import type { Resident, PBBPayment, PBBStatus } from '@/types';

/**
 * Filter data sensitif (phone, email) untuk non-admin users
 * @param resident - Resident data
 * @param isAdmin - Whether user is admin
 * @returns Resident data dengan sensitive fields di-filter jika bukan admin
 */
export function filterSensitiveData(resident: Resident, isAdmin: boolean): Resident {
  if (isAdmin) {
    return resident;
  }

  return {
    ...resident,
    phone: null,
    email: null,
  };
}

/**
 * Filter array of residents untuk non-admin users
 * @param residents - Array of residents
 * @param isAdmin - Whether user is admin
 * @returns Array of residents dengan sensitive data di-filter
 */
export function filterResidentsSensitiveData(
  residents: Resident[],
  isAdmin: boolean
): Resident[] {
  return residents.map((resident) => filterSensitiveData(resident, isAdmin));
}

/**
 * Calculate statistik PBB dari array of payments
 * @param payments - Array of PBB payments
 * @returns Statistics object
 */
export function calculatePBBStats(payments: PBBPayment[]) {
  const totalRecords = payments.length;
  const lunasCount = payments.filter((p) => p.status === 'lunas').length;
  const belumCount = payments.filter((p) => p.status === 'belum').length;

  const lunasPercentage = totalRecords > 0 
    ? Math.round((lunasCount / totalRecords) * 100 * 10) / 10 
    : 0;
  const belumPercentage = totalRecords > 0 
    ? Math.round((belumCount / totalRecords) * 100 * 10) / 10 
    : 0;

  // Group by year
  const byYearMap = new Map<number, { lunas: number; belum: number }>();
  
  payments.forEach((payment) => {
    const existing = byYearMap.get(payment.tax_year) || { lunas: 0, belum: 0 };
    if (payment.status === 'lunas') {
      existing.lunas++;
    } else {
      existing.belum++;
    }
    byYearMap.set(payment.tax_year, existing);
  });

  const byYear = Array.from(byYearMap.entries())
    .map(([tax_year, counts]) => ({
      tax_year,
      lunas: counts.lunas,
      belum: counts.belum,
    }))
    .sort((a, b) => b.tax_year - a.tax_year); // Sort descending

  return {
    total_records: totalRecords,
    lunas_count: lunasCount,
    belum_count: belumCount,
    lunas_percentage: lunasPercentage,
    belum_percentage: belumPercentage,
    by_year: byYear,
  };
}

/**
 * Get status PBB terbaru untuk sebuah rumah
 * @param payments - Array of PBB payments untuk rumah tersebut
 * @returns Latest PBB payment atau null jika tidak ada
 */
export function getLatestPBBStatus(
  payments: PBBPayment[]
): { tax_year: number; status: PBBStatus } | null {
  if (payments.length === 0) {
    return null;
  }

  const sorted = [...payments].sort((a, b) => b.tax_year - a.tax_year);
  const latest = sorted[0];

  return {
    tax_year: latest.tax_year,
    status: latest.status,
  };
}

/**
 * Format nomor telepon untuk display
 * @param phone - Phone number
 * @returns Formatted phone number atau null
 */
export function formatPhone(phone: string | null): string | null {
  if (!phone) return null;

  // Convert +62 to 0
  if (phone.startsWith('+62')) {
    return '0' + phone.slice(3);
  }

  return phone;
}

/**
 * Count houses by gang
 * @param houses - Array of houses
 * @returns Object dengan gang sebagai key dan count sebagai value
 */
export function countHousesByGang(
  houses: Array<{ gang: string }>
): Record<string, number> {
  const counts: Record<string, number> = {};

  houses.forEach((house) => {
    counts[house.gang] = (counts[house.gang] || 0) + 1;
  });

  return counts;
}
