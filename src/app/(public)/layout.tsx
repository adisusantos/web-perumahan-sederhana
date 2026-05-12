import React from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

/**
 * Layout untuk semua halaman publik.
 *
 * - Menyertakan Header di atas
 * - Padding bottom agar konten tidak tertutup BottomNav di mobile
 * - BottomNav dirender di sini agar tersedia di semua halaman publik
 *
 * Requirements: 4.1, 9 (mobile-first)
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {/* pb-20 = ruang untuk BottomNav (h-16) + safe area di mobile */}
      <main className="min-h-screen pb-20 md:pb-0">{children}</main>
      <BottomNav />
    </>
  );
}
