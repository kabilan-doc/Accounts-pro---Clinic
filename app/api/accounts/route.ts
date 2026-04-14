import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

const CLINIC_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

export async function GET(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers as any);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const year  = url.searchParams.get('year');
  const month = url.searchParams.get('month'); // 1–12

  let query = supabaseAdmin
    .from('daily_accounts')
    .select('*')
    .eq('clinic_id', CLINIC_ID)
    .order('date', { ascending: true });

  if (year && month) {
    const y = parseInt(year);
    const m = parseInt(month);
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('date', start).lte('date', end);
  } else if (year) {
    query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers as any);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  const isFY2025 = body._fy === 2025;

  const row: Record<string, unknown> = {
    clinic_id:             CLINIC_ID,
    date:                  body.date,
    day_name:              body.day_name ?? null,
    gpay:                  Number(body.gpay)             || 0,
    expense:               Number(body.expense)          || 0,
    gpay_and_expense:      Number(body.gpay_and_expense) || 0,
    extra_charge:          Number(body.extra_charge)     || 0,
    return_amount:         Number(body.return_amount)    || 0,
    total_cash:            Number(body.total_cash)       || 0,
    total_cash_given:      Number(body.total_cash_given) || 0,
    excess_deficit:        Number(body.excess_deficit)   || 0,
    notes:                 body.notes?.trim() || null,
  };

  if (isFY2025) {
    // FY2025 format: total_sale_amount + injection
    row.total_sale_amount    = Number(body.total_sale_amount)    || 0;
    row.total_op_charges     = Number(body.total_op_charges)     || 0;
    row.injection            = Number(body.injection)            || 0;
    row.total_medicine_sales = Number(body.total_medicine_sales) || 0;
  } else {
    // FY2026 format: medicine + no_of_op + trip_and_others + total_sales
    row.total_medicine_sales = Number(body.total_medicine_sales) || 0;
    row.no_of_op             = Number(body.no_of_op)             || 0;
    row.total_op_charges     = Number(body.total_op_charges)     || 0;
    row.trip_and_others      = Number(body.trip_and_others)      || 0;
    row.total_sales          = Number(body.total_sales)          || 0;
  }

  const { data, error } = await supabaseAdmin
    .from('daily_accounts')
    .insert(row)
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
