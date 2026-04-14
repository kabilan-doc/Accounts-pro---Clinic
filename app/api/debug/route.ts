import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

const CLINIC_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

export async function GET(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('daily_accounts')
    .select('date, total_sales, total_sale_amount, total_medicine_sales, total_op_charges, trip_and_others, expense, total_cash, gpay')
    .eq('clinic_id', CLINIC_ID)
    .gte('date', '2026-04-01')
    .lte('date', '2026-04-14')
    .order('date', { ascending: false });

  return NextResponse.json({ data, error });
}
