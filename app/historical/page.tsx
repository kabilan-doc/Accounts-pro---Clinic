'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Download, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { formatINR } from '@/lib/formatCurrency';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

// ── constants ──────────────────────────────────────────────────────────────────
const MONTHS = [
  'April','May','June','July','August','September',
  'October','November','December','January','February','March'
];
// Actual calendar month numbers (April = 4, not 1)
const MONTH_NUMS: Record<string, number> = {
  April:4, May:5, June:6, July:7, August:8, September:9,
  October:10, November:11, December:12, January:1, February:2, March:3
};
// Indian financial years:
// FY2025 = Apr 2025 – Mar 2026  (Apr–Dec → year=2025, Jan–Mar → year=2026)
// FY2026 = Apr 2026 – Mar 2027  (ongoing)
function fyMonthDate(fy: number, month: string): { start: string; end: string } {
  const m = MONTH_NUMS[month];
  // Apr(4)–Dec(12) are in the first calendar year of the FY;
  // Jan(1)–Mar(3) are in the second calendar year (fy + 1).
  const y = m >= 4 ? fy : fy + 1;
  // Last day of this calendar month
  const lastDay = new Date(y, m, 0).getDate(); // day 0 of month m+1 = last day of month m
  return {
    start: `${y}-${String(m).padStart(2,'0')}-01`,
    end:   `${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
  };
}

// ── types ──────────────────────────────────────────────────────────────────────
interface MonthStats {
  month: string;
  fy: number;
  income: number;
  expense: number;
  net: number;
  cash: number;
  upi: number;
  entries: number;
  consultation: number;
  pharmacy: number;
  procedure: number;
  other: number;
}

// ── helpers ────────────────────────────────────────────────────────────────────
async function fetchMonthStats(fy: number, month: string): Promise<MonthStats> {
  const { start, end } = fyMonthDate(fy, month);
  const empty = { month, fy, income:0, expense:0, net:0, cash:0, upi:0, entries:0, consultation:0, pharmacy:0, procedure:0, other:0 };

  // FY2025 (Apr 2025–Mar 2026): read from daily_accounts
  if (fy === 2025) {
    const res = await fetch(`/api/accounts/monthly-stats?start=${start}&end=${end}`);
    if (!res.ok) return empty;
    const d = await res.json();
    return { month, fy, ...d };
  }

  // FY2026+: read from account_entries
  const res = await fetch(`/api/entries?start_date=${start}&end_date=${end.substring(0,10)}&page=1`);
  if (!res.ok) return empty;

  const data = await res.json();
  let allEntries = [...(data.entries ?? [])];
  const total = data.count ?? 0;
  const pages = Math.ceil(total / 20);
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        fetch(`/api/entries?start_date=${start}&end_date=${end.substring(0,10)}&page=${i+2}`)
          .then(r => r.json()).then(d => d.entries ?? [])
      )
    );
    rest.forEach(pg => allEntries.push(...pg));
  }

  const active = allEntries.filter((e: { is_voided: boolean }) => !e.is_voided);
  const inc  = active.filter((e: { entry_type: string }) => e.entry_type === 'income');
  const exp  = active.filter((e: { entry_type: string }) => e.entry_type === 'expense');
  const s    = (arr: { amount: number | string }[]) => arr.reduce((x, e) => x + Number(e.amount), 0);

  return {
    month, fy,
    income:  s(inc),
    expense: s(exp),
    net:     s(inc) - s(exp),
    cash:    s(active.filter((e: { payment_mode: string }) => e.payment_mode === 'Cash')),
    upi:     s(active.filter((e: { payment_mode: string }) => e.payment_mode === 'UPI')),
    entries: active.length,
    consultation: s(inc.filter((e: { category: string }) => e.category === 'Consultation')),
    pharmacy:     s(inc.filter((e: { category: string }) => e.category === 'Pharmacy Sales')),
    procedure:    s(inc.filter((e: { category: string }) => e.category === 'Procedure')),
    other:        s(inc.filter((e: { category: string }) => e.category === 'Other Income')),
  };
}

interface DayStats {
  date: string;
  income: number;
  expense: number;
  net: number;
  cash: number;
  upi: number;
  consultation: number;
  pharmacy: number;
  procedure: number;
  other: number;
}

async function fetchDayStats(start: string, end: string): Promise<DayStats[]> {
  // fetch all entries for the month
  let all: any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`/api/entries?start_date=${start}&end_date=${end}&page=${page}`);
    if (!res.ok) break;
    const data = await res.json();
    all = all.concat(data.entries ?? []);
    if (all.length >= (data.count ?? 0)) break;
    page++;
  }

  // group by date
  const byDate: Record<string, any[]> = {};
  for (const e of all) {
    if (e.is_voided) continue;
    if (!byDate[e.entry_date]) byDate[e.entry_date] = [];
    byDate[e.entry_date].push(e);
  }

  const s = (arr: any[]) => arr.reduce((x, e) => x + Number(e.amount), 0);

  return Object.keys(byDate).sort().map(date => {
    const entries = byDate[date];
    const inc = entries.filter((e: any) => e.entry_type === 'income');
    const exp = entries.filter((e: any) => e.entry_type === 'expense');
    return {
      date,
      income:       s(inc),
      expense:      s(exp),
      net:          s(inc) - s(exp),
      cash:         s(entries.filter((e: any) => e.payment_mode === 'Cash'  && e.entry_type === 'income')),
      upi:          s(entries.filter((e: any) => e.payment_mode === 'UPI'   && e.entry_type === 'income')),
      consultation: s(inc.filter((e: any) => e.category === 'Consultation')),
      pharmacy:     s(inc.filter((e: any) => e.category === 'Pharmacy Sales')),
      procedure:    s(inc.filter((e: any) => e.category === 'Procedure')),
      other:        s(inc.filter((e: any) => e.category === 'Other Income')),
    };
  });
}

// ── component ──────────────────────────────────────────────────────────────────
export default function HistoricalPage() {
  const [selectedFY,   setSelectedFY]   = useState<'2025' | '2026' | 'both'>('both');
  const [stats2025,    setStats2025]    = useState<MonthStats[]>([]);
  const [stats2026,    setStats2026]    = useState<MonthStats[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // ── drill-down state ────────────────────────────────────────────────────────
  const [expandedKey,  setExpandedKey]  = useState<string | null>(null); // 'FY-Month'
  const [dayData,      setDayData]      = useState<DayStats[]>([]);
  const [dayLoading,   setDayLoading]   = useState(false);

  async function toggleDrillDown(fy: number, month: string, start: string, end: string) {
    const key = `${fy}-${month}`;
    if (expandedKey === key) { setExpandedKey(null); return; }
    setExpandedKey(key);
    setDayData([]);
    setDayLoading(true);
    const days = await fetchDayStats(start, end);
    setDayData(days);
    setDayLoading(false);
  }

  // ── monthly export state ────────────────────────────────────────────────────
  const [exportFY,    setExportFY]    = useState('2025');
  const [exportMonth, setExportMonth] = useState('April');

  const downloadMonth = () => {
    const fy   = Number(exportFY);
    const m    = MONTH_NUMS[exportMonth];
    const year = m >= 4 ? fy : fy + 1;
    window.open(`/api/export/monthly?year=${year}&month=${m}`, '_blank');  // month is now correct calendar month
  };

  // ── load all months for FY2025 and FY2026 ────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s25, s26] = await Promise.all([
        Promise.all(MONTHS.map(m => fetchMonthStats(2025, m))),
        Promise.all(MONTHS.map(m => fetchMonthStats(2026, m)))
      ]);
      setStats2025(s25);
      setStats2026(s26.filter(s => s.income > 0 || s.expense > 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── chart data ────────────────────────────────────────────────────────────────
  const chartData = MONTHS.map(month => {
    const s25 = stats2025.find(s => s.month === month);
    const s26 = stats2026.find(s => s.month === month);
    return {
      month: month.substring(0, 3),
      'FY2025 Income':  s25?.income  ?? 0,
      'FY2025 Expense': s25?.expense ?? 0,
      'FY2026 Income':  s26?.income  ?? 0,
      'FY2026 Expense': s26?.expense ?? 0,
    };
  });

  const netChartData = MONTHS.map(month => {
    const s25 = stats2025.find(s => s.month === month);
    const s26 = stats2026.find(s => s.month === month);
    return {
      month: month.substring(0, 3),
      'FY2025 Net': s25?.net ?? 0,
      'FY2026 Net': s26?.net ?? 0,
    };
  });

  // totals for summary cards
  const totals = (stats: MonthStats[]) => ({
    income:  stats.reduce((s, r) => s + r.income,  0),
    expense: stats.reduce((s, r) => s + r.expense, 0),
    net:     stats.reduce((s, r) => s + r.net,     0),
  });
  const t25 = totals(stats2025);
  const t26 = totals(stats2026);

  const activeStats = selectedFY === 'both'
    ? [...stats2025, ...stats2026]
    : selectedFY === '2025' ? stats2025 : stats2026;

  return (
    <div className="w-full px-4 py-6">
      <div className="grid gap-4 xl:grid-cols-[288px_1fr]">
        <Sidebar active="/historical" />

        <section className="space-y-6 pb-24">
          {/* ── header ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-600">Financial Years</p>
              <h1 className="text-3xl font-semibold text-slate-900">Historical Analytics</h1>
              <p className="mt-1 text-sm text-slate-500">
                Month-wise comparison across FY2025 (Apr 2025–Mar 2026) and FY2026 (Apr 2026–Mar 2027)
              </p>
            </div>
          </div>

          {/* ── FY selector ── */}
          <div className="flex flex-wrap gap-2">
            {(['both','2025','2026'] as const).map(fy => (
              <button key={fy} type="button"
                onClick={() => setSelectedFY(fy)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  selectedFY === fy
                    ? 'bg-brand-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}>
                {fy === 'both' ? 'Both FY' : `FY${fy}`}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
              <p className="mt-1 text-xs">
                Run <code className="rounded bg-red-100 px-1">node scripts/import-historical.mjs</code> to import xlsx data first.
              </p>
            </div>
          )}

          {/* ── FY total cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: 'FY2025 Total Income',  value: t25.income,  icon: TrendingUp,   color: 'text-green-600' },
              { label: 'FY2025 Total Expense', value: t25.expense, icon: TrendingDown, color: 'text-red-500'   },
              { label: 'FY2025 Net',           value: t25.net,     icon: Wallet,       color: 'text-slate-900' },
              { label: 'FY2026 Total Income',  value: t26.income,  icon: TrendingUp,   color: 'text-green-600' },
              { label: 'FY2026 Total Expense', value: t26.expense, icon: TrendingDown, color: 'text-red-500'   },
              { label: 'FY2026 Net',           value: t26.net,     icon: Wallet,       color: 'text-slate-900' },
            ].map(c => (
              <div key={c.label} className="card flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className={`mt-1 text-xl font-semibold ${c.color}`}>
                    {loading ? '—' : formatINR(c.value)}
                  </p>
                </div>
                <c.icon className="h-8 w-8 text-slate-200 shrink-0" />
              </div>
            ))}
          </div>

          {/* ── comparison charts ── */}
          {!loading && (
            <>
              <div className="card">
                <p className="text-sm text-slate-500">Month-wise comparison</p>
                <h3 className="font-semibold text-slate-900">Income vs Expense — FY2025 & FY2026</h3>
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top:5, right:10, left:0, bottom:5 }} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={52} />
                      <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ borderRadius:12, fontSize:13 }} />
                      <Legend />
                      <Bar dataKey="FY2025 Income"  fill="#16a34a" radius={[3,3,0,0]} maxBarSize={20} />
                      <Bar dataKey="FY2025 Expense" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={20} />
                      <Bar dataKey="FY2026 Income"  fill="#2563eb" radius={[3,3,0,0]} maxBarSize={20} />
                      <Bar dataKey="FY2026 Expense" fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <p className="text-sm text-slate-500">Net balance trend</p>
                <h3 className="font-semibold text-slate-900">FY2025 vs FY2026 — Net per Month</h3>
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={netChartData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={52} />
                      <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ borderRadius:12, fontSize:13 }} />
                      <Legend />
                      <Line type="monotone" dataKey="FY2025 Net" stroke="#16a34a" strokeWidth={2.5} dot={{ r:4 }} />
                      <Line type="monotone" dataKey="FY2026 Net" stroke="#2563eb" strokeWidth={2.5} dot={{ r:4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ── month-wise table with drill-down ── */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-slate-900">Month-wise Breakdown <span className="text-xs font-normal text-slate-400 ml-2">Click a month to see daily data</span></h3>

            {loading ? (
              <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-6 px-2 py-3" />
                      <th className="px-4 py-3 text-left font-medium text-slate-600">FY</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Month</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Income</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Expense</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Net</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Consultation</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Pharmacy</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">UPI</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Days</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {MONTHS.flatMap(month => {
                      const rows: React.ReactNode[] = [];
                      const fys: Array<{ fy: number; stats: MonthStats[] }> = [
                        { fy: 2025, stats: stats2025 },
                        { fy: 2026, stats: stats2026 }
                      ];
                      for (const { fy, stats } of fys) {
                        if (selectedFY !== 'both' && String(fy) !== selectedFY) continue;
                        const s = stats.find(x => x.month === month);
                        if (!s) continue;
                        const { start, end } = fyMonthDate(fy, month);
                        const calYear  = Number(start.substring(0, 4));
                        const calMonth = Number(start.substring(5, 7));
                        const key = `${fy}-${month}`;
                        const isOpen = expandedKey === key;

                        rows.push(
                          <tr
                            key={key}
                            onClick={() => toggleDrillDown(fy, month, start, end)}
                            className={`cursor-pointer transition ${isOpen ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                          >
                            <td className="px-2 py-3 text-slate-400">
                              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${fy === 2025 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                FY{fy}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{month}</td>
                            <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatINR(s.income)}</td>
                            <td className="px-4 py-3 text-right text-red-500">{formatINR(s.expense)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${s.net >= 0 ? 'text-slate-900' : 'text-red-500'}`}>{formatINR(s.net)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatINR(s.consultation)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatINR(s.pharmacy)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatINR(s.upi)}</td>
                            <td className="px-4 py-3 text-right text-slate-500">{s.entries}</td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => window.open(`/api/export/monthly?year=${calYear}&month=${calMonth}`, '_blank')}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                              >
                                <Download size={11} /> xlsx
                              </button>
                            </td>
                          </tr>
                        );

                        // ── daily drill-down rows ──
                        if (isOpen) {
                          rows.push(
                            <tr key={`${key}-drilldown`}>
                              <td colSpan={11} className="bg-slate-50 px-0 py-0">
                                {dayLoading ? (
                                  <div className="flex items-center gap-2 px-8 py-4 text-sm text-slate-400">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                                    Loading daily data...
                                  </div>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-200 bg-slate-100 text-slate-500">
                                        <th className="py-2 pl-10 pr-3 text-left font-medium">Date</th>
                                        <th className="py-2 pr-3 text-left font-medium">Day</th>
                                        <th className="py-2 pr-3 text-right font-medium">Income</th>
                                        <th className="py-2 pr-3 text-right font-medium">Expense</th>
                                        <th className="py-2 pr-3 text-right font-medium">Net</th>
                                        <th className="py-2 pr-3 text-right font-medium">Consultation</th>
                                        <th className="py-2 pr-3 text-right font-medium">Pharmacy</th>
                                        <th className="py-2 pr-3 text-right font-medium">Procedure</th>
                                        <th className="py-2 pr-3 text-right font-medium">Other</th>
                                        <th className="py-2 pr-3 text-right font-medium">Cash</th>
                                        <th className="py-2 pr-3 text-right font-medium">UPI</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dayData.map(d => {
                                        const dateObj = new Date(d.date + 'T00:00:00');
                                        const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
                                        const dateLabel = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                                        return (
                                          <tr key={d.date} className="border-b border-slate-100 hover:bg-white">
                                            <td className="py-2 pl-10 pr-3 font-semibold text-slate-700">{dateLabel}</td>
                                            <td className="py-2 pr-3 text-slate-400">{dayName}</td>
                                            <td className="py-2 pr-3 text-right text-green-700 font-medium">{formatINR(d.income)}</td>
                                            <td className="py-2 pr-3 text-right text-red-500">{d.expense > 0 ? formatINR(d.expense) : '—'}</td>
                                            <td className={`py-2 pr-3 text-right font-semibold ${d.net >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatINR(d.net)}</td>
                                            <td className="py-2 pr-3 text-right text-slate-500">{d.consultation > 0 ? formatINR(d.consultation) : '—'}</td>
                                            <td className="py-2 pr-3 text-right text-slate-500">{d.pharmacy > 0 ? formatINR(d.pharmacy) : '—'}</td>
                                            <td className="py-2 pr-3 text-right text-slate-500">{d.procedure > 0 ? formatINR(d.procedure) : '—'}</td>
                                            <td className="py-2 pr-3 text-right text-slate-500">{d.other > 0 ? formatINR(d.other) : '—'}</td>
                                            <td className="py-2 pr-3 text-right text-slate-600">{d.cash > 0 ? formatINR(d.cash) : '—'}</td>
                                            <td className="py-2 pr-3 text-right text-blue-600">{d.upi > 0 ? formatINR(d.upi) : '—'}</td>
                                          </tr>
                                        );
                                      })}
                                      {/* Daily totals row */}
                                      {dayData.length > 0 && (
                                        <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold text-slate-700">
                                          <td className="py-2 pl-10 pr-3" colSpan={2}>Total ({dayData.length} days)</td>
                                          <td className="py-2 pr-3 text-right text-green-700">{formatINR(dayData.reduce((s,d) => s+d.income, 0))}</td>
                                          <td className="py-2 pr-3 text-right text-red-500">{formatINR(dayData.reduce((s,d) => s+d.expense, 0))}</td>
                                          <td className="py-2 pr-3 text-right">{formatINR(dayData.reduce((s,d) => s+d.net, 0))}</td>
                                          <td className="py-2 pr-3 text-right">{formatINR(dayData.reduce((s,d) => s+d.consultation, 0))}</td>
                                          <td className="py-2 pr-3 text-right">{formatINR(dayData.reduce((s,d) => s+d.pharmacy, 0))}</td>
                                          <td className="py-2 pr-3 text-right">{formatINR(dayData.reduce((s,d) => s+d.procedure, 0))}</td>
                                          <td className="py-2 pr-3 text-right">{formatINR(dayData.reduce((s,d) => s+d.other, 0))}</td>
                                          <td className="py-2 pr-3 text-right">{formatINR(dayData.reduce((s,d) => s+d.cash, 0))}</td>
                                          <td className="py-2 pr-3 text-right text-blue-700">{formatINR(dayData.reduce((s,d) => s+d.upi, 0))}</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      }
                      return rows;
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Quick export panel ── */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-slate-900">Export Any Month</h3>
            <p className="text-sm text-slate-500">
              Downloads an Excel file in FY2026 format (Daily Summary + All Entries sheets).
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Financial Year</span>
                <select value={exportFY} onChange={e => setExportFY(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="2025">FY2025</option>
                  <option value="2026">FY2026</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Month</span>
                <select value={exportMonth} onChange={e => setExportMonth(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <button type="button" onClick={downloadMonth}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                <Download size={15} /> Download xlsx
              </button>
            </div>
          </div>

        </section>
      </div>

      <BottomNav active="/historical" />
    </div>
  );
}
