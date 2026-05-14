'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Download, TrendingUp, TrendingDown, Wallet,
  ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight,
  Layers, Eye, EyeOff, AlertTriangle
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { formatINR } from '@/lib/formatCurrency';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts';

// ── constants ──────────────────────────────────────────────────────────────────
const MONTHS = [
  'April','May','June','July','August','September',
  'October','November','December','January','February','March'
];
const MONTH_NUMS: Record<string, number> = {
  April:4, May:5, June:6, July:7, August:8, September:9,
  October:10, November:11, December:12, January:1, February:2, March:3
};
function fyMonthDate(fy: number, month: string): { start: string; end: string } {
  const m = MONTH_NUMS[month];
  const y = m >= 4 ? fy : fy + 1;
  const lastDay = new Date(y, m, 0).getDate();
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

// ── data fetchers ──────────────────────────────────────────────────────────────
async function fetchMonthStats(fy: number, month: string): Promise<MonthStats> {
  const { start, end } = fyMonthDate(fy, month);
  const empty = { month, fy, income:0, expense:0, net:0, cash:0, upi:0, entries:0, consultation:0, pharmacy:0, procedure:0, other:0 };
  const res = await fetch(`/api/accounts/monthly-stats?start=${start}&end=${end}`);
  if (!res.ok) return empty;
  const d = await res.json();
  return { month, fy, ...d };
}

async function fetchDayStats(start: string, end: string): Promise<DayStats[]> {
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
  const byDate: Record<string, any[]> = {};
  for (const e of all) {
    if (e.is_voided) continue;
    if (!byDate[e.entry_date]) byDate[e.entry_date] = [];
    byDate[e.entry_date].push(e);
  }
  const s = (arr: any[]) => arr.reduce((x, e) => x + Number(e.amount), 0);
  return Object.keys(byDate).sort().map(date => {
    const entries = byDate[date];
    const inc = entries.filter((e: any) => e.entry_type === 'income' && e.subcategory !== 'GPay');
    const exp = entries.filter((e: any) => e.entry_type === 'expense');
    const real = [...inc, ...exp];
    return {
      date, income: s(inc), expense: s(exp), net: s(inc) - s(exp),
      cash:         s(real.filter((e: any) => e.payment_mode === 'Cash')),
      upi:          s(real.filter((e: any) => e.payment_mode === 'UPI')),
      consultation: s(inc.filter((e: any) => e.category === 'Consultation')),
      pharmacy:     s(inc.filter((e: any) => e.category === 'Pharmacy Sales')),
      procedure:    s(inc.filter((e: any) => e.category === 'Procedure')),
      other:        s(inc.filter((e: any) => e.category === 'Other Income')),
    };
  });
}

// ── helpers ────────────────────────────────────────────────────────────────────
function yoyDelta(v26: number, v25: number): number | null {
  if (v25 === 0) return null;
  return (v26 - v25) / v25 * 100;
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-slate-400">—</span>;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

const INR_FMT = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const Num = ({ v, cls = '' }: { v: number; cls?: string }) => (
  <span className={`font-mono tabular-nums ${cls}`}>{INR_FMT.format(v)}</span>
);

// ── component ──────────────────────────────────────────────────────────────────
export default function HistoricalPage() {
  const [selectedFY,   setSelectedFY]   = useState<'2025' | '2026' | 'both'>('both');
  const [stats2025,    setStats2025]    = useState<MonthStats[]>([]);
  const [stats2026,    setStats2026]    = useState<MonthStats[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // ── interaction state ───────────────────────────────────────────────────────
  const [showOverlay,   setShowOverlay]   = useState(false);
  const [hoveredMonth,  setHoveredMonth]  = useState<string | null>(null);
  const [collapsedFYs,  setCollapsedFYs] = useState<Set<number>>(new Set());

  // ── drill-down ──────────────────────────────────────────────────────────────
  const [expandedKey,  setExpandedKey]  = useState<string | null>(null);
  const [dayData,      setDayData]      = useState<DayStats[]>([]);
  const [dayLoading,   setDayLoading]   = useState(false);

  // ── scroll refs for quick-jump ──────────────────────────────────────────────
  const ref2025 = useRef<HTMLTableRowElement>(null);
  const ref2026 = useRef<HTMLTableRowElement>(null);

  // ── export ──────────────────────────────────────────────────────────────────
  const [exportFY,    setExportFY]    = useState('2025');
  const [exportMonth, setExportMonth] = useState('April');

  const downloadMonth = () => {
    const fy   = Number(exportFY);
    const m    = MONTH_NUMS[exportMonth];
    const year = m >= 4 ? fy : fy + 1;
    window.open(`/api/export/monthly?year=${year}&month=${m}`, '_blank');
  };

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

  const toggleCollapse = (fy: number) => {
    setCollapsedFYs(prev => {
      const next = new Set(prev);
      next.has(fy) ? next.delete(fy) : next.add(fy);
      return next;
    });
  };

  // ── load ────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true); setError('');
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

  // ── derived totals ───────────────────────────────────────────────────────────
  const totals = (stats: MonthStats[]) => ({
    income:  stats.reduce((s, r) => s + r.income,  0),
    expense: stats.reduce((s, r) => s + r.expense, 0),
    net:     stats.reduce((s, r) => s + r.net,     0),
    pharmacy:     stats.reduce((s, r) => s + r.pharmacy,     0),
    consultation: stats.reduce((s, r) => s + r.consultation, 0),
  });
  const t25 = totals(stats2025);
  const t26 = totals(stats2026);
  const margin25 = t25.income > 0 ? t25.net / t25.income * 100 : 0;
  const margin26 = t26.income > 0 ? t26.net / t26.income * 100 : 0;

  // ── heatmap helpers ──────────────────────────────────────────────────────────
  const allStats    = [...stats2025, ...stats2026];
  const maxPharmacy = Math.max(...allStats.map(s => s.pharmacy), 1);
  const maxNetPos   = Math.max(...allStats.map(s => Math.max(s.net, 0)), 1);

  const pharmHeat = (v: number): React.CSSProperties => {
    const op = Math.min(v / maxPharmacy * 0.4, 0.4);
    return op > 0.02 ? { background: `rgba(22,163,74,${op.toFixed(3)})` } : {};
  };
  const netHeat = (v: number): React.CSSProperties => {
    if (v > 0) {
      const op = Math.min(v / maxNetPos * 0.3, 0.3);
      return op > 0.01 ? { background: `rgba(22,163,74,${op.toFixed(3)})` } : {};
    }
    if (v < 0) return { background: 'rgba(239,68,68,0.12)' };
    return {};
  };

  // ── anomaly detection ────────────────────────────────────────────────────────
  const entryCounts = allStats.map(s => s.entries).filter(e => e > 0);
  const avgEntries  = entryCounts.length ? entryCounts.reduce((a,b) => a+b, 0) / entryCounts.length : 0;
  const isAnomalous = (n: number) => avgEntries > 0 && n > avgEntries * 2.5;

  // ── chart data ───────────────────────────────────────────────────────────────
  const chartData = MONTHS.map(month => {
    const s25 = stats2025.find(s => s.month === month);
    const s26 = stats2026.find(s => s.month === month);
    return {
      month:     month.substring(0, 3),
      fullMonth: month,
      'FY26 Income':  s26?.income  ?? 0,
      'FY26 Expense': s26?.expense ?? 0,
      'FY25 Income':  s25?.income  ?? 0,
      'FY25 Expense': s25?.expense ?? 0,
    };
  });

  const netChartData = MONTHS.map(month => {
    const s25 = stats2025.find(s => s.month === month);
    const s26 = stats2026.find(s => s.month === month);
    return {
      month:     month.substring(0, 3),
      fullMonth: month,
      'FY2025': s25?.net ?? 0,
      'FY2026': s26?.net ?? 0,
    };
  });

  const showFY2025Bars = selectedFY === 'both' || selectedFY === '2025';
  const showFY2026Bars = selectedFY === 'both' || selectedFY === '2026';

  // ── table rows builder ───────────────────────────────────────────────────────
  const tableRowsForFY = (fy: number, stats: MonthStats[]) => {
    if (collapsedFYs.has(fy)) return null;
    return MONTHS.map(month => {
      const s = stats.find(x => x.month === month);
      if (!s) return null;
      const { start, end } = fyMonthDate(fy, month);
      const calYear  = Number(start.substring(0, 4));
      const calMonth = Number(start.substring(5, 7));
      const key      = `${fy}-${month}`;
      const isOpen   = expandedKey === key;
      const isHovered = hoveredMonth === month;
      const anomaly  = isAnomalous(s.entries);
      const margin   = s.income > 0 ? s.net / s.income * 100 : 0;

      return (
        <React.Fragment key={key}>
          <tr
            onClick={() => toggleDrillDown(fy, month, start, end)}
            className={`cursor-pointer transition-colors duration-100 ${
              isOpen    ? 'bg-brand-50'   :
              isHovered ? 'bg-amber-50/60' :
              'hover:bg-slate-50/80'
            }`}
          >
            <td className="px-2 py-2.5 text-slate-400 w-6">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </td>
            <td className="px-3 py-2.5 font-semibold text-slate-700 whitespace-nowrap font-mono text-xs">{month}</td>
            <td className="px-3 py-2.5 text-right"><Num v={s.income} cls="text-green-700 font-semibold" /></td>
            <td className="px-3 py-2.5 text-right"><Num v={s.expense} cls="text-red-500" /></td>
            <td className="px-3 py-2.5 text-right" style={netHeat(s.net)}>
              <Num v={s.net} cls={`font-semibold ${s.net >= 0 ? 'text-slate-800' : 'text-red-600'}`} />
            </td>
            <td className="px-3 py-2.5 text-right text-slate-500 font-mono text-xs">
              {s.income > 0 ? (
                <span className={margin >= 30 ? 'text-green-700 font-semibold' : margin >= 15 ? 'text-amber-600' : 'text-red-500 font-semibold'}>
                  {margin.toFixed(1)}%
                </span>
              ) : '—'}
            </td>
            <td className="px-3 py-2.5 text-right"><Num v={s.consultation} cls="text-slate-500" /></td>
            <td className="px-3 py-2.5 text-right" style={pharmHeat(s.pharmacy)}>
              <Num v={s.pharmacy} cls="text-slate-700" />
            </td>
            <td className="hidden lg:table-cell px-3 py-2.5 text-right"><Num v={s.upi} cls="text-slate-500" /></td>
            <td className={`px-3 py-2.5 text-right font-mono text-xs ${anomaly ? 'bg-amber-50' : ''}`}>
              <span className={anomaly ? 'inline-flex items-center gap-1 text-amber-700 font-semibold' : 'text-slate-500'}>
                {anomaly && <AlertTriangle size={11} />}
                {s.entries}
              </span>
            </td>
            <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => window.open(`/api/export/monthly?year=${calYear}&month=${calMonth}`, '_blank')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 whitespace-nowrap"
              >
                <Download size={10} /> xlsx
              </button>
            </td>
          </tr>

          {/* ── drill-down sub-table ── */}
          {isOpen && (
            <tr key={`${key}-dd`}>
              <td colSpan={11} className="bg-slate-50/80 p-0">
                {dayLoading ? (
                  <div className="flex items-center gap-2 px-10 py-4 text-xs text-slate-400">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    Loading daily data…
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-500">
                          <th className="py-2 pl-8 pr-3 text-left font-medium whitespace-nowrap">Date</th>
                          <th className="py-2 pr-3 text-left font-medium">Day</th>
                          <th className="py-2 pr-3 text-right font-medium">Income</th>
                          <th className="py-2 pr-3 text-right font-medium">Expense</th>
                          <th className="py-2 pr-3 text-right font-medium">Net</th>
                          <th className="py-2 pr-3 text-right font-medium">Consult</th>
                          <th className="py-2 pr-3 text-right font-medium">Pharmacy</th>
                          <th className="py-2 pr-3 text-right font-medium">Procedure</th>
                          <th className="py-2 pr-3 text-right font-medium">Other</th>
                          <th className="py-2 pr-3 text-right font-medium">Cash</th>
                          <th className="py-2 pr-3 text-right font-medium">UPI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayData.map(d => {
                          const dateObj  = new Date(d.date + 'T00:00:00');
                          const dayName  = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
                          const dateLabel = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                          return (
                            <tr key={d.date} className="border-b border-slate-100 hover:bg-white">
                              <td className="py-1.5 pl-8 pr-3 font-semibold font-mono text-slate-700">{dateLabel}</td>
                              <td className="py-1.5 pr-3 text-slate-400">{dayName}</td>
                              <td className="py-1.5 pr-3 text-right font-mono text-green-700">{formatINR(d.income)}</td>
                              <td className="py-1.5 pr-3 text-right font-mono text-red-500">{d.expense > 0 ? formatINR(d.expense) : '—'}</td>
                              <td className={`py-1.5 pr-3 text-right font-mono font-semibold ${d.net >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatINR(d.net)}</td>
                              <td className="py-1.5 pr-3 text-right font-mono text-slate-500">{d.consultation > 0 ? formatINR(d.consultation) : '—'}</td>
                              <td className="py-1.5 pr-3 text-right font-mono text-slate-500">{d.pharmacy > 0 ? formatINR(d.pharmacy) : '—'}</td>
                              <td className="py-1.5 pr-3 text-right font-mono text-slate-500">{d.procedure > 0 ? formatINR(d.procedure) : '—'}</td>
                              <td className="py-1.5 pr-3 text-right font-mono text-slate-500">{d.other > 0 ? formatINR(d.other) : '—'}</td>
                              <td className="py-1.5 pr-3 text-right font-mono text-slate-600">{d.cash > 0 ? formatINR(d.cash) : '—'}</td>
                              <td className="py-1.5 pr-3 text-right font-mono text-blue-600">{d.upi > 0 ? formatINR(d.upi) : '—'}</td>
                            </tr>
                          );
                        })}
                        {dayData.length > 0 && (
                          <tr className="border-t-2 border-slate-300 bg-slate-100/80 font-semibold">
                            <td className="py-2 pl-8 pr-3 font-mono text-slate-600" colSpan={2}>
                              Total ({dayData.length} days)
                            </td>
                            <td className="py-2 pr-3 text-right font-mono text-green-700">{formatINR(dayData.reduce((s,d)=>s+d.income,0))}</td>
                            <td className="py-2 pr-3 text-right font-mono text-red-500">{formatINR(dayData.reduce((s,d)=>s+d.expense,0))}</td>
                            <td className="py-2 pr-3 text-right font-mono">{formatINR(dayData.reduce((s,d)=>s+d.net,0))}</td>
                            <td className="py-2 pr-3 text-right font-mono text-slate-600">{formatINR(dayData.reduce((s,d)=>s+d.consultation,0))}</td>
                            <td className="py-2 pr-3 text-right font-mono text-slate-600">{formatINR(dayData.reduce((s,d)=>s+d.pharmacy,0))}</td>
                            <td className="py-2 pr-3 text-right font-mono text-slate-600">{formatINR(dayData.reduce((s,d)=>s+d.procedure,0))}</td>
                            <td className="py-2 pr-3 text-right font-mono text-slate-600">{formatINR(dayData.reduce((s,d)=>s+d.other,0))}</td>
                            <td className="py-2 pr-3 text-right font-mono text-slate-600">{formatINR(dayData.reduce((s,d)=>s+d.cash,0))}</td>
                            <td className="py-2 pr-3 text-right font-mono text-blue-700">{formatINR(dayData.reduce((s,d)=>s+d.upi,0))}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 py-6">
      <div className="grid gap-4 xl:grid-cols-[288px_1fr]">
        <Sidebar active="/historical" />

        <section className="space-y-6 pb-24">

          {/* ── Header ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-600">Financial Years</p>
              <h1 className="text-3xl font-semibold text-slate-900">Historical Analytics</h1>
              <p className="mt-1 text-sm text-slate-500">
                Month-wise comparison — FY2025 (Apr 2025–Mar 2026) vs FY2026 (Apr 2026–Mar 2027)
              </p>
            </div>
            {/* Quick-jump links */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-400 font-medium">Jump to:</span>
              <button
                onClick={() => ref2025.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
              >
                FY2025
              </button>
              <button
                onClick={() => ref2026.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                FY2026
              </button>
            </div>
          </div>

          {/* ── FY selector ── */}
          <div className="flex flex-wrap gap-2">
            {(['both','2025','2026'] as const).map(fy => (
              <button key={fy} type="button"
                onClick={() => setSelectedFY(fy)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  selectedFY === fy
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}>
                {fy === 'both' ? 'Both FY' : `FY${fy}`}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
              <p className="mt-1 text-xs">Run <code className="rounded bg-red-100 px-1">node scripts/import-historical.mjs</code> to import xlsx data first.</p>
            </div>
          )}

          {/* ── Unified KPI Comparison Grid ── */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/60 to-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide bg-slate-50/80">
              <div className="px-4 py-3 text-slate-500">Metric</div>
              <div className="px-4 py-3 text-green-700 text-center">FY2025 (Full Year)</div>
              <div className="px-4 py-3 text-slate-400 text-center">YoY Δ</div>
              <div className="px-4 py-3 text-blue-700 text-center">FY2026 (YTD)</div>
            </div>
            {loading ? (
              <div className="h-32 animate-pulse bg-slate-100/50" />
            ) : (
              [
                { label: 'Total Income',  icon: TrendingUp,   v25: t25.income,  v26: t26.income,  cls25: 'text-green-700', cls26: 'text-green-700' },
                { label: 'Total Expense', icon: TrendingDown, v25: t25.expense, v26: t26.expense, cls25: 'text-red-500',   cls26: 'text-red-500'   },
                { label: 'Net Balance',   icon: Wallet,       v25: t25.net,     v26: t26.net,     cls25: t25.net>=0?'text-slate-800':'text-red-600', cls26: t26.net>=0?'text-blue-700':'text-red-600' },
                { label: 'Pharmacy Rev.',           icon: null, v25: t25.pharmacy,     v26: t26.pharmacy,     cls25: 'text-purple-700', cls26: 'text-purple-700' },
                { label: 'Consultation Rev.',       icon: null, v25: t25.consultation, v26: t26.consultation, cls25: 'text-indigo-700', cls26: 'text-indigo-700' },
              ].map((row, i) => {
                const delta = yoyDelta(row.v26, row.v25);
                const margin25Row = i === 2 && t25.income > 0 ? ` (${margin25.toFixed(1)}%)` : '';
                const margin26Row = i === 2 && t26.income > 0 ? ` (${margin26.toFixed(1)}%)` : '';
                return (
                  <div key={row.label} className={`grid grid-cols-4 items-center ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} border-b border-slate-100 last:border-0`}>
                    <div className="px-4 py-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                      {row.icon && <row.icon size={14} className="text-slate-400" />}
                      {row.label}
                    </div>
                    <div className="px-4 py-3 text-center">
                      <span className={`font-bold font-mono text-sm ${row.cls25}`}>{formatINR(row.v25)}</span>
                      {margin25Row && <span className="ml-1 text-xs text-slate-400">{margin25Row}</span>}
                    </div>
                    <div className="px-4 py-3 text-center">
                      <DeltaBadge pct={delta} />
                    </div>
                    <div className="px-4 py-3 text-center">
                      <span className={`font-bold font-mono text-sm ${row.cls26}`}>{formatINR(row.v26)}</span>
                      {margin26Row && <span className="ml-1 text-xs text-slate-400">{margin26Row}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Charts ── */}
          {!loading && (
            <>
              {/* Income vs Expense bar with FY2025 overlay toggle */}
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/70 to-white shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Month-wise comparison</p>
                    <h3 className="font-semibold text-slate-800">Income vs Expense</h3>
                  </div>
                  {selectedFY === '2026' && (
                    <button
                      type="button"
                      onClick={() => setShowOverlay(v => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        showOverlay
                          ? 'bg-slate-800 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {showOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
                      {showOverlay ? 'Hide FY2025' : 'Overlay FY2025'}
                    </button>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData}
                    margin={{ top:5, right:10, left:0, bottom:5 }}
                    barGap={2}
                    onMouseMove={s => {
                      const full = (s as any)?.activePayload?.[0]?.payload?.fullMonth;
                      if (full) setHoveredMonth(full);
                    }}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize:11 }} />
                    <YAxis tick={{ fontSize:11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={52} />
                    <Tooltip
                      formatter={(v: number, name: string) => [formatINR(v), name]}
                      contentStyle={{ borderRadius:12, fontSize:12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {/* FY2026 bars — always shown when visible */}
                    {showFY2026Bars && <Bar dataKey="FY26 Income"  fill="#2563eb" radius={[3,3,0,0]} maxBarSize={22} />}
                    {showFY2026Bars && <Bar dataKey="FY26 Expense" fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={22} />}
                    {/* FY2025 bars — solid in both/2025 mode, ghost overlay in 2026+overlay mode */}
                    {showFY2025Bars && <Bar dataKey="FY25 Income"  fill="#16a34a" fillOpacity={selectedFY === 'both' ? 1 : 0.25} radius={[3,3,0,0]} maxBarSize={22} />}
                    {showFY2025Bars && <Bar dataKey="FY25 Expense" fill="#ef4444" fillOpacity={selectedFY === 'both' ? 1 : 0.25} radius={[3,3,0,0]} maxBarSize={22} />}
                    {/* Ghost overlay when FY2026 selected + overlay on */}
                    {selectedFY === '2026' && showOverlay && (
                      <Bar dataKey="FY25 Income"  fill="#16a34a" fillOpacity={0.22} radius={[3,3,0,0]} maxBarSize={22} strokeDasharray="3 2" />
                    )}
                    {selectedFY === '2026' && showOverlay && (
                      <Bar dataKey="FY25 Expense" fill="#ef4444" fillOpacity={0.22} radius={[3,3,0,0]} maxBarSize={22} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
                {hoveredMonth && (
                  <p className="mt-1 text-center text-xs text-slate-400">
                    Hovering: <span className="font-semibold text-slate-600">{hoveredMonth}</span> — corresponding row highlighted in table below
                  </p>
                )}
              </div>

              {/* Net balance line chart */}
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/70 to-white shadow-sm p-5">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Net balance per month</p>
                <h3 className="mb-4 font-semibold text-slate-800">FY2025 vs FY2026 — Net Trend</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={netChartData}
                    margin={{ top:5, right:10, left:0, bottom:5 }}
                    onMouseMove={s => {
                      const full = (s as any)?.activePayload?.[0]?.payload?.fullMonth;
                      if (full) setHoveredMonth(full);
                    }}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize:11 }} />
                    <YAxis tick={{ fontSize:11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={52} />
                    <Tooltip formatter={(v: number, name: string) => [formatINR(v), name]} contentStyle={{ borderRadius:12, fontSize:12 }} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
                    {(selectedFY === 'both' || selectedFY === '2025') && (
                      <Line type="monotone" dataKey="FY2025" stroke="#16a34a" strokeWidth={2.5} dot={{ r:4 }} />
                    )}
                    {(selectedFY === 'both' || selectedFY === '2026') && (
                      <Line type="monotone" dataKey="FY2026" stroke="#2563eb" strokeWidth={2.5} dot={{ r:4 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* ── Month-wise Breakdown Table ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Month-wise Breakdown</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click a month row to see daily data · Hover chart to highlight row ·
                  <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600"><AlertTriangle size={10} /> = unusual entry count</span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: 'rgba(22,163,74,0.3)' }} /> Heatmap intensity
              </div>
            </div>

            {loading ? (
              <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
            ) : (
              <div className="rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-auto max-h-[620px]">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="w-6 px-2 py-3" />
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Month</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Income</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Expense</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Net</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Margin %</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Consult</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            Pharmacy <span className="text-green-500 text-[10px]">●</span>
                          </span>
                        </th>
                        <th className="hidden lg:table-cell px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">UPI</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Entries</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Export</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">

                      {/* FY2025 accordion group */}
                      {(selectedFY === 'both' || selectedFY === '2025') && (
                        <>
                          <tr ref={ref2025} id="fy2025-anchor" className="bg-green-50/60 border-y border-green-200/60">
                            <td colSpan={11} className="px-4 py-2">
                              <button
                                type="button"
                                onClick={() => toggleCollapse(2025)}
                                className="flex items-center gap-2 text-sm font-bold text-green-800 hover:text-green-600"
                              >
                                {collapsedFYs.has(2025) ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                <span className="rounded-full bg-green-200 px-2.5 py-0.5 text-xs font-bold text-green-800">FY2025</span>
                                <span className="text-xs font-normal text-green-600">Apr 2025 – Mar 2026</span>
                                <span className="ml-2 font-mono text-xs text-green-700">{formatINR(t25.income)}</span>
                                {collapsedFYs.has(2025) && <span className="text-xs text-green-500">(collapsed)</span>}
                              </button>
                            </td>
                          </tr>
                          {!collapsedFYs.has(2025) && tableRowsForFY(2025, stats2025)}
                        </>
                      )}

                      {/* FY2026 accordion group */}
                      {(selectedFY === 'both' || selectedFY === '2026') && (
                        <>
                          <tr ref={ref2026} id="fy2026-anchor" className="bg-blue-50/60 border-y border-blue-200/60">
                            <td colSpan={11} className="px-4 py-2">
                              <button
                                type="button"
                                onClick={() => toggleCollapse(2026)}
                                className="flex items-center gap-2 text-sm font-bold text-blue-800 hover:text-blue-600"
                              >
                                {collapsedFYs.has(2026) ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                <span className="rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-800">FY2026</span>
                                <span className="text-xs font-normal text-blue-600">Apr 2026 – Mar 2027 (ongoing)</span>
                                <span className="ml-2 font-mono text-xs text-blue-700">{formatINR(t26.income)}</span>
                                {collapsedFYs.has(2026) && <span className="text-xs text-blue-500">(collapsed)</span>}
                              </button>
                            </td>
                          </tr>
                          {!collapsedFYs.has(2026) && tableRowsForFY(2026, stats2026)}
                        </>
                      )}

                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Quick Export ── */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/60 to-white shadow-sm p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900">Export Any Month</h3>
              <p className="text-sm text-slate-500 mt-0.5">Downloads an Excel file with Daily Summary + All Entries sheets.</p>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Financial Year</span>
                <select value={exportFY} onChange={e => setExportFY(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm w-full">
                  <option value="2025">FY2025</option>
                  <option value="2026">FY2026</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Month</span>
                <select value={exportMonth} onChange={e => setExportMonth(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm w-full">
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
