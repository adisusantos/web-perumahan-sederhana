# Rencana Implementasi: Dashboard Data Warga

## Ringkasan

Implementasi fitur Dashboard Data Warga untuk mengelola database warga perumahan Bukit Pandawa secara digital. Fitur ini mencakup database schema, API routes, UI components, dan kontrol akses berbasis role (admin vs ketua_gang).

## Tugas Implementasi

- [x] 1. Setup Database Schema dan RLS Policies
  - [x] 1.1 Buat migration file `003_resident_database.sql`
    - Buat tabel `houses` dengan kolom id, address, gang, owner_name, timestamps
    - Buat tabel `residents` dengan kolom id, house_id, name, phone, email, is_primary, timestamps
    - Buat tabel `pbb_payments` dengan kolom id, house_id, tax_year, status, reported_at, reported_by, notes, created_at
    - Buat tabel `audit_logs` dengan kolom id, table_name, record_id, action, changed_by, changed_at, old_data, new_data
    - Tambahkan indexes untuk performa query
    - Tambahkan UNIQUE constraints untuk data integrity
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2_

  - [x] 1.2 Implementasi RLS policies untuk kontrol akses
    - Buat policies untuk tabel `houses` (admin full access, ketua_gang read only)
    - Buat policies untuk tabel `residents` (admin full access, ketua_gang read only)
    - Buat policies untuk tabel `pbb_payments` (admin full access, ketua_gang read only)
    - Buat policies untuk tabel `audit_logs` (admin read only)
    - Enable RLS pada semua tabel
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3_

  - [x] 1.3 Implementasi database triggers
    - Buat function `audit_log_changes()` untuk audit logging
    - Buat triggers untuk audit logging pada houses, residents, pbb_payments
    - Buat function `update_updated_at_column()` untuk auto-update timestamps
    - Buat triggers untuk auto-update updated_at pada houses dan residents
    - _Requirements: 15.1, 15.2_

  - [ ]* 1.4 Test RLS policies secara manual
    - Test admin dapat read/write semua data
    - Test ketua_gang dapat read tapi tidak write
    - Test anonymous tidak dapat akses data
    - Seed test data untuk development

- [x] 2. Checkpoint - Verifikasi Database Setup
  - Pastikan migration berhasil dijalankan
  - Pastikan RLS policies berfungsi dengan benar
  - Pastikan triggers berfungsi dengan benar
  - Tanyakan user jika ada pertanyaan

- [x] 3. Implementasi TypeScript Types dan Helper Functions
  - [x] 3.1 Buat types untuk data models
    - Buat interface `House`, `Resident`, `PBBPayment`, `AuditLog` di `src/types/index.ts`
    - Buat type `PBBStatus` dan `AuditAction`
    - Buat derived types `HouseWithResidents` dan `ResidentStats`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Buat validation functions
    - Buat function `validateEmail()` di `src/lib/validation.ts`
    - Buat function `validatePhone()` untuk format Indonesia
    - Buat function `validateTaxYear()` untuk range 2000-2100
    - _Requirements: 10.5, 10.6_

  - [ ]* 3.3 Write unit tests untuk validation functions
    - Test `validateEmail()` dengan valid dan invalid inputs
    - Test `validatePhone()` dengan format Indonesia
    - Test `validateTaxYear()` dengan valid dan invalid years
    - File: `src/lib/validation.test.ts`

  - [x] 3.4 Buat data transformation functions
    - Buat function `filterSensitiveData()` untuk filter phone/email non-admin
    - Buat function `calculatePBBStats()` untuk statistik PBB
    - Buat function `generateCSV()` untuk export data
    - File: `src/lib/residents.ts` dan `src/lib/export.ts`
    - _Requirements: 7.2, 7.3, 12.1, 12.2, 13.1, 13.2, 13.3, 13.4_

  - [ ]* 3.5 Write unit tests untuk transformation functions
    - Test `filterSensitiveData()` untuk admin dan non-admin
    - Test `calculatePBBStats()` dengan berbagai data
    - Test `generateCSV()` dengan special characters
    - File: `src/lib/residents.test.ts` dan `src/lib/export.test.ts`

