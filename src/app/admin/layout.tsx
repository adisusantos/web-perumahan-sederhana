"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import type { UserRole } from "@/types";

/**
 * Layout untuk semua halaman admin (`/admin/*`).
 *
 * - Cek session Supabase; redirect ke `/admin` jika belum login
 * - Ambil profil pengguna (name, role, gang) dari tabel `profiles`
 * - Render `AdminSidebar` di sisi kiri (desktop) atau drawer (mobile)
 * - Konten halaman dirender di area utama kanan
 *
 * Requirements: 4.6, 4.7, 3
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [userGang, setUserGang] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // Halaman login (/admin persis) — skip auth check, langsung render
  const isLoginPage = pathname === "/admin";

  // Tutup drawer dan avatar menu saat navigasi
  useEffect(() => {
    setDrawerOpen(false);
    setAvatarMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }
    const supabase = createClient();

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, role, gang")
        .eq("id", session.user.id)
        .single();

      if (error || !profile) {
        await supabase.auth.signOut();
        router.replace("/admin");
        return;
      }

      setUserName(profile.name);
      setUserRole(profile.role as UserRole);
      setUserGang(profile.gang ?? null);
      setLoading(false);
    }

    loadSession();
  }, [router, isLoginPage]);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin");
  }, [router]);

  if (loading && !isLoginPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">Memuat…</div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar desktop ───────────────────────────────────────── */}
      <div className="hidden md:flex md:shrink-0">
        <AdminSidebar
          role={userRole}
          userName={userName}
          gang={userGang}
          onLogout={handleLogout}
          className="sticky top-0 h-screen"
        />
      </div>

      {/* ── Mobile drawer overlay ─────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          aria-hidden="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <AdminSidebar
              role={userRole}
              userName={userName}
              gang={userGang}
              onLogout={handleLogout}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* ── Mobile top bar ────────────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        {/* Hamburger + nama */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
            aria-label="Buka menu"
            aria-expanded={drawerOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <span className="text-sm font-semibold text-brand-black">
            {userName ?? "Admin"}
          </span>
        </div>

        {/* Avatar + dropdown logout */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setAvatarMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
            aria-label="Menu pengguna"
            aria-expanded={avatarMenuOpen}
            aria-haspopup="true"
          >
            {userName ? userName.charAt(0).toUpperCase() : "A"}
          </button>

          {/* Dropdown */}
          {avatarMenuOpen && (
            <>
              {/* Backdrop untuk tutup dropdown */}
              <div
                className="fixed inset-0 z-10"
                aria-hidden="true"
                onClick={() => setAvatarMenuOpen(false)}
              />
              <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <div className="border-b border-gray-100 px-4 py-2">
                  <p className="truncate text-xs font-semibold text-brand-black">
                    {userName ?? "Admin"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {userRole === "admin" ? "Admin" : `Ketua Gang${userGang ? ` · ${userGang}` : ""}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setAvatarMenuOpen(false); handleLogout(); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
