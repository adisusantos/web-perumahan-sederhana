/**
 * Page: /admin/data-warga
 * 
 * Dashboard Data Warga - Server Component
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DataWargaClient from './DataWargaClient';

export const metadata = {
  title: 'Data Warga | Portal Warga Bukit Pandawa',
  description: 'Dashboard data warga perumahan Bukit Pandawa',
};

export default async function DataWargaPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/');
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/');
  }

  // Only admin and ketua_gang can access
  if (profile.role !== 'admin' && profile.role !== 'ketua_gang') {
    redirect('/admin');
  }

  const isAdmin = profile.role === 'admin';

  return <DataWargaClient isAdmin={isAdmin} />;
}
