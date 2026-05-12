# Design Document: Dashboard Data Warga

## Overview

Dashboard Data Warga adalah fitur untuk mengelola dan menampilkan data warga perumahan Bukit Pandawa secara digital. Fitur ini memungkinkan admin untuk mengelola database warga yang mencakup informasi pemilik rumah, penghuni, kontak, dan history pembayaran PBB. Data dapat dilihat secara global atau per gang, dengan kontrol akses berbasis role (admin vs ketua_gang) dan sensitivitas data.

### Tujuan Utama

1. **Digitalisasi Data Warga**: Membuat database digital untuk data warga yang sebelumnya tidak ada
2. **Manajemen Data Terstruktur**: Menyediakan CRUD operations untuk data rumah, pemilik, penghuni, dan PBB
3. **Kontrol Akses Berbasis Role**: Admin dapat melihat semua data termasuk data sensitif (kontak), ketua gang hanya dapat melihat data publik
4. **Visualisasi dan Statistik**: Menampilkan ringkasan dan statistik data warga untuk memudahkan monitoring

### Scope

**In Scope:**
- Database schema untuk houses, residents (owners & occupants), dan pbb_payments
- RLS policies untuk kontrol akses data sensitif vs publik
- API routes untuk CRUD operations (admin only)
- UI components untuk menampilkan dan mengelola data warga
- Filter dan pencarian data warga
- Statistik dan ringkasan data
- Export data ke CSV/Excel (admin only)
- Audit logging untuk perubahan data

**Out of Scope:**
- Integrasi dengan sistem PBB pemerintah
- Notifikasi otomatis untuk pembayaran PBB
- Import data dari file eksternal (akan ditambahkan di fase berikutnya)
- Mobile app native (menggunakan responsive web)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Next.js App Router                                     │ │
│  │  - /admin/data-warga (Admin UI)                        │ │
│  │  - Client Components (DataWargaTable, FilterBar, etc) │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                         │
│  /api/admin/residents                                        │
│  - GET    (list/search residents)                           │
│  - POST   (create house + residents)                        │
│  - PATCH  (update house/resident/pbb)                       │
│  - DELETE (delete house/resident)                           │
│                                                              │
│  /api/admin/residents/export                                │
│  - GET    (export to CSV)                                   │
│                                                              │
│  /api/admin/residents/stats                                 │
│  - GET    (get statistics)                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Supabase Client SDK
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                                    │ │
│  │  - houses                                               │ │
│  │  - residents (owners & occupants)                      │ │
│  │  - pbb_payments                                        │ │
│  │  - audit_logs                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Row Level Security (RLS)                              │ │
│  │  - Admin: full access                                  │ │
│  │  - Ketua Gang: read public data only                  │ │
│  │  - Anonymous: no access                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Read Flow (GET)**:
   - User mengakses `/admin/data-warga`
   - Client component memanggil API `/api/admin/residents`
   - API route memverifikasi auth dan role user
   - API route query Supabase dengan RLS policies
   - RLS policies memfilter data berdasarkan role (admin vs ketua_gang)
   - Data dikembalikan ke client dan ditampilkan

2. **Write Flow (POST/PATCH/DELETE)**:
   - Admin mengisi form atau mengklik tombol aksi
   - Client component memanggil API route yang sesuai
   - API route memverifikasi role admin
   - API route melakukan operasi database
   - Audit log dicatat otomatis via database trigger
   - Response dikembalikan ke client
   - Client memperbarui UI

3. **Export Flow**:
   - Admin mengklik tombol export
   - Client memanggil `/api/admin/residents/export`
   - API route query data sesuai filter
   - API route generate CSV file
   - File di-download ke browser admin

## Components and Interfaces

### Database Schema

#### Table: houses

Menyimpan informasi rumah di perumahan.

```sql
CREATE TABLE houses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address     TEXT NOT NULL,              -- Nomor rumah (misal: "A-12")
  gang        TEXT NOT NULL,              -- Gang (misal: "A", "B", "C")
  owner_name  TEXT NOT NULL,              -- Nama pemilik rumah
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ,
  UNIQUE(address, gang)                   -- Satu alamat unik per gang
);

CREATE INDEX idx_houses_gang ON houses(gang);
CREATE INDEX idx_houses_address ON houses(address);
```

**Rationale**: 
- `owner_name` disimpan langsung di tabel houses untuk simplicity (tidak perlu join untuk menampilkan pemilik)
- `address` dan `gang` di-combine untuk membentuk alamat lengkap (misal: "A-12" di Gang A)
- UNIQUE constraint memastikan tidak ada duplikasi alamat

#### Table: residents

Menyimpan informasi penghuni rumah (bisa lebih dari satu per rumah).

```sql
CREATE TABLE residents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id    UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,              -- Nama penghuni
  phone       TEXT,                       -- Nomor telepon (SENSITIVE)
  email       TEXT,                       -- Email (SENSITIVE)
  is_primary  BOOLEAN NOT NULL DEFAULT false,  -- Penghuni utama
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX idx_residents_house_id ON residents(house_id);
CREATE INDEX idx_residents_name ON residents(name);
```

**Rationale**:
- Satu rumah bisa punya banyak penghuni (one-to-many relationship)
- `is_primary` menandai penghuni utama (untuk sorting/display priority)
- `phone` dan `email` adalah data sensitif yang akan difilter via RLS
- ON DELETE CASCADE: jika rumah dihapus, semua penghuni ikut terhapus

#### Table: pbb_payments

Menyimpan history pembayaran PBB per rumah.

