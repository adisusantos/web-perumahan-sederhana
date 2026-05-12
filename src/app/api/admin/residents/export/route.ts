/**
 * API Route: /api/admin/residents/export
 *
 * Endpoint untuk export data warga ke CSV.
 * GET: export data warga (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { House, Resident, HouseWithResidents } from '@/types';
import { getLatestPBBStatus } from '@/lib/residents';
import { generateCSV, generateExportFilename } from '@/lib/export';

// ─── Request / Response Types ─────────────────────────────────────────────────

interface ExportErrorResponse {
  success: false;
  error: string;
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifikasi bahwa user adalah admin
 */
async function verifyAdminRole(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ userId: string } | null> {
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

  if (profileError || !profile || profile.role !== 'admin') {
    return null;
  }

  return { userId: user.id };
}

// ─── GET /api/admin/residents/export ──────────────────────────────────────────

/**
 * Export data warga ke CSV.
 * Query params:
 * - gang: filter by gang (optional)
 *
 * Access: admin only (karena include sensitive data)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ExportErrorResponse> | NextResponse> {
  const supabase = await createClient();

  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<ExportErrorResponse>(
      {
        success: false,
        error: 'forbidden',
        message: 'Akses ditolak. Hanya admin yang dapat melakukan operasi ini.',
      },
      { status: 403 }
    );
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const gang = searchParams.get('gang');

  // Build query untuk houses
  let housesQuery = supabase.from('houses').select('*');

  if (gang) {
    housesQuery = housesQuery.eq('gang', gang);
  }

  housesQuery = housesQuery.order('gang').order('address');

  const { data: houses, error: housesError } = await housesQuery;

  if (housesError) {
    console.error('[GET /api/admin/residents/export] Houses query error:', housesError.message);
    return NextResponse.json<ExportErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat mengambil data rumah.',
      },
      { status: 500 }
    );
  }

  if (!houses || houses.length === 0) {
    return NextResponse.json<ExportErrorResponse>(
      {
        success: false,
        error: 'not_found',
        message: 'Tidak ada data untuk diekspor.',
      },
      { status: 404 }
    );
  }

  // Fetch residents untuk semua houses
  const houseIds = houses.map((h) => h.id);
  const { data: residents, error: residentsError } = await supabase
    .from('residents')
    .select('*')
    .in('house_id', houseIds)
    .order('is_primary', { ascending: false })
    .order('name');

  if (residentsError) {
    console.error('[GET /api/admin/residents/export] Residents query error:', residentsError.message);
    return NextResponse.json<ExportErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat mengambil data penghuni.',
      },
      { status: 500 }
    );
  }

  // Fetch latest PBB untuk semua houses
  const { data: pbbPayments, error: pbbError } = await supabase
    .from('pbb_payments')
    .select('house_id, tax_year, status')
    .in('house_id', houseIds)
    .order('tax_year', { ascending: false });

  if (pbbError) {
    console.error('[GET /api/admin/residents/export] PBB query error:', pbbError.message);
    return NextResponse.json<ExportErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat mengambil data PBB.',
      },
      { status: 500 }
    );
  }

  // Group residents by house_id
  const residentsMap = new Map<string, Resident[]>();
  (residents || []).forEach((resident) => {
    const existing = residentsMap.get(resident.house_id) || [];
    existing.push(resident as Resident);
    residentsMap.set(resident.house_id, existing);
  });

  // Group PBB by house_id
  const pbbMap = new Map<string, typeof pbbPayments>();
  (pbbPayments || []).forEach((pbb) => {
    const existing = pbbMap.get(pbb.house_id) || [];
    existing.push(pbb);
    pbbMap.set(pbb.house_id, existing);
  });

  // Combine data
  const housesWithResidents: HouseWithResidents[] = houses.map((house) => {
    const houseResidents = residentsMap.get(house.id) || [];
    const housePbb = pbbMap.get(house.id) || [];
    const latestPbb = getLatestPBBStatus(housePbb as any);

    return {
      ...(house as House),
      residents: houseResidents,
      latest_pbb: latestPbb,
    };
  });

  // Generate CSV
  const csv = generateCSV(housesWithResidents);
  const filename = generateExportFilename();

  // Return CSV file
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv;charset=utf-8;',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
