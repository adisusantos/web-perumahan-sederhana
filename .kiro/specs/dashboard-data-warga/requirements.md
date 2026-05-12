# Requirements Document: Dashboard Data Warga

## Introduction

Dashboard Data Warga adalah fitur untuk mengelola dan menampilkan data warga perumahan Bukit Pandawa secara digital. Fitur ini mencakup database warga yang baru (belum ada secara digital), dengan informasi pemilik rumah, penghuni rumah, kontak, dan history pembayaran PBB. Data dapat dilihat secara global (seluruh perumahan) dan per gang, dengan kontrol akses berbasis sensitivitas data.

## Glossary

- **Resident_Database**: Sistem database yang menyimpan data warga perumahan
- **Owner**: Pemilik rumah di perumahan Bukit Pandawa
- **Occupant**: Penghuni rumah di perumahan Bukit Pandawa (bisa sama atau berbeda dengan pemilik)
- **PBB_Payment**: Pajak Bumi dan Bangunan yang dilaporkan ke perumahan
- **Admin**: Pengguna dengan role admin yang memiliki akses penuh ke semua data
- **Gang_Leader**: Ketua gang (role ketua_gang) yang dapat melihat data warga
- **Gang**: Kelompok rumah dalam perumahan (misalnya: Gang A, Gang B)
- **Dashboard**: Antarmuka untuk menampilkan dan mengelola data warga
- **Sensitive_Data**: Data yang bersifat pribadi dan hanya boleh diakses oleh admin
- **Public_Data**: Data yang tidak terlalu mengganggu privasi dan bisa dilihat secara umum

## Requirements

### Requirement 1: Database Warga Baru

**User Story:** Sebagai admin, saya ingin membuat database warga yang baru secara digital, sehingga data warga dapat dikelola dengan lebih terstruktur.

#### Acceptance Criteria

1. THE Resident_Database SHALL menyimpan data pemilik rumah (Owner)
2. THE Resident_Database SHALL menyimpan data penghuni rumah (Occupant)
3. THE Resident_Database SHALL menyimpan informasi kontak untuk setiap Occupant
4. THE Resident_Database SHALL menyimpan history pembayaran PBB untuk setiap rumah
5. THE Resident_Database SHALL mengasosiasikan setiap rumah dengan Gang tertentu
6. THE Resident_Database SHALL menyimpan alamat rumah (nomor rumah dan Gang)

### Requirement 2: Informasi Pemilik Rumah

**User Story:** Sebagai admin, saya ingin mencatat siapa pemilik setiap rumah, sehingga kepemilikan rumah terdokumentasi dengan jelas.

#### Acceptance Criteria

1. THE Resident_Database SHALL menyimpan nama lengkap Owner untuk setiap rumah
2. THE Resident_Database SHALL mengasosiasikan setiap Owner dengan alamat rumah spesifik
3. WHEN admin menambahkan Owner baru, THE Resident_Database SHALL menyimpan data Owner tersebut
4. WHEN admin mengubah data Owner, THE Resident_Database SHALL memperbarui data Owner tersebut
5. THE Resident_Database SHALL memungkinkan satu Owner memiliki lebih dari satu rumah

### Requirement 3: Informasi Penghuni Rumah

**User Story:** Sebagai admin, saya ingin mencatat siapa penghuni setiap rumah beserta kontaknya, sehingga komunikasi dengan warga dapat dilakukan dengan mudah.

#### Acceptance Criteria

1. THE Resident_Database SHALL menyimpan nama lengkap Occupant untuk setiap rumah
2. THE Resident_Database SHALL menyimpan nomor telepon Occupant
3. THE Resident_Database SHALL menyimpan alamat email Occupant (jika ada)
4. THE Resident_Database SHALL memungkinkan satu rumah memiliki lebih dari satu Occupant
5. WHEN admin menambahkan Occupant baru, THE Resident_Database SHALL menyimpan data Occupant tersebut
6. WHEN admin mengubah data Occupant, THE Resident_Database SHALL memperbarui data Occupant tersebut

### Requirement 4: History Pembayaran PBB

**User Story:** Sebagai admin, saya ingin mencatat history pembayaran PBB setiap rumah, sehingga status pembayaran dapat dipantau.

#### Acceptance Criteria

1. THE Resident_Database SHALL menyimpan history pembayaran PBB untuk setiap rumah
2. WHEN admin mencatat pembayaran PBB, THE Resident_Database SHALL menyimpan tahun pajak, status pembayaran (lunas/belum), dan tanggal pelaporan
3. THE Resident_Database SHALL menampilkan status pembayaran PBB terakhir untuk setiap rumah
4. THE Resident_Database SHALL menampilkan history pembayaran PBB dalam urutan kronologis (terbaru ke terlama)
5. WHEN admin mengubah status pembayaran PBB, THE Resident_Database SHALL memperbarui record yang sesuai

