/**
 * API Route: /api/admin/residents/pbb
 *
 * Endpoint untuk menambah pembayaran PBB baru.
 * POST: create PBB payment baru (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateTaxYear } from '@/lib/validation';

// ─── Request / Response Types ─────────────────────────────────────────────────

interface PBBCreateResponse {
  success: true;
  data: {
    id: string;
    message: string;
  };
}

interface PBBErrorResponse {
  success: false;
  error: string;
  message: string;
}

type ApiResponse = PBBCreateResponse | PBBErrorResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

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

// ─── POST /api/admin/residents/pbb ────────────────────────────────────────────

/**
 * Tambah pembayaran PBB baru untuk sebuah rumah.
 * Body: {
 *   house_id: string,
 *   tax_year: number,
 *   status: 'lunas' | 'belum',
 *   notes?: string
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
    return NextResponse.json<PBBErrorResponse>(
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
    return NextResponse.json<PBBErrorResponse>(
      {
        success: false,
        error: 'invalid_request',
        message: 'Request body harus berupa JSON yang valid.',
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json<PBBErrorResponse>(
      {
        success: false,
        error: 'invalid_request',
        message: 'Request body tidak boleh kosong.',
      },
      { status: 400 }
    );
  }

  const { house_id, tax_year, status, notes } = body as Record<string, unknown>;

  // Validasi house_id
  if (!house_id || typeof house_id !== 'string' || !isValidUUID(house_id)) {
    return NextResponse.json<PBBErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Field 'house_id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Validasi tax_year
  if (typeof tax_year !== 'number' || !validateTaxYear(tax_year)) {
    return NextResponse.json<PBBErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Field 'tax_year' harus berupa angka antara 2000-2100.",
      },
      { status: 400 }
    );
  }

  // Validasi status
  if (status !== 'lunas' && status !== 'belum') {
    return NextResponse.json<PBBErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Field 'status' harus bernilai 'lunas' atau 'belum'.",
      },
      { status: 400 }
    );
  }

  // Check house exists
  const { data: house, error: houseError } = await supabase
    .from('houses')
    .select('id')
    .eq('id', house_id)
    .single();

  if (houseError || !house) {
    return NextResponse.json<PBBErrorResponse>(
      {
        success: false,
        error: 'not_found',
        message: 'Rumah dengan ID tersebut tidak ditemukan.',
      },
      { status: 404 }
    );
  }

  // Insert PBB payment
  const { data: newPayment, error: insertError } = await supabase
    .from('pbb_payments')
    .insert({
      house_id,
      tax_year,
      status,
      notes: notes ? (notes as string).trim() : null,
      reported_by: admin.userId,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[POST /api/admin/residents/pbb] Insert error:', insertError.message);

    // Check for duplicate house_id + tax_year
    if (insertError.code === '23505') {
      return NextResponse.json<PBBErrorResponse>(
        {
          success: false,
          error: 'conflict',
          message: `Pembayaran PBB untuk tahun ${tax_year} sudah tercatat untuk rumah ini.`,
        },
        { status: 409 }
      );
    }

    return NextResponse.json<PBBErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat menyimpan data pembayaran PBB.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json<PBBCreateResponse>(
    {
      success: true,
      data: {
        id: newPayment.id,
        message: 'Pembayaran PBB berhasil ditambahkan.',
      },
    },
    { status: 201 }
  );
}
