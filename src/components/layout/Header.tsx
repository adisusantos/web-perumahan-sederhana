"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Navigation items ─────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "Beranda" },
  { href: "/keuangan", label: "Keuangan" },
  { href: "/galeri", label: "Galeri" },
  { href: "/voting", label: "Voting" },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function BukitPandawaLogo() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Bukit 3 layer */}
      <path d="M2 30 L10 16 L18 26 L26 14 L34 30 Z" fill="#27500A" opacity="0.3" />
      <path d="M2 30 L12 18 L20 28 L28 16 L34 30 Z" fill="#27500A" opacity="0.6" />
      <path d="M4 30 L14 20 L22 30 Z" fill="#27500A" />
      {/* Siluet panda duduk */}
      <circle cx="26" cy="12" r="5" fill="#2C2C2A" />
      <circle cx="24" cy="10" r="1.5" fill="white" />
      <circle cx="28" cy="10" r="1.5" fill="white" />
      <circle cx="24.5" cy="10" r="0.7" fill="#2C2C2A" />
      <circle cx="27.5" cy="10" r="0.7" fill="#2C2C2A" />
      {/* Telinga panda */}
      <circle cx="22.5" cy="7.5" r="1.5" fill="#2C2C2A" />
      <circle cx="29.5" cy="7.5" r="1.5" fill="#2C2C2A" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface HeaderProps {
  /** Class tambahan untuk container header */
  className?: string;
}

/**
 * Header utama portal Bukit Pandawa.
 *
 * - Menampilkan logo + nama perumahan di kiri
 * - Navigasi desktop di kanan (hidden di mobile — diganti BottomNav)
 * - Warna brand-green (#27500A) sebagai background
 * - Accessible: nav landmark, aria-current untuk halaman aktif
 *
 * Requirements: 4.1, 9 (mobile-first)
 */
export function Header({ className = "" }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header
      className={[
        "sticky top-0 z-40 w-full",
        "bg-brand-green shadow-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo + nama */}
        <Link
          href="/"
          className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-green"
          aria-label="Bukit Pandawa — Halaman Beranda"
        >
          <BukitPandawaLogo />
          <span className="text-base font-bold leading-tight text-white sm:text-lg">
            Bukit Pandawa
          </span>
        </Link>

        {/* Navigasi desktop — hidden di mobile */}
        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex md:items-center md:gap-1"
        >
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-brand-green",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export default Header;
