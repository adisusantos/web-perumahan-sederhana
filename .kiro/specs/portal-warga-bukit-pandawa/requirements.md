# Requirements — Portal Warga Bukit Pandawa
> Godean Jogja Hills · Versi 1.0

---

## 1. Gambaran Umum

Portal web komunitas untuk warga perumahan Bukit Pandawa (Godean Jogja Hills). Tujuannya adalah menyediakan satu tempat terpusat untuk informasi keuangan, dokumentasi acara, pengumuman, dan pengambilan keputusan bersama melalui sistem voting.

**Prinsip utama:**
- Seringan mungkin (performa & kompleksitas)
- Mobile-first, responsive di semua ukuran layar
- Dapat diakses dari mana saja via browser
- Database sesimpel mungkin
- Biaya operasional: Rp 0 (semua pakai free tier)

---

## 2. Tech Stack

| Layer | Teknologi | Alasan |
|---|---|---|
| Frontend + Backend | Next.js (App Router) | SSR ringan, deploy mudah di Vercel |
| Hosting | Vercel (free tier) | Deploy otomatis, CDN global, gratis |
| Database | Supabase (PostgreSQL) | Dashboard visual, auth bawaan, storage foto, gratis |
| File storage | Supabase Storage | Upload foto galeri, terintegrasi langsung |
| Data keuangan | Google Sheets API | Sheet tetap jadi sumber data, web hanya baca |
| Styling | Tailwind CSS | Ringan, utility-first, mobile-friendly |
| Auth | Supabase Auth | Login admin & ketua gang, tanpa library tambahan |

---

## 3. Akses & Autentikasi

### Akses publik (tanpa login)
- Halaman beranda
- Halaman keuangan (read-only)
- Halaman galeri foto
- Halaman voting publik (seluruh warga)
- Halaman poll per gang via secret link

### Akses terbatas
| Role | Cara masuk | Hak akses |
|---|---|---|
| Admin / pengurus inti | Login email + password | Semua fitur: buat pengumuman, kelola galeri, buat poll publik & per gang, tutup poll, kelola akun ketua gang |
| Ketua gang | Login email + password | Buat poll per gang miliknya, tutup poll miliknya, lihat hasil poll miliknya |

> Tidak ada registrasi mandiri. Akun ketua gang dibuat oleh admin.

---

## 4. Fitur & Halaman

### 4.1 Beranda (`/`)
- Header dengan logo Bukit Pandawa dan navigasi
- Sambutan singkat perumahan
- Daftar pengumuman terbaru (maks. 5 tampil, sisanya di halaman pengumuman)
- Banner poll publik yang sedang aktif (jika ada)
- Bottom navigation bar untuk mobile

### 4.2 Keuangan (`/keuangan`)
- Data dibaca langsung dari Google Sheets via Google Sheets API
- Dropdown atau tab untuk memilih sheet (misal: per bulan / per tahun)
- Tabel arus kas: pemasukan, pengeluaran, saldo
- Informasi terakhir diperbarui (timestamp dari sheet)
- Tidak ada fitur input dari web — admin tetap input di Google Sheets

### 4.3 Galeri (`/galeri`)
- Grid foto acara perumahan
- Foto dikelompokkan per acara / album
- Lightbox untuk lihat foto ukuran penuh
- Upload foto hanya bisa dilakukan admin (via panel admin)
- Foto disimpan di Supabase Storage

### 4.4 Voting — Publik (`/voting`)
- Menampilkan semua poll publik (aktif dan selesai)
- Poll aktif: warga bisa langsung vote tanpa login
- Poll selesai: hanya menampilkan hasil akhir
- Anti double-vote: menggunakan browser fingerprint + session storage (tanpa akun)
- Hasil ditampilkan real-time dalam bentuk persentase + jumlah suara
- Setiap poll menampilkan: judul, pilihan, pembuat, waktu tersisa / tanggal selesai

### 4.5 Voting — Per Gang (`/voting/[secret-token]`)
- Diakses hanya via secret link yang dibagikan ketua gang
- Tampilan dan mekanisme sama seperti voting publik
- Link unik per poll (UUID atau random token 12 karakter)
- Poll tidak muncul di halaman `/voting` publik
- Hasil hanya bisa dilihat oleh yang punya link

