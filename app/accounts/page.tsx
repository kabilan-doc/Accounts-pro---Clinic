'use client';

import { useEffect, useState } from 'react';
import { PlusCircle, X, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';

interface DailyAccount {
  id: string;
  date: string;
  day_name: string | null;
  total_medicine_sales: number;
  no_of_op: number;
  total_op_charges: number;
  trip_and_others: number;
  total_sales: number;
  total_sale_amount: number;
  injection: number;
  gpay: number;
  expense: number;
  gpay_and_expense: number;
  extra_charge: number;
  return_amount: number;
  total_cash: number;
  total_cash_given: number;
  excess_deficit: number;
  notes: string | null;
}

const EMPTY_FORM_2026 = {
  date: '', day_name: '',
  total_medicine_sales: '', no_of_op: '', total_op_charges: '',
  trip_and_others: '', total_sales: '', gpay: '', expense: '',
  gpay_and_expense: '', extra_charge: '', return_amount: '',
  total_cash: '', total_cash_given: '', excess_deficit: '', notes: ''
};

const EMPTY_FORM_2025 = {
  date: '', day_name: '',
  total_sale_amount: '', total_op_charges: '', injection: '',
  total_medicine_sales: '', gpay: '', expense: '',
  gpay_and_expense: '', extra_charge: '', return_amount: '',
  total_cash: '', total_cash_given: '', excess_deficit: '', notes: ''
};

const fmt = (n: number | null | undefined) =>
  !n || n === 0 ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtINR = (n: number | null | undefined) => {
  const v = n ?? 0;
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const fmtED = (n: number | null | undefined) => {
  const v = n ?? 0;
  return v === 0 ? '0' : (v > 0 ? '+' : '') + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

function sum(rows: DailyAccount[], key: keyof DailyAccount): number {
  return rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);
}

const MONTHS = [
  { value: 1,  label: 'January'   },
  { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     },
  { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       },
  { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      },
  { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October'   },
  { value: 11, label: 'November'  },
  { value: 12, label: 'December'  },
];

function getYears() {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => current - i);
}

// ── Mobile card ───────────────────────────────────────────────────────────────
function DayCard({ r, isFY2025, role, onEdit }: {
  r: DailyAccount; isFY2025: boolean; role: string; onEdit: (r: DailyAccount) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ed = r.excess_deficit ?? 0;
  const edColor = ed < 0 ? 'text-red-600' : ed > 0 ? 'text-green-600' : 'text-slate-400';
  const borderAccent = ed < 0 ? 'border-l-red-400' : ed > 0 ? 'border-l-green-400' : 'border-l-slate-200';
  const dateStr = new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', weekday: 'short'
  });
  const income = isFY2025 ? r.total_sale_amount : r.total_sales;

  return (
    <div className={`rounded-2xl border-l-4 border border-slate-100 bg-white/90 shadow-sm backdrop-blur-sm p-4 ${borderAccent}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button type="button" onClick={() => onEdit(r)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 transition-colors">
              <Pencil size={14} />
            </button>
          )}
          <div>
            <p className="font-semibold text-slate-800 text-sm">{dateStr}</p>
            {r.day_name && <p className="text-xs text-slate-400 uppercase tracking-wide">{r.day_name}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-blue-700 text-base">{fmtINR(income)}</p>
          <p className="text-xs text-slate-400">Total Sales</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-blue-50 px-2 py-2.5">
          <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide">GPay</p>
          <p className="text-sm font-bold text-blue-700 mt-0.5">{fmt(r.gpay)}</p>
        </div>
        <div className="rounded-xl bg-red-50 px-2 py-2.5">
          <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">Expense</p>
          <p className="text-sm font-bold text-red-600 mt-0.5">{fmt(r.expense)}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 px-2 py-2.5">
          <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wide">Cash</p>
          <p className="text-sm font-bold text-indigo-700 mt-0.5">{fmt(r.total_cash)}</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between px-1">
        <span className="text-xs text-slate-500">
          Given: <span className="font-semibold text-slate-700">{fmt(r.total_cash_given)}</span>
        </span>
        <span className={`text-sm font-bold ${edColor}`}>
          {ed === 0 ? <span className="text-slate-400 text-xs">Balanced</span> : (ed > 0 ? '+' : '') + ed.toLocaleString('en-IN')}
        </span>
      </div>

      {r.notes && (
        <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5 italic">{r.notes}</p>
      )}

      <button type="button" onClick={() => setExpanded(p => !p)}
        className="mt-3 min-h-[36px] flex w-full items-center justify-center gap-1 rounded-xl bg-slate-50 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors">
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {expanded ? 'Less' : 'More Details'}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-slate-100 pt-3">
          {isFY2025 ? (
            <>
              <div className="flex justify-between"><span className="text-slate-400">Total Sale</span><span className="font-semibold">{fmt(r.total_sale_amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">OP Charges</span><span className="font-semibold">{fmt(r.total_op_charges)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Injection</span><span className="font-semibold text-purple-700">{fmt(r.injection)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Medicine</span><span className="font-semibold">{fmt(r.total_medicine_sales)}</span></div>
            </>
          ) : (
            <>
              <div className="flex justify-between"><span className="text-slate-400">Medicine</span><span className="font-semibold">{fmt(r.total_medicine_sales)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">OP #{r.no_of_op || '—'}</span><span className="font-semibold">{fmt(r.total_op_charges)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Trip/Others</span><span className="font-semibold">{fmt(r.trip_and_others)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Total Sales</span><span className="font-bold text-blue-700">{fmt(r.total_sales)}</span></div>
            </>
          )}
          <div className="flex justify-between"><span className="text-slate-400">GPay+Exp</span><span className="font-semibold">{fmt(r.gpay_and_expense)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Extra</span><span className="font-semibold text-green-700">{fmt(r.extra_charge)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Return</span><span className="font-semibold text-red-500">{fmt(r.return_amount)}</span></div>
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [role, setRole]           = useState<string>('');
  const [rows, setRows]           = useState<DailyAccount[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm]           = useState<Record<string, string>>(EMPTY_FORM_2026);
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState('');

  const isFY2025 = year === 2025;

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => setRole(d.role ?? '')).catch(() => {});
  }, []);

  useEffect(() => { load(year, month); }, [year, month]);

  async function load(y: number, m: number) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/accounts?year=${y}&month=${m}`);
      if (!res.ok) { setError('Failed to load data.'); return; }
      const { data } = await res.json();
      setRows(data ?? []);
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }

  function openModal() {
    const today = new Date();
    const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
    const base = isFY2025 ? EMPTY_FORM_2025 : EMPTY_FORM_2026;
    setForm({ ...base, date: today.toISOString().substring(0, 10), day_name: days[today.getDay()] });
    setIsEditing(false); setSaveErr(''); setShowModal(true);
  }

  function openEditModal(row: DailyAccount) {
    setForm({
      date: row.date, day_name: row.day_name ?? '',
      total_medicine_sales: String(row.total_medicine_sales ?? ''),
      no_of_op: String(row.no_of_op ?? ''),
      total_op_charges: String(row.total_op_charges ?? ''),
      trip_and_others: String(row.trip_and_others ?? ''),
      total_sales: String(row.total_sales ?? ''),
      total_sale_amount: String(row.total_sale_amount ?? ''),
      injection: String(row.injection ?? ''),
      gpay: String(row.gpay ?? ''),
      expense: String(row.expense ?? ''),
      gpay_and_expense: String(row.gpay_and_expense ?? ''),
      extra_charge: String(row.extra_charge ?? ''),
      return_amount: String(row.return_amount ?? ''),
      total_cash: String(row.total_cash ?? ''),
      total_cash_given: String(row.total_cash_given ?? ''),
      excess_deficit: String(row.excess_deficit ?? ''),
      notes: row.notes ?? '',
    });
    setIsEditing(true); setSaveErr(''); setShowModal(true);
  }

  function set2026(k: string, v: string, prev: Record<string, string>) {
    const next = { ...prev, [k]: v };
    const med  = Number(next.total_medicine_sales) || 0;
    const op   = Number(next.total_op_charges)     || 0;
    const trip = Number(next.trip_and_others)      || 0;
    const gpay = Number(next.gpay)                 || 0;
    const exp  = Number(next.expense)              || 0;
    const extra= Number(next.extra_charge)         || 0;
    const ret  = Number(next.return_amount)        || 0;
    const totalSales = med + op + trip;
    next.total_sales      = String(totalSales);
    next.gpay_and_expense = String(gpay + exp);
    next.total_cash       = String(totalSales - gpay - exp + extra - ret);
    next.excess_deficit   = String((Number(next.total_cash_given) || 0) - (Number(next.total_cash) || 0));
    return next;
  }

  function set2025(k: string, v: string, prev: Record<string, string>) {
    const next = { ...prev, [k]: v };
    const sale = Number(next.total_sale_amount) || 0;
    const gpay = Number(next.gpay)              || 0;
    const exp  = Number(next.expense)           || 0;
    const extra= Number(next.extra_charge)      || 0;
    const ret  = Number(next.return_amount)     || 0;
    next.gpay_and_expense = String(gpay + exp);
    next.total_cash       = String(sale - gpay - exp + extra - ret);
    next.excess_deficit   = String((Number(next.total_cash_given) || 0) - (Number(next.total_cash) || 0));
    return next;
  }

  function set(k: string, v: string) {
    setForm(prev => isFY2025 ? set2025(k, v, prev) : set2026(k, v, prev));
  }

  async function handleSave() {
    setSaveErr('');
    if (!form.date) { setSaveErr('Date is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, _fy: isFY2025 ? 2025 : 2026 })
      });
      const result = await res.json();
      if (!res.ok) { setSaveErr(result.message || 'Save failed.'); return; }
      setShowModal(false);
      const savedDate  = new Date(form.date + 'T00:00:00');
      const savedYear  = savedDate.getFullYear();
      const savedMonth = savedDate.getMonth() + 1;
      setYear(savedYear); setMonth(savedMonth);
      load(savedYear, savedMonth);
    } catch { setSaveErr('Network error.'); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-400 [appearance:textfield] min-h-[44px]';
  const autoCls  = inputCls + ' bg-slate-50 cursor-not-allowed text-slate-500';
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

  const totalED = sum(rows, 'excess_deficit');

  // ── Shared th style ────────────────────────────────────────────────────────
  const TH = 'whitespace-nowrap px-3 py-3 text-left font-semibold uppercase tracking-wider text-[11px]';
  const THR = 'whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider text-[11px]';

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 py-6 font-sans">
      <div className="grid gap-4 xl:grid-cols-[288px_1fr]">
        <Sidebar active="/accounts" />

        <section className="animate-fadeIn space-y-5 pb-24">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Daily Accounts</p>
              <h1 className="text-3xl font-bold text-slate-900 mt-0.5">Accounts Ledger</h1>
              <p className="mt-1 text-sm text-slate-500">
                {MONTHS.find(m => m.value === month)?.label} {year} — Dr. Kabilan&apos;s Clinic
                {isFY2025 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">FY2025</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                {getYears().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={month} onChange={e => setMonth(Number(e.target.value))}
                className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              {role === 'admin' && (
                <button onClick={openModal}
                  className="min-h-[44px] flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 active:scale-95 transition-all">
                  <PlusCircle size={17} /> Add Entry
                </button>
              )}
            </div>
          </div>

          {/* ── States ──────────────────────────────────────────────────── */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-2xl" style={{ animationDelay: `${i * 50}ms` }} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">{error}</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">No entries for this month.</div>
          ) : (
            <>
              {/* ── Mobile cards (< sm) ─────────────────────────────────── */}
              <div className="sm:hidden space-y-3">
                {rows.map(r => (
                  <DayCard key={r.id} r={r} isFY2025={isFY2025} role={role} onEdit={openEditModal} />
                ))}
                {/* Mobile totals */}
                <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 shadow-lg">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Month Totals — {rows.length} days</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {[
                      { label: 'Total Sales', val: fmtINR(isFY2025 ? sum(rows,'total_sale_amount') : sum(rows,'total_sales')), color: 'text-blue-300' },
                      { label: 'GPay',        val: fmtINR(sum(rows,'gpay')),           color: 'text-blue-300' },
                      { label: 'Expense',     val: fmtINR(sum(rows,'expense')),        color: 'text-red-300' },
                      { label: 'Total Cash',  val: fmtINR(sum(rows,'total_cash')),     color: 'text-indigo-300' },
                      { label: 'Cash Given',  val: fmtINR(sum(rows,'total_cash_given')), color: 'text-white' },
                      { label: 'Net +/−',    val: fmtED(totalED), color: totalED < 0 ? 'text-red-400' : totalED > 0 ? 'text-green-400' : 'text-slate-400' },
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                        <p className={`font-bold mt-0.5 ${color}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Desktop table (sm+) ─────────────────────────────────── */}
              <div className="hidden sm:block rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-lg overflow-hidden">
                {/* inner scroll container — enables both sticky header and horizontal scroll */}
                <div className="overflow-auto max-h-[calc(100vh-14rem)]">
                  <table className="w-full min-w-[700px] text-xs border-collapse">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                        {role === 'admin' && (
                          <th className="sticky left-0 z-30 w-[44px] min-w-[44px] bg-slate-800 px-2 py-3" />
                        )}
                        <th className={`sticky ${role === 'admin' ? 'left-[44px]' : 'left-0'} z-30 bg-slate-800 ${TH}`}>Date</th>
                        <th className={`hidden md:table-cell ${TH}`}>Day</th>

                        {isFY2025 ? (
                          <>
                            <th className={`hidden lg:table-cell ${THR}`}>Total Sale</th>
                            <th className={`hidden lg:table-cell ${THR}`}>OP Charges</th>
                            <th className={`hidden lg:table-cell ${THR}`}>Injection</th>
                            <th className={`hidden lg:table-cell ${THR}`}>Medicine</th>
                          </>
                        ) : (
                          <>
                            <th className={`hidden lg:table-cell ${THR}`}>Medicine</th>
                            <th className={`hidden xl:table-cell ${THR}`}>OP#</th>
                            <th className={`hidden lg:table-cell ${THR}`}>OP Charges</th>
                            <th className={`hidden lg:table-cell ${THR}`}>Trip/Others</th>
                            <th className={`${THR} text-blue-300`}>Total Sales</th>
                          </>
                        )}

                        <th className={`${THR} text-blue-200`}>GPay</th>
                        <th className={`${THR} text-red-300`}>Expense</th>
                        <th className={`hidden xl:table-cell ${THR}`}>GPay+Exp</th>
                        <th className={`hidden xl:table-cell ${THR} text-green-300`}>Extra</th>
                        <th className={`hidden xl:table-cell ${THR} text-red-300`}>Return</th>
                        <th className={`${THR} text-indigo-300`}>Cash</th>
                        <th className={`${THR}`}>Given</th>
                        <th className={`${THR}`}>+/−</th>
                        <th className={`hidden lg:table-cell ${TH}`}>Notes</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((r, idx) => {
                        const ed = r.excess_deficit ?? 0;
                        const rowBg    = ed < 0 ? 'bg-red-50/70' : ed > 0 ? 'bg-green-50/70' : (idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white');
                        const stickyBg = ed < 0 ? 'bg-red-50' : ed > 0 ? 'bg-green-50' : (idx % 2 === 1 ? 'bg-slate-50' : 'bg-white');
                        const edColor  = ed < 0 ? 'text-red-600 font-bold' : ed > 0 ? 'text-green-600 font-bold' : 'text-slate-400';
                        const dateStr  = new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

                        return (
                          <tr key={r.id}
                            className={`border-b border-slate-100 ${rowBg} hover:brightness-[0.97] hover:shadow-sm transition-all duration-100 cursor-default`}>

                            {role === 'admin' && (
                              <td className={`sticky left-0 z-10 w-[44px] min-w-[44px] px-2 py-1.5 ${stickyBg}`}>
                                <button type="button" onClick={() => openEditModal(r)} title="Edit"
                                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                                  <Pencil size={12} />
                                </button>
                              </td>
                            )}

                            <td className={`sticky ${role === 'admin' ? 'left-[44px]' : 'left-0'} z-10 whitespace-nowrap px-3 py-2.5 font-semibold text-slate-700 ${stickyBg}`}>
                              {dateStr}
                            </td>
                            <td className="hidden md:table-cell px-3 py-2.5 text-slate-500 whitespace-nowrap">{r.day_name ?? '—'}</td>

                            {isFY2025 ? (
                              <>
                                <td className="hidden lg:table-cell px-3 py-2.5 text-right font-bold text-blue-700">{fmt(r.total_sale_amount)}</td>
                                <td className="hidden lg:table-cell px-3 py-2.5 text-right text-slate-600">{fmt(r.total_op_charges)}</td>
                                <td className="hidden lg:table-cell px-3 py-2.5 text-right text-purple-700 font-semibold">{fmt(r.injection)}</td>
                                <td className="hidden lg:table-cell px-3 py-2.5 text-right text-slate-600">{fmt(r.total_medicine_sales)}</td>
                              </>
                            ) : (
                              <>
                                <td className="hidden lg:table-cell px-3 py-2.5 text-right text-slate-600">{fmt(r.total_medicine_sales)}</td>
                                <td className="hidden xl:table-cell px-3 py-2.5 text-center text-slate-600">{r.no_of_op || '—'}</td>
                                <td className="hidden lg:table-cell px-3 py-2.5 text-right text-slate-600">{fmt(r.total_op_charges)}</td>
                                <td className="hidden lg:table-cell px-3 py-2.5 text-right text-slate-600">{fmt(r.trip_and_others)}</td>
                                <td className="px-3 py-2.5 text-right font-bold text-blue-700">{fmt(r.total_sales)}</td>
                              </>
                            )}

                            <td className="px-3 py-2.5 text-right text-blue-600 font-semibold">{fmt(r.gpay)}</td>
                            <td className="px-3 py-2.5 text-right text-red-600 font-semibold">{fmt(r.expense)}</td>
                            <td className="hidden xl:table-cell px-3 py-2.5 text-right text-slate-500">{fmt(r.gpay_and_expense)}</td>
                            <td className="hidden xl:table-cell px-3 py-2.5 text-right text-green-700 font-semibold">{fmt(r.extra_charge)}</td>
                            <td className="hidden xl:table-cell px-3 py-2.5 text-right text-red-500">{fmt(r.return_amount)}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-indigo-700">{fmt(r.total_cash)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600">{fmt(r.total_cash_given)}</td>
                            <td className={`px-3 py-2.5 text-right text-sm ${edColor}`}>{fmtED(ed)}</td>
                            <td className="hidden lg:table-cell px-3 py-2.5 max-w-[180px]">
                              {r.notes
                                ? <span className="block truncate text-slate-500 italic text-[11px]" title={r.notes}>{r.notes}</span>
                                : <span className="text-slate-200">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white font-bold text-xs">
                        {role === 'admin' && (
                          <td className="sticky left-0 z-10 bg-slate-700 px-2 py-3" />
                        )}
                        <td className={`sticky ${role === 'admin' ? 'left-[44px]' : 'left-0'} z-10 bg-slate-700 whitespace-nowrap px-3 py-3 text-slate-200 text-[11px] font-semibold uppercase tracking-wide`} colSpan={2}>
                          TOTALS ({rows.length} days)
                        </td>

                        {isFY2025 ? (
                          <>
                            <td className="hidden lg:table-cell px-3 py-3 text-right text-blue-300">{fmtINR(sum(rows,'total_sale_amount'))}</td>
                            <td className="hidden lg:table-cell px-3 py-3 text-right">{fmtINR(sum(rows,'total_op_charges'))}</td>
                            <td className="hidden lg:table-cell px-3 py-3 text-right text-purple-300">{fmtINR(sum(rows,'injection'))}</td>
                            <td className="hidden lg:table-cell px-3 py-3 text-right">{fmtINR(sum(rows,'total_medicine_sales'))}</td>
                          </>
                        ) : (
                          <>
                            <td className="hidden lg:table-cell px-3 py-3 text-right">{fmtINR(sum(rows,'total_medicine_sales'))}</td>
                            <td className="hidden xl:table-cell px-3 py-3 text-center">{rows.reduce((s,r) => s + (r.no_of_op||0), 0)}</td>
                            <td className="hidden lg:table-cell px-3 py-3 text-right">{fmtINR(sum(rows,'total_op_charges'))}</td>
                            <td className="hidden lg:table-cell px-3 py-3 text-right">{fmtINR(sum(rows,'trip_and_others'))}</td>
                            <td className="px-3 py-3 text-right text-blue-300">{fmtINR(sum(rows,'total_sales'))}</td>
                          </>
                        )}

                        <td className="px-3 py-3 text-right text-blue-300">{fmtINR(sum(rows,'gpay'))}</td>
                        <td className="px-3 py-3 text-right text-red-300">{fmtINR(sum(rows,'expense'))}</td>
                        <td className="hidden xl:table-cell px-3 py-3 text-right">{fmtINR(sum(rows,'gpay_and_expense'))}</td>
                        <td className="hidden xl:table-cell px-3 py-3 text-right text-green-300">{fmtINR(sum(rows,'extra_charge'))}</td>
                        <td className="hidden xl:table-cell px-3 py-3 text-right text-red-300">{fmtINR(sum(rows,'return_amount'))}</td>
                        <td className="px-3 py-3 text-right text-indigo-300">{fmtINR(sum(rows,'total_cash'))}</td>
                        <td className="px-3 py-3 text-right">{fmtINR(sum(rows,'total_cash_given'))}</td>
                        <td className={`px-3 py-3 text-right text-sm ${totalED < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {fmtED(totalED)}
                        </td>
                        <td className="hidden lg:table-cell px-3 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <BottomNav active="/accounts" />

      {/* ── Add / Edit Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:px-4 sm:py-8">
          <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-7 shadow-2xl overflow-y-auto max-h-[94dvh]">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isEditing ? 'Edit Entry' : 'Add Daily Entry'}
                </h2>
                {isEditing && (
                  <p className="text-xs text-brand-600 mt-1">
                    {new Date(form.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {isFY2025 && <p className="text-xs text-amber-600 mt-1">FY2025 format</p>}
              </div>
              <button onClick={() => setShowModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Date *</span>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  readOnly={isEditing}
                  className={`w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 ${isEditing ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'}`} />
              </label>
              <label className="block">
                <span className={labelCls}>Day</span>
                <input type="text" value={form.day_name} onChange={e => set('day_name', e.target.value)}
                  placeholder="MONDAY"
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </label>

              {isFY2025 ? (
                <>
                  <label className="block"><span className={labelCls}>Total Sale Amount</span>
                    <input type="number" min="0" value={form.total_sale_amount ?? ''} onChange={e => set('total_sale_amount', e.target.value)} className={inputCls} placeholder="0" /></label>
                  <label className="block"><span className={labelCls}>OP Charges</span>
                    <input type="number" min="0" value={form.total_op_charges ?? ''} onChange={e => set('total_op_charges', e.target.value)} className={inputCls} placeholder="0" /></label>
                  <label className="block"><span className={labelCls}>Injection</span>
                    <input type="number" min="0" value={form.injection ?? ''} onChange={e => set('injection', e.target.value)} className={inputCls + ' text-purple-700'} placeholder="0" /></label>
                  <label className="block"><span className={labelCls}>Medicine Sales</span>
                    <input type="number" min="0" value={form.total_medicine_sales ?? ''} onChange={e => set('total_medicine_sales', e.target.value)} className={inputCls} placeholder="0" /></label>
                </>
              ) : (
                <>
                  <label className="block"><span className={labelCls}>Medicine Sales</span>
                    <input type="number" min="0" value={form.total_medicine_sales ?? ''} onChange={e => set('total_medicine_sales', e.target.value)} className={inputCls} placeholder="0" /></label>
                  <label className="block"><span className={labelCls}>No. of OP</span>
                    <input type="number" min="0" value={form.no_of_op ?? ''} onChange={e => set('no_of_op', e.target.value)} className={inputCls} placeholder="0" /></label>
                  <label className="block"><span className={labelCls}>OP Charges</span>
                    <input type="number" min="0" value={form.total_op_charges ?? ''} onChange={e => set('total_op_charges', e.target.value)} className={inputCls} placeholder="0" /></label>
                  <label className="block"><span className={labelCls}>Trip &amp; Others</span>
                    <input type="number" min="0" value={form.trip_and_others ?? ''} onChange={e => set('trip_and_others', e.target.value)} className={inputCls} placeholder="0" /></label>
                  <label className="block rounded-xl bg-slate-50 p-3">
                    <span className={labelCls}>Total Sales (auto)</span>
                    <input type="number" value={form.total_sales ?? ''} readOnly className={autoCls + ' text-blue-700 font-bold'} /></label>
                </>
              )}

              <label className="block"><span className={labelCls}>GPay / UPI</span>
                <input type="number" min="0" value={form.gpay ?? ''} onChange={e => set('gpay', e.target.value)} className={inputCls + ' text-blue-700'} placeholder="0" /></label>
              <label className="block"><span className={labelCls}>Expense</span>
                <input type="number" min="0" value={form.expense ?? ''} onChange={e => set('expense', e.target.value)} className={inputCls + ' text-red-600'} placeholder="0" /></label>
              <label className="block rounded-xl bg-slate-50 p-3"><span className={labelCls}>GPay + Expense (auto)</span>
                <input type="number" value={form.gpay_and_expense ?? ''} readOnly className={autoCls} /></label>
              <label className="block"><span className={labelCls}>Extra Charge</span>
                <input type="number" min="0" value={form.extra_charge ?? ''} onChange={e => set('extra_charge', e.target.value)} className={inputCls + ' text-green-700'} placeholder="0" /></label>
              <label className="block"><span className={labelCls}>Return</span>
                <input type="number" min="0" value={form.return_amount ?? ''} onChange={e => set('return_amount', e.target.value)} className={inputCls} placeholder="0" /></label>
              <label className="block rounded-xl bg-slate-50 p-3"><span className={labelCls}>Total Cash (auto)</span>
                <input type="number" value={form.total_cash ?? ''} readOnly className={autoCls + ' font-bold text-indigo-700'} /></label>
              <label className="block"><span className={labelCls}>Cash Given</span>
                <input type="number" min="0" value={form.total_cash_given ?? ''} onChange={e => set('total_cash_given', e.target.value)} className={inputCls} placeholder="0" /></label>
              <label className={`block rounded-xl p-3 ${Number(form.excess_deficit) < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <span className={labelCls}>Excess / Deficit (auto)</span>
                <input type="number" value={form.excess_deficit ?? ''} readOnly
                  className={`${autoCls} font-bold ${Number(form.excess_deficit) < 0 ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'}`} /></label>
              <label className="block sm:col-span-2"><span className={labelCls}>Notes</span>
                <input type="text" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="Any notes for the day..." /></label>
            </div>

            {saveErr && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{saveErr}</div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 min-h-[48px] rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 min-h-[48px] rounded-2xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 active:scale-95 transition-all">
                {saving ? 'Saving…' : isEditing ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
