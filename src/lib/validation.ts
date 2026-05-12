/**
 * Validation functions untuk Dashboard Data Warga
 */

/**
 * Validasi format email
 * @param email - Email address to validate
 * @returns true jika email valid, false jika tidak
 */
export function validateEmail(email: string): boolean {
  if (!email || email.trim() === '') {
    return false;
  }

  // RFC 5322 simplified regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validasi format nomor telepon Indonesia
 * Menerima format: 08xxxxxxxxxx atau +628xxxxxxxxxx
 * @param phone - Phone number to validate
 * @returns true jika phone valid, false jika tidak
 */
export function validatePhone(phone: string): boolean {
  if (!phone || phone.trim() === '') {
    return false;
  }

  const cleanPhone = phone.trim().replace(/[\s-]/g, '');

  // Format: 08xxxxxxxxxx (minimal 10 digit, maksimal 15 digit)
  const localFormat = /^08\d{8,13}$/;
  
  // Format: +628xxxxxxxxxx (minimal 12 digit, maksimal 17 digit)
  const internationalFormat = /^\+628\d{8,13}$/;

  return localFormat.test(cleanPhone) || internationalFormat.test(cleanPhone);
}

/**
 * Validasi tahun pajak (tax year)
 * Range valid: 2000-2100
 * @param year - Tax year to validate
 * @returns true jika year valid, false jika tidak
 */
export function validateTaxYear(year: number): boolean {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

/**
 * Validasi alamat rumah (tidak boleh kosong)
 * @param address - Address to validate
 * @returns true jika address valid, false jika tidak
 */
export function validateAddress(address: string): boolean {
  return Boolean(address && address.trim().length > 0);
}

/**
 * Validasi gang (tidak boleh kosong)
 * @param gang - Gang to validate
 * @returns true jika gang valid, false jika tidak
 */
export function validateGang(gang: string): boolean {
  return Boolean(gang && gang.trim().length > 0);
}

/**
 * Validasi nama (tidak boleh kosong)
 * @param name - Name to validate
 * @returns true jika name valid, false jika tidak
 */
export function validateName(name: string): boolean {
  return Boolean(name && name.trim().length > 0);
}
