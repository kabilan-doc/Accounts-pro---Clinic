import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

const CLINIC_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

export async function GET(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const url    = new URL(request.url);
  const start  = url.searchParams.get('start');  // YYYY-MM-DD
  const end    = url.searchParams.get('end');    // YYYY-MM-DD

  if (!start || !end) return NextResponse.json({ message: 'start and end required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('daily_accounts')
    .select('*')
    .eq('clinic_id', CLINIC_ID)
    .gte('date', start)
    .lte('date', end);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const rows = data ?? [];

  // Aggregate from daily_accounts columns.
  // Income formula matches the accounts ledger exactly:
  //   FY2026 rows have total_sales > 0; FY2025 rows use total_sale_amount.
  //   return_amount is NOT deducted from income (it is a separate adjustment column).
  const income       = rows.reduce((s, r) => s + (Number(r.total_sales) || Number(r.total_sale_amount) || 0), 0);
  const expense      = rows.reduce((s, r) => s + (Number(r.expense) || 0), 0);
  const gpay         = rows.reduce((s, r) => s + (Number(r.gpay) || 0), 0);
  const totalCash    = rows.reduce((s, r) => s + (Number(r.total_cash) || 0), 0);
  const consultation = rows.reduce((s, r) => s + (Number(r.total_op_charges) || 0), 0);
  const pharmacy     = rows.reduce((s, r) => s + (Number(r.total_medicine_sales) || 0), 0);
  const procedure    = rows.reduce((s, r) => s + (Number(r.injection) || 0), 0);
  const other        = Math.max(0, income - consultation - pharmacy - procedure);

  return NextResponse.json({
    income,
    expense,
    net:          income - expense,
    cash:         totalCash,
    upi:          gpay,
    entries:      rows.length,
    consultation,
    pharmacy,
    procedure,
    other:        Math.max(0, other),
  });
}