### Requirement 5: Tampilan Data Global

**User Story:** Sebagai admin atau Gang_Leader, saya ingin melihat data warga secara global (seluruh perumahan), sehingga saya dapat memantau kondisi keseluruhan perumahan.

#### Acceptance Criteria

1. WHEN pengguna yang terautentikasi mengakses Dashboard, THE Dashboard SHALL menampilkan data warga dari seluruh perumahan
2. THE Dashboard SHALL menampilkan daftar rumah dengan informasi Owner dan Occupant
3. THE Dashboard SHALL menampilkan status pembayaran PBB terakhir untuk setiap rumah
4. THE Dashboard SHALL memungkinkan pengguna memfilter data berdasarkan Gang
5. THE Dashboard SHALL menampilkan jumlah total rumah, jumlah rumah per Gang, dan statistik pembayaran PBB

### Requirement 6: Tampilan Data Per Gang

**User Story:** Sebagai admin atau Gang_Leader, saya ingin melihat data warga per gang, sehingga saya dapat fokus pada data gang tertentu.

#### Acceptance Criteria

1. WHEN pengguna memilih Gang tertentu, THE Dashboard SHALL menampilkan hanya data warga dari Gang tersebut
2. THE Dashboard SHALL menampilkan daftar rumah dalam Gang yang dipilih
3. THE Dashboard SHALL menampilkan informasi Owner, Occupant, dan status PBB untuk rumah dalam Gang tersebut
4. THE Dashboard SHALL menampilkan statistik khusus untuk Gang yang dipilih (jumlah rumah, status PBB)

### Requirement 7: Kontrol Akses Data Sensitif

**User Story:** Sebagai admin, saya ingin memastikan data sensitif hanya dapat diakses oleh admin, sehingga privasi warga terjaga.

#### Acceptance Criteria

1. THE Dashboard SHALL mengklasifikasikan data kontak (nomor telepon, email) sebagai Sensitive_Data
2. WHEN pengguna dengan role admin mengakses Dashboard, THE Dashboard SHALL menampilkan semua Sensitive_Data
3. WHEN pengguna dengan role selain admin mengakses Dashboard, THE Dashboard SHALL menyembunyikan Sensitive_Data
4. THE Dashboard SHALL menampilkan indikator visual bahwa data tertentu disembunyikan untuk pengguna non-admin

### Requirement 8: Kontrol Akses Data Publik

**User Story:** Sebagai Gang_Leader, saya ingin melihat data warga yang tidak terlalu sensitif, sehingga saya dapat mengetahui informasi dasar warga perumahan.

#### Acceptance Criteria

1. THE Dashboard SHALL mengklasifikasikan nama Owner, nama Occupant, alamat rumah, dan status PBB sebagai Public_Data
2. WHEN pengguna dengan role ketua_gang mengakses Dashboard, THE Dashboard SHALL menampilkan Public_Data
3. THE Dashboard SHALL menyembunyikan Sensitive_Data dari pengguna dengan role ketua_gang
4. WHEN pengguna anonim (tidak login) mengakses Dashboard, THE Dashboard SHALL menolak akses dan menampilkan pesan error

### Requirement 9: Akses Ketua Gang ke Semua Data Warga

**User Story:** Sebagai Gang_Leader, saya ingin melihat data warga dari seluruh perumahan (tidak hanya gang saya), sehingga saya dapat membantu koordinasi di tingkat perumahan.

#### Acceptance Criteria

1. WHEN pengguna dengan role ketua_gang mengakses Dashboard, THE Dashboard SHALL menampilkan data warga dari semua Gang
2. THE Dashboard SHALL tidak membatasi akses Gang_Leader hanya pada Gang mereka sendiri
3. THE Dashboard SHALL menampilkan Public_Data dari semua Gang kepada Gang_Leader
4. THE Dashboard SHALL tetap menyembunyikan Sensitive_Data dari Gang_Leader

### Requirement 10: Manajemen Data Warga oleh Admin

**User Story:** Sebagai admin, saya ingin menambah, mengubah, dan menghapus data warga, sehingga database tetap akurat dan terkini.

#### Acceptance Criteria

