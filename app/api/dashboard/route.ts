import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

export async function GET(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const todayStr = today.toISOString().substring(0, 10);

  // Fetch last 31 days of non-voided entries
  const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

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

  const e = entries ?? [];

  // ── helpers ───────────────────────────────────────────────────────────
  const sum = (rows: typeof e, key: 'amount') =>
    rows.reduce((s, r) => s + Number(r[key]), 0);

  const byType = (type: 'income' | 'expense') =>
    e.filter(r => r.entry_type === type);

  const byMode = (mode: string) =>
    e.filter(r => r.payment_mode === mode);

  // ── today ─────────────────────────────────────────────────────────────
  const todayAll   = e.filter(r => r.entry_date === todayStr);
  const todayInc   = sum(todayAll.filter(r => r.entry_type === 'income'), 'amount');
  const todayExp   = sum(todayAll.filter(r => r.entry_type === 'expense'), 'amount');
  const todayCash  = sum(todayAll.filter(r => r.payment_mode === 'Cash'), 'amount');
  const todayUPI   = sum(todayAll.filter(r => r.payment_mode === 'UPI'), 'amount');
  const todayCard  = sum(todayAll.filter(r => r.payment_mode === 'Card'), 'amount');

  // ── this week (Mon–today) ─────────────────────────────────────────────
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon = 0
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dow);
  const weekStartStr = weekStart.toISOString().substring(0, 10);
  const weekAll  = e.filter(r => r.entry_date >= weekStartStr);
  const weekInc  = sum(weekAll.filter(r => r.entry_type === 'income'), 'amount');
  const weekExp  = sum(weekAll.filter(r => r.entry_type === 'expense'), 'amount');

  // ── this month ────────────────────────────────────────────────────────
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const monthAll = e.filter(r => r.entry_date >= monthStr);
  const monthInc = sum(monthAll.filter(r => r.entry_type === 'income'), 'amount');
  const monthExp = sum(monthAll.filter(r => r.entry_type === 'expense'), 'amount');

  // ── daily breakdown for last 30 days ──────────────────────────────────
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

  for (const r of e) {
    if (!dateMap[r.entry_date]) continue;
    dateMap[r.entry_date].count++;
    if (r.entry_type === 'income')  dateMap[r.entry_date].income  += Number(r.amount);
    if (r.entry_type === 'expense') dateMap[r.entry_date].expense += Number(r.amount);
    if (r.payment_mode === 'Cash')  dateMap[r.entry_date].cash   += Number(r.amount);
    if (r.payment_mode === 'UPI')   dateMap[r.entry_date].upi    += Number(r.amount);
    if (r.payment_mode === 'Card')  dateMap[r.entry_date].card   += Number(r.amount);
  }

  const dailyBreakdown = Object.entries(dateMap).map(([date, s]) => ({
    date,
    income: s.income,
    expense: s.expense,
    net: s.income - s.expense,
    cash: s.cash,
    upi: s.upi,
    card: s.card,
    count: s.count
  }));

  // ── category breakdowns for this month ────────────────────────────────
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

  return NextResponse.json({
    today: {
      income: todayInc,
      expense: todayExp,
      net: todayInc - todayExp,
      cash: todayCash,
      upi: todayUPI,
      card: todayCard,
      count: todayAll.length
    },
    week:  { income: weekInc,  expense: weekExp,  net: weekInc  - weekExp  },
    month: { income: monthInc, expense: monthExp, net: monthInc - monthExp },
    dailyBreakdown,
    monthIncomeByCategory,
    monthExpenseByCategory
  });
}
