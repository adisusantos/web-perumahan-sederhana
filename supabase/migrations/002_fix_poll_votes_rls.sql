-- Migration: Fix RLS policy untuk poll_votes
-- Masalah: Policy lama menggunakan USING (false) sehingga admin tidak bisa count votes
-- Solusi: Allow SELECT untuk admin, ketua_gang, DAN anonymous users (untuk public voting page)

-- Drop policy lama
DROP POLICY IF EXISTS "poll_votes_select_own" ON poll_votes;
DROP POLICY IF EXISTS "poll_votes_select_admin" ON poll_votes;

-- Buat policy baru yang allow:
-- 1. Admin dan ketua_gang (authenticated) untuk admin dashboard
-- 2. Anonymous users untuk public voting page (count votes)
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