- [x] 4. Implementasi API Route: GET /api/admin/residents
  - [x] 4.1 Buat route handler untuk list dan search data warga
    - Buat file `src/app/api/admin/residents/route.ts`
    - Implementasi GET handler dengan query params: gang, pbb_status, search, page, limit
    - Verifikasi authentication dan authorization
    - Query Supabase dengan filter dan pagination
    - Filter sensitive data untuk non-admin users
    - Return response dengan format yang sesuai
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.2, 7.3, 8.2, 8.3, 9.1, 9.2, 11.1, 11.2, 11.3, 11.4_

  - [ ]* 4.2 Write integration tests untuk GET /api/admin/residents
    - Test 403 untuk non-authenticated users
    - Test data filtering untuk ketua_gang (no sensitive data)
    - Test full data untuk admin
    - Test filter by gang parameter
    - Test search by name
    - File: `src/app/api/admin/residents/route.test.ts`

- [x] 5. Implementasi API Route: POST /api/admin/residents
  - [x] 5.1 Buat route handler untuk create house dan residents
    - Implementasi POST handler di `src/app/api/admin/residents/route.ts`
    - Verifikasi role admin (403 untuk non-admin)
    - Validasi input data (address, gang, owner_name required)
    - Insert house ke database
    - Insert residents jika ada
    - Handle duplicate address error (409)
    - Return success response dengan house_id
    - _Requirements: 2.3, 3.5, 10.1, 10.5, 10.6_

  - [ ]* 5.2 Write integration tests untuk POST /api/admin/residents
    - Test 403 untuk non-admin users
    - Test create house dengan valid data
    - Test 400 untuk missing required fields
    - Test 409 untuk duplicate address
    - Test create house dengan residents

- [x] 6. Implementasi API Route: PATCH /api/admin/residents
  - [x] 6.1 Buat route handler untuk update data
    - Implementasi PATCH handler di `src/app/api/admin/residents/route.ts`
    - Verifikasi role admin
    - Support update type: 'house', 'resident', 'pbb'
    - Validasi input berdasarkan type
    - Update data di database
    - Handle not found error (404)
    - Return success response
    - _Requirements: 2.4, 3.6, 4.5, 10.2_

  - [ ]* 6.2 Write integration tests untuk PATCH /api/admin/residents
    - Test update house data
    - Test update resident data
    - Test update PBB data
    - Test 404 untuk non-existent records
    - Test 403 untuk non-admin users

- [x] 7. Implementasi API Route: DELETE /api/admin/residents
  - [x] 7.1 Buat route handler untuk delete data
    - Implementasi DELETE handler di `src/app/api/admin/residents/route.ts`
    - Verifikasi role admin
    - Support delete type: 'house', 'resident'
    - Delete data dari database (cascade untuk house)
    - Handle not found error (404)
    - Return success response
    - _Requirements: 10.3_

  - [ ]* 7.2 Write integration tests untuk DELETE /api/admin/residents
    - Test delete house (cascade delete residents dan pbb)
    - Test delete resident
    - Test 404 untuk non-existent records
    - Test 403 untuk non-admin users

- [x] 8. Checkpoint - Verifikasi API Routes CRUD
  - Test semua API routes dengan Postman atau Thunder Client
  - Pastikan authentication dan authorization berfungsi
  - Pastikan validation berfungsi dengan benar
  - Pastikan error handling sesuai spesifikasi
  - Tanyakan user jika ada pertanyaan

- [x] 9. Implementasi API Route: POST /api/admin/residents/pbb
  - [x] 9.1 Buat route handler untuk tambah PBB payment
    - Buat file `src/app/api/admin/residents/pbb/route.ts`
    - Implementasi POST handler
    - Verifikasi role admin
    - Validasi input (house_id, tax_year, status)
    - Check house_id exists
    - Insert PBB payment ke database
    - Handle duplicate house_id + tax_year (409)
    - Return success response dengan payment id
    - _Requirements: 4.2_

  - [ ]* 9.2 Write integration tests untuk POST /api/admin/residents/pbb
    - Test create PBB payment dengan valid data
    - Test 400 untuk invalid tax_year
    - Test 404 untuk non-existent house_id
    - Test 409 untuk duplicate house_id + tax_year

