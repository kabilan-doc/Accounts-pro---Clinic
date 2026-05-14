import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

const CLINIC_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

export async function GET(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const url   = new URL(request.url);
  const start = url.searchParams.get('start');
  const end   = url.searchParams.get('end');

  if (!start || !end) return NextResponse.json({ message: 'start and end required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('daily_accounts')
    .select('*')
    .eq('clinic_id', CLINIC_ID)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const days = (data ?? []).map(r => {
    const income       = Number(r.total_sales) || Number(r.total_sale_amount) || 0;
    const expense      = Number(r.expense) || 0;
    const consultation = Number(r.total_op_charges) || 0;
    const pharmacy     = Number(r.total_medicine_sales) || 0;
    const procedure    = Number(r.injection) || 0;
    const other        = Math.max(0, income - consultation - pharmacy - procedure);
    return {
      date:         r.date,
      income,
      expense,
      net:          income - expense,
      cash:         Number(r.total_cash) || 0,
      upi:          Number(r.gpay) || 0,
      consultation,
      pharmacy,
      procedure,
      other,
    };
  });

  return NextResponse.json({ days });
}
