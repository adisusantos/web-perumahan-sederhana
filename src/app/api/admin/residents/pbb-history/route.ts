/**
 * API Route: /api/admin/residents/pbb-history
 * 
 * Endpoint untuk mendapatkan history pembayaran PBB untuk sebuah rumah.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PBBPayment } from '@/types';

interface PBBHistoryResponse {
  success: true;
  data: PBBPayment[];
}

interface PBBErrorResponse {
  success: false;
  error: string;
  message: string;
}

type ApiResponse = PBBHistoryResponse | PBBErrorResponse;

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

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

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const auth = await verifyAuth(supabase);
  if (!auth) {
    return NextResponse.json<PBBErrorResponse>(
      {
        success: false,
        error: 'unauthorized',
        message: 'Anda harus login untuk mengakses halaman ini.',
      },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const houseId = searchParams.get('house_id');

  if (!houseId || !isValidUUID(houseId)) {
    return NextResponse.json<PBBErrorResponse>(
      {
        success: false,
        error: 'validation_error',
        message: "Query param 'house_id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  const { data: payments, error } = await supabase
    .from('pbb_payments')
    .select('*')
    .eq('house_id', houseId)
    .order('tax_year', { ascending: false });

  if (error) {
    console.error('[GET /api/admin/residents/pbb-history] Query error:', error.message);
    return NextResponse.json<PBBErrorResponse>(
      {
        success: false,
        error: 'server_error',
        message: 'Terjadi kesalahan saat mengambil data pembayaran PBB.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json<PBBHistoryResponse>(
    { success: true, data: (payments || []) as PBBPayment[] },
    { status: 200 }
  );
}