```sql
CREATE TABLE pbb_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id        UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  tax_year        INTEGER NOT NULL,       -- Tahun pajak (misal: 2024)
  status          TEXT NOT NULL CHECK (status IN ('lunas', 'belum')),
  reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reported_by     UUID NOT NULL REFERENCES profiles(id),
  notes           TEXT,                   -- Catatan tambahan
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(house_id, tax_year)              -- Satu record per rumah per tahun
);

CREATE INDEX idx_pbb_payments_house_id ON pbb_payments(house_id);
CREATE INDEX idx_pbb_payments_tax_year ON pbb_payments(tax_year DESC);
CREATE INDEX idx_pbb_payments_status ON pbb_payments(status);
```

**Rationale**:
- UNIQUE constraint memastikan satu rumah hanya punya satu record per tahun pajak
- `reported_by` untuk audit trail (siapa yang input data)
- `status` hanya 'lunas' atau 'belum' untuk simplicity
- Index pada `tax_year DESC` untuk query tahun terbaru lebih cepat

#### Table: audit_logs

Menyimpan log perubahan data untuk audit trail.

```sql
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      TEXT NOT NULL,          -- Nama tabel yang diubah
  record_id       UUID NOT NULL,          -- ID record yang diubah
  action          TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by      UUID NOT NULL REFERENCES profiles(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_data        JSONB,                  -- Data sebelum perubahan
  new_data        JSONB                   -- Data setelah perubahan
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at DESC);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);
```

**Rationale**:
- Generic audit log table untuk semua perubahan data
- `old_data` dan `new_data` dalam JSONB untuk fleksibilitas
- Akan di-populate via database triggers

### RLS Policies

#### houses Table

```sql
-- Admin: full access
CREATE POLICY "houses_admin_all" ON houses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Ketua gang: read only (public data)
CREATE POLICY "houses_select_ketua_gang" ON houses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ketua_gang')
  );

-- Anonymous: no access
-- (no policy = default deny)
```

#### residents Table

```sql
-- Admin: full access to all columns
CREATE POLICY "residents_admin_all" ON residents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Ketua gang: read only, but sensitive columns will be filtered at application layer
-- RLS allows SELECT, but API will filter phone/email
CREATE POLICY "residents_select_ketua_gang" ON residents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ketua_gang')
  );
```

**Note**: Untuk data sensitif (phone, email), filtering dilakukan di application layer (API route) karena RLS tidak bisa hide specific columns. API akan return `null` untuk kolom sensitif jika user bukan admin.

#### pbb_payments Table

```sql
-- Admin: full access
CREATE POLICY "pbb_payments_admin_all" ON pbb_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Ketua gang: read only
CREATE POLICY "pbb_payments_select_ketua_gang" ON pbb_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ketua_gang')
  );
```

#### audit_logs Table

```sql
-- Admin: read only (logs should not be modified)
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- No INSERT/UPDATE/DELETE policies - logs are created via triggers only
```

### API Routes

#### GET /api/admin/residents

**Purpose**: List dan search data warga dengan filter dan pagination.

**Query Parameters**:
- `gang` (optional): Filter by gang (misal: "A", "B")
- `pbb_status` (optional): Filter by PBB status ("lunas", "belum")
- `search` (optional): Search by owner name atau resident name
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response**:
```typescript
{
  success: true,
  data: {
    houses: Array<{
      id: string;
      address: string;
      gang: string;
      owner_name: string;
      residents: Array<{
        id: string;
        name: string;
        phone: string | null;  // null if user is not admin
        email: string | null;  // null if user is not admin
        is_primary: boolean;
      }>;
      latest_pbb: {
        tax_year: number;
        status: 'lunas' | 'belum';
      } | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }
}
```

**Access Control**:
- Admin: dapat melihat semua data termasuk phone dan email
- Ketua gang: dapat melihat semua data kecuali phone dan email (di-set null)
- Anonymous: 403 Forbidden

#### POST /api/admin/residents

**Purpose**: Membuat data rumah baru beserta pemilik dan penghuni.

**Request Body**:
```typescript
{
  address: string;        // Required, misal: "A-12"
  gang: string;           // Required, misal: "A"
  owner_name: string;     // Required
  residents: Array<{      // Optional, bisa kosong
    name: string;
    phone?: string;
    email?: string;
    is_primary: boolean;
  }>;
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    house_id: string;
    message: string;
  }
}
```

**Access Control**: Admin only (403 for non-admin)

**Validation**:
- `address` tidak boleh kosong
- `gang` tidak boleh kosong
- `owner_name` tidak boleh kosong
- Kombinasi `address` + `gang` harus unik
- `email` harus valid format jika diisi
- `phone` harus valid format jika diisi

#### PATCH /api/admin/residents

**Purpose**: Update data rumah, penghuni, atau PBB.

**Request Body**:
```typescript
{
  type: 'house' | 'resident' | 'pbb';
  id: string;  // house_id, resident_id, atau pbb_payment_id
  data: {
    // For type='house':
    address?: string;
    gang?: string;
    owner_name?: string;
    
    // For type='resident':
    name?: string;
    phone?: string;
    email?: string;
    is_primary?: boolean;
    
    // For type='pbb':
    tax_year?: number;
    status?: 'lunas' | 'belum';
    notes?: string;
  };
}
```

**Response**:
```typescript
{
  success: true,
  message: string;
}
```

**Access Control**: Admin only

#### DELETE /api/admin/residents

**Purpose**: Hapus rumah atau penghuni.