### 4.6 Panel Admin (`/admin`)
- Login dengan email + password (Supabase Auth)
- Dashboard ringkasan: jumlah poll aktif, pengumuman terakhir, foto terbaru
- **Kelola pengumuman:** buat, edit, hapus
- **Kelola galeri:** upload foto, buat album, hapus foto
- **Kelola voting:** buat poll publik atau per gang, atur durasi / timer, tutup manual, lihat hasil
- **Kelola akun:** buat akun ketua gang, reset password, nonaktifkan akun

### 4.7 Panel Ketua Gang (`/admin` — tampilan terbatas)
- Login yang sama dengan admin, tapi setelah login diarahkan ke dashboard dengan menu yang disesuaikan role
- Menu yang tampil: hanya "Voting" (poll milik gang sendiri)
- Menu yang disembunyikan: Pengumuman, Galeri, Kelola Akun
- Buat poll baru (scope: gang sendiri)
- Lihat dan tutup poll milik sendiri
- Salin secret link untuk dibagikan ke grup WA

---

## 5. Sistem Voting — Detail

### Poll publik
- Dibuat oleh: admin
- Tampil di: halaman `/voting` dan banner beranda (jika aktif)
- Siapa bisa vote: semua pengunjung web
- Anti double-vote: fingerprint device + session (1 device = 1 suara)
- Penutupan: manual oleh admin, atau timer otomatis (batas waktu diset saat buat poll)

### Poll per gang
- Dibuat oleh: admin atau ketua gang
- Tampil di: hanya via secret link (`/voting/[token]`)
- Siapa bisa vote: siapa pun yang punya link
- Anti double-vote: sama, fingerprint + session
- Penutupan: manual oleh pembuat, atau timer otomatis
- Secret link: random token 12 karakter, generate otomatis saat poll dibuat

### Anonimitas
- Nama / identitas pemilih tidak disimpan
- Yang disimpan hanya: `poll_id`, `option_id`, `fingerprint_hash`, `voted_at`
- Fingerprint di-hash sebelum disimpan (tidak bisa di-reverse ke identitas)

### Catatan keamanan anti double-vote
Mekanisme fingerprint + session storage adalah *best-effort deterrent*, bukan jaminan mutlak. Pengguna yang menggunakan incognito, ganti browser, atau clear storage bisa berpotensi vote lebih dari sekali. Untuk skala komunitas perumahan ini dianggap cukup, namun perlu dikomunikasikan ke pengurus bahwa sistem ini bukan tamper-proof.

Poll yang sudah berstatus `closed` wajib menolak semua vote baru, terlepas dari nilai `closes_at`.

---

## 6. Skema Database (Supabase)

### Tabel `users` (dikelola Supabase Auth)
Kolom tambahan via tabel `profiles`:
- `id` (uuid, FK ke auth.users)
- `name` (text)
- `role` (enum: `admin`, `ketua_gang`)
- `gang` (text, nullable — diisi jika role ketua_gang, misal "Gang 1")
- `created_at` (timestamp)

### Tabel `announcements`
- `id` (uuid, PK)
- `title` (text)
- `body` (text)
- `priority` (enum: `normal`, `urgent`)
- `created_by` (uuid, FK ke profiles)
- `created_at` (timestamp)
- `updated_at` (timestamp, nullable — diisi saat pengumuman diedit)

### Tabel `gallery_albums`
- `id` (uuid, PK)
- `name` (text)
- `description` (text, nullable)
- `cover_url` (text, nullable)
- `created_at` (timestamp)

### Tabel `gallery_photos`
- `id` (uuid, PK)
- `album_id` (uuid, FK ke gallery_albums)
- `url` (text — path di Supabase Storage)
- `caption` (text, nullable)
- `uploaded_by` (uuid, FK ke profiles — untuk audit trail)
- `created_at` (timestamp)

### Tabel `polls`
- `id` (uuid, PK)
- `title` (text)
- `description` (text, nullable)
- `type` (enum: `public`, `gang`)
- `gang_scope` (text, nullable — diisi jika type = gang)
- `secret_token` (text, nullable, unique — diisi jika type = gang)
- `status` (enum: `active`, `closed`)
- `closes_at` (timestamp, nullable — null = tutup manual)
- `created_by` (uuid, FK ke profiles)
- `created_at` (timestamp)

