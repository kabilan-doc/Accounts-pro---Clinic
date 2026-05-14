'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, TrendingUp, TrendingDown, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import {
  NetTrendChart,
  IncomeExpenseBarChart,
  CategoryDonut,
  PaymentModeChart,
  DayOfWeekChart,
  CashDigitalRing,
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

// ── Chart card wrapper with subtle gradient ───────────────────────────────────
function ChartCard({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/70 to-white shadow-sm p-5">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <h3 className="mt-0.5 font-semibold text-slate-800">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

// ── Trend badge ───────────────────────────────────────────────────────────────
function TrendBadge({ pct, label = 'vs prior half' }: { pct: number | null; label?: string }) {
  if (pct === null) return <span className="text-[11px] text-slate-400">Not enough data</span>;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(pct).toFixed(1)}% {label}
    </span>
  );
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
    setLoading(true); setError('');
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

  // ── Derived totals ───────────────────────────────────────────────────────────
  const totalIncome  = dailyPoints.reduce((s, d) => s + d.income,  0);
  const totalExpense = dailyPoints.reduce((s, d) => s + d.expense, 0);
  const netBalance   = totalIncome - totalExpense;
  const margin       = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  const incCatPoints: CategoryPoint[] = Object.entries(incByCat)
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const expCatPoints: CategoryPoint[] = Object.entries(expByCat)
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const modePoints: CategoryPoint[] = Object.entries(modeMap)
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const uniqueDays       = dailyPoints.filter(d => d.income > 0 || d.expense > 0).length || 1;
  const avgDailyIncome   = totalIncome  / uniqueDays;
  const avgDailyExpense  = totalExpense / uniqueDays;

  // ── Best day ─────────────────────────────────────────────────────────────────
  const bestDay = dailyPoints.reduce<DailyPoint | null>(
    (best, d) => (!best || d.income > best.income ? d : best), null
  );

  // ── Period-trend comparison (2nd half vs 1st half) ───────────────────────────
  const mid          = Math.floor(dailyPoints.length / 2);
  const firstHalf    = dailyPoints.slice(0, mid);
  const secondHalf   = dailyPoints.slice(mid);
  const fhAvgInc     = firstHalf.length  ? firstHalf.reduce((s, d)  => s + d.income,  0) / firstHalf.length  : 0;
  const shAvgInc     = secondHalf.length ? secondHalf.reduce((s, d) => s + d.income,  0) / secondHalf.length : 0;
  const fhAvgExp     = firstHalf.length  ? firstHalf.reduce((s, d)  => s + d.expense, 0) / firstHalf.length  : 0;
  const shAvgExp     = secondHalf.length ? secondHalf.reduce((s, d) => s + d.expense, 0) / secondHalf.length : 0;
  const incTrend     = fhAvgInc > 0 && firstHalf.length > 2 ? (shAvgInc - fhAvgInc) / fhAvgInc * 100 : null;
  const expTrend     = fhAvgExp > 0 && firstHalf.length > 2 ? (shAvgExp - fhAvgExp) / fhAvgExp * 100 : null;

  // ── Payment split ────────────────────────────────────────────────────────────
  const cashTotal    = dailyPoints.reduce((s, d) => s + d.cash, 0);
  const upiTotal     = dailyPoints.reduce((s, d) => s + d.upi,  0);
  const cardTotal    = dailyPoints.reduce((s, d) => s + d.card, 0);
  const digitalTotal = upiTotal + cardTotal;
  const grandTotal   = cashTotal + digitalTotal;
  const cashPct      = grandTotal > 0 ? Math.round(cashTotal / grandTotal * 100) : 50;

  // ── Day-of-week ──────────────────────────────────────────────────────────────
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

  // Day-of-week insight
  const bestDow  = dowPoints.reduce((b, d) => d.value > b.value ? d : b, dowPoints[0]);
  const worstDow = dowPoints.filter(d => d.value > 0).reduce((w, d) => d.value < w.value ? d : w, dowPoints.find(d => d.value > 0) ?? dowPoints[0]);
  const dowGap   = bestDow && worstDow && bestDow.value > 0 && worstDow.value > 0
    ? Math.round((1 - worstDow.value / bestDow.value) * 100)
    : null;

  // ── Synced chart data (same 14-day slice for both trend charts) ───────────────
  const syncData = dailyPoints.slice(-14);

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today',      label: 'Today'      },
    { key: 'week',       label: 'This Week'  },
    { key: 'month',      label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'custom',     label: 'Custom Range' }
  ];

  const Skeleton = ({ h }: { h: string }) => (
    <div className={`${h} animate-pulse rounded-2xl bg-slate-100`} />
  );

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 py-6">
      <div className="grid gap-4 xl:grid-cols-[288px_1fr]">
        <Sidebar active="/analytics" />

        <section className="space-y-6 pb-24">

          {/* ── Header ── */}
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-600">Insights</p>
            <h1 className="text-3xl font-semibold text-slate-900">Financial Analytics</h1>
          </div>

          {/* ── Period picker ── */}
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  period === p.key
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p.key === 'custom' && <Calendar size={13} className="inline mr-1.5 mb-0.5" />}
                {p.label}
              </button>
            ))}
          </div>

          {/* ── Custom Range Picker ── */}
          {period === 'custom' && (
            <div className="rounded-2xl border border-brand-200/60 bg-gradient-to-r from-brand-50/60 to-white shadow-sm p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3 flex items-center gap-1.5">
                <Calendar size={13} /> Select Date Range
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <label className="block flex-1 min-w-[140px]">
                  <span className="text-xs font-medium text-slate-500">From</span>
                  <div className="relative mt-1">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={customStart}
                      onChange={e => setCustomStart(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </label>
                <span className="text-slate-400 font-bold mb-2.5">→</span>
                <label className="block flex-1 min-w-[140px]">
                  <span className="text-xs font-medium text-slate-500">To</span>
                  <div className="relative mt-1">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={customEnd}
                      onChange={e => setCustomEnd(e.target.value)}
                      min={customStart}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </label>
                {customStart && customEnd && (
                  <p className="text-xs text-slate-500 mb-2.5 self-end">
                    {Math.round((new Date(customEnd).getTime() - new Date(customStart).getTime()) / 86400000) + 1} days selected
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
          )}

          {/* ── KPI Cards ── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Key Metrics</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {/* Best Income Day */}
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-amber-50/60 to-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Best Income Day</p>
                  <Zap size={16} className="text-amber-400" />
                </div>
                {loading ? <Skeleton h="h-12 mt-2" /> : bestDay ? (
                  <>
                    <p className="mt-2 text-xl font-bold font-mono text-slate-800">{formatINR(bestDay.income)}</p>
                    <p className="mt-1 text-xs text-slate-500 font-mono">{bestDay.date}</p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">—</p>
                )}
              </div>

              {/* Avg Daily Income */}
              <div className="rounded-2xl border border-green-200/80 bg-gradient-to-br from-green-50/60 to-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Avg Daily Income</p>
                  <TrendingUp size={16} className="text-green-400" />
                </div>
                {loading ? <Skeleton h="h-12 mt-2" /> : (
                  <>
                    <p className="mt-2 text-xl font-bold font-mono text-green-700">{formatINR(avgDailyIncome)}</p>
                    <div className="mt-1">
                      <TrendBadge pct={incTrend} label="period momentum" />
                    </div>
                  </>
                )}
              </div>

              {/* Avg Daily Expense */}
              <div className="rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50/60 to-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Avg Daily Expense</p>
                  <TrendingDown size={16} className="text-red-400" />
                </div>
                {loading ? <Skeleton h="h-12 mt-2" /> : (
                  <>
                    <p className="mt-2 text-xl font-bold font-mono text-red-600">{formatINR(avgDailyExpense)}</p>
                    <div className="mt-1">
                      <TrendBadge pct={expTrend} label="period momentum" />
                    </div>
                  </>
                )}
              </div>

              {/* Cash : Digital Ring */}
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-blue-50/40 to-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-3">Cash vs Digital</p>
                {loading ? <Skeleton h="h-12" /> : (
                  <CashDigitalRing cashPct={cashPct} />
                )}
              </div>
            </div>
          </div>

          {/* ── Totals ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-l-4 border-l-green-400 border-slate-200/80 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Income</p>
              <p className="mt-1 text-2xl font-bold font-mono text-green-600">{loading ? '—' : formatINR(totalIncome)}</p>
            </div>
            <div className="rounded-2xl border border-l-4 border-l-red-400 border-slate-200/80 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Expense</p>
              <p className="mt-1 text-2xl font-bold font-mono text-red-500">{loading ? '—' : formatINR(totalExpense)}</p>
            </div>
            <div className={`rounded-2xl border border-l-4 border-slate-200/80 bg-white px-5 py-4 shadow-sm ${netBalance >= 0 ? 'border-l-blue-500' : 'border-l-red-500'}`}>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Net Balance</p>
              <p className={`mt-1 text-2xl font-bold font-mono ${netBalance >= 0 ? 'text-blue-700' : 'text-red-500'}`}>
                {loading ? '—' : formatINR(netBalance)}
              </p>
            </div>
            <div className={`rounded-2xl border border-l-4 border-slate-200/80 bg-white px-5 py-4 shadow-sm ${
              !loading && totalIncome > 0
                ? margin >= 50 ? 'border-l-green-500' : margin >= 20 ? 'border-l-amber-400' : 'border-l-red-400'
                : 'border-l-slate-300'
            }`}>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Profit Margin</p>
              {loading || totalIncome === 0 ? (
                <p className="mt-1 text-2xl font-bold text-slate-400">—</p>
              ) : (
                <>
                  <p className={`mt-1 text-2xl font-bold font-mono ${margin >= 50 ? 'text-green-600' : margin >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                    {margin.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">(Income − Expense) ÷ Income</p>
                </>
              )}
            </div>
          </div>

          {/* ── Charts Row 1: Synced pair ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard label="Last 14 days — hover to compare" title="Income vs Expense">
              {loading ? <Skeleton h="h-[260px]" /> : <IncomeExpenseBarChart data={syncData} syncId="analytics-sync" maxDays={14} />}
            </ChartCard>
            <ChartCard label="Net balance — dashed red = break-even" title="Daily Net Trend">
              {loading ? <Skeleton h="h-[260px]" /> : <NetTrendChart data={syncData} syncId="analytics-sync" />}
            </ChartCard>
          </div>

          {/* ── Charts Row 2: Category Donuts ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard label="This period — share of income sources" title="Income Breakdown">
              {loading ? <Skeleton h="h-[260px]" /> : <CategoryDonut data={incCatPoints} emptyLabel="No income entries this period" />}
            </ChartCard>
            <ChartCard label="This period — share of expense categories" title="Expense Breakdown">
              {loading ? <Skeleton h="h-[260px]" /> : <CategoryDonut data={expCatPoints} emptyLabel="No expense entries this period" />}
            </ChartCard>
          </div>

          {/* ── Charts Row 3: Payment Mode + Day of Week ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard label="Income by payment method" title="Cash vs Digital Breakdown">
              {loading ? <Skeleton h="h-[220px]" /> : <PaymentModeChart data={modePoints} />}
            </ChartCard>
            <div>
              <ChartCard label="Avg daily income by day — darker = higher" title="Day-of-Week Performance">
                {loading ? <Skeleton h="h-[220px]" /> : <DayOfWeekChart data={dowPoints} />}
              </ChartCard>
              {/* Day-of-week insight */}
              {!loading && dowGap !== null && dowGap > 10 && (
                <div className="mt-3 rounded-2xl border border-blue-200/60 bg-gradient-to-r from-blue-50/60 to-white px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">Insight</p>
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">{bestDow?.name}</span> is your strongest day ({formatINR(bestDow?.value ?? 0)} avg).{' '}
                    <span className="font-semibold">{worstDow?.name}</span> earns{' '}
                    <span className="text-red-500 font-semibold">{dowGap}% less</span> — consider adjusting hours or running a promotion on that day.
                  </p>
                </div>
              )}
            </div>
          </div>

        </section>
      </div>

      <BottomNav active="/analytics" />
    </div>
  );
}