1. WHEN admin menambahkan data rumah baru, THE Dashboard SHALL menyimpan data rumah tersebut ke Resident_Database
2. WHEN admin mengubah data rumah, THE Dashboard SHALL memperbarui data di Resident_Database
3. WHEN admin menghapus data rumah, THE Dashboard SHALL menghapus data tersebut dari Resident_Database
4. THE Dashboard SHALL menampilkan form input untuk menambah dan mengubah data Owner, Occupant, dan PBB_Payment
5. THE Dashboard SHALL memvalidasi input data sebelum menyimpan ke Resident_Database
6. WHEN admin menyimpan data yang tidak valid, THE Dashboard SHALL menampilkan pesan error yang jelas

### Requirement 11: Pencarian dan Filter Data

**User Story:** Sebagai admin atau Gang_Leader, saya ingin mencari dan memfilter data warga, sehingga saya dapat menemukan informasi spesifik dengan cepat.

#### Acceptance Criteria

1. THE Dashboard SHALL menyediakan fitur pencarian berdasarkan nama Owner atau nama Occupant
2. THE Dashboard SHALL menyediakan filter berdasarkan Gang
3. THE Dashboard SHALL menyediakan filter berdasarkan status pembayaran PBB (lunas/belum)
4. WHEN pengguna memasukkan query pencarian, THE Dashboard SHALL menampilkan hasil yang sesuai dalam waktu kurang dari 2 detik
5. THE Dashboard SHALL menampilkan pesan "Tidak ada data ditemukan" jika hasil pencarian kosong

### Requirement 12: Ekspor Data

**User Story:** Sebagai admin, saya ingin mengekspor data warga ke format CSV atau Excel, sehingga data dapat digunakan untuk keperluan lain.

#### Acceptance Criteria

1. WHEN admin memilih opsi ekspor, THE Dashboard SHALL menghasilkan file CSV atau Excel yang berisi data warga
2. THE Dashboard SHALL menyertakan semua kolom data (Owner, Occupant, kontak, PBB) dalam file ekspor
3. THE Dashboard SHALL memungkinkan admin memilih apakah akan mengekspor data global atau per Gang
4. WHEN ekspor selesai, THE Dashboard SHALL mengunduh file ke perangkat admin
5. THE Dashboard SHALL memberi nama file ekspor dengan format "data-warga-YYYY-MM-DD.csv"

### Requirement 13: Statistik dan Ringkasan

**User Story:** Sebagai admin atau Gang_Leader, saya ingin melihat statistik dan ringkasan data warga, sehingga saya dapat memahami kondisi perumahan secara cepat.

#### Acceptance Criteria

1. THE Dashboard SHALL menampilkan jumlah total rumah di perumahan
2. THE Dashboard SHALL menampilkan jumlah rumah per Gang
3. THE Dashboard SHALL menampilkan persentase rumah dengan status PBB lunas
4. THE Dashboard SHALL menampilkan persentase rumah dengan status PBB belum lunas
5. THE Dashboard SHALL menampilkan statistik dalam bentuk grafik atau chart yang mudah dibaca
6. WHEN pengguna memfilter data per Gang, THE Dashboard SHALL memperbarui statistik sesuai filter

### Requirement 14: Responsivitas dan Aksesibilitas

**User Story:** Sebagai pengguna, saya ingin mengakses Dashboard dari berbagai perangkat, sehingga saya dapat melihat data warga kapan saja.

#### Acceptance Criteria

1. THE Dashboard SHALL dapat diakses dari desktop, tablet, dan smartphone
2. THE Dashboard SHALL menyesuaikan layout berdasarkan ukuran layar perangkat
3. THE Dashboard SHALL memiliki waktu loading kurang dari 3 detik pada koneksi internet normal
4. THE Dashboard SHALL mengikuti standar aksesibilitas WCAG 2.1 Level AA
5. THE Dashboard SHALL dapat digunakan dengan keyboard navigation
6. THE Dashboard SHALL memiliki contrast ratio yang memadai untuk teks dan background

### Requirement 15: Keamanan dan Audit Log

**User Story:** Sebagai admin, saya ingin mencatat semua perubahan data warga, sehingga ada jejak audit untuk keperluan transparansi.

#### Acceptance Criteria

1. WHEN admin menambah, mengubah, atau menghapus data warga, THE Resident_Database SHALL mencatat log aktivitas tersebut
2. THE Resident_Database SHALL menyimpan informasi: siapa yang melakukan perubahan, kapan perubahan dilakukan, dan apa yang diubah
3. THE Dashboard SHALL menampilkan halaman audit log yang hanya dapat diakses oleh admin
4. THE Dashboard SHALL memungkinkan admin memfilter audit log berdasarkan tanggal dan jenis aktivitas
5. THE Resident_Database SHALL menyimpan audit log minimal selama 1 tahun

