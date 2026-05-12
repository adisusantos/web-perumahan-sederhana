-- ============================================================
-- Migration: 001_initial_schema.sql
-- Portal Warga Bukit Pandawa — Godean Jogja Hills
-- ============================================================

-- ─── Profiles (extend Supabase Auth) ────────────────────────────

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'ketua_gang')),
  gang        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Announcements ──────────────────────────────────────────────

CREATE TABLE announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- ─── Gallery Albums ──────────────────────────────────────────────

CREATE TABLE gallery_albums (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  cover_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Gallery Photos ──────────────────────────────────────────────

CREATE TABLE gallery_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id    UUID NOT NULL REFERENCES gallery_albums(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  caption     TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Polls ───────────────────────────────────────────────────────

CREATE TABLE polls (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  type         TEXT NOT NULL CHECK (type IN ('public', 'gang')),
  gang_scope   TEXT,
  secret_token TEXT UNIQUE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  closes_at    TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Poll Options ─────────────────────────────────────────────────

CREATE TABLE poll_options (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id  UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  "order"  INTEGER NOT NULL DEFAULT 0
);

-- ─── Poll Votes ───────────────────────────────────────────────────

CREATE TABLE poll_votes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id          UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id        UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  fingerprint_hash TEXT NOT NULL,
  voted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, fingerprint_hash)  -- Cegah double-vote di level DB
);

-- ============================================================
-- Indexes — Performa query umum
-- ============================================================

CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_gallery_photos_album_id  ON gallery_photos(album_id);
CREATE INDEX idx_polls_type_status        ON polls(type, status);
CREATE INDEX idx_poll_options_poll_id     ON poll_options(poll_id);
CREATE INDEX idx_poll_votes_poll_id       ON poll_votes(poll_id);
CREATE INDEX idx_polls_secret_token       ON polls(secret_token) WHERE secret_token IS NOT NULL;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_albums  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options    ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies — profiles
-- ============================================================

-- Pengguna bisa baca profil sendiri
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin bisa baca semua profil
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Profil dibuat otomatis via trigger (INSERT diizinkan untuk auth.uid() yang sesuai)
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Pengguna bisa update profil sendiri
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin bisa update semua profil (misal: reset role, nonaktifkan)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin bisa hapus profil
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- RLS Policies — announcements
-- ============================================================

-- Siapa pun (termasuk anonim) bisa baca pengumuman
CREATE POLICY "announcements_select_public" ON announcements
  FOR SELECT USING (true);

-- Hanya admin yang bisa buat pengumuman
CREATE POLICY "announcements_insert_admin" ON announcements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Hanya admin yang bisa edit pengumuman
CREATE POLICY "announcements_update_admin" ON announcements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Hanya admin yang bisa hapus pengumuman
CREATE POLICY "announcements_delete_admin" ON announcements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- RLS Policies — gallery_albums
-- ============================================================

-- Siapa pun bisa baca album galeri
CREATE POLICY "gallery_albums_select_public" ON gallery_albums
  FOR SELECT USING (true);

-- Hanya admin yang bisa buat album
CREATE POLICY "gallery_albums_insert_admin" ON gallery_albums
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Hanya admin yang bisa edit album
CREATE POLICY "gallery_albums_update_admin" ON gallery_albums
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Hanya admin yang bisa hapus album
CREATE POLICY "gallery_albums_delete_admin" ON gallery_albums
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- RLS Policies — gallery_photos
-- ============================================================

-- Siapa pun bisa baca foto galeri
CREATE POLICY "gallery_photos_select_public" ON gallery_photos
  FOR SELECT USING (true);

-- Hanya admin yang bisa upload foto
CREATE POLICY "gallery_photos_insert_admin" ON gallery_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Hanya admin yang bisa edit foto
CREATE POLICY "gallery_photos_update_admin" ON gallery_photos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Hanya admin yang bisa hapus foto
CREATE POLICY "gallery_photos_delete_admin" ON gallery_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- RLS Policies — polls
-- ============================================================

-- Siapa pun bisa baca semua poll (aktif maupun selesai)
-- Filtering poll gang vs publik dilakukan di application layer
CREATE POLICY "polls_select_public" ON polls
  FOR SELECT USING (status = 'active' OR status = 'closed');

-- Admin dan ketua_gang yang sudah login bisa buat poll
CREATE POLICY "polls_insert_auth" ON polls
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Admin bisa update semua poll; ketua_gang hanya bisa update poll miliknya
CREATE POLICY "polls_update_admin" ON polls
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "polls_update_own_ketua_gang" ON polls
  FOR UPDATE USING (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ketua_gang')
  );

-- Hanya admin yang bisa hapus poll
CREATE POLICY "polls_delete_admin" ON polls
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- RLS Policies — poll_options
-- ============================================================

-- Siapa pun bisa baca opsi poll
CREATE POLICY "poll_options_select_public" ON poll_options
  FOR SELECT USING (true);

-- Admin dan ketua_gang yang sudah login bisa buat opsi poll
CREATE POLICY "poll_options_insert_auth" ON poll_options
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Admin bisa update semua opsi; ketua_gang hanya opsi milik poll sendiri
CREATE POLICY "poll_options_update_admin" ON poll_options
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "poll_options_update_own_ketua_gang" ON poll_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_options.poll_id
        AND polls.created_by = auth.uid()
    ) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ketua_gang')
  );

-- Hanya admin yang bisa hapus opsi poll
CREATE POLICY "poll_options_delete_admin" ON poll_options
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- RLS Policies — poll_votes
-- ============================================================

-- Siapa pun (termasuk anonim) bisa insert vote — anti double-vote dijaga UNIQUE constraint
CREATE POLICY "poll_votes_insert_anon" ON poll_votes
  FOR INSERT WITH CHECK (true);

-- Admin, ketua gang, dan anonymous users bisa baca votes untuk counting/aggregasi
-- Anonymous perlu akses untuk tampilkan hasil voting di public page
CREATE POLICY "poll_votes_select_public" ON poll_votes
  FOR SELECT USING (
    -- Allow admin & ketua_gang
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ketua_gang')
    )
    -- OR allow anonymous (untuk public voting page)
    OR auth.uid() IS NULL
  );
