# Implementation Plan: Portal Warga Bukit Pandawa

## Overview

Implementasi portal web komunitas Bukit Pandawa (Godean Jogja Hills) menggunakan Next.js App Router, Supabase, dan Tailwind CSS. Pendekatan incremental: mulai dari fondasi proyek, lalu fitur publik (beranda, keuangan, galeri, voting), kemudian panel admin, dan terakhir integrasi penuh.

## Tasks

- [x] 1. Setup proyek dan fondasi
  - Inisialisasi proyek Next.js App Router dengan TypeScript dan Tailwind CSS
  - Buat struktur direktori sesuai design (`src/app`, `src/components`, `src/lib`, `src/types`)
  - Buat file `src/types/index.ts` dengan semua TypeScript types dari design (`Profile`, `Announcement`, `GalleryAlbum`, `GalleryPhoto`, `Poll`, `PollOption`, `PollVote`, `PollResult`, `PollWithResults`, `FinanceRow`, `FinanceData`)
  - Setup Vitest dan fast-check sebagai dev dependencies
  - Buat file konfigurasi environment (`.env.local.example`) dengan semua variabel yang dibutuhkan: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_API_KEY`
  - _Requirements: 2, 9_

- [x] 2. Setup Supabase dan database
  - [x] 2.1 Buat migration SQL untuk semua tabel
    - Tulis SQL migration untuk tabel `profiles`, `announcements`, `gallery_albums`, `gallery_photos`, `polls`, `poll_options`, `poll_votes` sesuai skema di design
    - Tambahkan semua constraint, index, dan UNIQUE constraint pada `poll_votes(poll_id, fingerprint_hash)`
    - Aktifkan Row Level Security (RLS) di semua tabel
    - Tulis semua RLS policies sesuai design
    - _Requirements: 6, 9_

  - [x] 2.2 Buat Supabase client utilities
    - Buat `src/lib/supabase/client.ts` — browser client menggunakan `createBrowserClient`
    - Buat `src/lib/supabase/server.ts` — server client menggunakan `createServerClient` dengan cookies
    - Buat `src/lib/supabase/admin.ts` — service role client untuk operasi admin
    - _Requirements: 2, 3_

- [x] 3. Implementasi utilitas inti
  - [x] 3.1 Implementasi `generateSecretToken` dan `hashFingerprint`
    - Buat `src/lib/utils.ts` dengan fungsi `generateSecretToken()` — menggunakan `crypto.getRandomValues`, menghasilkan token 12 karakter alfanumerik URL-safe
    - Buat `src/lib/fingerprint.ts` dengan fungsi `generateFingerprint()` (browser attributes) dan `hashFingerprint(input: string): string` — SHA-256 menggunakan Web Crypto API, output 64 karakter hex lowercase
    - _Requirements: 5, 6, 9_

  - [ ]* 3.2 Tulis property test untuk `generateSecretToken` (Property 6)
    - **Property 6: Secret token valid dan unik**
    - Test bahwa setiap token tepat 12 karakter, hanya alfanumerik/URL-safe, dan tidak ada duplikat dalam batch N token
    - **Validates: Requirements 4.5, 5, 9**

  - [ ]* 3.3 Tulis property test untuk `hashFingerprint` (Property 7)
    - **Property 7: Fingerprint hash deterministik dan berformat valid**
    - Test bahwa output selalu 64 karakter hex lowercase, deterministik untuk input sama, dan berbeda untuk input berbeda
    - **Validates: Requirements 5, 6**

  - [x] 3.4 Implementasi `calculatePollResults`
    - Buat fungsi `calculatePollResults(voteCounts: number[]): PollResult[]` di `src/lib/voting.ts`
    - Hitung `vote_count`, `percentage` (dibulatkan 1 desimal), dan `total_votes`
    - _Requirements: 4.4_

  - [ ]* 3.5 Tulis property test untuk `calculatePollResults` (Property 4)
    - **Property 4: Kalkulasi persentase hasil voting akurat dan konsisten**
    - Test bahwa `sum(percentage) ≈ 100` (toleransi ±0.1%), `sum(vote_count) === total_votes`, dan setiap `percentage = vote_count / total_votes * 100`
    - **Validates: Requirements 4.4**

- [x] 4. Checkpoint — Pastikan semua tests pass
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [x] 5. Integrasi Google Sheets
  - [x] 5.1 Implementasi Google Sheets API wrapper
    - Buat `src/lib/google-sheets.ts` dengan fungsi `getFinanceData(sheetName?: string): Promise<FinanceData>`
    - Implementasi fetch ke Google Sheets API v4 dengan `GOOGLE_SHEETS_API_KEY` dan `GOOGLE_SHEETS_ID`
    - Implementasi in-memory cache server-side dengan TTL 5 menit (`revalidate: 300`)
    - Implementasi retry 1x saat network timeout
    - Implementasi fallback ke cache dengan flag `from_cache: true` saat API error
    - Parsing baris header + data ke array `FinanceRow` (kolom: Tanggal, Keterangan, Pemasukan, Pengeluaran, Saldo)
    - Jika tidak ada cache dan API error, lempar error deskriptif
    - _Requirements: 4.2, 7_

  - [ ]* 5.2 Tulis property test untuk parsing Google Sheets (Property 9)
    - **Property 9: Parsing data Google Sheets menghasilkan FinanceRow yang benar**
    - Test round-trip: serialize `FinanceRow[]` ke format Sheets lalu parse kembali, hasilnya harus identik
    - **Validates: Requirements 4.2, 7**

  - [ ]* 5.3 Tulis property test untuk fallback cache (Property 8)
    - **Property 8: Fallback cache saat Google Sheets tidak tersedia**
    - Test bahwa untuk semua jenis error API (network, 403, 429, format invalid), jika cache tersedia maka `from_cache = true` dikembalikan; jika tidak ada cache, error informatif dikembalikan
    - **Validates: Requirements 4.2, 7**

  - [x] 5.4 Buat API route `GET /api/keuangan`
    - Buat `src/app/api/keuangan/route.ts`
    - Panggil `getFinanceData()`, kembalikan `FinanceResponse` atau `FinanceErrorResponse`
    - Tangani semua error sesuai tabel error handling di design
    - _Requirements: 4.2, 7_

- [x] 6. Implementasi komponen UI dasar
  - [x] 6.1 Buat komponen UI primitif
    - Buat `src/components/ui/Button.tsx` — mendukung variant (primary, secondary, danger), ukuran, dan disabled state; touch target minimal 44px
    - Buat `src/components/ui/Badge.tsx` — untuk status poll (aktif/selesai) dan prioritas pengumuman (normal/urgent)
    - Buat `src/components/ui/EmptyState.tsx` — tampilan saat data kosong
    - _Requirements: 9 (mobile, aksesibilitas)_

  - [x] 6.2 Buat komponen layout
    - Buat `src/components/layout/Header.tsx` — logo Bukit Pandawa, navigasi desktop, warna `#27500A`
    - Buat `src/components/layout/BottomNav.tsx` — navigasi bawah mobile (beranda, keuangan, galeri, voting), sticky, hidden di desktop
    - Buat `src/components/layout/AdminSidebar.tsx` — sidebar admin dengan menu yang disesuaikan role
    - _Requirements: 4.1, 9 (mobile-first)_