**Query Parameters**:
- `type`: 'house' | 'resident'
- `id`: UUID of house or resident

**Response**:
```typescript
{
  success: true,
  message: string;
}
```

**Access Control**: Admin only

**Note**: Menghapus house akan cascade delete semua residents dan pbb_payments.

#### POST /api/admin/residents/pbb

**Purpose**: Tambah record pembayaran PBB baru.

**Request Body**:
```typescript
{
  house_id: string;
  tax_year: number;
  status: 'lunas' | 'belum';
  notes?: string;
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string;
    message: string;
  }
}
```

**Access Control**: Admin only

**Validation**:
- `house_id` harus exist
- `tax_year` harus valid (misal: 2000-2100)
- Kombinasi `house_id` + `tax_year` harus unik

#### GET /api/admin/residents/stats

**Purpose**: Mendapatkan statistik data warga.

**Query Parameters**:
- `gang` (optional): Filter by gang

**Response**:
```typescript
{
  success: true,
  data: {
    total_houses: number;
    houses_by_gang: Record<string, number>;  // { "A": 50, "B": 45, ... }
    pbb_stats: {
      total_records: number;
      lunas_count: number;
      belum_count: number;
      lunas_percentage: number;
      belum_percentage: number;
      by_year: Array<{
        tax_year: number;
        lunas: number;
        belum: number;
      }>;
    };
  }
}
```

**Access Control**: Admin dan ketua gang

#### GET /api/admin/residents/export

**Purpose**: Export data warga ke CSV.

**Query Parameters**:
- `gang` (optional): Filter by gang
- `format` (optional): 'csv' | 'excel' (default: 'csv')

**Response**: File download (CSV atau Excel)

**CSV Format**:
```
Alamat,Gang,Pemilik,Penghuni,Telepon,Email,Status PBB Terakhir,Tahun PBB
A-12,A,John Doe,Jane Doe,08123456789,jane@example.com,lunas,2024
```

**Access Control**: Admin only (data sensitif included)

### UI Components

#### Page: /admin/data-warga

Main page untuk dashboard data warga.

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Data Warga                                        │
│  Kelola data warga perumahan Bukit Pandawa                  │
├─────────────────────────────────────────────────────────────┤
│  [Statistik Cards]                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Total    │ │ Gang A   │ │ Gang B   │ │ PBB      │      │
│  │ Rumah    │ │ 50 rumah │ │ 45 rumah │ │ Lunas    │      │
│  │ 150      │ │          │ │          │ │ 85%      │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│  [Filter Bar]                                                │
│  Gang: [All ▼]  PBB: [All ▼]  Search: [________] [🔍]      │
│  [+ Tambah Rumah]  [📊 Export CSV]                          │
├─────────────────────────────────────────────────────────────┤
│  [Data Table]                                                │
│  Alamat │ Gang │ Pemilik │ Penghuni │ Kontak │ PBB │ Aksi  │
│  ────────────────────────────────────────────────────────────│
│  A-12   │ A    │ John    │ Jane     │ 0812.. │ ✓   │ [⋮]   │
│  A-13   │ A    │ Smith   │ -        │ -      │ ✗   │ [⋮]   │
│  ...                                                         │
├─────────────────────────────────────────────────────────────┤
│  [Pagination]                                                │
│  ← Previous  1 2 3 ... 10  Next →                           │
└─────────────────────────────────────────────────────────────┘
```

**Components**:

1. **StatsCards**: Menampilkan statistik ringkasan
2. **FilterBar**: Filter dan search controls
3. **DataWargaTable**: Tabel data warga dengan sorting dan actions
4. **AddHouseModal**: Modal untuk tambah rumah baru
5. **EditHouseModal**: Modal untuk edit data rumah
6. **AddResidentModal**: Modal untuk tambah penghuni
7. **EditResidentModal**: Modal untuk edit penghuni
8. **PBBHistoryModal**: Modal untuk lihat dan manage history PBB
9. **ExportButton**: Button untuk export data

#### Component: DataWargaTable

**Props**:
```typescript
interface DataWargaTableProps {
  houses: HouseWithResidents[];
  isAdmin: boolean;
  onEdit: (houseId: string) => void;
  onDelete: (houseId: string) => void;
  onAddResident: (houseId: string) => void;
  onViewPBB: (houseId: string) => void;
}
```

**Features**:
- Sortable columns
- Row actions menu (edit, delete, add resident, view PBB)
- Conditional rendering untuk data sensitif (phone/email hanya untuk admin)
- Empty state jika tidak ada data
- Loading state

#### Component: FilterBar

**Props**:
```typescript
interface FilterBarProps {
  gangs: string[];
  selectedGang: string | null;
  selectedPBBStatus: 'all' | 'lunas' | 'belum';
  searchQuery: string;
  onGangChange: (gang: string | null) => void;
  onPBBStatusChange: (status: 'all' | 'lunas' | 'belum') => void;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
}
```

**Features**:
- Dropdown untuk filter gang
- Dropdown untuk filter status PBB
- Search input dengan debounce
- Clear filters button

#### Component: AddHouseModal

**Props**:
```typescript
interface AddHouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Form Fields**:
- Alamat (text input, required)
- Gang (dropdown, required)
- Nama Pemilik (text input, required)
- Penghuni (dynamic list):
  - Nama (text input)
  - Telepon (text input)
  - Email (email input)
  - Penghuni Utama (checkbox)
  - [+ Tambah Penghuni] button

