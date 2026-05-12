/**
 * API Route: /api/admin/residents
 *
 * Endpoint untuk pengelolaan data warga perumahan.
 * GET: list dan search data warga (admin & ketua_gang)
 * POST: create house baru dengan residents (admin only)
 * PATCH: update house/resident/pbb (admin only)
 * DELETE: delete house/resident (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { House, Resident, HouseWithResidents, PBBStatus } from '@/types';
import { filterResidentsSensitiveData, getLatestPBBStatus } from '@/lib/residents';
import {
  validateAddress,
  validateGang,
  validateName,
  validateEmail,
  validatePhone,
} from '@/lib/validation';

// ─── Request / Response Types ─────────────────────────────────────────────────

interface ResidentsListResponse {
  success: true;
  data: {
    houses: HouseWithResidents[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

interface ResidentCreateResponse {
  success: true;
  data: {
    house_id: string;
    message: string;
  };
}

interface ResidentMessageResponse {
  success: true;
  message: string;
}

interface ResidentErrorResponse {
  success: false;
  error: string;
  message: string;
}

type ApiResponse =
  | ResidentsListResponse
  | ResidentCreateResponse
  | ResidentMessageResponse
  | ResidentErrorResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Verifikasi bahwa request berasal dari user yang terautentikasi.
 * Mengembalikan user info jika valid, atau null jika tidak.
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

/**
 * Verifikasi bahwa user adalah admin
 */
async function verifyAdminRole(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ userId: string } | null> {
  const auth = await verifyAuth(supabase);
  if (!auth || auth.role !== 'admin') {
    return null;
  }
  return { userId: auth.userId };
}

// ─── GET /api/admin/residents ─────────────────────────────────────────────────