- [x] 7. Halaman publik — Beranda (`/`)
  - [x] 7.1 Implementasi query pengumuman untuk beranda
    - Buat fungsi server-side untuk mengambil maksimal 5 pengumuman terbaru dari Supabase
    - Implementasi ISR dengan `revalidate: 60`
    - _Requirements: 4.1_

  - [ ]* 7.2 Tulis property test untuk batas pengumuman beranda (Property 1)
    - **Property 1: Beranda membatasi pengumuman yang ditampilkan**
    - Test bahwa untuk sembarang jumlah pengumuman di database, fungsi selalu mengembalikan maksimal 5 item diurutkan dari terbaru
    - **Validates: Requirements 4.1**

  - [x] 7.3 Buat halaman beranda `src/app/(public)/page.tsx`
    - Render header, sambutan singkat perumahan
    - Tampilkan daftar pengumuman terbaru (maks. 5)
    - Tampilkan banner poll publik aktif (jika ada)
    - Render `BottomNav` untuk mobile
    - _Requirements: 4.1_

- [x] 8. Halaman publik — Keuangan (`/keuangan`)
  - [x] 8.1 Buat komponen `FinanceTable` dan `SheetSelector`
    - Buat `src/components/finance/FinanceTable.tsx` — tabel arus kas dengan scroll horizontal di mobile, footer total pemasukan/pengeluaran/saldo
    - Buat `src/components/finance/SheetSelector.tsx` — dropdown/tab untuk memilih sheet
    - _Requirements: 4.2, 9 (mobile)_

  - [x] 8.2 Buat halaman keuangan `src/app/(public)/keuangan/page.tsx`
    - Fetch data via `/api/keuangan`, render `SheetSelector` dan `FinanceTable`
    - Tampilkan timestamp "terakhir diperbarui"
    - Tampilkan label "Data mungkin tidak terbaru" jika `from_cache = true`
    - Tampilkan pesan error deskriptif jika API tidak tersedia
    - ISR dengan `revalidate: 300`
    - _Requirements: 4.2, 7_