**Validation**:
- Alamat tidak boleh kosong
- Gang harus dipilih
- Nama pemilik tidak boleh kosong
- Email harus valid format jika diisi
- Minimal satu penghuni harus ditandai sebagai penghuni utama jika ada penghuni

## Data Models

### TypeScript Types

```typescript
// houses
export interface House {
  id: string;
  address: string;
  gang: string;
  owner_name: string;
  created_at: string;
  updated_at: string | null;
}

// residents
export interface Resident {
  id: string;
  house_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string | null;
}

// pbb_payments
export type PBBStatus = 'lunas' | 'belum';

export interface PBBPayment {
  id: string;
  house_id: string;
  tax_year: number;
  status: PBBStatus;
  reported_at: string;
  reported_by: string;
  notes: string | null;
  created_at: string;
}

// audit_logs
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  changed_by: string;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

// Derived types for API responses
export interface HouseWithResidents extends House {
  residents: Resident[];
  latest_pbb: {
    tax_year: number;
    status: PBBStatus;
  } | null;
}

export interface ResidentStats {
  total_houses: number;
  houses_by_gang: Record<string, number>;
  pbb_stats: {
    total_records: number;
    lunas_count: number;
    belum_count: number;
    lunas_percentage: number;
    belum_percentage: number;
    by_year: Array<{
      tax_year: number;
      lunas: number;
      belum: number;
    }>;
  };
}
```

### Database Triggers

#### Audit Log Trigger

Trigger untuk mencatat semua perubahan data ke audit_logs table.

```sql
-- Function untuk audit logging
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_data)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), row_to_json(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (table_name, record_id, action, changed_by, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', auth.uid(), row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk houses
CREATE TRIGGER audit_houses
  AFTER INSERT OR UPDATE OR DELETE ON houses
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Trigger untuk residents
CREATE TRIGGER audit_residents
  AFTER INSERT OR UPDATE OR DELETE ON residents
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Trigger untuk pbb_payments
CREATE TRIGGER audit_pbb_payments
  AFTER INSERT OR UPDATE OR DELETE ON pbb_payments
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
```

#### Updated_at Trigger

Trigger untuk auto-update kolom `updated_at`.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_houses_updated_at
  BEFORE UPDATE ON houses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_residents_updated_at
  BEFORE UPDATE ON residents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```


## Error Handling

### API Error Responses

Semua API routes menggunakan format error response yang konsisten:

```typescript
interface ErrorResponse {
  success: false;
  error: string;        // Error code (misal: 'validation_error', 'not_found')
  message: string;      // Human-readable error message dalam Bahasa Indonesia
}
```

### Error Categories

#### 1. Authentication Errors (401)

**Scenario**: User tidak terautentikasi atau session expired.

**Response**:
```json
{
  "success": false,
  "error": "unauthorized",
  "message": "Anda harus login untuk mengakses halaman ini."
}
```

**Handling**: Redirect ke login page.

#### 2. Authorization Errors (403)

**Scenario**: User terautentikasi tapi tidak punya permission (misal: ketua gang mencoba create/update/delete).

**Response**:
```json
{
  "success": false,
  "error": "forbidden",
  "message": "Akses ditolak. Hanya admin yang dapat melakukan operasi ini."
}
```

**Handling**: Tampilkan error message, disable action buttons untuk non-admin.

#### 3. Validation Errors (400)

**Scenario**: Input data tidak valid.

**Response**:
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Field 'address' tidak boleh kosong."
}
```

**Handling**: Tampilkan error message di form, highlight field yang error.

**Common Validation Rules**:
- Required fields tidak boleh kosong
- Email harus valid format
- Phone harus valid format (Indonesia: 08xx atau +62)
- Tax year harus dalam range valid (2000-2100)
- Unique constraints (address+gang, house_id+tax_year)

#### 4. Not Found Errors (404)

**Scenario**: Resource tidak ditemukan (misal: house_id tidak exist).

**Response**:
```json
{
  "success": false,
  "error": "not_found",
  "message": "Data rumah tidak ditemukan."
}
```

**Handling**: Tampilkan error message, refresh data list.

#### 5. Conflict Errors (409)

**Scenario**: Duplicate data (misal: alamat sudah exist).

**Response**:
```json
{
  "success": false,
  "error": "conflict",
  "message": "Alamat A-12 di Gang A sudah terdaftar."
}
```

**Handling**: Tampilkan error message, suggest user to check existing data.

#### 6. Server Errors (500)

**Scenario**: Database error, unexpected errors.

**Response**:
```json
{
  "success": false,
  "error": "server_error",
  "message": "Terjadi kesalahan server. Silakan coba lagi."
}
```

**Handling**: Tampilkan generic error message, log error untuk debugging.

### Client-Side Error Handling

#### Network Errors

**Scenario**: Request timeout, no internet connection.

**Handling**:
- Tampilkan toast notification: "Koneksi terputus. Silakan cek internet Anda."
- Retry button untuk user
- Auto-retry dengan exponential backoff (max 3 attempts)

#### Form Validation

**Client-side validation** dilakukan sebelum submit untuk UX yang lebih baik:
- Required field validation
- Email format validation
- Phone format validation
- Real-time feedback saat user mengetik

**Server-side validation** tetap dilakukan untuk security.

### Database Constraints

Database constraints sebagai last line of defense:

1. **UNIQUE constraints**: Mencegah duplicate data
   - `houses(address, gang)`
   - `pbb_payments(house_id, tax_year)`

2. **CHECK constraints**: Validasi nilai enum
   - `pbb_payments.status IN ('lunas', 'belum')`

