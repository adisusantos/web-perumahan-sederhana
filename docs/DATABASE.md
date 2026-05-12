# Database Schema Documentation

## Overview

Database menggunakan PostgreSQL via Supabase dengan Row Level Security (RLS) untuk kontrol akses.

## Entity Relationship Diagram

```
┌─────────────────┐
│    profiles     │
│  (Supabase)     │
└────────┬────────┘
         │
         │ reported_by
         │
┌────────┴────────┐       ┌──────────────────┐
│     houses      │───────│    residents     │
│                 │ 1:N   │                  │
│  - id (PK)      │       │  - id (PK)       │
│  - address      │       │  - house_id (FK) │
│  - gang         │       │  - name          │
│  - owner_name   │       │  - phone         │
│  - created_at   │       │  - email         │
│  - updated_at   │       │  - is_primary    │
└────────┬────────┘       │  - created_at    │
         │                │  - updated_at    │
         │                └──────────────────┘
         │ 1:N
         │
┌────────┴────────┐
│  pbb_payments   │
│                 │
│  - id (PK)      │
│  - house_id (FK)│
│  - tax_year     │
│  - status       │
│  - reported_at  │
│  - reported_by  │
│  - notes        │
│  - created_at   │
└─────────────────┘

┌─────────────────┐
│   audit_logs    │
│                 │
│  - id (PK)      │
│  - table_name   │
│  - record_id    │
│  - action       │
│  - changed_by   │
│  - changed_at   │
│  - old_data     │
│  - new_data     │
└─────────────────┘
```

---

## Tables

### 1. houses

Tabel untuk menyimpan data rumah di perumahan.

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `address` | text | No | - | Alamat rumah (contoh: A-12) |
| `gang` | text | No | - | Nama gang (contoh: A, B, C) |
| `owner_name` | text | No | - | Nama pemilik rumah |
| `created_at` | timestamptz | No | `now()` | Timestamp created |
| `updated_at` | timestamptz | No | `now()` | Timestamp last updated |

**Constraints:**

- **Primary Key:** `id`
- **Unique:** `(address, gang)` - Alamat harus unique per gang
- **Check:** `address <> ''` - Address tidak boleh empty string
- **Check:** `gang <> ''` - Gang tidak boleh empty string
- **Check:** `owner_name <> ''` - Owner name tidak boleh empty string

**Indexes:**

- `idx_houses_gang` on `gang` - Untuk filter by gang
- `idx_houses_address` on `address` - Untuk search by address
- `idx_houses_owner_name` on `owner_name` - Untuk search by owner name

**Triggers:**

- `update_houses_updated_at` - Auto-update `updated_at` on UPDATE
- `audit_houses_changes` - Log changes ke `audit_logs`

**RLS Policies:**

- `admin_all_houses` - Admin dapat SELECT, INSERT, UPDATE, DELETE
- `ketua_gang_read_houses` - Ketua gang dapat SELECT only

---

### 2. residents

Tabel untuk menyimpan data penghuni rumah.

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `house_id` | uuid | No | - | Foreign key ke houses |
| `name` | text | No | - | Nama penghuni |
| `phone` | text | Yes | NULL | Nomor telepon (format Indonesia) |
| `email` | text | Yes | NULL | Email address |
| `is_primary` | boolean | No | `false` | Apakah penghuni utama |
| `created_at` | timestamptz | No | `now()` | Timestamp created |
| `updated_at` | timestamptz | No | `now()` | Timestamp last updated |

**Constraints:**

- **Primary Key:** `id`
- **Foreign Key:** `house_id` REFERENCES `houses(id)` ON DELETE CASCADE
- **Check:** `name <> ''` - Name tidak boleh empty string
- **Check:** `phone ~ '^08[0-9]{8,11}$'` - Phone format Indonesia (jika diisi)
- **Check:** `email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'` - Email format valid (jika diisi)

**Indexes:**

- `idx_residents_house_id` on `house_id` - Untuk join dengan houses
- `idx_residents_name` on `name` - Untuk search by name
- `idx_residents_is_primary` on `is_primary` - Untuk filter penghuni utama

