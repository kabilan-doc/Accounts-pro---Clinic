import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

export async function GET(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const { searchParams } = url;
  const user = searchParams.get('user');
  const action = searchParams.get('action');
  const table = searchParams.get('table');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = supabaseAdmin.from('audit_log').select('*').order('changed_at', { ascending: false });
  if (user) query = query.eq('changed_by', user);
  if (action) query = query.eq('action', action);
  if (table) query = query.eq('table_name', table);
  if (startDate) query = query.gte('changed_at', `${startDate}T00:00:00Z`);
  if (endDate) query = query.lte('changed_at', `${endDate}T23:59:59Z`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ audit: data ?? [] });
}
