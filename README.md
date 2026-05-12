# Portal Warga Bukit Pandawa

> Website komunitas untuk mengelola informasi dan data warga di Perumahan Bukit Pandawa, Godean Jogja Hills.

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)

---

## 📖 Tentang Proyek

Portal web komunitas yang menyediakan satu tempat terpusat untuk:
- 📊 **Transparansi keuangan** perumahan
- 📸 **Dokumentasi kegiatan** melalui galeri foto
- 📢 **Pengumuman** penting untuk warga
- 🗳️ **Sistem voting** untuk pengambilan keputusan bersama
- 👥 **Database warga** digital dengan kontrol akses berbasis role

**Prinsip Utama:**
- ⚡ Ringan dan cepat (mobile-first)
- 🌐 Dapat diakses dari mana saja via browser
- 💰 Biaya operasional Rp 0 (semua pakai free tier)
- 🔒 Keamanan data dengan Row Level Security (RLS)

---

## 🚀 Fitur Utama

### 1. 👥 Dashboard Data Warga (Admin & Ketua Gang)
Sistem manajemen database warga perumahan secara digital:

**Fitur Lengkap:**
- ✅ **Manajemen Rumah**: CRUD data rumah (alamat, gang, pemilik)
- ✅ **Manajemen Penghuni**: CRUD data penghuni per rumah dengan kontak
- ✅ **Tracking PBB**: Riwayat pembayaran PBB per tahun per rumah
- ✅ **Statistik Real-time**: Dashboard jumlah rumah per gang dan status PBB
- ✅ **Filter & Search**: Filter gang, status PBB, pencarian nama (debounced)
- ✅ **Export CSV**: Export data warga untuk keperluan administrasi
- ✅ **Audit Trail**: Semua perubahan data tercatat otomatis
- ✅ **Responsive Design**: Optimized untuk desktop, tablet, dan mobile

**Kontrol Akses:**
- 🔑 **Admin**: Full CRUD + akses data sensitif (telepon, email)
- 👁️ **Ketua Gang**: Read-only + data publik saja (privasi terjaga)

**UI/UX:**
- Toast notifications untuk feedback operasi
- Confirmation dialogs untuk operasi destructive
- Loading states dan empty states
- Smart dropdown positioning (auto-adjust)
- Compact statistics cards
- Individual resident edit buttons
- Keyboard navigation support (ESC, Tab, Enter)

### 2. 📸 Galeri Foto (Public)
- Album foto kegiatan perumahan
- Lightbox untuk preview foto full-size
- Upload dan manajemen foto (admin only)
- Storage terintegrasi dengan Supabase

### 3. 📢 Pengumuman (Public)
- Informasi dan pengumuman terkini untuk warga
- Priority levels (normal, urgent)
- CRUD operations (admin only)

### 4. 💰 Keuangan (Public)
- Transparansi laporan keuangan perumahan
- Integrasi langsung dengan Google Sheets
- Data real-time dari spreadsheet bendahara
- Dropdown selector untuk sheet berbeda (per bulan/tahun)

### 5. 🗳️ Voting/Polling (Public & Per Gang)
- **Poll Publik**: Voting terbuka untuk seluruh warga
- **Poll Per Gang**: Voting khusus per gang via secret link
- Anti double-vote dengan browser fingerprinting
- Timer otomatis atau penutupan manual
- Real-time results dengan persentase
- Token-based security untuk poll per gang

---

## 🛠️ Tech Stack

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Frontend + Backend** | Next.js 15 (App Router) | SSR, ISR, API routes dalam satu framework |
| **Language** | TypeScript 5 | Type safety, better DX |
| **Database** | Supabase (PostgreSQL) | Real-time, RLS, auth bawaan, free tier generous |
| **Authentication** | Supabase Auth | Email/password, session management |
| **Storage** | Supabase Storage | Upload foto galeri, terintegrasi |
| **Styling** | Tailwind CSS 3.4 | Utility-first, mobile-friendly, ringan |
| **Data Keuangan** | Google Sheets API | Sheet tetap jadi sumber data, web read-only |
| **Testing** | Vitest | Fast unit testing |
| **Deployment** | Vercel | Zero-config, CDN global, free tier |

