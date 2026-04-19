import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

const CLINIC_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

export async function GET(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start_date');
  const end   = searchParams.get('end_date');
  if (!start || !end) return NextResponse.json({ message: 'start_date and end_date required' }, { status: 400 });

  const [{ data: daRows }, { data: entries, error }] = await Promise.all([
    supabaseAdmin
      .from('daily_accounts')
      .select('date, total_sales, total_sale_amount, total_medicine_sales, total_op_charges, trip_and_others, injection, expense, return_amount, total_cash, gpay')
      .eq('clinic_id', CLINIC_ID)
      .gte('date', start)
      .lte('date', end),
    supabaseAdmin
      .from('account_entries')
      .select('entry_date, entry_type, category, subcategory, payment_mode, amount')
      .gte('entry_date', start)
      .lte('entry_date', end)
      .eq('is_voided', false),
  ]);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const e  = entries ?? [];
  const da = daRows  ?? [];

  const isGPay = (r: { entry_type: string; subcategory: string | null }) =>
    r.entry_type === 'income' && r.subcategory === 'GPay';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const daIncome = (row: any): number => {
    const ts = Number(row.total_sales ?? 0); if (ts > 0) return ts;
    const tsa = Number(row.total_sale_amount ?? 0); if (tsa > 0) return tsa;
    const comp = Number(row.total_medicine_sales ?? 0) + Number(row.total_op_charges ?? 0)
               + Number(row.trip_and_others ?? 0) + Number(row.injection ?? 0);
    if (comp > 0) return comp;
    return Number(row.total_cash ?? 0) + Number(row.gpay ?? 0);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const daExpense = (row: any): number =>
    Number(row.expense ?? 0) + Number(row.return_amount ?? 0);

  // Build per-day map — daily_accounts PRIMARY, account_entries FALLBACK
  const dailyMap: Record<string, {
    income: number; expense: number; cash: number; upi: number; card: number; fromDA: boolean;
  }> = {};

  for (const row of da) {
    const income  = daIncome(row);
    const expense = daExpense(row);
    if (income === 0 && expense === 0) continue;
    dailyMap[row.date] = {
      income, expense,
      cash: Number(row.total_cash ?? 0),
      upi:  Number(row.gpay ?? 0),
      card: 0,
      fromDA: true,
    };
  }

  for (const r of e) {
    if (isGPay(r)) continue;
    if (!dailyMap[r.entry_date]) {
      dailyMap[r.entry_date] = { income: 0, expense: 0, cash: 0, upi: 0, card: 0, fromDA: false };
    }
    if (dailyMap[r.entry_date].fromDA) {
      // DA is authoritative for income/expense/cash/upi — only supplement card
      if (r.payment_mode === 'Card') dailyMap[r.entry_date].card += Number(r.amount);
    } else {
      if (r.entry_type === 'income')  dailyMap[r.entry_date].income  += Number(r.amount);
      if (r.entry_type === 'expense') dailyMap[r.entry_date].expense += Number(r.amount);
      if (r.payment_mode === 'Cash')  dailyMap[r.entry_date].cash    += Number(r.amount);
      if (r.payment_mode === 'UPI')   dailyMap[r.entry_date].upi     += Number(r.amount);
      if (r.payment_mode === 'Card')  dailyMap[r.entry_date].card    += Number(r.amount);
    }
  }

  const dailyPoints = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, s]) => ({
      date,
      income:  s.income,
      expense: s.expense,
      net:     s.income - s.expense,
      cash:    s.cash,
      upi:     s.upi,
      card:    s.card,
    }));

  // Category breakdown — account_entries only (DA has no category split)
  const incByCat: Record<string, number> = {};
  const expByCat: Record<string, number> = {};
  for (const r of e) {
    if (isGPay(r)) continue;
    if (r.entry_type === 'income')  incByCat[r.category] = (incByCat[r.category] ?? 0) + Number(r.amount);
    if (r.entry_type === 'expense') expByCat[r.category] = (expByCat[r.category] ?? 0) + Number(r.amount);
  }

  // Payment mode from daily_accounts (cash + upi totals per day) + card from AE
  const modeMap: Record<string, number> = {};
  for (const s of Object.values(dailyMap)) {
    if (s.cash > 0) modeMap['Cash'] = (modeMap['Cash'] ?? 0) + s.cash;
    if (s.upi  > 0) modeMap['UPI']  = (modeMap['UPI']  ?? 0) + s.upi;
    if (s.card > 0) modeMap['Card'] = (modeMap['Card'] ?? 0) + s.card;
  }

  return NextResponse.json(
    { dailyPoints, incByCat, expByCat, modeMap },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } }
  );
}
