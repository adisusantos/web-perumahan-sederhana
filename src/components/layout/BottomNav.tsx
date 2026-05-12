"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={active ? 0 : 1.75}
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function FinanceIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={active ? 0 : 1.75}
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
      />
    </svg>
  );
}

function GalleryIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={active ? 0 : 1.75}
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function VotingIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={active ? 0 : 1.75}
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
      />
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

interface BottomNavItem {
  href: string;
  label: string;
  Icon: React.ComponentType<{ active: boolean }>;
}

const navItems: BottomNavItem[] = [
  { href: "/", label: "Beranda", Icon: HomeIcon },
  { href: "/keuangan", label: "Keuangan", Icon: FinanceIcon },
  { href: "/galeri", label: "Galeri", Icon: GalleryIcon },
  { href: "/voting", label: "Voting", Icon: VotingIcon },
];

// ─── Component ────────────────────────────────────────────────────────────────

export interface BottomNavProps {
  /** Class tambahan untuk container */
  className?: string;
}

/**
 * Navigasi bawah untuk mobile.
 *
 * - Sticky di bagian bawah layar
 * - Hidden di desktop (md ke atas) — diganti navigasi di Header
 * - Setiap item memiliki touch target minimal 44px
 * - Ikon + label teks untuk aksesibilitas
 * - Accessible: nav landmark, aria-current untuk halaman aktif
 *
 * Requirements: 4.1, 9 (mobile-first)
 */
export function BottomNav({ className = "" }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi bawah"
      className={[
        // Hanya tampil di mobile
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        // Styling
        "border-t border-gray-200 bg-white",
        // Safe area untuk notch/home indicator di iOS
        "pb-safe",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ul className="flex h-16 items-stretch" role="list">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  // Touch target minimal 44px (h-16 = 64px sudah memenuhi)
                  "flex flex-1 flex-col items-center justify-center gap-0.5 px-1",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-green",
                  isActive
                    ? "text-brand-green"
                    : "text-gray-500 hover:text-brand-green",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <item.Icon active={isActive} />
                <span
                  className={[
                    "text-[10px] font-medium leading-none",
                    isActive ? "text-brand-green" : "text-gray-500",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomNav;