3. **FOREIGN KEY constraints**: Referential integrity
   - `residents.house_id REFERENCES houses(id)`
   - `pbb_payments.house_id REFERENCES houses(id)`
   - `pbb_payments.reported_by REFERENCES profiles(id)`

4. **NOT NULL constraints**: Required fields
   - `houses.address`, `houses.gang`, `houses.owner_name`
   - `residents.name`, `residents.house_id`
   - `pbb_payments.house_id`, `pbb_payments.tax_year`, `pbb_payments.status`

### Cascade Deletes

**ON DELETE CASCADE** digunakan untuk maintain referential integrity:

- Menghapus `house` akan otomatis menghapus:
  - Semua `residents` yang terkait
  - Semua `pbb_payments` yang terkait
  - Audit logs tetap dipertahankan (tidak cascade)

**Warning**: Sebelum delete house, tampilkan confirmation dialog yang menjelaskan bahwa semua data terkait akan ikut terhapus.

## Testing Strategy

### Overview

Karena fitur ini adalah **CRUD application dengan UI rendering dan database operations**, property-based testing (PBT) **tidak applicable**. Testing strategy fokus pada:

1. **Unit Tests**: Validasi logic dan helper functions
2. **Integration Tests**: API routes dengan mock database
3. **E2E Tests**: User flows dengan real database (test environment)
4. **Manual Testing**: UI/UX, accessibility, responsiveness

### Unit Tests

**Target**: Helper functions, validation logic, data transformations.

**Framework**: Vitest (sudah ada di project)

**Test Cases**:

#### 1. Validation Functions

File: `src/lib/validation.test.ts`

```typescript
describe('validateEmail', () => {
  it('should accept valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user+tag@domain.co.id')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('should accept valid Indonesian phone numbers', () => {
    expect(validatePhone('08123456789')).toBe(true);
    expect(validatePhone('+628123456789')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhone('123')).toBe(false);
    expect(validatePhone('abcdefghij')).toBe(false);
  });
});

describe('validateTaxYear', () => {
  it('should accept valid tax years', () => {
    expect(validateTaxYear(2024)).toBe(true);
    expect(validateTaxYear(2000)).toBe(true);
  });

  it('should reject invalid tax years', () => {
    expect(validateTaxYear(1999)).toBe(false);
    expect(validateTaxYear(2101)).toBe(false);
  });
});
```

#### 2. Data Transformation Functions

File: `src/lib/residents.test.ts`

```typescript
describe('filterSensitiveData', () => {
  it('should remove phone and email for non-admin users', () => {
    const resident = {
      id: '123',
      name: 'John Doe',
      phone: '08123456789',
      email: 'john@example.com',
      is_primary: true,
    };
    
    const filtered = filterSensitiveData(resident, false);
    
    expect(filtered.phone).toBeNull();
    expect(filtered.email).toBeNull();
    expect(filtered.name).toBe('John Doe');
  });

  it('should keep all data for admin users', () => {
    const resident = {
      id: '123',
      name: 'John Doe',
      phone: '08123456789',
      email: 'john@example.com',
      is_primary: true,
    };
    
    const filtered = filterSensitiveData(resident, true);
    
    expect(filtered.phone).toBe('08123456789');
    expect(filtered.email).toBe('john@example.com');
  });
});

describe('calculatePBBStats', () => {
  it('should calculate correct statistics', () => {
    const payments = [
      { status: 'lunas', tax_year: 2024 },
      { status: 'lunas', tax_year: 2024 },
      { status: 'belum', tax_year: 2024 },
      { status: 'lunas', tax_year: 2023 },
    ];
    
    const stats = calculatePBBStats(payments);
    
    expect(stats.total_records).toBe(4);
    expect(stats.lunas_count).toBe(3);
    expect(stats.belum_count).toBe(1);
    expect(stats.lunas_percentage).toBe(75);
  });
});
```

#### 3. CSV Export Functions

File: `src/lib/export.test.ts`

```typescript
describe('generateCSV', () => {
  it('should generate valid CSV format', () => {
    const data = [
      {
        address: 'A-12',
        gang: 'A',
        owner_name: 'John Doe',
        residents: [{ name: 'Jane Doe', phone: '08123456789' }],
        latest_pbb: { tax_year: 2024, status: 'lunas' },
      },
    ];
    
    const csv = generateCSV(data);
    
    expect(csv).toContain('Alamat,Gang,Pemilik');
    expect(csv).toContain('A-12,A,John Doe');
  });

  it('should escape special characters', () => {
    const data = [
      {
        address: 'A-12',
        gang: 'A',
        owner_name: 'John "Doe"',
        residents: [],
        latest_pbb: null,
      },
    ];
    
    const csv = generateCSV(data);
    
    expect(csv).toContain('"John ""Doe"""');
  });
});
```

### Integration Tests

**Target**: API routes dengan mock Supabase client.

**Framework**: Vitest + MSW (Mock Service Worker) atau manual mocks

**Test Cases**:

#### 1. GET /api/admin/residents

File: `src/app/api/admin/residents/route.test.ts`

