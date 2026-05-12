"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types";

// ─── Icons ────────────────────────────────────────────────────────────────────

function DashboardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function AnnouncementIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
      />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-5 w-5 shrink-0"
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

function VotingIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-5 w-5 shrink-0"
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

function AccountIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function DataWargaIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
      />
    </svg>
  );
}

// ─── Menu definitions ─────────────────────────────────────────────────────────

interface MenuItem {
  href: string;
  label: string;
  Icon: React.ComponentType;
  /** Role yang diizinkan mengakses menu ini */
  allowedRoles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    Icon: DashboardIcon,
    allowedRoles: ["admin", "ketua_gang"],
  },
  {
    href: "/admin/data-warga",
    label: "Data Warga",
    Icon: DataWargaIcon,
    allowedRoles: ["admin", "ketua_gang"],
  },
  {
    href: "/admin/pengumuman",
    label: "Pengumuman",
    Icon: AnnouncementIcon,
    allowedRoles: ["admin"],
  },
  {
    href: "/admin/galeri",
    label: "Galeri",
    Icon: GalleryIcon,
    allowedRoles: ["admin"],
  },
  {
    href: "/admin/voting",
    label: "Voting",
    Icon: VotingIcon,
    allowedRoles: ["admin", "ketua_gang"],
  },
  {
    href: "/admin/akun",
    label: "Kelola Akun",
    Icon: AccountIcon,
    allowedRoles: ["admin"],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AdminSidebarProps {
  /** Role pengguna yang sedang login — menentukan menu yang ditampilkan */
  role: UserRole;
  /** Nama pengguna untuk ditampilkan di header sidebar */
  userName?: string;
  /** Gang pengguna (untuk ketua_gang) */
  gang?: string | null;
  /** Callback saat tombol logout diklik */
  onLogout?: () => void;
  /** Class tambahan untuk container */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Sidebar navigasi panel admin.
 *
 * Menu yang ditampilkan disesuaikan dengan role:
 * - `admin`: semua menu (Dashboard, Pengumuman, Galeri, Voting, Kelola Akun)
 * - `ketua_gang`: hanya Dashboard dan Voting
 *
 * Touch target setiap item minimal 44px.
 * Accessible: nav landmark, aria-current untuk halaman aktif.
 *
 * Requirements: 4.6, 4.7, 9 (mobile-first)
 */
export function AdminSidebar({
  role,
  userName,
  gang,
  onLogout,
  className = "",
}: AdminSidebarProps) {
  const pathname = usePathname();

  // Filter menu berdasarkan role
  const visibleMenuItems = menuItems.filter((item) =>
    item.allowedRoles.includes(role)
  );

  const roleLabel = role === "admin" ? "Admin" : `Ketua Gang${gang ? ` · ${gang}` : ""}`;

  return (
    <aside
      aria-label="Navigasi admin"
      className={[
        "flex h-full w-64 flex-col",
        "border-r border-gray-200 bg-white",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header sidebar — logo + info user */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green text-white"
          aria-hidden="true"
        >
          <span className="text-sm font-bold">
            {userName ? userName.charAt(0).toUpperCase() : "A"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          {userName && (
            <p className="truncate text-sm font-semibold text-brand-black">
              {userName}
            </p>
          )}
          <p className="truncate text-xs text-gray-500">{roleLabel}</p>
        </div>
      </div>

      {/* Menu navigasi */}
      <nav aria-label="Menu admin" className="flex-1 overflow-y-auto px-3 py-3">
        <ul role="list" className="space-y-0.5">
          {visibleMenuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    // Touch target minimal 44px
                    "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5",
                    "text-sm font-medium transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-1",
                    isActive
                      ? "bg-brand-green/10 text-brand-green"
                      : "text-gray-700 hover:bg-gray-100 hover:text-brand-green",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <item.Icon />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer sidebar — tombol logout */}
      <div className="border-t border-gray-200 px-3 py-3">
        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className={[
              "flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5",
              "text-sm font-medium text-gray-700 transition-colors duration-150",
              "hover:bg-red-50 hover:text-red-600",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1",
            ].join(" ")}
          >
            <LogoutIcon />
            Keluar
          </button>
        ) : (
          <Link
            href="/admin"
            className={[
              "flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5",
              "text-sm font-medium text-gray-700 transition-colors duration-150",
              "hover:bg-red-50 hover:text-red-600",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1",
            ].join(" ")}
          >
            <LogoutIcon />
            Keluar
          </Link>
        )}
      </div>
    </aside>
  );
}

export default AdminSidebar;
