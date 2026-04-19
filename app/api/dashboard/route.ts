import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

const CLINIC_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

export async function GET(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const todayStr = today.toISOString().substring(0, 10);

  const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  // Fetch daily_accounts — authoritative/reconciled source (matches accounts ledger)
  const { data: dailyAccRows } = await supabaseAdmin
    .from('daily_accounts')
    .select('date, total_sales, total_sale_amount, total_medicine_sales, total_op_charges, trip_and_others, injection, expense, return_amount, total_cash, gpay')
    .eq('clinic_id', CLINIC_ID)
    .gte('date', startDate)
    .lte('date', todayStr);

  // Fetch account_entries — used as fallback for dates not in daily_accounts, and for category breakdown
  const { data: entries, error } = await supabaseAdmin
    .from('account_entries')
    .select('entry_date, entry_type, category, subcategory, payment_mode, amount')
    .gte('entry_date', startDate)
    .lte('entry_date', todayStr)
    .eq('is_voided', false)
    .order('entry_date', { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const e = entries ?? [];
  const da = dailyAccRows ?? [];

  // Income from a daily_accounts row — cascade through available fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const daIncome = (row: any): number => {
    const ts = Number(row.total_sales ?? 0);
    if (ts > 0) return ts;
    const tsa = Number(row.total_sale_amount ?? 0);
    if (tsa > 0) return tsa;
    const components =
      Number(row.total_medicine_sales ?? 0) +
      Number(row.total_op_charges ?? 0) +
      Number(row.trip_and_others ?? 0) +
      Number(row.injection ?? 0);
    if (components > 0) return components;
    return Number(row.total_cash ?? 0) + Number(row.gpay ?? 0);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const daExpense = (row: any): number =>
    Number(row.expense ?? 0) + Number(row.return_amount ?? 0);

  const isGPay = (r: { entry_type: string; subcategory: string | null }) =>
    r.entry_type === 'income' && r.subcategory === 'GPay';

  const sum = (rows: typeof e, key: 'amount') =>
    rows.reduce((s, r) => s + Number(r[key]), 0);

  // ── Build unified daily dateMap ──────────────────────────────────────────
  // PRIMARY: daily_accounts (reconciled, matches accounts ledger)
  // FALLBACK: account_entries for dates not in daily_accounts

  const dateMap: Record<string, {
    income: number; expense: number;
    cash: number; upi: number; card: number; count: number;
    fromDA: boolean;
  }> = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    dateMap[d.toISOString().substring(0, 10)] = {
      income: 0, expense: 0, cash: 0, upi: 0, card: 0, count: 0, fromDA: false
    };
  }

  // Fill PRIMARY from daily_accounts
  const daByDate: Record<string, typeof da[0]> = {};
  for (const row of da) {
    daByDate[row.date] = row;
    if (!dateMap[row.date]) continue;
    const income  = daIncome(row);
    const expense = daExpense(row);
    if (income === 0 && expense === 0) continue;
    dateMap[row.date] = {
      income,
      expense,
      cash:   Number(row.total_cash ?? 0),
      upi:    Number(row.gpay ?? 0),
      card:   0,
      count:  1,
      fromDA: true,
    };
  }

  // Fill FALLBACK from account_entries for dates without daily_accounts data
  for (const r of e) {
    if (!dateMap[r.entry_date]) continue;
    if (dateMap[r.entry_date].fromDA) continue; // daily_accounts is authoritative
    if (isGPay(r)) continue;
    dateMap[r.entry_date].count++;
    if (r.entry_type === 'income')  dateMap[r.entry_date].income  += Number(r.amount);
    if (r.entry_type === 'expense') dateMap[r.entry_date].expense += Number(r.amount);
    if (r.payment_mode === 'Cash')  dateMap[r.entry_date].cash    += Number(r.amount);
    if (r.payment_mode === 'UPI')   dateMap[r.entry_date].upi     += Number(r.amount);
    if (r.payment_mode === 'Card')  dateMap[r.entry_date].card    += Number(r.amount);
  }

  const dailyBreakdown = Object.entries(dateMap).map(([date, s]) => ({
    date,
    income:  s.income,
    expense: s.expense,
    net:     s.income - s.expense,
    cash:    s.cash,
    upi:     s.upi,
    card:    s.card,
    count:   s.count,
  }));

  // ── today ─────────────────────────────────────────────────────────────
  const todayPoint = dateMap[todayStr];
  const todayDA    = daByDate[todayStr];

  // Card payments only available from account_entries (daily_accounts doesn't track card)
  const todayCard = sum(
    e.filter(r => r.entry_date === todayStr && r.payment_mode === 'Card' && !isGPay(r)),
    'amount'
  );

  const todayIncFinal  = todayPoint?.income  ?? 0;
  const todayExpFinal  = todayPoint?.expense ?? 0;
  const todayCashFinal = todayPoint?.cash    ?? 0;
  const todayUPIFinal  = todayPoint?.upi     ?? 0;
  const todayCount     = todayDA
    ? e.filter(r => r.entry_date === todayStr).length
    : (todayPoint?.count ?? 0);

  // ── this week (sum from dateMap) ───────────────────────────────────────
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dow);
  const weekStartStr = weekStart.toISOString().substring(0, 10);

  let weekInc = 0, weekExp = 0;
  for (const [date, s] of Object.entries(dateMap)) {
    if (date >= weekStartStr) { weekInc += s.income; weekExp += s.expense; }
  }

  // ── this month (sum from dateMap) ──────────────────────────────────────
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  let monthInc = 0, monthExp = 0;
  for (const [date, s] of Object.entries(dateMap)) {
    if (date >= monthStr) { monthInc += s.income; monthExp += s.expense; }
  }

  // ── category breakdowns (account_entries only — for charts) ───────────
  const monthIncomeByCategory: Record<string, number>  = {};
  const monthExpenseByCategory: Record<string, number> = {};
  for (const r of e) {
    if (r.entry_date < monthStr) continue;
    if (isGPay(r)) continue;
    if (r.entry_type === 'income') {
      monthIncomeByCategory[r.category] =
        (monthIncomeByCategory[r.category] ?? 0) + Number(r.amount);
    } else {
      monthExpenseByCategory[r.category] =
        (monthExpenseByCategory[r.category] ?? 0) + Number(r.amount);
    }
  }

  return NextResponse.json(
    {
      today: {
        income:  todayIncFinal,
        expense: todayExpFinal,
        net:     todayIncFinal - todayExpFinal,
        cash:    todayCashFinal,
        upi:     todayUPIFinal,
        card:    todayCard,
        count:   todayCount,
      },
      week:  { income: weekInc,  expense: weekExp,  net: weekInc  - weekExp  },
      month: { income: monthInc, expense: monthExp, net: monthInc - monthExp },
      dailyBreakdown,
      monthIncomeByCategory,
      monthExpenseByCategory,
    },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } }
  );
}