```typescript
describe('GET /api/admin/residents', () => {
  it('should return 403 for non-authenticated users', async () => {
    // Mock: no auth session
    const response = await GET(mockRequest);
    expect(response.status).toBe(403);
  });

  it('should return 403 for ketua_gang trying to access without proper role', async () => {
    // Mock: ketua_gang session
    const response = await GET(mockRequest);
    expect(response.status).toBe(200);
    // Verify sensitive data is filtered
  });

  it('should return all data for admin', async () => {
    // Mock: admin session
    const response = await GET(mockRequest);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.houses).toBeDefined();
  });

  it('should filter by gang parameter', async () => {
    // Mock: admin session with gang=A filter
    const response = await GET(mockRequestWithGang);
    const data = await response.json();
    
    expect(data.data.houses.every(h => h.gang === 'A')).toBe(true);
  });

  it('should search by name', async () => {
    // Mock: admin session with search query
    const response = await GET(mockRequestWithSearch);
    const data = await response.json();
    
    expect(data.data.houses.length).toBeGreaterThan(0);
  });
});
```

#### 2. POST /api/admin/residents

```typescript
describe('POST /api/admin/residents', () => {
  it('should return 403 for non-admin users', async () => {
    // Mock: ketua_gang session
    const response = await POST(mockRequest);
    expect(response.status).toBe(403);
  });

  it('should create house with valid data', async () => {
    // Mock: admin session
    const body = {
      address: 'A-12',
      gang: 'A',
      owner_name: 'John Doe',
      residents: [],
    };
    
    const response = await POST(mockRequestWithBody(body));
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.house_id).toBeDefined();
  });

  it('should return 400 for missing required fields', async () => {
    const body = { address: 'A-12' }; // Missing gang and owner_name
    
    const response = await POST(mockRequestWithBody(body));
    
    expect(response.status).toBe(400);
  });

  it('should return 409 for duplicate address', async () => {
    // Mock: address already exists
    const body = {
      address: 'A-12',
      gang: 'A',
      owner_name: 'John Doe',
      residents: [],
    };
    
    const response = await POST(mockRequestWithBody(body));
    
    expect(response.status).toBe(409);
  });
});
```

#### 3. PATCH /api/admin/residents

```typescript
describe('PATCH /api/admin/residents', () => {
  it('should update house data', async () => {
    const body = {
      type: 'house',
      id: 'house-uuid',
      data: { owner_name: 'Jane Doe' },
    };
    
    const response = await PATCH(mockRequestWithBody(body));
    
    expect(response.status).toBe(200);
  });

  it('should return 404 for non-existent house', async () => {
    const body = {
      type: 'house',
      id: 'non-existent-uuid',
      data: { owner_name: 'Jane Doe' },
    };
    
    const response = await PATCH(mockRequestWithBody(body));
    
    expect(response.status).toBe(404);
  });
});
```

### E2E Tests

**Target**: Complete user flows dari UI hingga database.

**Framework**: Playwright (recommended) atau Cypress

**Test Environment**: Supabase test project dengan test data

**Test Cases**:

#### 1. Admin Flow: Create House

```typescript
test('admin can create new house with residents', async ({ page }) => {
  // Login as admin
  await page.goto('/admin/data-warga');
  
  // Click "Tambah Rumah" button
  await page.click('button:has-text("Tambah Rumah")');
  
  // Fill form
  await page.fill('input[name="address"]', 'A-99');
  await page.selectOption('select[name="gang"]', 'A');
  await page.fill('input[name="owner_name"]', 'Test Owner');
  
  // Add resident
  await page.click('button:has-text("Tambah Penghuni")');
  await page.fill('input[name="residents[0].name"]', 'Test Resident');
  await page.fill('input[name="residents[0].phone"]', '08123456789');
  await page.check('input[name="residents[0].is_primary"]');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Verify success
  await expect(page.locator('text=berhasil ditambahkan')).toBeVisible();
  await expect(page.locator('text=A-99')).toBeVisible();
});
```

#### 2. Admin Flow: Update PBB Status

```typescript
test('admin can update PBB status', async ({ page }) => {
  await page.goto('/admin/data-warga');
  
  // Click action menu for first house
  await page.click('button[aria-label="Actions"]:first');
  await page.click('text=Kelola PBB');
  
  // Add new PBB record
  await page.click('button:has-text("Tambah Pembayaran")');
  await page.fill('input[name="tax_year"]', '2024');
  await page.selectOption('select[name="status"]', 'lunas');
  await page.click('button[type="submit"]');
  
  // Verify
  await expect(page.locator('text=2024')).toBeVisible();
  await expect(page.locator('text=✓')).toBeVisible();
});
```

#### 3. Ketua Gang Flow: View Data (No Sensitive Info)

```typescript
test('ketua gang cannot see phone and email', async ({ page }) => {
  // Login as ketua gang
  await page.goto('/admin/data-warga');
  
  // Verify data is visible
  await expect(page.locator('text=A-12')).toBeVisible();
  
  // Verify sensitive data is hidden
  await expect(page.locator('text=08123456789')).not.toBeVisible();
  await expect(page.locator('text=@')).not.toBeVisible();
  
  // Verify action buttons are disabled
  await expect(page.locator('button:has-text("Tambah Rumah")')).toBeDisabled();
});
```

#### 4. Search and Filter

```typescript
test('user can search and filter data', async ({ page }) => {
  await page.goto('/admin/data-warga');
  
  // Filter by gang
  await page.selectOption('select[name="gang"]', 'A');
  await expect(page.locator('tbody tr')).toHaveCount(50); // Assuming 50 houses in Gang A
  
  // Search by name
  await page.fill('input[name="search"]', 'John');
  await page.click('button:has-text("Cari")');
  await expect(page.locator('text=John')).toBeVisible();
  
  // Clear filters
  await page.click('button:has-text("Reset")');
  await expect(page.locator('tbody tr')).toHaveCount(150); // All houses
});
```

