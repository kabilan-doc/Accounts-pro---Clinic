'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import {
  NetTrendChart,
  IncomeExpenseBarChart,
  CategoryBarChart,
  PaymentModeChart,
  DayOfWeekChart,
  type DailyPoint,
  type CategoryPoint
} from '@/components/AccountCharts';
import { formatINR } from '@/lib/formatCurrency';

type Period = 'today' | 'week' | 'month' | 'last_month' | 'custom';

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isoDate(d: Date) { return d.toISOString().substring(0, 10); }

function periodDates(period: Period, customStart: string, customEnd: string): [string, string] {
  const today = new Date();
  switch (period) {
    case 'today':
      return [isoDate(today), isoDate(today)];
    case 'week': {
      const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
      const start = new Date(today); start.setDate(today.getDate() - dow);
      return [isoDate(start), isoDate(today)];
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return [isoDate(start), isoDate(today)];
    }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end   = new Date(today.getFullYear(), today.getMonth(), 0);
      return [isoDate(start), isoDate(end)];
    }
    case 'custom':
      return [customStart, customEnd];
  }
}

export default function AnalyticsPage() {
  const [period,      setPeriod]      = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const [dailyPoints,  setDailyPoints]  = useState<DailyPoint[]>([]);
  const [incByCat,     setIncByCat]     = useState<Record<string, number>>({});
  const [expByCat,     setExpByCat]     = useState<Record<string, number>>({});
  const [modeMap,      setModeMap]      = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [start, end] = periodDates(period, customStart, customEnd);
    if (!start || !end) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics?start_date=${start}&end_date=${end}`);
      if (!res.ok) throw new Error('Failed to load analytics data');
      const data = await res.json();
      setDailyPoints(data.dailyPoints ?? []);
      setIncByCat(data.incByCat ?? {});
      setExpByCat(data.expByCat ?? {});
      setModeMap(data.modeMap ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => { load(); }, [load]);

  // ── derived totals ───────────────────────────────────────────────────────
  const totalIncome  = dailyPoints.reduce((s, d) => s + d.income,  0);
  const totalExpense = dailyPoints.reduce((s, d) => s + d.expense, 0);

  const incCatPoints: CategoryPoint[] = Object.entries(incByCat)
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const expCatPoints: CategoryPoint[] = Object.entries(expByCat)
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const modePoints: CategoryPoint[] = Object.entries(modeMap)
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Day of week — from dailyPoints income
  const dowMap: Record<number, { total: number; count: number }> = {};
  for (let i = 0; i < 7; i++) dowMap[i] = { total: 0, count: 0 };
  for (const d of dailyPoints) {
    if (d.income === 0) continue;
    const dow = (new Date(d.date + 'T12:00:00').getDay() + 6) % 7;
    dowMap[dow].total += d.income;
    dowMap[dow].count++;
  }
  const dowPoints: CategoryPoint[] = DOW_LABELS.map((name, i) => ({
    name,
    value: dowMap[i].count > 0 ? Math.round(dowMap[i].total / dowMap[i].count) : 0
  }));

  // Key metrics
  const bestDay = dailyPoints.reduce<DailyPoint | null>(
    (best, d) => (!best || d.income > best.income ? d : best), null
  );
  const uniqueDays = dailyPoints.filter(d => d.income > 0 || d.expense > 0).length || 1;
  const avgDailyIncome  = totalIncome  / uniqueDays;
  const avgDailyExpense = totalExpense / uniqueDays;
  const cashTotal    = dailyPoints.reduce((s, d) => s + d.cash, 0);
  const upiTotal     = dailyPoints.reduce((s, d) => s + d.upi,  0);
  const cardTotal    = dailyPoints.reduce((s, d) => s + d.card, 0);
  const digitalTotal = upiTotal + cardTotal;

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today',      label: 'Today'      },
    { key: 'week',       label: 'This Week'  },
    { key: 'month',      label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'custom',     label: 'Custom'     }
  ];

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 py-6">
      <div className="grid gap-4 xl:grid-cols-[288px_1fr]">
        <Sidebar active="/analytics" />

        <section className="space-y-6 pb-24">
          {/* header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-600">Insights</p>
              <h1 className="text-3xl font-semibold text-slate-900">Financial Analytics</h1>
            </div>
          </div>

          {/* period picker */}
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  period === p.key
                    ? 'bg-brand-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex flex-wrap gap-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-500">From</span>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">To</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
          )}

          {/* key metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Best income day',      value: bestDay ? `${bestDay.date} (${formatINR(bestDay.income)})` : '—' },
              { label: 'Avg daily income',     value: loading ? '—' : formatINR(avgDailyIncome) },
              { label: 'Avg daily expense',    value: loading ? '—' : formatINR(avgDailyExpense) },
              { label: 'Cash : Digital ratio', value: loading ? '—' : `${cashTotal + digitalTotal > 0 ? Math.round(cashTotal / (cashTotal + digitalTotal) * 100) : 0}% Cash` }
            ].map(m => (
              <div key={m.label} className="card">
                <p className="text-xs font-medium text-slate-500">{m.label}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 break-words">{m.value}</p>
              </div>
            ))}
          </div>

          {/* totals */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card border-l-4 border-l-green-400">
              <p className="text-sm text-slate-500">Total Income</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{loading ? '—' : formatINR(totalIncome)}</p>
            </div>
            <div className="card border-l-4 border-l-red-400">
              <p className="text-sm text-slate-500">Total Expense</p>
              <p className="mt-1 text-2xl font-bold text-red-500">{loading ? '—' : formatINR(totalExpense)}</p>
            </div>
            <div className="card border-l-4 border-l-brand-500">
              <p className="text-sm text-slate-500">Net Balance</p>
              <p className={`mt-1 text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
                {loading ? '—' : formatINR(totalIncome - totalExpense)}
              </p>
            </div>
          </div>

          {/* charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <p className="text-sm text-slate-500">Daily trend</p>
              <h3 className="font-semibold text-slate-900">Income vs Expense</h3>
              <div className="mt-4">
                {loading ? <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100" /> : <IncomeExpenseBarChart data={dailyPoints} />}
              </div>
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">Net balance</p>
              <h3 className="font-semibold text-slate-900">Daily trend</h3>
              <div className="mt-4">
                {loading ? <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100" /> : <NetTrendChart data={dailyPoints} />}
              </div>
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">Income by category</p>
              <h3 className="font-semibold text-slate-900">Income breakdown</h3>
              <div className="mt-4">
                {loading ? <div className="h-[220px] animate-pulse rounded-2xl bg-slate-100" /> : <CategoryBarChart data={incCatPoints} />}
              </div>
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">Expense by category</p>
              <h3 className="font-semibold text-slate-900">Expense breakdown</h3>
              <div className="mt-4">
                {loading ? <div className="h-[220px] animate-pulse rounded-2xl bg-slate-100" /> : <CategoryBarChart data={expCatPoints} />}
              </div>
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">Payment modes</p>
              <h3 className="font-semibold text-slate-900">Cash vs Digital</h3>
              <div className="mt-4">
                {loading ? <div className="h-[220px] animate-pulse rounded-2xl bg-slate-100" /> : <PaymentModeChart data={modePoints} />}
              </div>
            </div>
            <div className="card">
              <p className="text-sm text-slate-500">Avg income by day of week</p>
              <h3 className="font-semibold text-slate-900">Day-of-week analysis</h3>
              <div className="mt-4">
                {loading ? <div className="h-[220px] animate-pulse rounded-2xl bg-slate-100" /> : <DayOfWeekChart data={dowPoints} />}
              </div>
            </div>
          </div>
        </section>
      </div>

      <BottomNav active="/analytics" />
    </div>
  );
}