- [x] 9. Halaman publik — Galeri (`/galeri`)
  - [x] 9.1 Buat komponen galeri
    - Buat `src/components/gallery/AlbumGrid.tsx` — grid album dengan cover foto
    - Buat `src/components/gallery/PhotoGrid.tsx` — grid foto dalam album, menggunakan `next/image`
    - Buat `src/components/gallery/Lightbox.tsx` — modal foto ukuran penuh, navigasi prev/next, close via Escape atau klik luar
    - _Requirements: 4.3, 9 (performa, mobile)_

  - [x] 9.2 Buat halaman galeri `src/app/(public)/galeri/page.tsx`
    - Fetch album dan foto dari Supabase, render `AlbumGrid`
    - Integrasikan `Lightbox` untuk foto ukuran penuh
    - ISR dengan `revalidate: 60`
    - _Requirements: 4.3_

- [x] 10. Sistem Voting — API dan logika inti
  - [x] 10.1 Buat API route `POST /api/votes`
    - Buat `src/app/api/votes/route.ts`
    - Validasi request body (`poll_id`, `option_id`, `fingerprint_hash`)
    - Cek status poll — tolak dengan `poll_closed` jika status `closed` atau `closes_at` sudah lewat
    - Insert ke `poll_votes`, tangani UNIQUE constraint violation → kembalikan 409 `already_voted`
    - Kembalikan hasil terbaru (`PollResult[]`) setelah vote berhasil
    - _Requirements: 4.4, 5_

  - [ ]* 10.2 Tulis property test untuk penolakan vote ke poll closed (Property 2)
    - **Property 2: Poll closed selalu menolak vote baru**
    - Test bahwa untuk sembarang poll dengan status `closed`, semua permintaan vote selalu ditolak dengan `poll_closed`
    - **Validates: Requirements 4.4, 5**

  - [ ]* 10.3 Tulis property test untuk anti double-vote (Property 3)
    - **Property 3: Anti double-vote via fingerprint**
    - Test bahwa untuk sembarang poll aktif dan fingerprint_hash, vote kedua dengan poll_id + fingerprint_hash yang sama selalu ditolak dengan `already_voted`
    - **Validates: Requirements 4.4, 4.5, 5**