- [x] 10. Implementasi API Route: GET /api/admin/residents/stats
  - [x] 10.1 Buat route handler untuk statistik data warga
    - Buat file `src/app/api/admin/residents/stats/route.ts`
    - Implementasi GET handler dengan optional gang filter
    - Verifikasi authentication (admin dan ketua_gang)
    - Query total houses dan houses by gang
    - Query PBB statistics (total, lunas, belum, by year)
    - Calculate percentages
    - Return statistics response
    - _Requirements: 5.5, 6.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [ ]* 10.2 Write integration tests untuk GET /api/admin/residents/stats
    - Test statistics untuk all gangs
    - Test statistics dengan gang filter
    - Test access untuk admin dan ketua_gang
    - Test 403 untuk non-authenticated users

- [x] 11. Implementasi API Route: GET /api/admin/residents/export
  - [x] 11.1 Buat route handler untuk export CSV
    - Buat file `src/app/api/admin/residents/export/route.ts`
    - Implementasi GET handler dengan optional gang filter
    - Verifikasi role admin (403 untuk non-admin)
    - Query data sesuai filter
    - Generate CSV dengan function `generateCSV()`
    - Set response headers untuk file download
    - Return CSV file dengan nama "data-warga-YYYY-MM-DD.csv"
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 11.2 Write integration tests untuk GET /api/admin/residents/export
    - Test export all data
    - Test export dengan gang filter
    - Test CSV format dan headers
    - Test 403 untuk non-admin users

- [x] 12. Checkpoint - Verifikasi Semua API Routes
  - Test semua API routes end-to-end
  - Pastikan semua responses sesuai spesifikasi
  - Pastikan error handling konsisten
  - Tanyakan user jika ada pertanyaan

- [x] 13. Implementasi UI Component: StatsCards
  - [x] 13.1 Buat component untuk menampilkan statistik cards
    - Buat file `src/components/residents/StatsCards.tsx`
    - Buat interface `StatsCardsProps` dengan data statistik
    - Implementasi component dengan 4 cards: Total Rumah, Gang A, Gang B, PBB Lunas
    - Style dengan Tailwind CSS
    - Responsive design untuk mobile dan desktop
    - _Requirements: 5.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 14. Implementasi UI Component: FilterBar
  - [x] 14.1 Buat component untuk filter dan search controls
    - Buat file `src/components/residents/FilterBar.tsx`
    - Buat interface `FilterBarProps` dengan callbacks
    - Implementasi dropdown untuk filter gang
    - Implementasi dropdown untuk filter PBB status
    - Implementasi search input dengan debounce (500ms)
    - Implementasi clear filters button
    - Style dengan Tailwind CSS
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 15. Implementasi UI Component: DataWargaTable
  - [x] 15.1 Buat component untuk tabel data warga
    - Buat file `src/components/residents/DataWargaTable.tsx`
    - Buat interface `DataWargaTableProps` dengan houses data dan callbacks
    - Implementasi tabel dengan kolom: Alamat, Gang, Pemilik, Penghuni, Kontak, PBB, Aksi
    - Conditional rendering untuk data sensitif (hanya admin)
    - Implementasi action menu per row (edit, delete, add resident, view PBB)
    - Implementasi loading state dan empty state
    - Responsive design dengan horizontal scroll untuk mobile
    - _Requirements: 5.1, 5.2, 5.3, 7.2, 7.3, 7.4, 8.2, 8.3_

- [x] 16. Implementasi UI Component: AddHouseModal
  - [x] 16.1 Buat modal untuk tambah rumah baru
    - Buat file `src/components/residents/AddHouseModal.tsx`
    - Buat interface `AddHouseModalProps` dengan isOpen, onClose, onSuccess
    - Implementasi form dengan fields: address, gang, owner_name
    - Implementasi dynamic list untuk residents (nama, telepon, email, is_primary)
    - Implementasi "Tambah Penghuni" button
    - Implementasi client-side validation
    - Implementasi submit handler yang call POST /api/admin/residents
    - Handle error dan success states
    - Style dengan Tailwind CSS
    - _Requirements: 2.3, 3.5, 10.1, 10.4, 10.5, 10.6_

- [x] 17. Implementasi UI Component: EditHouseModal
  - [x] 17.1 Buat modal untuk edit data rumah
    - Buat file `src/components/residents/EditHouseModal.tsx`
    - Buat interface `EditHouseModalProps` dengan house data
    - Implementasi form dengan pre-filled data
    - Implementasi submit handler yang call PATCH /api/admin/residents
    - Handle error dan success states
    - Style dengan Tailwind CSS
    - _Requirements: 2.4, 10.2, 10.4_

