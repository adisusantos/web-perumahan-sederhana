// ─── Auth & Users ───────────────────────────────────────────────

export type UserRole = "admin" | "ketua_gang";

export interface Profile {
  id: string;           // UUID, FK ke auth.users
  name: string;
  role: UserRole;
  gang: string | null;  // Diisi jika role = ketua_gang
  created_at: string;
}

// ─── Announcements ──────────────────────────────────────────────

export type AnnouncementPriority = "normal" | "urgent";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  created_by: string;   // UUID FK ke profiles
  created_at: string;
  updated_at: string | null;
}

// ─── Gallery ────────────────────────────────────────────────────

export interface GalleryAlbum {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
}

export interface GalleryPhoto {
  id: string;
  album_id: string;
  url: string;          // Path di Supabase Storage
  caption: string | null;
  uploaded_by: string;  // UUID FK ke profiles
  created_at: string;
}

// ─── Voting ─────────────────────────────────────────────────────

export type PollType = "public" | "gang";
export type PollStatus = "active" | "closed";

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  type: PollType;
  gang_scope: string | null;    // Diisi jika type = gang
  secret_token: string | null;  // Diisi jika type = gang
  status: PollStatus;
  closes_at: string | null;     // null = tutup manual
  created_by: string;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  order: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  fingerprint_hash: string;     // SHA-256 hex
  voted_at: string;
}

// ─── Derived / View Types ────────────────────────────────────────

export interface PollResult {
  option_id: string;
  label: string;
  vote_count: number;
  percentage: number;           // 0–100, dibulatkan 1 desimal
}

export interface PollWithResults extends Poll {
  options: PollOption[];
  results: PollResult[];
  total_votes: number;
}

// ─── Finance ─────────────────────────────────────────────────────

export interface FinanceRow {
  tanggal: string;
  keterangan: string;
  pemasukan: number | null;
  pengeluaran: number | null;
  saldo: number;
}

export interface FinanceData {
  rows: FinanceRow[];
  last_updated: string;
  from_cache: boolean;
  available_sheets: string[];
}

// ─── Residents (Data Warga) ──────────────────────────────────────

export interface House {
  id: string;
  address: string;
  gang: string;
  owner_name: string;
  created_at: string;
  updated_at: string | null;
}

export interface Resident {
  id: string;
  house_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string | null;
}

export type PBBStatus = 'lunas' | 'belum';

export interface PBBPayment {
  id: string;
  house_id: string;
  tax_year: number;
  status: PBBStatus;
  reported_at: string;
  reported_by: string;
  notes: string | null;
  created_at: string;
}

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  changed_by: string;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

// ─── Derived Types for Residents ─────────────────────────────────

export interface HouseWithResidents extends House {
  residents: Resident[];
  latest_pbb: {
    tax_year: number;
    status: PBBStatus;
  } | null;
}

export interface ResidentStats {
  total_houses: number;
  houses_by_gang: Record<string, number>;
  pbb_stats: {
    total_records: number;
    lunas_count: number;
    belum_count: number;
    lunas_percentage: number;
    belum_percentage: number;
    by_year: Array<{
      tax_year: number;
      lunas: number;
      belum: number;
    }>;
  };
}