- [x] 11. Checkpoint — Pastikan semua tests pass
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [x] 12. Halaman publik — Voting
  - [x] 12.1 Buat komponen voting
    - Buat `src/components/voting/PollCard.tsx` — ringkasan poll: judul, status, jumlah suara, waktu tersisa/tanggal selesai, pembuat
    - Buat `src/components/voting/VoteForm.tsx` — form pilihan vote, cek session storage untuk status sudah-vote, panggil `POST /api/votes`, tampilkan loading state
    - Buat `src/components/voting/VoteResults.tsx` — hasil real-time dalam persentase + jumlah suara per opsi
    - _Requirements: 4.4, 5_

  - [ ]* 12.2 Tulis property test untuk poll gang tidak muncul di listing publik (Property 5)
    - **Property 5: Poll gang tidak muncul di listing publik**
    - Test bahwa query untuk halaman `/voting` hanya mengembalikan poll dengan `type = 'public'`, tidak pernah `type = 'gang'`
    - **Validates: Requirements 4.4, 4.5**

  - [x] 12.3 Buat halaman voting publik `src/app/(public)/voting/page.tsx`
    - Fetch semua poll publik (aktif dan selesai) dari Supabase
    - Render `PollCard` untuk setiap poll
    - Poll aktif: tampilkan `VoteForm`; poll selesai: tampilkan `VoteResults`
    - SSR (tidak ada ISR — data harus real-time)
    - _Requirements: 4.4_

  - [x] 12.4 Buat halaman voting per gang `src/app/(public)/voting/[token]/page.tsx`
    - Fetch poll berdasarkan `secret_token` dari URL
    - Jika token tidak valid, kembalikan 404 (tidak membedakan "tidak ada" vs "salah token")
    - Render `VoteForm` atau `VoteResults` sesuai status poll
    - Poll tidak muncul di listing publik
    - SSR
    - _Requirements: 4.5_

- [x] 13. Autentikasi Admin
  - [x] 13.1 Buat halaman login `src/app/admin/page.tsx`
    - Form email + password, panggil `supabase.auth.signInWithPassword()`
    - Setelah login, ambil `role` dari tabel `profiles`
    - Redirect ke `/admin/dashboard`
    - Tampilkan pesan generik "Email atau password salah" saat login gagal
    - Tangani query `?expired=1` untuk session expired
    - _Requirements: 3_

  - [x] 13.2 Implementasi middleware autentikasi
    - Buat `src/middleware.ts` untuk proteksi semua route `/admin/*`
    - Redirect ke `/admin` jika tidak ada session aktif
    - _Requirements: 3, 9_

- [x] 14. Panel Admin — Dashboard dan Pengumuman
  - [x] 14.1 Buat dashboard admin `src/app/admin/dashboard/page.tsx`
    - Tampilkan ringkasan: jumlah poll aktif, pengumuman terakhir, foto terbaru
    - Render `AdminSidebar` dengan menu sesuai role (admin: semua menu; ketua_gang: hanya Voting)
    - _Requirements: 4.6, 4.7_

  - [x] 14.2 Buat API route pengumuman `src/app/api/admin/announcements/route.ts`
    - `GET` — ambil semua pengumuman (admin only)
    - `POST` — buat pengumuman baru (admin only), validasi `title`, `body`, `priority`
    - `PUT` — edit pengumuman (admin only)
    - `DELETE` — hapus pengumuman (admin only)
    - Semua endpoint cek role admin via Supabase Auth + profiles
    - _Requirements: 4.6_

  - [x] 14.3 Buat halaman kelola pengumuman `src/app/admin/pengumuman/page.tsx`
    - List semua pengumuman dengan opsi edit dan hapus
    - Form buat/edit pengumuman (judul, isi, prioritas)
    - _Requirements: 4.6_

- [x] 15. Panel Admin — Galeri
  - [x] 15.1 Buat API route galeri admin `src/app/api/admin/`
    - Endpoint untuk buat album, upload foto ke Supabase Storage, hapus foto
    - Validasi file: hanya `image/jpeg`, `image/png`, `image/webp`; maksimal 5MB (validasi client-side dan server-side)
    - Jika upload Storage gagal, jangan simpan record ke DB
    - _Requirements: 4.3, 4.6_

  - [x] 15.2 Buat halaman kelola galeri `src/app/admin/galeri/page.tsx`
    - Form buat album baru
    - Upload foto ke album (dengan validasi ukuran dan format di client-side)
    - Tampilkan daftar foto per album dengan opsi hapus
    - _Requirements: 4.3, 4.6_