- [x] 18. Implementasi UI Component: AddResidentModal
  - [x] 18.1 Buat modal untuk tambah penghuni ke rumah existing
    - Buat file `src/components/residents/AddResidentModal.tsx`
    - Buat interface `AddResidentModalProps` dengan house_id
    - Implementasi form dengan fields: name, phone, email, is_primary
    - Implementasi client-side validation
    - Implementasi submit handler yang call POST /api/admin/residents (add resident)
    - Handle error dan success states
    - Style dengan Tailwind CSS
    - _Requirements: 3.5, 10.1_

- [x] 19. Implementasi UI Component: EditResidentModal
  - [x] 19.1 Buat modal untuk edit data penghuni
    - Buat file `src/components/residents/EditResidentModal.tsx`
    - Buat interface `EditResidentModalProps` dengan resident data
    - Implementasi form dengan pre-filled data
    - Implementasi submit handler yang call PATCH /api/admin/residents
    - Handle error dan success states
    - Style dengan Tailwind CSS
    - _Requirements: 3.6, 10.2_

- [x] 20. Implementasi UI Component: PBBHistoryModal
  - [x] 20.1 Buat modal untuk lihat dan manage history PBB
    - Buat file `src/components/residents/PBBHistoryModal.tsx`
    - Buat interface `PBBHistoryModalProps` dengan house_id
    - Fetch PBB history dari API
    - Implementasi tabel history dengan kolom: Tahun, Status, Tanggal Lapor, Catatan
    - Implementasi form untuk tambah PBB payment baru
    - Implementasi edit status PBB existing
    - Sort history by tax_year descending
    - Style dengan Tailwind CSS
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 21. Implementasi UI Component: ExportButton
  - [x] 21.1 Buat button component untuk export data
    - Buat file `src/components/residents/ExportButton.tsx`
    - Buat interface `ExportButtonProps` dengan current filters
    - Implementasi click handler yang call GET /api/admin/residents/export
    - Implementasi loading state saat export
    - Trigger file download di browser
    - Handle error states
    - Style dengan Tailwind CSS
    - _Requirements: 12.1, 12.3, 12.4_

- [x] 22. Checkpoint - Verifikasi UI Components
  - Test semua components secara isolated
  - Pastikan props dan callbacks berfungsi
  - Pastikan styling responsive
  - Tanyakan user jika ada pertanyaan

- [x] 23. Implementasi Main Page: /admin/data-warga
  - [x] 23.1 Buat page component untuk dashboard data warga
    - Buat file `src/app/admin/data-warga/page.tsx`
    - Implementasi server component untuk initial data fetch
    - Buat client component `DataWargaClient.tsx` untuk interactivity
    - Fetch user session dan verify authentication
    - Fetch initial data dari GET /api/admin/residents
    - Fetch statistics dari GET /api/admin/residents/stats
    - _Requirements: 5.1, 7.2, 8.2, 9.1, 9.2_

  - [x] 23.2 Wire semua UI components di DataWargaClient
    - Import dan render StatsCards dengan statistics data
    - Import dan render FilterBar dengan filter handlers
    - Import dan render DataWargaTable dengan houses data
    - Implementasi state management untuk filters, search, pagination
    - Implementasi handlers untuk open/close modals
    - Implementasi refresh data setelah CRUD operations
    - Handle loading states dan error states
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.4, 11.1, 11.2, 11.3, 11.4_

  - [x] 23.3 Implementasi conditional rendering berdasarkan role
    - Hide "Tambah Rumah" button untuk non-admin
    - Hide "Export CSV" button untuk non-admin
    - Disable action buttons untuk non-admin
    - Show/hide sensitive data berdasarkan role
    - _Requirements: 7.2, 7.3, 7.4, 8.2, 8.3, 8.4, 10.1, 10.2, 10.3, 12.1_

  - [x] 23.4 Implementasi pagination
    - Implementasi pagination controls (Previous, Next, page numbers)
    - Handle page change dan fetch new data
    - Update URL query params untuk shareable links
    - _Requirements: 5.4_

- [x] 24. Implementasi Error Handling dan User Feedback
  - [x] 24.1 Implementasi toast notifications
    - Install atau buat toast notification system
    - Show success toast setelah create/update/delete berhasil
    - Show error toast jika operasi gagal
    - Show loading toast untuk long operations (export)
    - _Requirements: 10.6_

  - [x] 24.2 Implementasi confirmation dialogs
    - Buat ConfirmDialog component
    - Show confirmation sebelum delete house (explain cascade delete)
    - Show confirmation sebelum delete resident
    - _Requirements: 10.3_

  - [x] 24.3 Implementasi error messages dalam Bahasa Indonesia
    - Translate semua error messages ke Bahasa Indonesia
    - Ensure error messages informatif dan user-friendly
    - _Requirements: 10.6_

