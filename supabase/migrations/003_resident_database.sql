-- ============================================================
-- Migration: 003_resident_database.sql
-- Dashboard Data Warga — Portal Warga Bukit Pandawa
-- ============================================================

-- ─── Houses (Rumah) ─────────────────────────────────────────────

CREATE TABLE houses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address     TEXT NOT NULL,              -- Nomor rumah (misal: "A-12")
  gang        TEXT NOT NULL,              -- Gang (misal: "A", "B", "C")
  owner_name  TEXT NOT NULL,              -- Nama pemilik rumah
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ,
  UNIQUE(address, gang)                   -- Satu alamat unik per gang
);

-- ─── Residents (Penghuni) ───────────────────────────────────────

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

-- ─── PBB Payments (Pembayaran PBB) ──────────────────────────────

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

-- ─── Audit Logs (Log Perubahan Data) ────────────────────────────

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

-- ============================================================
-- Indexes — Performa query umum
-- ============================================================

CREATE INDEX idx_houses_gang ON houses(gang);
CREATE INDEX idx_houses_address ON houses(address);
CREATE INDEX idx_residents_house_id ON residents(house_id);
CREATE INDEX idx_residents_name ON residents(name);
CREATE INDEX idx_pbb_payments_house_id ON pbb_payments(house_id);
CREATE INDEX idx_pbb_payments_tax_year ON pbb_payments(tax_year DESC);
CREATE INDEX idx_pbb_payments_status ON pbb_payments(status);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at DESC);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE houses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbb_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies — houses
-- ============================================================

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

-- ============================================================
-- RLS Policies — residents
-- ============================================================

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

-- ============================================================
-- RLS Policies — pbb_payments
-- ============================================================

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

-- ============================================================
-- RLS Policies — audit_logs
-- ============================================================

-- Admin: read only (logs should not be modified)
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- No INSERT/UPDATE/DELETE policies - logs are created via triggers only

-- ============================================================
-- Database Triggers — Audit Logging
-- ============================================================

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

-- ============================================================
-- Database Triggers — Auto-update updated_at
-- ============================================================

-- Function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk houses
CREATE TRIGGER update_houses_updated_at
  BEFORE UPDATE ON houses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger untuk residents
CREATE TRIGGER update_residents_updated_at
  BEFORE UPDATE ON residents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