- [x] 16. Panel Admin — Voting
  - [x] 16.1 Buat API route polls admin `src/app/api/admin/polls/route.ts`
    - `POST` — buat poll baru (publik atau per gang), generate `secret_token` untuk poll gang menggunakan `generateSecretToken()`
    - `PATCH` — tutup poll manual (update `status = 'closed'`)
    - Validasi: admin bisa buat semua poll; ketua_gang hanya bisa buat poll untuk gang sendiri
    - _Requirements: 4.6, 4.7, 5_

  - [x] 16.2 Buat halaman kelola voting admin `src/app/admin/voting/page.tsx`
    - **REFACTORED**: Dipecah jadi komponen modular yang lebih simple
    - `src/components/voting/PollFormFields.tsx` — Form fields reusable untuk buat poll
    - `src/components/voting/AdminPollCard.tsx` — Card component untuk tampilkan poll dengan actions
    - `src/app/admin/voting/page.tsx` — Main page dengan state management sederhana (useState)
    - Form buat poll baru: judul, deskripsi, tipe (publik/gang), pilihan, durasi/timer
    - List semua poll dengan status, jumlah suara, dan tombol tutup manual
    - Tampilkan secret link untuk poll gang (dengan tombol salin)
    - Untuk ketua_gang: hanya tampilkan poll milik gang sendiri
    - _Requirements: 4.6, 4.7_

- [x] 17. Panel Admin — Kelola Akun
  - [x] 17.1 Buat API route akun `src/app/api/admin/accounts/route.ts`
    - `POST` — buat akun ketua gang baru via Supabase Admin API (admin only)
    - `PATCH` — reset password, nonaktifkan akun (admin only)
    - Endpoint ini hanya bisa diakses oleh role `admin`
    - _Requirements: 4.6_

  - [x] 17.2 Buat halaman kelola akun `src/app/admin/akun/page.tsx`
    - List semua akun ketua gang
    - Form buat akun baru (nama, email, gang)
    - Tombol reset password dan nonaktifkan akun
    - Halaman ini hanya muncul di menu admin (disembunyikan dari ketua_gang)
    - _Requirements: 4.6_

- [x] 18. Checkpoint — Pastikan semua tests pass
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [x] 19. Integrasi dan wiring akhir
  - [x] 19.1 Implementasi auto-close poll via timer
    - Tambahkan logika di `POST /api/votes` untuk cek `closes_at` — jika sudah lewat, tolak vote dan update `status = 'closed'`
    - Pastikan poll dengan `closes_at` yang sudah lewat tidak ditampilkan sebagai aktif di halaman publik
    - _Requirements: 5_

  - [x] 19.2 Implementasi banner poll aktif di beranda
    - Fetch poll publik aktif di halaman beranda, tampilkan sebagai banner dengan link ke `/voting`
    - _Requirements: 4.1_

  - [x] 19.3 Verifikasi RLS dan keamanan
    - Tulis smoke test untuk memverifikasi RLS aktif di semua tabel (query `pg_tables` + `relrowsecurity`)
    - Verifikasi environment variable tidak di-expose ke client (cek bundle output)
    - Verifikasi `generateSecretToken` menggunakan `crypto.getRandomValues` (CSPRNG)
    - _Requirements: 9_

  - [ ]* 19.4 Tulis integration tests
    - Test double-vote bypass via API langsung (Supabase UNIQUE constraint)
    - Test RLS policies: akses tanpa auth ke tabel terproteksi
    - Test auth flow: login admin, login ketua gang, session expired
    - _Requirements: 3, 5, 6, 9_

- [x] 20. Final checkpoint — Pastikan semua tests pass
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

## Notes

- Tasks bertanda `*` bersifat opsional dan bisa dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- Property tests menggunakan fast-check dengan minimum 100 iterasi per property
- Unit tests melengkapi property tests untuk skenario konkret dan edge cases
- Semua komponen mengikuti prinsip mobile-first dengan touch target minimal 44px
- Tidak ada library UI berat — hanya Tailwind CSS
- Semua operasi sensitif (auth, RLS, secret token) menggunakan server-side code
