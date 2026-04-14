'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet,
  Banknote, Smartphone, RefreshCw
} from 'lucide-react';
import { SummaryCard } from '@/components/SummaryCard';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { DateSummaryTable } from '@/components/DateSummaryTable';
import {
  NetTrendChart,
  IncomeExpenseBarChart,
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

export default function DashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

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

  const today    = data?.today;
  const month    = data?.month;
  const daily    = data?.dailyBreakdown ?? [];
  const incCats  = toPoints(data?.monthIncomeByCategory  ?? {});
  const expCats  = toPoints(data?.monthExpenseByCategory ?? {});

  // Date-wise summary table rows (latest 14 days, non-zero or all)
  const tableRows = [...daily].reverse().slice(0, 14).map(d => ({
    date:    d.date,
    income:  d.income,
    expense: d.expense,
    net:     d.net,
    cash:    d.cash,
    upi:     d.upi,
    card:    d.card,
    count:   d.count
  }));

  return (
    <div className="w-full px-4 py-6">
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

          {/* ── today summary cards ── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Today</p>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-28 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 animate-fadeIn">
                <SummaryCard title="Total Income"    amount={formatINR(today?.income  ?? 0)} subtitle={`${today?.count ?? 0} entries`} icon={TrendingUp}   color="green"  />
                <SummaryCard title="Total Expense"   amount={formatINR(today?.expense ?? 0)} subtitle="Today"             icon={TrendingDown} color="red"    />
                <SummaryCard title="Net Balance"     amount={formatINR(today?.net     ?? 0)} subtitle="Income − Expense"  icon={Wallet}       color="blue"   />
                <SummaryCard title="Cash Collected"  amount={formatINR(today?.cash    ?? 0)} subtitle="Cash transactions" icon={Banknote}     color="slate"  />
                <SummaryCard title="UPI Collected"   amount={formatINR(today?.upi     ?? 0)} subtitle="UPI transactions"  icon={Smartphone}   color="purple" />
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
                <div className="flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Income</p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-green-700">{formatINR(month?.income ?? 0)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-300" />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Expense</p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-red-600">{formatINR(month?.expense ?? 0)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-300" />
                </div>
                <div className={`flex items-center justify-between rounded-2xl border p-5 shadow-sm ${(month?.net ?? 0) >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${(month?.net ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Net Balance</p>
                    <p className={`mt-1.5 text-2xl font-bold tabular-nums ${(month?.net ?? 0) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatINR(month?.net ?? 0)}</p>
                  </div>
                  <Wallet className={`h-8 w-8 ${(month?.net ?? 0) >= 0 ? 'text-blue-300' : 'text-red-300'}`} />
                </div>
              </div>
            )}
          </div>

          {/* ── charts row 1 ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <p className="text-sm text-slate-500">30-day trend</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Net Balance</h2>
              <div className="mt-4">
                {loading ? (
                  <div className="skeleton h-[260px]" />
                ) : (
                  <NetTrendChart data={daily} />
                )}
              </div>
            </div>

            <div className="card">
              <p className="text-sm text-slate-500">Last 14 days</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Income vs Expense</h2>
              <div className="mt-4">
                {loading ? (
                  <div className="skeleton h-[260px]" />
                ) : (
                  <IncomeExpenseBarChart data={daily} />
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
                {loading ? (
                  <div className="skeleton h-[260px]" />
                ) : (
                  <CategoryDonut data={incCats} emptyLabel="No income entries this month" />
                )}
              </div>
            </div>

            <div className="card">
              <p className="text-sm text-slate-500">This month</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Expense Breakdown</h2>
              <div className="mt-4">
                {loading ? (
                  <div className="skeleton h-[260px]" />
                ) : (
                  <CategoryDonut data={expCats} emptyLabel="No expense entries this month" />
                )}
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