- [ ] 25. Checkpoint - Verifikasi End-to-End Flow
  - Test complete user flow: login → view data → create → edit → delete
  - Test filter dan search functionality
  - Test pagination
  - Test export functionality
  - Test error handling dan user feedback
  - Tanyakan user jika ada pertanyaan

- [x] 26. Implementasi Accessibility Features
  - [x] 26.1 Tambahkan ARIA labels dan keyboard navigation
    - Tambahkan aria-label untuk action buttons
    - Tambahkan aria-describedby untuk form fields
    - Ensure keyboard navigation berfungsi (Tab, Enter, Escape)
    - Tambahkan focus indicators yang visible
    - Test dengan screen reader
    - _Requirements: 14.4, 14.5_

  - [x] 26.2 Ensure color contrast dan responsive design
    - Verify color contrast ratio memenuhi WCAG 2.1 Level AA
    - Test responsive design di berbagai screen sizes
    - Test di desktop (1920x1080), laptop (1366x768), tablet (768x1024), mobile (375x667)
    - Ensure table scrollable di mobile
    - _Requirements: 14.1, 14.2, 14.3, 14.6_

- [x] 27. Performance Optimization
  - [x] 27.1 Implementasi optimizations
    - Implementasi debouncing untuk search input (500ms)
    - Implementasi lazy loading untuk modals
    - Optimize database queries (use specific columns, not SELECT *)
    - Add loading skeletons untuk better UX
    - Verify page load time < 3 detik
    - Verify search response time < 2 detik
    - _Requirements: 11.4, 14.3_

- [ ] 28. Testing dan Bug Fixes
  - [ ]* 28.1 Run semua unit tests dan integration tests
    - Run `npm test` atau `vitest`
    - Ensure semua tests pass
    - Fix failing tests jika ada

  - [ ]* 28.2 Manual testing checklist
    - Test semua functionality sesuai manual testing checklist di design doc
    - Test di berbagai browsers (Chrome, Firefox, Safari)
    - Test di berbagai devices (desktop, tablet, mobile)
    - Document bugs yang ditemukan

  - [ ] 28.3 Fix bugs dan issues
    - Fix semua bugs yang ditemukan dari testing
    - Verify fixes dengan re-testing
    - Update documentation jika ada perubahan

- [ ] 29. Final Checkpoint - Pre-Deployment
  - Run full regression testing
  - Verify semua requirements terpenuhi
  - Verify audit logging berfungsi
  - Verify RLS policies enforce access control
  - Verify performance metrics (load time, response time)
  - Ensure all tests pass
  - Tanyakan user jika siap untuk deployment

- [x] 30. Documentation dan Deployment Preparation
  - [x] 30.1 Update documentation
    - Update README.md dengan informasi fitur baru
    - Document API endpoints dan request/response format
    - Document database schema changes
    - Document environment variables jika ada yang baru

  - [x] 30.2 Prepare untuk deployment
    - Ensure migration file ready untuk production
    - Verify environment variables di production
    - Create deployment checklist
    - Prepare rollback plan jika ada issues

## Catatan

- Tugas yang ditandai dengan `*` adalah optional dan dapat di-skip untuk MVP lebih cepat
- Setiap tugas mereferensikan requirements spesifik untuk traceability
- Checkpoints memastikan validasi incremental
- Semua error messages harus dalam Bahasa Indonesia
- UI harus responsive dan accessible (WCAG 2.1 Level AA)
- Testing fokus pada unit tests dan integration tests (no property-based testing karena ini CRUD application)

## Teknologi yang Digunakan

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit & integration tests)
- **Authentication**: Supabase Auth

## Estimasi Waktu

- **Phase 1 (Database)**: 1 minggu
- **Phase 2 (API Routes)**: 1 minggu
- **Phase 3 (UI Components)**: 1.5 minggu
- **Phase 4 (Testing & Polish)**: 1 minggu
- **Phase 5 (Deployment)**: 0.5 minggu

**Total**: ~5 minggu untuk implementasi lengkap
