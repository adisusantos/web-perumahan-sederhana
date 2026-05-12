/**
 * Centralized Messages
 * 
 * Semua pesan error, success, dan info dalam Bahasa Indonesia.
 */

export const ERROR_MESSAGES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'Anda harus login terlebih dahulu.',
  FORBIDDEN: 'Anda tidak memiliki akses untuk melakukan operasi ini.',
  ADMIN_ONLY: 'Hanya admin yang dapat melakukan operasi ini.',
  
  // Validation
  REQUIRED_FIELD: 'Field ini wajib diisi.',
  INVALID_EMAIL: 'Format email tidak valid.',
  INVALID_PHONE: 'Format nomor telepon tidak valid. Gunakan format Indonesia (08xxx).',
  INVALID_TAX_YEAR: 'Tahun pajak tidak valid. Harus antara 2000-2100.',
  ADDRESS_REQUIRED: 'Alamat tidak boleh kosong.',
  GANG_REQUIRED: 'Gang harus dipilih atau diisi.',
  OWNER_NAME_REQUIRED: 'Nama pemilik tidak boleh kosong.',
  RESIDENT_NAME_REQUIRED: 'Nama penghuni tidak boleh kosong.',
  
  // Database Errors
  DUPLICATE_ADDRESS: 'Alamat rumah sudah terdaftar.',
  DUPLICATE_PBB: 'Data PBB untuk tahun ini sudah ada.',
  HOUSE_NOT_FOUND: 'Data rumah tidak ditemukan.',
  RESIDENT_NOT_FOUND: 'Data penghuni tidak ditemukan.',
  PBB_NOT_FOUND: 'Data PBB tidak ditemukan.',
  
  // Network & Server Errors
  NETWORK_ERROR: 'Terjadi kesalahan jaringan. Silakan coba lagi.',
  SERVER_ERROR: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
  UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui.',
  
  // Operation Errors
  CREATE_FAILED: 'Gagal menyimpan data.',
  UPDATE_FAILED: 'Gagal mengupdate data.',
  DELETE_FAILED: 'Gagal menghapus data.',
  EXPORT_FAILED: 'Gagal mengekspor data.',
  FETCH_FAILED: 'Gagal mengambil data.',
} as const;

export const SUCCESS_MESSAGES = {
  // CRUD Operations
  HOUSE_CREATED: 'Data rumah berhasil ditambahkan.',
  HOUSE_UPDATED: 'Data rumah berhasil diupdate.',
  HOUSE_DELETED: 'Data rumah berhasil dihapus.',
  
  RESIDENT_CREATED: 'Data penghuni berhasil ditambahkan.',
  RESIDENT_UPDATED: 'Data penghuni berhasil diupdate.',
  RESIDENT_DELETED: 'Data penghuni berhasil dihapus.',
  
  PBB_CREATED: 'Data PBB berhasil ditambahkan.',
  PBB_UPDATED: 'Status PBB berhasil diupdate.',
  
  // Export
  EXPORT_SUCCESS: 'Data berhasil diekspor.',
} as const;

export const INFO_MESSAGES = {
  // Loading States
  LOADING: 'Memuat data...',
  SAVING: 'Menyimpan data...',
  DELETING: 'Menghapus data...',
  EXPORTING: 'Mengekspor data...',
  
  // Empty States
  NO_DATA: 'Belum ada data.',
  NO_RESULTS: 'Tidak ada hasil yang ditemukan.',
  NO_RESIDENTS: 'Belum ada penghuni.',
  NO_PBB_HISTORY: 'Belum ada riwayat PBB.',
} as const;

export const CONFIRM_MESSAGES = {
  // Delete Confirmations
  DELETE_HOUSE_TITLE: 'Hapus Data Rumah?',
  DELETE_HOUSE_MESSAGE: 'Apakah Anda yakin ingin menghapus data rumah ini? Semua data penghuni dan riwayat PBB akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.',
  
  DELETE_RESIDENT_TITLE: 'Hapus Data Penghuni?',
  DELETE_RESIDENT_MESSAGE: 'Apakah Anda yakin ingin menghapus data penghuni ini? Tindakan ini tidak dapat dibatalkan.',
  
  // Action Confirmations
  CONFIRM_BUTTON: 'Ya, Hapus',
  CANCEL_BUTTON: 'Batal',
} as const;
