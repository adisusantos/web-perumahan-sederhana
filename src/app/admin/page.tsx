"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

// ─── Inner component (needs useSearchParams) ──────────────────────────────────

/**
 * Komponen form login admin.
 *
 * - Memanggil `supabase.auth.signInWithPassword()`
 * - Setelah login, ambil `role` dari tabel `profiles`
 * - Redirect ke `/admin/dashboard`
 * - Pesan generik "Email atau password salah" saat login gagal
 * - Tangani query `?expired=1` untuk session expired
 *
 * Requirements: 3
 */
function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tampilkan pesan session expired jika ada query ?expired=1
  const isExpired = searchParams.get("expired") === "1";

  // Cek apakah sudah login — redirect ke dashboard jika sudah
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/admin/dashboard");
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      // 1. Login dengan email + password
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError || !authData.user) {
        // Pesan generik — tidak membedakan email salah vs password salah
        setError("Email atau password salah.");
        return;
      }

      // 2. Ambil role dari tabel profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .select("role, gang")
        .eq("id", authData.user.id)
        .single();

      if (profileError) {
        // Profil tidak ditemukan — kemungkinan akun belum dikonfigurasi
        setError("Email atau password salah.");
        await supabase.auth.signOut();
        return;
      }

      // 3. Redirect ke dashboard
      router.push("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* ── Logo & Judul ─────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          {/* Logo panda sederhana via emoji + nama */}
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green text-3xl shadow-sm"
            aria-hidden="true"
          >
            🐼
          </div>
          <h1 className="text-xl font-bold text-brand-black">
            Portal Bukit Pandawa
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Masuk sebagai pengurus perumahan
          </p>
        </div>

        {/* ── Notifikasi session expired ────────────────────────────── */}
        {isExpired && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            Sesi kamu telah berakhir. Silakan masuk kembali.
          </div>
        )}

        {/* ── Form Login ────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          {/* Error message */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-brand-black"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="pengurus@bukitpandawa.id"
              className="block w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-brand-black"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              className="block w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={loading || !email || !password}
            className="w-full"
          >
            Masuk
          </Button>
        </form>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Hanya untuk pengurus perumahan Bukit Pandawa.
          <br />
          Tidak ada registrasi mandiri.
        </p>
      </div>
    </div>
  );
}

// ─── Page (wrapped in Suspense for useSearchParams) ───────────────────────────

/**
 * Halaman login admin — `/admin`
 *
 * Dibungkus Suspense karena `AdminLoginForm` menggunakan `useSearchParams()`
 * yang membutuhkan Suspense boundary di Next.js App Router.
 *
 * Requirements: 3
 */
export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-sm text-gray-400">Memuat…</div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