### Database Tests

**Target**: RLS policies, triggers, constraints.

**Framework**: pgTAP (PostgreSQL testing framework) atau manual SQL tests

**Test Cases**:

#### 1. RLS Policy Tests

```sql
-- Test: Admin can read all houses
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub": "admin-uuid", "role": "admin"}';
  
  SELECT plan(1);
  SELECT ok(
    (SELECT COUNT(*) FROM houses) > 0,
    'Admin can read houses'
  );
  
  SELECT * FROM finish();
ROLLBACK;

-- Test: Ketua gang can read houses but not modify
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub": "ketua-uuid", "role": "ketua_gang"}';
  
  SELECT plan(2);
  SELECT ok(
    (SELECT COUNT(*) FROM houses) > 0,
    'Ketua gang can read houses'
  );
  
  SELECT throws_ok(
    'INSERT INTO houses (address, gang, owner_name) VALUES (''A-99'', ''A'', ''Test'')',
    'Ketua gang cannot insert houses'
  );
  
  SELECT * FROM finish();
ROLLBACK;

-- Test: Anonymous cannot access
BEGIN;
  SET LOCAL ROLE anon;
  
  SELECT plan(1);
  SELECT is(
    (SELECT COUNT(*) FROM houses),
    0::bigint,
    'Anonymous cannot read houses'
  );
  
  SELECT * FROM finish();
ROLLBACK;
```

#### 2. Trigger Tests

```sql
-- Test: Audit log is created on INSERT
BEGIN;
  INSERT INTO houses (address, gang, owner_name)
  VALUES ('TEST-1', 'TEST', 'Test Owner');
  
  SELECT plan(1);
  SELECT ok(
    EXISTS (
      SELECT 1 FROM audit_logs
      WHERE table_name = 'houses'
      AND action = 'INSERT'
      AND new_data->>'address' = 'TEST-1'
    ),
    'Audit log created on INSERT'
  );
  
  SELECT * FROM finish();
ROLLBACK;

-- Test: updated_at is auto-updated
BEGIN;
  INSERT INTO houses (address, gang, owner_name)
  VALUES ('TEST-2', 'TEST', 'Test Owner');
  
  SELECT pg_sleep(1);
  
  UPDATE houses SET owner_name = 'Updated Owner'
  WHERE address = 'TEST-2';
  
  SELECT plan(1);
  SELECT ok(
    (SELECT updated_at FROM houses WHERE address = 'TEST-2') > 
    (SELECT created_at FROM houses WHERE address = 'TEST-2'),
    'updated_at is auto-updated'
  );
  
  SELECT * FROM finish();
ROLLBACK;
```

### Manual Testing Checklist

#### Functionality
- [ ] Admin dapat create, read, update, delete houses
- [ ] Admin dapat create, read, update, delete residents
- [ ] Admin dapat create, read, update PBB payments
- [ ] Ketua gang dapat read data (tanpa data sensitif)
- [ ] Ketua gang tidak dapat create/update/delete
- [ ] Search berfungsi dengan benar
- [ ] Filter gang berfungsi dengan benar
- [ ] Filter PBB status berfungsi dengan benar
- [ ] Pagination berfungsi dengan benar
- [ ] Export CSV berfungsi dengan benar
- [ ] Audit log tercatat dengan benar

#### UI/UX
- [ ] Loading states ditampilkan dengan jelas
- [ ] Error messages informatif dan dalam Bahasa Indonesia
- [ ] Success messages ditampilkan setelah operasi berhasil
- [ ] Confirmation dialogs untuk operasi destructive (delete)
- [ ] Form validation real-time
- [ ] Empty states ditampilkan dengan jelas
- [ ] Action buttons disabled untuk non-admin

#### Responsiveness
- [ ] Desktop (1920x1080): layout optimal
- [ ] Laptop (1366x768): layout optimal
- [ ] Tablet (768x1024): layout responsive
- [ ] Mobile (375x667): layout responsive, table scrollable

#### Accessibility
- [ ] Keyboard navigation berfungsi
- [ ] Focus indicators visible
- [ ] ARIA labels untuk screen readers
- [ ] Color contrast memenuhi WCAG 2.1 Level AA
- [ ] Form labels terhubung dengan inputs
- [ ] Error messages accessible

#### Performance
- [ ] Initial page load < 3 detik
- [ ] Search response < 2 detik
- [ ] Filter response < 1 detik
- [ ] Export CSV < 5 detik untuk 1000 records
- [ ] No memory leaks pada long sessions

#### Security
- [ ] RLS policies enforce access control
- [ ] API routes verify authentication
- [ ] API routes verify authorization
- [ ] Sensitive data filtered untuk non-admin
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (React escaping)
- [ ] CSRF protection (Next.js built-in)

### Test Coverage Goals

- **Unit Tests**: 80% coverage untuk utility functions
- **Integration Tests**: 100% coverage untuk API routes
- **E2E Tests**: Critical user flows (create, update, delete, search, filter)
- **Manual Tests**: Full checklist sebelum production deployment

### Continuous Testing

**Pre-commit**: 
- Run unit tests
- Run linter
- Run type checker

**CI/CD Pipeline**:
- Run all unit tests
- Run all integration tests
- Run E2E tests (on staging environment)
- Check test coverage
- Deploy only if all tests pass

## Implementation Plan

### Phase 1: Database Setup (Week 1)

1. Create migration file `003_resident_database.sql`
2. Implement tables: houses, residents, pbb_payments, audit_logs
3. Implement RLS policies
4. Implement triggers (audit log, updated_at)
5. Test RLS policies manually
6. Seed test data