**Triggers:**

- `update_residents_updated_at` - Auto-update `updated_at` on UPDATE
- `audit_residents_changes` - Log changes ke `audit_logs`

**RLS Policies:**

- `admin_all_residents` - Admin dapat SELECT, INSERT, UPDATE, DELETE
- `ketua_gang_read_residents` - Ketua gang dapat SELECT only (phone & email di-filter di application layer)

---

### 3. pbb_payments

Tabel untuk menyimpan riwayat pembayaran PBB (Pajak Bumi dan Bangunan).

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `house_id` | uuid | No | - | Foreign key ke houses |
| `tax_year` | integer | No | - | Tahun pajak (2000-2100) |
| `status` | text | No | - | Status pembayaran ('lunas' atau 'belum') |
| `reported_at` | timestamptz | No | `now()` | Timestamp dilaporkan |
| `reported_by` | uuid | No | - | User ID yang melaporkan |
| `notes` | text | Yes | NULL | Catatan tambahan |
| `created_at` | timestamptz | No | `now()` | Timestamp created |

**Constraints:**

- **Primary Key:** `id`
- **Foreign Key:** `house_id` REFERENCES `houses(id)` ON DELETE CASCADE
- **Foreign Key:** `reported_by` REFERENCES `auth.users(id)`
- **Unique:** `(house_id, tax_year)` - Satu rumah hanya bisa punya satu record per tahun
- **Check:** `tax_year >= 2000 AND tax_year <= 2100` - Tahun valid
- **Check:** `status IN ('lunas', 'belum')` - Status valid

**Indexes:**

- `idx_pbb_house_id` on `house_id` - Untuk join dengan houses
- `idx_pbb_tax_year` on `tax_year` - Untuk filter by year
- `idx_pbb_status` on `status` - Untuk filter by status
- `idx_pbb_house_year` on `(house_id, tax_year DESC)` - Untuk get latest PBB per house

**Triggers:**

- `audit_pbb_payments_changes` - Log changes ke `audit_logs`

**RLS Policies:**

- `admin_all_pbb` - Admin dapat SELECT, INSERT, UPDATE, DELETE
- `ketua_gang_read_pbb` - Ketua gang dapat SELECT only

---

### 4. audit_logs

Tabel untuk menyimpan audit trail semua perubahan data.

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `table_name` | text | No | - | Nama tabel yang diubah |
| `record_id` | uuid | No | - | ID record yang diubah |
| `action` | text | No | - | Jenis aksi (INSERT, UPDATE, DELETE) |
| `changed_by` | uuid | No | - | User ID yang melakukan perubahan |
| `changed_at` | timestamptz | No | `now()` | Timestamp perubahan |
| `old_data` | jsonb | Yes | NULL | Data sebelum perubahan (untuk UPDATE/DELETE) |
| `new_data` | jsonb | Yes | NULL | Data setelah perubahan (untuk INSERT/UPDATE) |

**Constraints:**

- **Primary Key:** `id`
- **Check:** `action IN ('INSERT', 'UPDATE', 'DELETE')` - Action valid

**Indexes:**

- `idx_audit_table_name` on `table_name` - Untuk filter by table
- `idx_audit_record_id` on `record_id` - Untuk filter by record
- `idx_audit_changed_by` on `changed_by` - Untuk filter by user
- `idx_audit_changed_at` on `changed_at DESC` - Untuk sort by time

**RLS Policies:**

- `admin_read_audit_logs` - Admin dapat SELECT only (read-only table)

---

## Database Functions

### 1. update_updated_at_column()

Trigger function untuk auto-update kolom `updated_at`.

**Usage:**
```sql
CREATE TRIGGER update_houses_updated_at
  BEFORE UPDATE ON houses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 2. audit_log_changes()

Trigger function untuk logging semua perubahan data ke `audit_logs`.

**Usage:**
```sql
CREATE TRIGGER audit_houses_changes
  AFTER INSERT OR UPDATE OR DELETE ON houses
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_changes();
```

**Implementation:**
```sql
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
```

---

## Row Level Security (RLS)

### Roles

- **admin**: Full CRUD access ke semua tabel
- **ketua_gang**: Read-only access (data sensitif di-filter di application layer)
- **anonymous**: No access

### Policy Examples

#### Admin Full Access
```sql
CREATE POLICY admin_all_houses ON houses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