---

## 📋 Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- ✅ **Node.js** 18+ dan npm/yarn
- ✅ **Akun Supabase** (gratis di [supabase.com](https://supabase.com))
- ✅ **Google Service Account** (untuk fitur keuangan)
- ✅ **Git** untuk version control

---

## 🔧 Installation & Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd portal-warga-bukit-pandawa
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` dengan kredensial Anda:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Google Sheets API (untuk fitur keuangan)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_google_sheet_id_here
```

### 4. Setup Database

Jalankan migrations di **Supabase SQL Editor** secara berurutan:

```bash
# 1. Initial schema (users, profiles, announcements, gallery, polls)
supabase/migrations/001_initial_schema.sql

# 2. Fix poll votes RLS
supabase/migrations/002_fix_poll_votes_rls.sql

# 3. Resident database (houses, residents, pbb_payments, audit_logs)
supabase/migrations/003_resident_database.sql
```

**Cara menjalankan:**
1. Buka Supabase Dashboard → SQL Editor
2. Copy-paste isi file migration
3. Klik "Run"
4. Verify tidak ada error

### 5. Create Admin User

Di Supabase Dashboard → Authentication → Users:
1. Klik "Add user" → "Create new user"
2. Masukkan email dan password
3. Setelah user dibuat, jalankan SQL berikut di SQL Editor:

```sql
-- Buat profile admin
INSERT INTO profiles (id, name, role)
VALUES (
  'user-uuid-dari-auth-users',  -- Ganti dengan UUID user yang baru dibuat
  'Admin Name',
  'admin'
);
```

### 6. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 📁 Project Structure

```
portal-warga-bukit-pandawa/
├── .kiro/
│   └── specs/                      # Spec files (requirements, design, tasks)
│       ├── dashboard-data-warga/
│       └── portal-warga-bukit-pandawa/
├── docs/                           # Documentation
│   ├── API.md                     # API endpoints documentation
│   ├── DATABASE.md                # Database schema & ERD
│   └── DEPLOYMENT.md              # Deployment guide
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (public)/             # Public pages
│   │   │   ├── galeri/           # Gallery page
│   │   │   ├── keuangan/         # Finance page
│   │   │   ├── pengumuman/       # Announcements page
│   │   │   ├── voting/           # Voting pages
│   │   │   └── page.tsx          # Homepage
│   │   ├── admin/                # Admin pages (protected)
│   │   │   ├── akun/             # Account management
│   │   │   ├── dashboard/        # Admin dashboard
│   │   │   ├── data-warga/       # Resident data management ⭐
│   │   │   ├── galeri/           # Gallery management
│   │   │   ├── pengumuman/       # Announcement management
│   │   │   └── voting/           # Poll management
│   │   └── api/                  # API routes
│   │       ├── admin/
│   │       │   ├── accounts/
│   │       │   ├── announcements/
│   │       │   ├── gallery/
│   │       │   ├── polls/
│   │       │   └── residents/    # Resident data API ⭐
│   │       ├── keuangan/
│   │       └── votes/
│   ├── components/               # React components
│   │   ├── finance/             # Finance components
│   │   ├── gallery/             # Gallery components
│   │   ├── layout/              # Layout components (Header, Sidebar, etc)
│   │   ├── residents/           # Resident data components ⭐
│   │   ├── ui/                  # Reusable UI components
│   │   └── voting/              # Voting components
│   ├── hooks/                   # Custom React hooks
│   │   └── useToast.ts         # Toast notification hook
│   ├── lib/                     # Utility functions & helpers
│   │   ├── supabase/           # Supabase clients (server, client, admin)
│   │   ├── queries/            # Database query helpers
│   │   ├── export.ts           # CSV export utilities
│   │   ├── fingerprint.ts      # Browser fingerprinting
│   │   ├── google-sheets.ts    # Google Sheets integration
│   │   ├── messages.ts         # Centralized messages (Indonesian)
│   │   ├── residents.ts        # Resident data helpers
│   │   ├── security.ts         # Security utilities
│   │   ├── utils.ts            # General utilities
│   │   ├── validation.ts       # Input validation
│   │   └── voting.ts           # Voting utilities
│   ├── middleware.ts            # Next.js middleware (auth)
│   └── types/                   # TypeScript type definitions
│       └── index.ts            # All type definitions
├── supabase/
│   └── migrations/              # Database migrations
│       ├── 001_initial_schema.sql
│       ├── 002_fix_poll_votes_rls.sql
│       └── 003_resident_database.sql
├── public/                      # Static assets
├── .env.local.example          # Environment variables template
├── package.json                # Dependencies & scripts
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── vitest.config.ts            # Vitest configuration
```

---

## 🗄️ Database Schema

### Core Tables

#### `profiles`
User profiles dengan role-based access control.
- `id` (uuid, PK, FK → auth.users)
- `name` (text)
- `role` (enum: 'admin', 'ketua_gang')
- `gang` (text, nullable)
- `created_at` (timestamp)

#### `houses` ⭐
Data rumah di perumahan.
- `id` (uuid, PK)
- `address` (text) - Nomor rumah
- `gang` (text) - Gang/cluster
- `owner_name` (text) - Nama pemilik
- `created_at`, `updated_at` (timestamp)
- **Constraint**: UNIQUE(address, gang)

#### `residents` ⭐
Data penghuni rumah (bisa lebih dari satu per rumah).
- `id` (uuid, PK)
- `house_id` (uuid, FK → houses, ON DELETE CASCADE)
- `name` (text)
- `phone` (text, nullable) - **SENSITIVE DATA**
- `email` (text, nullable) - **SENSITIVE DATA**
- `is_primary` (boolean) - Penghuni utama
- `created_at`, `updated_at` (timestamp)

#### `pbb_payments` ⭐
Riwayat pembayaran PBB per rumah.
- `id` (uuid, PK)
- `house_id` (uuid, FK → houses, ON DELETE CASCADE)
- `tax_year` (integer)
- `status` (enum: 'lunas', 'belum')
- `reported_at` (timestamp)
- `reported_by` (uuid, FK → profiles)
- `notes` (text, nullable)
- `created_at` (timestamp)
- **Constraint**: UNIQUE(house_id, tax_year)

#### `audit_logs` ⭐
Audit trail untuk semua perubahan data.
- `id` (uuid, PK)
- `table_name` (text)
- `record_id` (uuid)
- `action` (enum: 'INSERT', 'UPDATE', 'DELETE')
- `changed_by` (uuid, FK → profiles)
- `changed_at` (timestamp)
- `old_data`, `new_data` (jsonb)

#### `announcements`
Pengumuman untuk warga.
- `id` (uuid, PK)
- `title`, `body` (text)
- `priority` (enum: 'normal', 'urgent')
- `created_by` (uuid, FK → profiles)
- `created_at`, `updated_at` (timestamp)

#### `gallery_albums`, `gallery_photos`
Album dan foto kegiatan perumahan.

#### `polls`, `poll_options`, `poll_votes`
Sistem voting dengan anti double-vote.

### Row Level Security (RLS)

Semua tabel dilindungi dengan RLS policies:

| Table | Admin | Ketua Gang | Anonymous |
|-------|-------|------------|-----------|
| `houses` | Full CRUD | Read only | No access |
| `residents` | Full CRUD | Read only* | No access |
| `pbb_payments` | Full CRUD | Read only | No access |
| `audit_logs` | Read only | No access | No access |

*Data sensitif (phone, email) di-filter di application layer untuk ketua gang.

### Database Triggers

#### Audit Logging
Otomatis mencatat semua INSERT, UPDATE, DELETE ke `audit_logs`:
```sql
CREATE TRIGGER audit_houses AFTER INSERT OR UPDATE OR DELETE ON houses
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
```

#### Auto-update Timestamps
Otomatis update `updated_at` saat record diubah:
```sql
CREATE TRIGGER update_houses_updated_at BEFORE UPDATE ON houses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔐 Authentication & Authorization

### Roles

| Role | Access Level | Capabilities |
|------|--------------|--------------|
| **admin** | Full access | CRUD semua data, lihat data sensitif, kelola akun, export data |
| **ketua_gang** | Read-only | Lihat data warga (tanpa data sensitif), buat poll per gang |
| **anonymous** | Public only | Lihat galeri, pengumuman, keuangan, vote di poll publik |

### Protected Routes

```
/admin/*              → Requires authentication (admin atau ketua_gang)
/admin/akun           → Admin only
/admin/data-warga     → Admin & ketua_gang (different views)
```

### Data Privacy

- ✅ Data sensitif (phone, email) hanya untuk admin
- ✅ Ketua gang hanya lihat data publik (nama, alamat, gang)
- ✅ Semua akses tercatat di audit_logs
- ✅ RLS enforce di database level
- ✅ Additional filtering di application layer

---

## 📡 API Endpoints

### Resident Data API ⭐

Dokumentasi lengkap: [docs/API.md](docs/API.md)

#### `GET /api/admin/residents`
List dan search data warga dengan filter dan pagination.

**Query Parameters:**
- `gang` (optional): Filter by gang
- `pbb_status` (optional): 'lunas' | 'belum'
- `search` (optional): Search by name
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "houses": [
      {
        "id": "uuid",
        "address": "A-12",
        "gang": "A",
        "owner_name": "John Doe",
        "residents": [
          {
            "id": "uuid",
            "name": "Jane Doe",
            "phone": "081234567890",  // null for ketua_gang
            "email": "jane@example.com",  // null for ketua_gang
            "is_primary": true
          }
        ],
        "latest_pbb": {
          "tax_year": 2024,
          "status": "lunas"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "total_pages": 2
    }
  }
}
```

#### `POST /api/admin/residents`
Create rumah baru (admin only).

#### `PATCH /api/admin/residents`
Update data rumah/resident/PBB (admin only).

#### `DELETE /api/admin/residents`
Delete rumah atau resident (admin only).

#### `GET /api/admin/residents/stats`
Get statistik data warga.

#### `GET /api/admin/residents/export`
Export data ke CSV (admin only).

#### `POST /api/admin/residents/pbb`
Tambah data PBB payment (admin only).

#### `GET /api/admin/residents/pbb-history`
Get riwayat PBB untuk rumah tertentu.

---

## 🎨 UI Components

### Resident Data Components ⭐

| Component | Purpose |
|-----------|---------|
| `StatsCards` | Kartu statistik (total rumah, per gang, PBB) |
| `FilterBar` | Filter gang, PBB status, search input |
| `DataWargaTable` | Tabel data warga dengan action menu |
| `AddHouseModal` | Modal tambah rumah + penghuni |
| `EditHouseModal` | Modal edit data rumah |
| `AddResidentModal` | Modal tambah penghuni ke rumah existing |
| `EditResidentModal` | Modal edit data penghuni |
| `PBBHistoryModal` | Modal kelola riwayat PBB |
| `ExportButton` | Button export data ke CSV |

### Reusable UI Components

| Component | Purpose |
|-----------|---------|
| `Toast` | Notification system (success, error, info, loading) |
| `ConfirmDialog` | Confirmation dialog untuk operasi destructive |
| `Button` | Reusable button dengan variants |
| `Badge` | Status badge (lunas, belum, active, closed) |
| `EmptyState` | Empty state dengan icon dan message |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test src/lib/validation.test.ts
```

### Test Coverage

- ✅ Unit tests untuk validation functions
- ✅ Unit tests untuk fingerprinting
- ✅ Unit tests untuk Google Sheets integration
- ✅ Unit tests untuk voting utilities
- ⏳ Integration tests untuk API routes (optional)

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Push ke GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import di Vercel**
   - Buka [vercel.com](https://vercel.com)
   - Klik "New Project"
   - Import repository dari GitHub
   - Vercel akan auto-detect Next.js

3. **Set Environment Variables**
   Di Vercel Dashboard → Settings → Environment Variables, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID`

4. **Deploy!**
   - Klik "Deploy"
   - Tunggu build selesai (~2-3 menit)
   - Website live di `https://your-project.vercel.app`

### Database Migration untuk Production

1. **Backup database** di Supabase Dashboard
2. **Jalankan migrations** di Supabase SQL Editor (production project)
3. **Verify RLS policies** sudah aktif
4. **Create admin user** di production
5. **Test login** dan semua fitur

Panduan lengkap: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 💡 Development Tips

### Adding New Gang
Gang baru otomatis tersimpan saat admin menambah rumah dengan gang baru. Tidak perlu master data gang terpisah.

### Custom Gang Input
Di AddHouseModal dan EditHouseModal, ada toggle untuk switch antara dropdown (gang existing) dan text input (gang baru).

### Data Privacy Best Practices
- Selalu filter data sensitif di API layer untuk non-admin
- Jangan expose phone/email di client-side untuk ketua_gang
- Semua perubahan data tercatat di audit_logs

### Performance Optimization
- Search input menggunakan debounce 500ms
- Pagination default 50 items (max 100)
- Database queries menggunakan indexes
- Images menggunakan `next/image` untuk auto-optimization

### Error Handling
- Semua error messages dalam Bahasa Indonesia
- Toast notifications untuk user feedback
- Confirmation dialogs untuk operasi destructive
- Centralized messages di `src/lib/messages.ts`

---

## 🐛 Troubleshooting

### Error: "Anda harus login untuk mengakses halaman ini"
**Solusi:**
- Pastikan user sudah login
- Check session di browser DevTools → Application → Cookies
- Verify role user di tabel `profiles`

### Error: "Akses ditolak. Hanya admin yang dapat melakukan operasi ini"
**Solusi:**
- Pastikan user memiliki role `admin` untuk operasi CRUD
- Check di Supabase Dashboard → Table Editor → profiles

### Data sensitif tidak muncul
**Ini normal** jika user adalah `ketua_gang`. Hanya admin yang bisa melihat phone dan email.

### Dropdown menu terpotong di bawah
**Sudah fixed** dengan smart positioning. Dropdown otomatis muncul ke atas jika space di bawah tidak cukup.

### Google Sheets API error
**Solusi:**
- Verify `GOOGLE_PRIVATE_KEY` format benar (dengan `\n`)
- Check service account punya akses ke sheet
- Pastikan sheet ID benar

---

## 📚 Documentation

- 📖 [API Documentation](docs/API.md) - Semua API endpoints
- 🗄️ [Database Schema](docs/DATABASE.md) - ERD dan table details
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md) - Step-by-step deployment
- 📋 [Spec Files](.kiro/specs/) - Requirements, design, tasks

---

## 🎯 Roadmap

### ✅ Completed (v1.0)
- [x] Dashboard data warga dengan CRUD lengkap
- [x] Kontrol akses berbasis role (admin, ketua_gang)
- [x] Tracking PBB per rumah
- [x] Export data ke CSV
- [x] Audit logging otomatis
- [x] Toast notifications & confirm dialogs
- [x] Responsive design (mobile-first)
- [x] Accessibility features (keyboard nav, ARIA labels)
- [x] Smart dropdown positioning
- [x] Compact statistics cards
- [x] Individual resident edit buttons

### 🔜 Future Enhancements (v2.0)
- [ ] Bulk operations (bulk delete, bulk update PBB)
- [ ] Import data dari CSV/Excel
- [ ] Advanced search dengan full-text search
- [ ] Data visualization (charts untuk PBB trends)
- [ ] Email/WhatsApp notifications untuk PBB reminders
- [ ] PWA dengan offline support
- [ ] Dark mode
- [ ] Multi-language support (English)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Team

**Perumahan Bukit Pandawa**  
Godean Jogja Hills, Yogyakarta

---

## 📞 Support

Untuk pertanyaan atau issue:
- 🐛 Buat issue di GitHub repository
- 📧 Email: [your-email@example.com]
- 💬 WhatsApp: [your-whatsapp-number]

---

<div align="center">

**Made with ❤️ for Warga Bukit Pandawa**

[⬆ Back to Top](#portal-warga-bukit-pandawa)

</div>