### Phase 2: API Routes (Week 2)

1. Implement GET /api/admin/residents
2. Implement POST /api/admin/residents
3. Implement PATCH /api/admin/residents
4. Implement DELETE /api/admin/residents
5. Implement POST /api/admin/residents/pbb
6. Implement GET /api/admin/residents/stats
7. Implement GET /api/admin/residents/export
8. Write integration tests for all routes
9. Test with Postman/Thunder Client

### Phase 3: UI Components (Week 3)

1. Create page /admin/data-warga
2. Implement StatsCards component
3. Implement FilterBar component
4. Implement DataWargaTable component
5. Implement AddHouseModal component
6. Implement EditHouseModal component
7. Implement AddResidentModal component
8. Implement EditResidentModal component
9. Implement PBBHistoryModal component
10. Implement ExportButton component

### Phase 4: Testing & Polish (Week 4)

1. Write unit tests for utility functions
2. Write E2E tests for critical flows
3. Manual testing (full checklist)
4. Fix bugs and issues
5. Performance optimization
6. Accessibility audit
7. Documentation

### Phase 5: Deployment (Week 5)

1. Deploy to staging environment
2. User acceptance testing (UAT)
3. Fix issues from UAT
4. Deploy to production
5. Monitor for errors
6. Gather user feedback

## Security Considerations

### Authentication & Authorization

1. **Session Management**: Menggunakan Supabase Auth dengan JWT tokens
2. **Role-Based Access Control**: Admin vs Ketua Gang
3. **API Route Protection**: Semua routes verify auth dan role
4. **RLS Policies**: Database-level access control

### Data Protection

1. **Sensitive Data Filtering**: Phone dan email di-filter untuk non-admin
2. **Audit Logging**: Semua perubahan data tercatat
3. **Cascade Deletes**: Referential integrity maintained
4. **Input Validation**: Client-side dan server-side

### Attack Prevention

1. **SQL Injection**: Parameterized queries via Supabase client
2. **XSS**: React auto-escaping, no dangerouslySetInnerHTML
3. **CSRF**: Next.js built-in protection
4. **Rate Limiting**: Implement di API routes (future enhancement)

## Performance Optimization

### Database Optimization

1. **Indexes**: Created on frequently queried columns (gang, address, tax_year)
2. **Query Optimization**: Use SELECT specific columns, avoid SELECT *
3. **Pagination**: Limit results per page (default 50)
4. **Caching**: Consider Redis for stats (future enhancement)

### Frontend Optimization

1. **Code Splitting**: Next.js automatic code splitting
2. **Lazy Loading**: Load modals only when opened
3. **Debouncing**: Search input debounced (500ms)
4. **Optimistic Updates**: Update UI before API response (with rollback on error)

### API Optimization

1. **Parallel Queries**: Use Promise.all untuk multiple queries
2. **Response Compression**: Enable gzip compression
3. **CDN**: Serve static assets via CDN (Vercel Edge Network)

## Monitoring & Observability

### Logging

1. **Application Logs**: Console.log untuk development, structured logging untuk production
2. **Audit Logs**: Database-level audit trail
3. **Error Logs**: Capture dan log semua errors dengan context

### Metrics

1. **API Response Times**: Monitor via Vercel Analytics
2. **Error Rates**: Track 4xx dan 5xx responses
3. **User Activity**: Track page views, actions performed

### Alerts

1. **High Error Rate**: Alert jika error rate > 5%
2. **Slow Response**: Alert jika p95 response time > 3s
3. **Database Issues**: Alert jika connection errors

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Import Data**: Upload CSV/Excel untuk bulk import
2. **Advanced Search**: Full-text search dengan PostgreSQL FTS
3. **Data Visualization**: Charts untuk PBB trends, demographics
4. **Notifications**: Email/WhatsApp notifications untuk PBB reminders
5. **Mobile App**: React Native app untuk mobile access
6. **Offline Support**: PWA dengan offline capabilities
7. **Multi-language**: Support English dan Bahasa Indonesia
8. **Advanced Filters**: Filter by date range, multiple gangs, etc.
9. **Bulk Operations**: Bulk update PBB status, bulk delete
10. **Data Backup**: Automated daily backups dengan restore capability

### Technical Improvements

1. **Rate Limiting**: Implement rate limiting untuk API routes
2. **Caching**: Redis cache untuk frequently accessed data
3. **Real-time Updates**: WebSocket untuk real-time data sync
4. **Advanced Analytics**: Integration dengan analytics platform
5. **API Documentation**: OpenAPI/Swagger documentation
6. **GraphQL API**: Alternative API dengan GraphQL (optional)

## Conclusion

Design document ini menjelaskan arsitektur lengkap untuk fitur Dashboard Data Warga, mencakup database schema, API routes, UI components, RLS policies, error handling, dan testing strategy. 

**Key Design Decisions**:

1. **Simplified Data Model**: Owner name disimpan langsung di houses table untuk simplicity
2. **Application-Layer Filtering**: Sensitive data di-filter di API layer (bukan RLS) untuk flexibility
3. **Audit Logging via Triggers**: Automatic audit trail tanpa perlu manual logging di application code
4. **Role-Based UI**: UI components adapt berdasarkan user role (admin vs ketua gang)
5. **No PBT**: Feature ini adalah CRUD + UI, sehingga property-based testing tidak applicable

**Next Steps**: Proceed to task creation phase untuk breakdown implementation tasks.