#### Ketua Gang Read-Only
```sql
CREATE POLICY ketua_gang_read_houses ON houses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ketua_gang')
    )
  );
```

---

## Migrations

Migrations disimpan di `supabase/migrations/` dan harus dijalankan secara berurutan:

1. **001_initial_schema.sql** - Setup awal (profiles, polls, announcements, gallery)
2. **002_fix_poll_votes_rls.sql** - Fix RLS policies untuk voting
3. **003_resident_database.sql** - Setup database data warga (houses, residents, pbb_payments, audit_logs)

### Running Migrations

**Development:**
```bash
# Via Supabase CLI
supabase db push

# Atau manual via Supabase Dashboard SQL Editor
# Copy-paste isi file migration dan execute
```

**Production:**
```bash
# IMPORTANT: Backup database terlebih dahulu!
# Kemudian jalankan via Supabase Dashboard SQL Editor
```

---

## Backup & Restore

### Backup

```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Atau via Supabase Dashboard
# Settings → Database → Backups → Create backup
```

### Restore

```bash
# Via Supabase CLI
supabase db reset
psql -h db.xxx.supabase.co -U postgres -d postgres -f backup.sql

# Atau via Supabase Dashboard
# Settings → Database → Backups → Restore
```

---

## Performance Optimization

### Indexes

Semua foreign keys dan kolom yang sering di-query sudah memiliki indexes:
- `houses`: gang, address, owner_name
- `residents`: house_id, name, is_primary
- `pbb_payments`: house_id, tax_year, status
- `audit_logs`: table_name, record_id, changed_by, changed_at

### Query Optimization Tips

1. **Gunakan pagination** untuk list queries
2. **Filter di database level** daripada di application level
3. **Use specific columns** dalam SELECT (hindari SELECT *)
4. **Leverage indexes** dengan WHERE clauses yang sesuai
5. **Use EXPLAIN ANALYZE** untuk debug slow queries

### Example Optimized Query

```sql
-- BAD: SELECT *
SELECT * FROM houses
WHERE gang = 'A'
ORDER BY address;

-- GOOD: Specific columns + indexed WHERE
SELECT id, address, gang, owner_name
FROM houses
WHERE gang = 'A'  -- Uses idx_houses_gang
ORDER BY address
LIMIT 50 OFFSET 0;
```

---

## Security Best Practices

1. **Always use RLS** - Jangan disable RLS di production
2. **Validate input** - Di application layer sebelum insert/update
3. **Use prepared statements** - Supabase client sudah handle ini
4. **Audit logging** - Semua perubahan data ter-log otomatis
5. **Backup regularly** - Setup automated backups di Supabase
6. **Monitor queries** - Check slow queries di Supabase Dashboard

---

## Troubleshooting

### Common Issues

**Issue: RLS policy tidak berfungsi**
- Check apakah RLS enabled: `ALTER TABLE houses ENABLE ROW LEVEL SECURITY;`
- Check apakah user memiliki role yang benar di tabel `profiles`
- Check policy dengan: `SELECT * FROM pg_policies WHERE tablename = 'houses';`

**Issue: Trigger tidak jalan**
- Check apakah trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'audit_houses_changes';`
- Check function exists: `SELECT * FROM pg_proc WHERE proname = 'audit_log_changes';`

**Issue: Slow queries**
- Run `EXPLAIN ANALYZE` untuk lihat query plan
- Check apakah indexes digunakan
- Consider adding composite indexes untuk complex queries

---

## Future Enhancements

1. **Partitioning** - Partition `audit_logs` by month untuk performa
2. **Materialized Views** - Untuk statistik yang sering di-query
3. **Full-text Search** - Untuk search yang lebih advanced
4. **Soft Deletes** - Add `deleted_at` column untuk soft delete
5. **Versioning** - Track version history untuk data penting
