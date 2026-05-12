/**
 * API Route: /api/admin/residents/add-resident
 * 
 * Helper endpoint untuk menambah resident ke house existing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateName, validateEmail, validatePhone } from '@/lib/validation';

interface ResidentErrorResponse {
  success: false;
  error: string;
  message: string;
}

interface ResidentSuccessResponse {
  success: true;
  message: string;
}

type ApiResponse = ResidentSuccessResponse | ResidentErrorResponse;

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

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

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
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

  const { house_id, name, phone, email, is_primary } = body as Record<string, unknown>;

  if (!house_id || typeof house_id !== 'string' || !isValidUUID(house_id)) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Field 'house_id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

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

  // Check house exists
  const { data: house, error: houseError } = await supabase
    .from('houses')
    .select('id')
    .eq('id', house_id)
    .single();

  if (houseError || !house) {
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'not_found',
        message: 'Rumah dengan ID tersebut tidak ditemukan.',
      },
      { status: 404 }
    );
  }

  // Insert resident
  const { error: insertError } = await supabase.from('residents').insert({
    house_id,
    name: (name as string).trim(),
    phone: phone ? (phone as string).trim() : null,
    email: email ? (email as string).trim() : null,
    is_primary: Boolean(is_primary),
  });

  if (insertError) {
    console.error('[POST /api/admin/residents/add-resident] Insert error:', insertError.message);
    return NextResponse.json<ResidentErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat menyimpan data penghuni.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json<ResidentSuccessResponse>(
    { success: true, message: 'Penghuni berhasil ditambahkan.' },
    { status: 201 }
  );
}