/**
 * List dan search data warga dengan filter dan pagination.
 * Query params:
 * - gang: filter by gang (optional)
 * - pbb_status: filter by PBB status (optional)
 * - search: search by owner name atau resident name (optional)
 * - page: page number (default: 1)
 * - limit: items per page (default: 50)
 *
 * Access: admin & ketua_gang (sensitive data filtered untuk ketua_gang)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const auth = await verifyAuth(supabase);
  if (!auth) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'unauthorized',
        message: 'Anda harus login untuk mengakses halaman ini.',
      },
      { status: 403 }
    );
  }

  const isAdmin = auth.role === 'admin';

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const gang = searchParams.get('gang');
  const pbbStatus = searchParams.get('pbb_status') as PBBStatus | null;
  const search = searchParams.get('search');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  // Build query untuk houses
  let housesQuery = supabase
    .from('houses')
    .select('*', { count: 'exact' });

  // Filter by gang
  if (gang) {
    housesQuery = housesQuery.eq('gang', gang);
  }

  // Search by owner name
  if (search) {
    housesQuery = housesQuery.ilike('owner_name', `%${search}%`);
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  housesQuery = housesQuery.range(from, to).order('gang').order('address');

  const { data: houses, error: housesError, count } = await housesQuery;

  if (housesError) {
    console.error('[GET /api/admin/residents] Houses query error:', housesError.message);
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat mengambil data rumah.',
      },
      { status: 500 }
    );
  }

  if (!houses || houses.length === 0) {
    return NextResponse.json<ResidentsListResponse>(
      {
        success: true,
        data: {
          houses: [],
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: 0,
          },
        },
      },
      { status: 200 }
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
    console.error('[GET /api/admin/residents] Residents query error:', residentsError.message);
    return NextResponse.json<ResidentErrorResponse>(
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
    console.error('[GET /api/admin/residents] PBB query error:', pbbError.message);
    return NextResponse.json<ResidentErrorResponse>(
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
  let housesWithResidents: HouseWithResidents[] = houses.map((house) => {
    const houseResidents = residentsMap.get(house.id) || [];
    const housePbb = pbbMap.get(house.id) || [];
    const latestPbb = getLatestPBBStatus(housePbb as any);

    return {
      ...(house as House),
      residents: filterResidentsSensitiveData(houseResidents, isAdmin),
      latest_pbb: latestPbb,
    };
  });

  // Filter by PBB status if specified
  if (pbbStatus) {
    housesWithResidents = housesWithResidents.filter(
      (h) => h.latest_pbb?.status === pbbStatus
    );
  }

  // Filter by search in resident names if specified
  if (search) {
    housesWithResidents = housesWithResidents.filter((h) => {
      const ownerMatch = h.owner_name.toLowerCase().includes(search.toLowerCase());
      const residentMatch = h.residents.some((r) =>
        r.name.toLowerCase().includes(search.toLowerCase())
      );
      return ownerMatch || residentMatch;
    });
  }

  const totalPages = count ? Math.ceil(count / limit) : 0;

  return NextResponse.json<ResidentsListResponse>(
    {
      success: true,
      data: {
        houses: housesWithResidents,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: totalPages,
        },
      },
    },
    { status: 200 }
  );
}

// ─── POST /api/admin/residents ────────────────────────────────────────────────

/**
 * Create house baru beserta residents.
 * Body: {
 *   address: string,
 *   gang: string,
 *   owner_name: string,
 *   residents: Array<{ name, phone?, email?, is_primary }>
 * }
 *
 * Access: admin only
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'forbidden',
        message: 'Akses ditolak. Hanya admin yang dapat melakukan operasi ini.',
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'invalid_request',
        message: 'Request body harus berupa JSON yang valid.',
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'invalid_request',
        message: 'Request body tidak boleh kosong.',
      },
      { status: 400 }
    );
  }

  const { address, gang, owner_name, residents } = body as Record<string, unknown>;

  // Validasi address
  if (!validateAddress(address as string)) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Field 'address' tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  // Validasi gang
  if (!validateGang(gang as string)) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Field 'gang' tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  // Validasi owner_name
  if (!validateName(owner_name as string)) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Field 'owner_name' tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  // Validasi residents array (optional)
  const residentsArray = Array.isArray(residents) ? residents : [];
  for (const resident of residentsArray) {
    if (!resident || typeof resident !== 'object') {
      return NextResponse.json<ResidentErrorResponse>(
        {
          success: false,
          error: 'validation_error',
          message: 'Setiap resident harus berupa object.',
        },
        { status: 400 }
      );
    }

    const { name, email, phone } = resident as Record<string, unknown>;

    if (!validateName(name as string)) {
      return NextResponse.json<ResidentErrorResponse>(
        {
          success: false,
          error: 'validation_error',
          message: "Field 'name' untuk resident tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    if (email && !validateEmail(email as string)) {
      return NextResponse.json<ResidentErrorResponse>(
        {
          success: false,
          error: 'validation_error',
          message: "Field 'email' harus berupa alamat email yang valid.",
        },
        { status: 400 }
      );
    }

    if (phone && !validatePhone(phone as string)) {
      return NextResponse.json<ResidentErrorResponse>(
        {
          success: false,
          error: 'validation_error',
          message: "Field 'phone' harus berupa nomor telepon yang valid.",
        },
        { status: 400 }
      );
    }
  }

  // Insert house
  const { data: newHouse, error: houseError } = await supabase
    .from('houses')
    .insert({
      address: (address as string).trim(),
      gang: (gang as string).trim(),
      owner_name: (owner_name as string).trim(),
    })
    .select('id')
    .single();

  if (houseError) {
    console.error('[POST /api/admin/residents] House insert error:', houseError.message);

    // Check for duplicate address
    if (houseError.code === '23505') {
      return NextResponse.json<ResidentErrorResponse>(
        {
          success: false,
          error: 'conflict',
          message: `Alamat ${address} di Gang ${gang} sudah terdaftar.`,
        },
        { status: 409 }
      );
    }

    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat menyimpan data rumah.',
      },
      { status: 500 }
    );
  }

  // Insert residents jika ada
  if (residentsArray.length > 0) {
    const residentsToInsert = residentsArray.map((r: any) => ({
      house_id: newHouse.id,
      name: r.name.trim(),
      phone: r.phone ? r.phone.trim() : null,
      email: r.email ? r.email.trim() : null,
      is_primary: r.is_primary || false,
    }));

    const { error: residentsError } = await supabase
      .from('residents')
      .insert(residentsToInsert);

    if (residentsError) {
      console.error('[POST /api/admin/residents] Residents insert error:', residentsError.message);
      // Rollback: delete house yang sudah dibuat
      await supabase.from('houses').delete().eq('id', newHouse.id);
      return NextResponse.json<ResidentErrorResponse>(
        {
          success: false,
          error: 'server_error',
          message: 'Terjadi kesalahan saat menyimpan data penghuni.',
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json<ResidentCreateResponse>(
    {
      success: true,
      data: {
        house_id: newHouse.id,
        message: 'Data rumah berhasil ditambahkan.',
      },
    },
    { status: 201 }
  );
}

// ─── PATCH /api/admin/residents ───────────────────────────────────────────────

/**
 * Update house, resident, atau PBB data.
 * Body: {
 *   type: 'house' | 'resident' | 'pbb',
 *   id: string,
 *   data: { ... }
 * }
 *
 * Access: admin only
 */
