/**
 * API Route: /api/admin/residents/stats
 *
 * Endpoint untuk mendapatkan statistik data warga.
 * GET: statistik data warga (admin & ketua_gang)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { countHousesByGang, calculatePBBStats } from '@/lib/residents';
import type { ResidentStats, PBBPayment } from '@/types';

// ─── Request / Response Types ─────────────────────────────────────────────────

interface StatsResponse {
  success: true;
  data: ResidentStats;
}

interface StatsErrorResponse {
  success: false;
  error: string;
  message: string;
}

type ApiResponse = StatsResponse | StatsErrorResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifikasi bahwa request berasal dari user yang terautentikasi.
 */
async function verifyAuth(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ userId: string; role: 'admin' | 'ketua_gang' } | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  if (profile.role !== 'admin' && profile.role !== 'ketua_gang') {
    return null;
  }

  return { userId: user.id, role: profile.role };
}

// ─── GET /api/admin/residents/stats ───────────────────────────────────────────

/**
 * Mendapatkan statistik data warga.
 * Query params:
 * - gang: filter by gang (optional)
 *
 * Access: admin & ketua_gang
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const auth = await verifyAuth(supabase);
  if (!auth) {
    return NextResponse.json<StatsErrorResponse>(
      {
        success: false,
        error: 'unauthorized',
        message: 'Anda harus login untuk mengakses halaman ini.',
      },
      { status: 403 }
    );
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const gang = searchParams.get('gang');

  // Build query untuk houses
  let housesQuery = supabase.from('houses').select('id, gang');

  if (gang) {
    housesQuery = housesQuery.eq('gang', gang);
  }

  const { data: houses, error: housesError } = await housesQuery;

  if (housesError) {
    console.error('[GET /api/admin/residents/stats] Houses query error:', housesError.message);
    return NextResponse.json<StatsErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat mengambil data rumah.',
      },
      { status: 500 }
    );
  }

  const totalHouses = houses?.length || 0;
  const housesByGang = countHousesByGang(houses || []);

  // Fetch PBB payments
  let pbbQuery = supabase
    .from('pbb_payments')
    .select('house_id, tax_year, status');

  if (gang && houses && houses.length > 0) {
    const houseIds = houses.map((h) => h.id);
    pbbQuery = pbbQuery.in('house_id', houseIds);
  }

  const { data: pbbPayments, error: pbbError } = await pbbQuery;

  if (pbbError) {
    console.error('[GET /api/admin/residents/stats] PBB query error:', pbbError.message);
    return NextResponse.json<StatsErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat mengambil data PBB.',
      },
      { status: 500 }
    );
  }

  const pbbStats = calculatePBBStats((pbbPayments || []) as PBBPayment[]);

  const stats: ResidentStats = {
    total_houses: totalHouses,
    houses_by_gang: housesByGang,
    pbb_stats: pbbStats,
  };

  return NextResponse.json<StatsResponse>(
    { success: true, data: stats },
    { status: 200 }
  );
}
