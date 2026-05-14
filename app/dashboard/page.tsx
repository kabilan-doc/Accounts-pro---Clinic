'use client';

import { useEffect, useState, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Wallet,
  Banknote, Smartphone, RefreshCw,
  ArrowUpRight, ArrowDownRight, Target, BarChart2, LineChart as LineChartIcon,
  Flag, Pencil, Check
} from 'lucide-react';
import { SummaryCard } from '@/components/SummaryCard';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { DateSummaryTable } from '@/components/DateSummaryTable';
import {
  NetTrendChart,
  IncomeExpenseBarChart,
  IncomeExpenseCumulativeChart,
  CategoryDonut,
  type DailyPoint,
  type CategoryPoint
} from '@/components/AccountCharts';
import { formatINR } from '@/lib/formatCurrency';

interface DashboardData {
  today:  { income: number; expense: number; net: number; cash: number; upi: number; card: number; count: number };
  week:   { income: number; expense: number; net: number };
  month:  { income: number; expense: number; net: number };
  dailyBreakdown: DailyPoint[];
  monthIncomeByCategory:  Record<string, number>;
  monthExpenseByCategory: Record<string, number>;
}

function toPoints(obj: Record<string, number>): CategoryPoint[] {
  return Object.entries(obj)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function WoWBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function DashboardPage() {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [chartMode, setChartMode] = useState<'bar' | 'cumulative'>('bar');

  // ── Monthly Target ──────────────────────────────────────────────────────────
  const targetKey = `monthly_target_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [target,      setTarget]      = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem(targetKey) ?? '0');
  });
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput,   setTargetInput]   = useState('');
  const targetInputRef = useRef<HTMLInputElement>(null);

  const saveTarget = () => {
    const v = Number(targetInput.replace(/[^0-9.]/g, ''));
    if (!isNaN(v) && v > 0) {
      localStorage.setItem(targetKey, String(v));
      setTarget(v);
    }
    setEditingTarget(false);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard data');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const today   = data?.today;
  const month   = data?.month;
  const daily   = data?.dailyBreakdown ?? [];
  const incCats = toPoints(data?.monthIncomeByCategory  ?? {});
  const expCats = toPoints(data?.monthExpenseByCategory ?? {});

  // Table rows — latest 14 days, most-recent first
  const tableRows = [...daily].reverse().slice(0, 14).map(d => ({
    date: d.date, income: d.income, expense: d.expense, net: d.net,
    cash: d.cash, upi: d.upi, card: d.card, count: d.count
  }));

  // ── WoW growth ─────────────────────────────────────────────────────────────
  const thisWeekInc  = daily.slice(-7).reduce((s, d) => s + d.income,  0);
  const lastWeekInc  = daily.slice(-14, -7).reduce((s, d) => s + d.income,  0);
  const thisWeekExp  = daily.slice(-7).reduce((s, d) => s + d.expense, 0);
  const lastWeekExp  = daily.slice(-14, -7).reduce((s, d) => s + d.expense, 0);
  const wowIncPct    = lastWeekInc > 0 ? (thisWeekInc - lastWeekInc) / lastWeekInc * 100 : null;
  const wowExpPct    = lastWeekExp > 0 ? (thisWeekExp - lastWeekExp) / lastWeekExp * 100 : null;

  // ── Projected Income ────────────────────────────────────────────────────────
  const now          = new Date();
  const monthPrefix  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const activeDays   = daily.filter(d => d.income > 0 && d.date.startsWith(monthPrefix)).length;
  const projectedInc = activeDays > 0 ? Math.round((month?.income ?? 0) / activeDays * daysInMonth) : 0;

  const isEmptyToday = !loading && (today?.count ?? 0) === 0 && (today?.income ?? 0) === 0;

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 py-6">
      <div className="grid gap-4 xl:grid-cols-[288px_1fr]">
        <Sidebar active="/dashboard" />

        <section className="animate-fadeIn space-y-6 pb-24">
          {/* ── header ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-600">Overview</p>
              <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── today summary ── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Today</p>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-28 rounded-2xl" />
                ))}
              </div>
            ) : isEmptyToday ? (
              <div className="animate-fadeIn rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-sm px-6 py-8 text-center">
                <p className="text-2xl mb-1">☀️</p>
                <p className="text-base font-semibold text-slate-700">Start your day</p>
                <p className="mt-1 text-sm text-slate-400">No entries recorded yet for today. Add your first transaction to see the summary.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 animate-fadeIn">
                <SummaryCard title="Total Income"   amount={formatINR(today?.income  ?? 0)} subtitle={`${today?.count ?? 0} entries`} icon={TrendingUp}   color="green"  />
                <SummaryCard title="Total Expense"  amount={formatINR(today?.expense ?? 0)} subtitle="Today"             icon={TrendingDown} color="red"    />
                <SummaryCard title="Net Balance"    amount={formatINR(today?.net     ?? 0)} subtitle="Income − Expense"  icon={Wallet}       color="blue"   />
                <SummaryCard title="Cash Collected" amount={formatINR(today?.cash    ?? 0)} subtitle="Cash transactions" icon={Banknote}     color="slate"  />
                <SummaryCard title="UPI Collected"  amount={formatINR(today?.upi     ?? 0)} subtitle="UPI transactions"  icon={Smartphone}   color="purple" />
              </div>
            )}
          </div>

          {/* ── this month cards ── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">This Month</p>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-24 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3 animate-fadeIn">
                {/* Income */}
                <div className="flex items-center justify-between rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white/90 backdrop-blur-sm p-5 shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Income</p>
                      <WoWBadge pct={wowIncPct} />
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-green-700 font-mono">{formatINR(month?.income ?? 0)}</p>
                    <p className="mt-1 text-[11px] text-green-500">WoW vs last 7 days</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-300" />
                </div>

                {/* Expense */}
                <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white/90 backdrop-blur-sm p-5 shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Expense</p>
                      <WoWBadge pct={wowExpPct} />
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-red-600 font-mono">{formatINR(month?.expense ?? 0)}</p>
                    <p className="mt-1 text-[11px] text-red-400">WoW vs last 7 days</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-300" />
                </div>

                {/* Net Balance */}
                <div className={`flex items-center justify-between rounded-2xl border p-5 shadow-sm backdrop-blur-sm ${(month?.net ?? 0) >= 0 ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white/90' : 'border-red-200 bg-gradient-to-br from-red-50 to-white/90'}`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${(month?.net ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Net Balance</p>
                    <p className={`text-2xl font-bold tabular-nums font-mono ${(month?.net ?? 0) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatINR(month?.net ?? 0)}</p>
                    <p className={`mt-1 text-[11px] ${(month?.net ?? 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>Income − Expense</p>
                  </div>
                  <Wallet className={`h-8 w-8 ${(month?.net ?? 0) >= 0 ? 'text-blue-300' : 'text-red-300'}`} />
                </div>
              </div>
            )}
          </div>

          {/* ── monthly target tracker ── */}
          {!loading && (
            <div className="animate-fadeIn rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-sm px-5 py-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Flag size={15} className="text-brand-600" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Monthly Revenue Target</p>
                </div>
                {!editingTarget ? (
                  <button
                    type="button"
                    onClick={() => { setTargetInput(target > 0 ? String(target) : ''); setEditingTarget(true); setTimeout(() => targetInputRef.current?.focus(), 50); }}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                  >
                    <Pencil size={11} /> {target > 0 ? 'Edit' : 'Set goal'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      ref={targetInputRef}
                      type="number"
                      value={targetInput}
                      onChange={e => setTargetInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditingTarget(false); }}
                      placeholder="Enter target amount"
                      className="w-36 rounded-xl border border-brand-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                    <button type="button" onClick={saveTarget} className="rounded-xl bg-brand-600 p-1.5 text-white hover:bg-brand-700">
                      <Check size={13} />
                    </button>
                  </div>
                )}
              </div>

              {target > 0 ? (() => {
                const income    = month?.income ?? 0;
                const pct       = Math.min(100, Math.round(income / target * 100));
                const remaining = Math.max(0, target - income);
                const over      = income > target;
                const barColor  = over ? 'bg-green-500' : pct >= 70 ? 'bg-brand-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
                return (
                  <div>
                    <div className="flex items-end justify-between mb-1.5 text-xs text-slate-500">
                      <span><span className="font-bold text-slate-800 text-sm font-mono">{pct}%</span> of goal reached</span>
                      <span>{over ? <span className="text-green-600 font-semibold">Goal exceeded! 🎉</span> : `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(remaining)} remaining`}</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                      <span>₹0</span>
                      <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(target)}</span>
                    </div>
                  </div>
                );
              })() : (
                <p className="text-sm text-slate-400">Set a monthly revenue goal to track your progress here.</p>
              )}
            </div>
          )}

          {/* ── financial insights ── */}
          {!loading && activeDays > 0 && (
            <div className="animate-fadeIn rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white/90 backdrop-blur-sm shadow-sm px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={15} className="text-amber-600" />
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Financial Insights</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Projected Income</p>
                  <p className="text-base font-bold font-mono text-slate-800">{formatINR(projectedInc)}</p>
                  <p className="text-[10px] text-slate-400">at current avg × {daysInMonth} days</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Daily Avg Income</p>
                  <p className="text-base font-bold font-mono text-slate-800">{formatINR(activeDays > 0 ? Math.round((month?.income ?? 0) / activeDays) : 0)}</p>
                  <p className="text-[10px] text-slate-400">over {activeDays} active day{activeDays !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Expense Ratio</p>
                  <p className={`text-base font-bold font-mono ${(month?.income ?? 0) > 0 && ((month?.expense ?? 0) / (month?.income ?? 1)) > 0.4 ? 'text-red-600' : 'text-slate-800'}`}>
                    {(month?.income ?? 0) > 0 ? (((month?.expense ?? 0) / (month?.income ?? 1)) * 100).toFixed(1) : '0.0'}%
                  </p>
                  <p className="text-[10px] text-slate-400">expense ÷ income</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">This Week Inc</p>
                  <p className="text-base font-bold font-mono text-slate-800">{formatINR(thisWeekInc)}</p>
                  <p className="text-[10px] text-slate-400">last 7 days</p>
                </div>
              </div>
            </div>
          )}

          {/* ── charts row 1 ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <p className="text-sm text-slate-500">30-day trend</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Net Balance</h2>
              <div className="mt-4">
                {loading ? <div className="skeleton h-[260px]" /> : <NetTrendChart data={daily} />}
              </div>
            </div>

            <div className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-slate-500">Last 14 days</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Income vs Expense</h2>
                </div>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs mt-1">
                  <button
                    onClick={() => setChartMode('bar')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 font-medium transition-colors ${chartMode === 'bar' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    <BarChart2 size={12} /> Bar
                  </button>
                  <button
                    onClick={() => setChartMode('cumulative')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 font-medium transition-colors ${chartMode === 'cumulative' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    <LineChartIcon size={12} /> Cumulative
                  </button>
                </div>
              </div>
              <div className="mt-4">
                {loading ? (
                  <div className="skeleton h-[260px]" />
                ) : chartMode === 'bar' ? (
                  <IncomeExpenseBarChart data={daily} />
                ) : (
                  <IncomeExpenseCumulativeChart data={daily} />
                )}
              </div>
            </div>
          </div>

          {/* ── charts row 2 ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <p className="text-sm text-slate-500">This month</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Income Breakdown</h2>
              <div className="mt-4">
                {loading ? <div className="skeleton h-[260px]" /> : <CategoryDonut data={incCats} emptyLabel="No income entries this month" />}
              </div>
            </div>

            <div className="card">
              <p className="text-sm text-slate-500">This month</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Expense Breakdown</h2>
              <div className="mt-4">
                {loading ? <div className="skeleton h-[260px]" /> : <CategoryDonut data={expCats} emptyLabel="No expense entries this month" />}
              </div>
            </div>
          </div>

          {/* ── date-wise summary table ── */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Summary Table</p>
              <h2 className="text-lg font-semibold text-slate-900">Date-wise Totals (last 14 days)</h2>
            </div>
            {loading ? (
              <div className="skeleton h-40" />
            ) : (
              <DateSummaryTable rows={tableRows} />
            )}
          </div>
        </section>
      </div>

      <BottomNav active="/dashboard" />
    </div>
  );
}