### Tabel `poll_options`
- `id` (uuid, PK)
- `poll_id` (uuid, FK ke polls)
- `label` (text)
- `order` (integer)

### Tabel `poll_votes`
- `id` (uuid, PK)
- `poll_id` (uuid, FK ke polls)
- `option_id` (uuid, FK ke poll_options)
- `fingerprint_hash` (text — SHA-256 dari device fingerprint)
- `voted_at` (timestamp)

> Constraint: `UNIQUE(poll_id, fingerprint_hash)` wajib ada di level database untuk mencegah double-vote bypass via API langsung.

> Tidak ada kolom nama / identitas pemilih di tabel ini.

---

## 7. Integrasi Google Sheets

- Data keuangan tetap dikelola di Google Sheets oleh admin/bendahara
- Web membaca data via **Google Sheets API v4** (read-only)
- Sheet harus bersifat publik (atau menggunakan service account)
- Konfigurasi: `GOOGLE_SHEETS_ID` dan `GOOGLE_SHEETS_API_KEY` disimpan di environment variable Vercel
- Data di-cache di server Next.js selama 5 menit (`revalidate: 300`) agar tidak membebani quota API
- Format sheet yang diharapkan: baris pertama = header, kolom = Tanggal, Keterangan, Pemasukan, Pengeluaran, Saldo
- Jika data tidak bisa diambil (API error, quota habis, format sheet berubah), tampilkan pesan error yang informatif. Jika ada data cache sebelumnya, tampilkan data cache dengan label "Data mungkin tidak terbaru"

---

## 8. Struktur Halaman & Routing

```
/                        → Beranda
/keuangan                → Laporan keuangan (dari Google Sheets)
/galeri                  → Galeri foto acara
/voting                  → Daftar poll publik
/voting/[token]          → Poll per gang (via secret link)
/admin                   → Login admin / ketua gang
/admin/dashboard         → Dashboard (setelah login)
/admin/pengumuman        → Kelola pengumuman
/admin/galeri            → Upload & kelola foto
/admin/voting            → Buat & kelola poll
/admin/akun              → Kelola akun (admin only)
```

---

## 9. Non-Functional Requirements

### Performa
- Target Lighthouse score: ≥ 85 (mobile)
- Halaman publik menggunakan SSR / ISR Next.js agar cepat di load pertama
- Gambar galeri menggunakan `next/image` (otomatis optimasi & lazy load)
- Tidak ada library UI berat (tidak pakai MUI, Chakra, dll.)

### Mobile
- Desain mobile-first
- Bottom navigation bar untuk navigasi utama di mobile
- Semua tombol & input minimal 44px touch target
- Tabel keuangan bisa di-scroll horizontal di layar kecil

### Keamanan
- Row Level Security (RLS) aktif di semua tabel Supabase
- Secret token poll di-generate secara kriptografis (tidak bisa ditebak)
- Fingerprint hash tidak menyimpan data identitas
- Environment variable tidak pernah di-expose ke client (hanya server-side)

### Skalabilitas
- Free tier Supabase cukup untuk skala 1 perumahan (ratusan warga)
- Jika suatu saat perlu upgrade, cukup ganti tier Supabase tanpa ubah kode

---

## 10. Identitas Visual

- **Nama:** Bukit Pandawa / Godean Jogja Hills
- **Logo:** Siluet panda duduk miring makan bambu, latar bukit 3 layer, hitam putih
- **Warna utama:** Hijau tua (`#27500A`), hitam (`#2C2C2A`), putih
- **Tipografi:** System font / sans-serif (ringan, tidak perlu load Google Fonts)
- **Gaya:** Minimalis, putih bersih, border tipis, tanpa ornamen berlebihan

---

## 11. Out of Scope (Versi 1.0)

Fitur-fitur berikut tidak termasuk dalam versi pertama dan bisa dipertimbangkan untuk versi selanjutnya:

- Notifikasi push / WhatsApp blast otomatis
- Sistem pembayaran iuran online
- Forum diskusi / komentar
- Direktori kontak warga
- Integrasi kalender acara
- Dark mode
- Aplikasi mobile native (Android / iOS)

---

*Dokumen ini adalah acuan pengembangan. Perubahan requirement dicatat sebagai revisi dokumen ini.*
