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

  // Fetch from account_entries (detailed per-entry rows)
  const { data: entries, error } = await supabaseAdmin
    .from('account_entries')
    .select('entry_date, entry_type, category, payment_mode, amount')
    .gte('entry_date', startDate)
    .lte('entry_date', todayStr)
    .eq('is_voided', false)
    .order('entry_date', { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // Also fetch daily_accounts for fallback (dates with no account_entries)
  const { data: dailyAccRows } = await supabaseAdmin
    .from('daily_accounts')
    .select('date, total_sales, total_sale_amount, total_medicine_sales, total_op_charges, trip_and_others, injection, expense, total_cash, gpay')
    .eq('clinic_id', CLINIC_ID)
    .gte('date', startDate)
    .lte('date', todayStr);

  const e = entries ?? [];

  // Derive income from a daily_accounts row — cascade through all available fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const daIncome = (da: any): number => {
    const ts = Number(da.total_sales ?? 0);
    if (ts > 0) return ts;
    const tsa = Number(da.total_sale_amount ?? 0);
    if (tsa > 0) return tsa;
    const components =
      Number(da.total_medicine_sales ?? 0) +
      Number(da.total_op_charges ?? 0) +
      Number(da.trip_and_others ?? 0) +
      Number(da.injection ?? 0);
    if (components > 0) return components;
    // Last resort: cash + gpay collected = total collected that day
    return Number(da.total_cash ?? 0) + Number(da.gpay ?? 0);
  };

  const sum = (rows: typeof e, key: 'amount') =>
    rows.reduce((s, r) => s + Number(r[key]), 0);

  // ── today ─────────────────────────────────────────────────────────────
  const todayAll  = e.filter(r => r.entry_date === todayStr);
  const todayInc  = sum(todayAll.filter(r => r.entry_type === 'income'), 'amount');
  const todayExp  = sum(todayAll.filter(r => r.entry_type === 'expense'), 'amount');
  const todayCash = sum(todayAll.filter(r => r.payment_mode === 'Cash'), 'amount');
  const todayUPI  = sum(todayAll.filter(r => r.payment_mode === 'UPI'), 'amount');
  const todayCard = sum(todayAll.filter(r => r.payment_mode === 'Card'), 'amount');

  // If today has no account_entries, fall back to daily_accounts
  const todayDA = (dailyAccRows ?? []).find(r => r.date === todayStr);
  const todayIncFinal  = todayAll.length > 0 ? todayInc  : (todayDA ? daIncome(todayDA) : 0);
  const todayExpFinal  = todayAll.length > 0 ? todayExp  : (todayDA ? Number(todayDA.expense ?? 0) : 0);
  const todayCashFinal = todayAll.length > 0 ? todayCash : (todayDA ? Number(todayDA.total_cash ?? 0) : 0);
  const todayUPIFinal  = todayAll.length > 0 ? todayUPI  : (todayDA ? Number(todayDA.gpay ?? 0) : 0);

  // ── this week ─────────────────────────────────────────────────────────
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dow);
  const weekStartStr = weekStart.toISOString().substring(0, 10);
  const weekAll = e.filter(r => r.entry_date >= weekStartStr);
  const weekInc = sum(weekAll.filter(r => r.entry_type === 'income'), 'amount');
  const weekExp = sum(weekAll.filter(r => r.entry_type === 'expense'), 'amount');

  // ── this month ────────────────────────────────────────────────────────
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const monthAll = e.filter(r => r.entry_date >= monthStr);
  const monthInc = sum(monthAll.filter(r => r.entry_type === 'income'), 'amount');
  const monthExp = sum(monthAll.filter(r => r.entry_type === 'expense'), 'amount');

  // ── daily breakdown — account_entries primary, daily_accounts fallback ──
  const dateMap: Record<string, {
    income: number; expense: number;
    cash: number; upi: number; card: number; count: number;
  }> = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    dateMap[d.toISOString().substring(0, 10)] = {
      income: 0, expense: 0, cash: 0, upi: 0, card: 0, count: 0
    };
  }

  // Fill from account_entries
  for (const r of e) {
    if (!dateMap[r.entry_date]) continue;
    dateMap[r.entry_date].count++;
    if (r.entry_type === 'income')  dateMap[r.entry_date].income  += Number(r.amount);
    if (r.entry_type === 'expense') dateMap[r.entry_date].expense += Number(r.amount);
    if (r.payment_mode === 'Cash')  dateMap[r.entry_date].cash    += Number(r.amount);
    if (r.payment_mode === 'UPI')   dateMap[r.entry_date].upi     += Number(r.amount);
    if (r.payment_mode === 'Card')  dateMap[r.entry_date].card    += Number(r.amount);
  }

  // Fallback: fill zero-count dates from daily_accounts
  for (const da of (dailyAccRows ?? [])) {
    if (!dateMap[da.date]) continue;
    if (dateMap[da.date].count > 0) continue; // account_entries takes priority
    const income = daIncome(da);
    const expense = Number(da.expense ?? 0);
    if (income === 0 && expense === 0) continue;
    dateMap[da.date].income  = income;
    dateMap[da.date].expense = expense;
    dateMap[da.date].cash    = Number(da.total_cash ?? 0);
    dateMap[da.date].upi     = Number(da.gpay ?? 0);
    dateMap[da.date].count   = -1; // marker: sourced from daily_accounts
  }

  const dailyBreakdown = Object.entries(dateMap).map(([date, s]) => ({
    date,
    income:  s.income,
    expense: s.expense,
    net:     s.income - s.expense,
    cash:    s.cash,
    upi:     s.upi,
    card:    s.card,
    count:   s.count === -1 ? 0 : s.count, // show 0 for fallback rows
  }));

  // ── category breakdowns for this month (account_entries only) ─────────
  const monthIncomeByCategory: Record<string, number> = {};
  const monthExpenseByCategory: Record<string, number> = {};
  for (const r of monthAll) {
    if (r.entry_type === 'income') {
      monthIncomeByCategory[r.category] =
        (monthIncomeByCategory[r.category] ?? 0) + Number(r.amount);
    } else {
      monthExpenseByCategory[r.category] =
        (monthExpenseByCategory[r.category] ?? 0) + Number(r.amount);
    }
  }

  // Supplement month totals with daily_accounts fallback
  let monthIncFinal = monthInc;
  let monthExpFinal = monthExp;
  for (const da of (dailyAccRows ?? [])) {
    if (da.date < monthStr) continue;
    // Only add if this date had no account_entries
    const hasEntries = e.some(r => r.entry_date === da.date);
    if (hasEntries) continue;
    monthIncFinal += daIncome(da);
    monthExpFinal += Number(da.expense ?? 0);
  }

  return NextResponse.json({
    today: {
      income:  todayIncFinal,
      expense: todayExpFinal,
      net:     todayIncFinal - todayExpFinal,
      cash:    todayCashFinal,
      upi:     todayUPIFinal,
      card:    todayCard,
      count:   todayAll.length,
    },
    week:  { income: weekInc,       expense: weekExp,       net: weekInc       - weekExp       },
    month: { income: monthIncFinal, expense: monthExpFinal, net: monthIncFinal - monthExpFinal },
    dailyBreakdown,
    monthIncomeByCategory,
    monthExpenseByCategory,
  });
}
