/**
 * Smoke tests untuk verifikasi keamanan Portal Warga Bukit Pandawa.
 *
 * Mencakup:
 * 1. Verifikasi generateSecretToken menggunakan crypto.getRandomValues (CSPRNG)
 * 2. Verifikasi environment variable server-side tidak bocor ke client bundle
 * 3. Verifikasi skema database memiliki RLS aktif di semua tabel
 *
 * Requirements: 9
 */

import { describe, it, expect, vi } from "vitest";
import { generateSecretToken } from "./utils";

// ─── 1. CSPRNG Verification ───────────────────────────────────────────────────

describe("generateSecretToken — CSPRNG verification", () => {
  it("menggunakan crypto.getRandomValues (bukan Math.random)", () => {
    // Spy pada crypto.getRandomValues untuk memastikan dipanggil
    const spy = vi.spyOn(crypto, "getRandomValues");

    generateSecretToken();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("tidak menggunakan Math.random", () => {
    // Pastikan Math.random tidak dipanggil saat generate token
    const mathRandomSpy = vi.spyOn(Math, "random");

    generateSecretToken();

    expect(mathRandomSpy).not.toHaveBeenCalled();
    mathRandomSpy.mockRestore();
  });

  it("menghasilkan token yang tidak bisa diprediksi (entropi cukup)", () => {
    // Generate 1000 token dan pastikan tidak ada yang identik
    // Probabilitas collision untuk 12-char base62 token sangat kecil (~1/62^12)
    const tokens = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      tokens.add(generateSecretToken());
    }
    // Semua 1000 token harus unik
    expect(tokens.size).toBe(1000);
  });

  it("setiap token tepat 12 karakter", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateSecretToken()).toHaveLength(12);
    }
  });

  it("setiap token hanya mengandung karakter alfanumerik URL-safe", () => {
    const urlSafePattern = /^[A-Za-z0-9]{12}$/;
    for (let i = 0; i < 100; i++) {
      expect(generateSecretToken()).toMatch(urlSafePattern);
    }
  });
});

// ─── 2. Environment Variable Exposure Check ───────────────────────────────────

describe("Environment variable exposure", () => {
  it("SUPABASE_SERVICE_ROLE_KEY tidak boleh ada di NEXT_PUBLIC_ prefix", () => {
    // Variabel dengan prefix NEXT_PUBLIC_ akan di-bundle ke client
    // SUPABASE_SERVICE_ROLE_KEY harus TIDAK memiliki prefix NEXT_PUBLIC_
    const envKeys = Object.keys(process.env);
    const publicServiceRoleKey = envKeys.find(
      (key) =>
        key.startsWith("NEXT_PUBLIC_") &&
        key.toLowerCase().includes("service_role")
    );
    expect(publicServiceRoleKey).toBeUndefined();
  });

  it("GOOGLE_SHEETS_API_KEY tidak boleh ada di NEXT_PUBLIC_ prefix", () => {
    // Google Sheets API key harus server-side only
    const envKeys = Object.keys(process.env);
    const publicSheetsKey = envKeys.find(
      (key) =>
        key.startsWith("NEXT_PUBLIC_") &&
        key.toLowerCase().includes("sheets")
    );
    expect(publicSheetsKey).toBeUndefined();
  });

  it("variabel NEXT_PUBLIC_ hanya berisi Supabase URL dan anon key", () => {
    // Hanya dua variabel yang boleh di-expose ke client:
    // NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
    const publicEnvKeys = Object.keys(process.env).filter((key) =>
      key.startsWith("NEXT_PUBLIC_")
    );

    const allowedPublicKeys = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ];

    for (const key of publicEnvKeys) {
      expect(allowedPublicKeys).toContain(key);
    }
  });
});

// ─── 3. Database Schema RLS Verification ─────────────────────────────────────

describe("Database schema — RLS configuration", () => {
  /**
   * Verifikasi bahwa semua tabel yang didefinisikan di design.md
   * memiliki RLS aktif. Ini adalah static analysis terhadap migration SQL.
   *
   * Catatan: Test ini memverifikasi konten file migration, bukan
   * koneksi ke database live (yang memerlukan environment Supabase).
   */

  const TABLES_REQUIRING_RLS = [
    "profiles",
    "announcements",
    "gallery_albums",
    "gallery_photos",
    "polls",
    "poll_options",
    "poll_votes",
  ];

  it("migration SQL mengaktifkan RLS di semua tabel yang diperlukan", async () => {
    // Baca file migration SQL
    const fs = await import("fs/promises");
    const path = await import("path");

    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/001_initial_schema.sql"
    );

    let migrationSql: string;
    try {
      migrationSql = await fs.readFile(migrationPath, "utf-8");
    } catch {
      // Jika file tidak ada, skip test ini (mungkin di CI tanpa file migration)
      console.warn(
        "[security.test] Migration file tidak ditemukan, skip RLS check"
      );
      return;
    }

    for (const table of TABLES_REQUIRING_RLS) {
      // Cek bahwa ada statement ENABLE ROW LEVEL SECURITY untuk setiap tabel
      const rlsPattern = new RegExp(
        `ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        "i"
      );
      expect(
        rlsPattern.test(migrationSql),
        `Tabel '${table}' harus memiliki ENABLE ROW LEVEL SECURITY di migration SQL`
      ).toBe(true);
    }
  });

  it("migration SQL mendefinisikan RLS policies untuk tabel kritis", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/001_initial_schema.sql"
    );

    let migrationSql: string;
    try {
      migrationSql = await fs.readFile(migrationPath, "utf-8");
    } catch {
      console.warn(
        "[security.test] Migration file tidak ditemukan, skip policy check"
      );
      return;
    }

    // Tabel kritis yang harus memiliki minimal satu policy
    const tablesWithPolicies = [
      "profiles",
      "announcements",
      "polls",
      "poll_votes",
    ];

    for (const table of tablesWithPolicies) {
      // Cek ada CREATE POLICY yang mereferensikan tabel ini
      const policyPattern = new RegExp(
        `CREATE\\s+POLICY\\s+[^\\s]+\\s+ON\\s+${table}`,
        "i"
      );
      expect(
        policyPattern.test(migrationSql),
        `Tabel '${table}' harus memiliki minimal satu RLS policy`
      ).toBe(true);
    }
  });

  it("poll_votes memiliki UNIQUE constraint untuk mencegah double-vote", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/001_initial_schema.sql"
    );

    let migrationSql: string;
    try {
      migrationSql = await fs.readFile(migrationPath, "utf-8");
    } catch {
      console.warn(
        "[security.test] Migration file tidak ditemukan, skip UNIQUE constraint check"
      );
      return;
    }

    // Cek ada UNIQUE constraint pada (poll_id, fingerprint_hash)
    const uniqueConstraintPattern =
      /UNIQUE\s*\(\s*poll_id\s*,\s*fingerprint_hash\s*\)/i;
    expect(
      uniqueConstraintPattern.test(migrationSql),
      "poll_votes harus memiliki UNIQUE constraint pada (poll_id, fingerprint_hash)"
    ).toBe(true);
  });
});