export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'forbidden',
        message: 'Akses ditolak. Hanya admin yang dapat melakukan operasi ini.',
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'invalid_request',
        message: 'Request body harus berupa JSON yang valid.',
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'invalid_request',
        message: 'Request body tidak boleh kosong.',
      },
      { status: 400 }
    );
  }

  const { type, id, data } = body as Record<string, unknown>;

  // Validasi type
  if (type !== 'house' && type !== 'resident' && type !== 'pbb') {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Field 'type' harus bernilai 'house', 'resident', atau 'pbb'.",
      },
      { status: 400 }
    );
  }

  // Validasi ID
  if (!id || typeof id !== 'string' || !isValidUUID(id)) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Field 'id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Validasi data
  if (!data || typeof data !== 'object') {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Field 'data' wajib diisi dan harus berupa object.",
      },
      { status: 400 }
    );
  }

  if (type === 'house') {
    const updateData: any = {};
    const { address, gang, owner_name } = data as Record<string, unknown>;

    if (address !== undefined) {
      if (!validateAddress(address as string)) {
        return NextResponse.json<ResidentErrorResponse>(
          {
            success: false,
            error: 'validation_error',
            message: "Field 'address' tidak boleh kosong.",
          },
          { status: 400 }
        );
      }
      updateData.address = (address as string).trim();
    }

    if (gang !== undefined) {
      if (!validateGang(gang as string)) {
        return NextResponse.json<ResidentErrorResponse>(
          {
            success: false,
            error: 'validation_error',
            message: "Field 'gang' tidak boleh kosong.",
          },
          { status: 400 }
        );
      }
      updateData.gang = (gang as string).trim();
    }

    if (owner_name !== undefined) {
      if (!validateName(owner_name as string)) {
        return NextResponse.json<ResidentErrorResponse>(
          {
            success: false,
            error: 'validation_error',
            message: "Field 'owner_name' tidak boleh kosong.",
          },
          { status: 400 }
        );
      }
      updateData.owner_name = (owner_name as string).trim();
    }

    const { error: updateError } = await supabase
      .from('houses')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('[PATCH /api/admin/residents] House update error:', updateError.message);

      if (updateError.code === '23505') {
        return NextResponse.json<ResidentErrorResponse>(
          {
            success: false,
            error: 'conflict',
            message: 'Alamat tersebut sudah terdaftar di gang yang sama.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json<ResidentErrorResponse>(
        {
          success: false,
          error: 'server_error',
          message: 'Terjadi kesalahan saat mengupdate data rumah.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ResidentMessageResponse>(
      { success: true, message: 'Data rumah berhasil diupdate.' },
      { status: 200 }
    );
  }

  if (type === 'resident') {
    const updateData: any = {};
    const { name, phone, email, is_primary } = data as Record<string, unknown>;

    if (name !== undefined) {
      if (!validateName(name as string)) {
        return NextResponse.json<ResidentErrorResponse>(
          {
            success: false,
            error: 'validation_error',
            message: "Field 'name' tidak boleh kosong.",
          },
          { status: 400 }
        );
      }
      updateData.name = (name as string).trim();
    }

    if (phone !== undefined) {
      if (phone && !validatePhone(phone as string)) {
        return NextResponse.json<ResidentErrorResponse>(
          {
            success: false,
            error: 'validation_error',
            message: "Field 'phone' harus berupa nomor telepon yang valid.",
          },
          { status: 400 }
        );
      }
      updateData.phone = phone ? (phone as string).trim() : null;
    }

    if (email !== undefined) {
      if (email && !validateEmail(email as string)) {
        return NextResponse.json<ResidentErrorResponse>(
          {
            success: false,
            error: 'validation_error',
            message: "Field 'email' harus berupa alamat email yang valid.",
          },
          { status: 400 }
        );
      }
      updateData.email = email ? (email as string).trim() : null;
    }

    if (is_primary !== undefined) {
      updateData.is_primary = Boolean(is_primary);
    }

    const { error: updateError } = await supabase
      .from('residents')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('[PATCH /api/admin/residents] Resident update error:', updateError.message);
      return NextResponse.json<ResidentErrorResponse>(
        {
          success: false,
          error: 'server_error',
          message: 'Terjadi kesalahan saat mengupdate data penghuni.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ResidentMessageResponse>(
      { success: true, message: 'Data penghuni berhasil diupdate.' },
      { status: 200 }
    );
  }

  // type === 'pbb'
  const updateData: any = {};
  const { tax_year, status, notes } = data as Record<string, unknown>;

  if (tax_year !== undefined) {
    updateData.tax_year = tax_year;
  }

  if (status !== undefined) {
    if (status !== 'lunas' && status !== 'belum') {
      return NextResponse.json<ResidentErrorResponse>(
        {
          success: false,
          error: 'validation_error',
          message: "Field 'status' harus bernilai 'lunas' atau 'belum'.",
        },
        { status: 400 }
      );
    }
    updateData.status = status;
  }

  if (notes !== undefined) {
    updateData.notes = notes ? (notes as string).trim() : null;
  }

  const { error: updateError } = await supabase
    .from('pbb_payments')
    .update(updateData)
    .eq('id', id);

  if (updateError) {
    console.error('[PATCH /api/admin/residents] PBB update error:', updateError.message);
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat mengupdate data PBB.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json<ResidentMessageResponse>(
    { success: true, message: 'Data PBB berhasil diupdate.' },
    { status: 200 }
  );
}

// ─── DELETE /api/admin/residents ──────────────────────────────────────────────

/**
 * Delete house atau resident.
 * Query params:
 * - type: 'house' | 'resident'
 * - id: UUID
 *
 * Access: admin only
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'forbidden',
        message: 'Akses ditolak. Hanya admin yang dapat melakukan operasi ini.',
      },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  // Validasi type
  if (type !== 'house' && type !== 'resident') {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Query param 'type' harus bernilai 'house' atau 'resident'.",
      },
      { status: 400 }
    );
  }

  // Validasi ID
  if (!id || !isValidUUID(id)) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Query param 'id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  if (type === 'house') {
    const { error: deleteError } = await supabase
      .from('houses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/admin/residents] House delete error:', deleteError.message);
      return NextResponse.json<ResidentErrorResponse>(
        {
          success: false,
          error: 'server_error',
          message: 'Terjadi kesalahan saat menghapus data rumah.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ResidentMessageResponse>(
      { success: true, message: 'Data rumah berhasil dihapus.' },
      { status: 200 }
    );
  }

  // type === 'resident'
  const { error: deleteError } = await supabase
    .from('residents')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[DELETE /api/admin/residents] Resident delete error:', deleteError.message);
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat menghapus data penghuni.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json<ResidentMessageResponse>(
    { success: true, message: 'Data penghuni berhasil dihapus.' },
    { status: 200 }
  );
}
