'use client';

import { useEffect, useState } from 'react';
import { PlusCircle, X, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';

interface DailyAccount {
  id: string;
  date: string;
  day_name: string | null;
  // FY2026 columns
  total_medicine_sales: number;
  no_of_op: number;
  total_op_charges: number;
  trip_and_others: number;
  total_sales: number;
  // FY2025 extra columns
  total_sale_amount: number;
  injection: number;
  // shared
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

// ── Mobile card for a single day ──────────────────────────────────────────────
function DayCard({ r, isFY2025, role, onEdit }: {
  r: DailyAccount;
  isFY2025: boolean;
  role: string;
  onEdit: (r: DailyAccount) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ed = r.excess_deficit ?? 0;
  const edColor = ed < 0 ? 'text-red-600' : ed > 0 ? 'text-green-600' : 'text-slate-500';
  const cardBorder = ed < 0 ? 'border-l-4 border-l-red-400' : ed > 0 ? 'border-l-4 border-l-green-400' : '';
  const dateStr = new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' });
  const income = isFY2025 ? r.total_sale_amount : r.total_sales;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${cardBorder}`}>
      {/* Row 1: date + edit + income */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button
              type="button"
              onClick={() => onEdit(r)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600"
            >
              <Pencil size={12} />
            </button>
          )}
          <div>
            <p className="font-semibold text-slate-800 text-sm">{dateStr}</p>
            {r.day_name && <p className="text-xs text-slate-400">{r.day_name}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-900 text-sm">{fmtINR(income)}</p>
          <p className="text-xs text-slate-400">Total Sales</p>
        </div>
      </div>

      {/* Row 2: key metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-blue-50 px-2 py-2">
          <p className="text-xs text-blue-500 font-medium">GPay</p>
          <p className="text-sm font-semibold text-blue-700">{fmt(r.gpay)}</p>
        </div>
        <div className="rounded-xl bg-red-50 px-2 py-2">
          <p className="text-xs text-red-400 font-medium">Expense</p>
          <p className="text-sm font-semibold text-red-600">{fmt(r.expense)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="text-xs text-slate-500 font-medium">Cash</p>
          <p className="text-sm font-bold text-slate-800">{fmt(r.total_cash)}</p>
        </div>
      </div>

      {/* Row 3: cash given + excess/deficit */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">Cash Given: <span className="font-medium text-slate-700">{fmt(r.total_cash_given)}</span></span>
        <span className={`text-sm font-bold ${edColor}`}>
          {ed === 0 ? 'Balanced' : (ed > 0 ? '+' : '') + ed.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Expandable details */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-slate-50 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {expanded ? 'Less' : 'Details'}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {isFY2025 ? (
            <>
              <div className="flex justify-between"><span className="text-slate-500">Total Sale</span><span className="font-medium">{fmt(r.total_sale_amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">OP Charges</span><span className="font-medium">{fmt(r.total_op_charges)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Injection</span><span className="font-medium text-purple-700">{fmt(r.injection)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Medicine</span><span className="font-medium">{fmt(r.total_medicine_sales)}</span></div>
            </>
          ) : (
            <>
              <div className="flex justify-between"><span className="text-slate-500">Medicine</span><span className="font-medium">{fmt(r.total_medicine_sales)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">OP #{r.no_of_op || '—'}</span><span className="font-medium">{fmt(r.total_op_charges)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Trip/Others</span><span className="font-medium">{fmt(r.trip_and_others)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Sales</span><span className="font-bold">{fmt(r.total_sales)}</span></div>
            </>
          )}
          <div className="flex justify-between"><span className="text-slate-500">GPay+Exp</span><span className="font-medium">{fmt(r.gpay_and_expense)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Extra</span><span className="font-medium text-green-700">{fmt(r.extra_charge)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Return</span><span className="font-medium text-red-500">{fmt(r.return_amount)}</span></div>
          {r.notes && <div className="col-span-2 flex justify-between"><span className="text-slate-500">Notes</span><span className="font-medium truncate ml-2">{r.notes}</span></div>}
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
    setLoading(true);
    setError('');
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
    setIsEditing(false);
    setSaveErr('');
    setShowModal(true);
  }

  function openEditModal(row: DailyAccount) {
    const f: Record<string, string> = {
      date:                 row.date,
      day_name:             row.day_name ?? '',
      total_medicine_sales: String(row.total_medicine_sales ?? ''),
      no_of_op:             String(row.no_of_op ?? ''),
      total_op_charges:     String(row.total_op_charges ?? ''),
      trip_and_others:      String(row.trip_and_others ?? ''),
      total_sales:          String(row.total_sales ?? ''),
      total_sale_amount:    String(row.total_sale_amount ?? ''),
      injection:            String(row.injection ?? ''),
      gpay:                 String(row.gpay ?? ''),
      expense:              String(row.expense ?? ''),
      gpay_and_expense:     String(row.gpay_and_expense ?? ''),
      extra_charge:         String(row.extra_charge ?? ''),
      return_amount:        String(row.return_amount ?? ''),
      total_cash:           String(row.total_cash ?? ''),
      total_cash_given:     String(row.total_cash_given ?? ''),
      excess_deficit:       String(row.excess_deficit ?? ''),
      notes:                row.notes ?? '',
    };
    setForm(f);
    setIsEditing(true);
    setSaveErr('');
    setShowModal(true);
  }

  function set2026(k: string, v: string, prev: Record<string, string>) {
    const next = { ...prev, [k]: v };
    const med   = Number(next.total_medicine_sales) || 0;
    const op    = Number(next.total_op_charges)     || 0;
    const trip  = Number(next.trip_and_others)      || 0;
    const gpay  = Number(next.gpay)                 || 0;
    const exp   = Number(next.expense)              || 0;
    const extra = Number(next.extra_charge)         || 0;
    const ret   = Number(next.return_amount)        || 0;
    const totalSales = med + op + trip;
    next.total_sales      = String(totalSales);
    next.gpay_and_expense = String(gpay + exp);
    next.total_cash       = String(totalSales - gpay - exp + extra - ret);
    next.excess_deficit   = String((Number(next.total_cash_given) || 0) - (Number(next.total_cash) || 0));
    return next;
  }

  function set2025(k: string, v: string, prev: Record<string, string>) {
    const next = { ...prev, [k]: v };
    const sale  = Number(next.total_sale_amount) || 0;
    const gpay  = Number(next.gpay)              || 0;
    const exp   = Number(next.expense)           || 0;
    const extra = Number(next.extra_charge)      || 0;
    const ret   = Number(next.return_amount)     || 0;
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
      setYear(savedYear);
      setMonth(savedMonth);
      load(savedYear, savedMonth);
    } catch { setSaveErr('Network error.'); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-400 [appearance:textfield]';
  const autoCls  = inputCls + ' bg-slate-100 cursor-not-allowed';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  // ── Totals row ─────────────────────────────────────────────────────────────
  const totalED = sum(rows, 'excess_deficit');

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 py-6">
      <div className="grid gap-4 xl:grid-cols-[288px_1fr]">
        <Sidebar active="/accounts" />

        <section className="animate-fadeIn space-y-4 pb-24">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-700">Daily Accounts</p>
              <h1 className="text-3xl font-semibold text-slate-900">Accounts Ledger</h1>
              <p className="mt-1 text-sm text-slate-500">
                {MONTHS.find(m => m.value === month)?.label} {year} — Dr. Kabilan&apos;s Clinic
                {isFY2025 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">FY2025 Format</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {getYears().map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              {role === 'admin' && (
                <button
                  onClick={openModal}
                  className="flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <PlusCircle size={18} /> Add Entry
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-2xl sm:h-10" style={{ animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
          ) : error ? (
            <div className="card p-8 text-center text-red-600">{error}</div>
          ) : rows.length === 0 ? (
            <div className="card p-10 text-center text-slate-400">No entries for this month.</div>
          ) : (
            <>
              {/* ── Mobile card list (< sm) ─────────────────────────────── */}
              <div className="sm:hidden space-y-3">
                {rows.map(r => (
                  <DayCard key={r.id} r={r} isFY2025={isFY2025} role={role} onEdit={openEditModal} />
                ))}

                {/* Mobile totals card */}
                <div className="rounded-2xl bg-slate-800 text-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Month Totals — {rows.length} days</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Total Sales</p>
                      <p className="font-bold">{fmtINR(isFY2025 ? sum(rows,'total_sale_amount') : sum(rows,'total_sales'))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">GPay</p>
                      <p className="font-bold text-blue-300">{fmtINR(sum(rows,'gpay'))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Expense</p>
                      <p className="font-bold text-red-300">{fmtINR(sum(rows,'expense'))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Total Cash</p>
                      <p className="font-bold">{fmtINR(sum(rows,'total_cash'))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Cash Given</p>
                      <p className="font-bold">{fmtINR(sum(rows,'total_cash_given'))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Net Balance</p>
                      <p className={`font-bold ${totalED < 0 ? 'text-red-400' : totalED > 0 ? 'text-green-400' : 'text-slate-300'}`}>
                        {fmtED(totalED)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Desktop table (sm+) ─────────────────────────────────── */}
              <div className="hidden sm:block card p-0 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                      {/* Edit */}
                      {role === 'admin' && (
                        <th className="sticky left-0 z-20 w-[44px] min-w-[44px] bg-slate-800 px-2 py-3" />
                      )}
                      {/* Date — always */}
                      <th className={`sticky ${role === 'admin' ? 'left-[44px]' : 'left-0'} z-20 bg-slate-800 whitespace-nowrap px-3 py-3 text-left font-semibold uppercase tracking-wider`}>Date</th>
                      {/* Day — md+ */}
                      <th className="hidden md:table-cell whitespace-nowrap px-3 py-3 text-left font-semibold uppercase tracking-wider">Day</th>

                      {isFY2025 ? (
                        <>
                          <th className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Total Sale</th>
                          <th className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">OP Charges</th>
                          <th className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Injection</th>
                          <th className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Medicine</th>
                        </>
                      ) : (
                        <>
                          <th className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Medicine</th>
                          <th className="hidden xl:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">OP#</th>
                          <th className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">OP Charges</th>
                          <th className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Trip/Others</th>
                          <th className="whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Total Sales</th>
                        </>
                      )}

                      <th className="whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">GPay</th>
                      <th className="whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Expense</th>
                      <th className="hidden xl:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">GPay+Exp</th>
                      <th className="hidden xl:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Extra</th>
                      <th className="hidden xl:table-cell whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Return</th>
                      <th className="whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Cash</th>
                      <th className="whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">Given</th>
                      <th className="whitespace-nowrap px-3 py-3 text-right font-semibold uppercase tracking-wider">+/−</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const ed = r.excess_deficit ?? 0;
                      const rowBg    = ed < 0 ? 'bg-red-50' : ed > 0 ? 'bg-green-50' : '';
                      const stickyBg = ed < 0 ? 'bg-red-50' : ed > 0 ? 'bg-green-50' : 'bg-white';
                      const edColor  = ed < 0 ? 'text-red-700 font-semibold' : ed > 0 ? 'text-green-700 font-semibold' : 'text-slate-500';
                      const dateStr  = new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                      return (
                        <tr key={r.id} className={`border-b border-slate-100 ${rowBg} transition hover:brightness-95`}>
                          {/* Edit */}
                          {role === 'admin' && (
                            <td className={`sticky left-0 z-10 w-[44px] min-w-[44px] px-2 py-2 ${stickyBg}`}>
                              <button
                                type="button"
                                onClick={() => openEditModal(r)}
                                title="Edit"
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                              >
                                <Pencil size={12} />
                              </button>
                            </td>
                          )}
                          {/* Date */}
                          <td className={`sticky ${role === 'admin' ? 'left-[44px]' : 'left-0'} z-10 whitespace-nowrap px-3 py-2 font-medium text-slate-700 ${stickyBg}`}>{dateStr}</td>
                          {/* Day */}
                          <td className="hidden md:table-cell px-3 py-2 text-slate-500 whitespace-nowrap">{r.day_name ?? '—'}</td>

                          {isFY2025 ? (
                            <>
                              <td className="hidden lg:table-cell px-3 py-2 text-right font-semibold text-slate-800">{fmt(r.total_sale_amount)}</td>
                              <td className="hidden lg:table-cell px-3 py-2 text-right">{fmt(r.total_op_charges)}</td>
                              <td className="hidden lg:table-cell px-3 py-2 text-right text-purple-700">{fmt(r.injection)}</td>
                              <td className="hidden lg:table-cell px-3 py-2 text-right">{fmt(r.total_medicine_sales)}</td>
                            </>
                          ) : (
                            <>
                              <td className="hidden lg:table-cell px-3 py-2 text-right">{fmt(r.total_medicine_sales)}</td>
                              <td className="hidden xl:table-cell px-3 py-2 text-center text-slate-600">{r.no_of_op || '—'}</td>
                              <td className="hidden lg:table-cell px-3 py-2 text-right">{fmt(r.total_op_charges)}</td>
                              <td className="hidden lg:table-cell px-3 py-2 text-right">{fmt(r.trip_and_others)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmt(r.total_sales)}</td>
                            </>
                          )}

                          <td className="px-3 py-2 text-right text-blue-700">{fmt(r.gpay)}</td>
                          <td className="px-3 py-2 text-right text-red-600">{fmt(r.expense)}</td>
                          <td className="hidden xl:table-cell px-3 py-2 text-right text-slate-500">{fmt(r.gpay_and_expense)}</td>
                          <td className="hidden xl:table-cell px-3 py-2 text-right text-green-700">{fmt(r.extra_charge)}</td>
                          <td className="hidden xl:table-cell px-3 py-2 text-right text-red-500">{fmt(r.return_amount)}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">{fmt(r.total_cash)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.total_cash_given)}</td>
                          <td className={`px-3 py-2 text-right ${edColor}`}>{fmtED(ed)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-semibold text-slate-800 text-xs border-t-2 border-slate-300">
                      {role === 'admin' && (
                        <td className={`sticky left-0 z-10 bg-slate-100 px-2 py-3`} />
                      )}
                      <td className={`sticky ${role === 'admin' ? 'left-[44px]' : 'left-0'} z-10 bg-slate-100 whitespace-nowrap px-3 py-3`} colSpan={2}>
                        TOTALS ({rows.length} days)
                      </td>
                      {/* md+ Day col spacer */}
                      {/* lg+ income columns */}
                      {isFY2025 ? (
                        <>
                          <td className="hidden lg:table-cell px-3 py-3 text-right">₹{fmt(sum(rows,'total_sale_amount'))}</td>
                          <td className="hidden lg:table-cell px-3 py-3 text-right">₹{fmt(sum(rows,'total_op_charges'))}</td>
                          <td className="hidden lg:table-cell px-3 py-3 text-right text-purple-700">₹{fmt(sum(rows,'injection'))}</td>
                          <td className="hidden lg:table-cell px-3 py-3 text-right">₹{fmt(sum(rows,'total_medicine_sales'))}</td>
                        </>
                      ) : (
                        <>
                          <td className="hidden lg:table-cell px-3 py-3 text-right">₹{fmt(sum(rows,'total_medicine_sales'))}</td>
                          <td className="hidden xl:table-cell px-3 py-3 text-center">{rows.reduce((s,r) => s + (r.no_of_op||0), 0)}</td>
                          <td className="hidden lg:table-cell px-3 py-3 text-right">₹{fmt(sum(rows,'total_op_charges'))}</td>
                          <td className="hidden lg:table-cell px-3 py-3 text-right">₹{fmt(sum(rows,'trip_and_others'))}</td>
                          <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'total_sales'))}</td>
                        </>
                      )}
                      <td className="px-3 py-3 text-right text-blue-700">₹{fmt(sum(rows,'gpay'))}</td>
                      <td className="px-3 py-3 text-right text-red-600">₹{fmt(sum(rows,'expense'))}</td>
                      <td className="hidden xl:table-cell px-3 py-3 text-right">₹{fmt(sum(rows,'gpay_and_expense'))}</td>
                      <td className="hidden xl:table-cell px-3 py-3 text-right text-green-700">₹{fmt(sum(rows,'extra_charge'))}</td>
                      <td className="hidden xl:table-cell px-3 py-3 text-right text-red-500">₹{fmt(sum(rows,'return_amount'))}</td>
                      <td className="px-3 py-3 text-right font-bold">₹{fmt(sum(rows,'total_cash'))}</td>
                      <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'total_cash_given'))}</td>
                      <td className={`px-3 py-3 text-right ${totalED < 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {fmtED(totalED)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
      <BottomNav active="/accounts" />

      {/* Add / Edit Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:px-4 sm:py-8">
          <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl overflow-y-auto max-h-[92dvh]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {isEditing ? 'Edit Entry' : 'Add Daily Entry'}
                </h2>
                {isEditing && (
                  <p className="text-xs text-brand-600 mt-0.5">
                    Editing {new Date(form.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {isFY2025 && <p className="text-xs text-amber-600 mt-0.5">FY2025 format — includes Injection &amp; Total Sale</p>}
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-xl p-2 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Date *</span>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  readOnly={isEditing}
                  className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 ${isEditing ? 'bg-slate-100 cursor-not-allowed' : ''}`} />
              </label>
              <label className="block">
                <span className={labelCls}>Day</span>
                <input type="text" value={form.day_name} onChange={e => set('day_name', e.target.value)}
                  placeholder="MONDAY" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </label>

              {isFY2025 ? (
                <>
                  <label className="block">
                    <span className={labelCls}>Total Sale Amount</span>
                    <input type="number" min="0" value={form.total_sale_amount ?? ''} onChange={e => set('total_sale_amount', e.target.value)} className={inputCls} placeholder="0" />
                  </label>
                  <label className="block">
                    <span className={labelCls}>OP Charges</span>
                    <input type="number" min="0" value={form.total_op_charges ?? ''} onChange={e => set('total_op_charges', e.target.value)} className={inputCls} placeholder="0" />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Injection</span>
                    <input type="number" min="0" value={form.injection ?? ''} onChange={e => set('injection', e.target.value)} className={inputCls + ' text-purple-700'} placeholder="0" />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Medicine Sales</span>
                    <input type="number" min="0" value={form.total_medicine_sales ?? ''} onChange={e => set('total_medicine_sales', e.target.value)} className={inputCls} placeholder="0" />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className={labelCls}>Medicine Sales</span>
                    <input type="number" min="0" value={form.total_medicine_sales ?? ''} onChange={e => set('total_medicine_sales', e.target.value)} className={inputCls} placeholder="0" />
                  </label>
                  <label className="block">
                    <span className={labelCls}>No. of OP</span>
                    <input type="number" min="0" value={form.no_of_op ?? ''} onChange={e => set('no_of_op', e.target.value)} className={inputCls} placeholder="0" />
                  </label>
                  <label className="block">
                    <span className={labelCls}>OP Charges</span>
                    <input type="number" min="0" value={form.total_op_charges ?? ''} onChange={e => set('total_op_charges', e.target.value)} className={inputCls} placeholder="0" />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Trip &amp; Others</span>
                    <input type="number" min="0" value={form.trip_and_others ?? ''} onChange={e => set('trip_and_others', e.target.value)} className={inputCls} placeholder="0" />
                  </label>
                  <label className="block rounded-xl bg-slate-50 p-3">
                    <span className={labelCls}>Total Sales (auto)</span>
                    <input type="number" value={form.total_sales ?? ''} readOnly className={autoCls} />
                  </label>
                </>
              )}

              <label className="block">
                <span className={labelCls}>GPay</span>
                <input type="number" min="0" value={form.gpay ?? ''} onChange={e => set('gpay', e.target.value)} className={inputCls + ' text-blue-700'} placeholder="0" />
              </label>
              <label className="block">
                <span className={labelCls}>Expense</span>
                <input type="number" min="0" value={form.expense ?? ''} onChange={e => set('expense', e.target.value)} className={inputCls + ' text-red-600'} placeholder="0" />
              </label>
              <label className="block rounded-xl bg-slate-50 p-3">
                <span className={labelCls}>GPay + Expense (auto)</span>
                <input type="number" value={form.gpay_and_expense ?? ''} readOnly className={autoCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Extra Charge</span>
                <input type="number" min="0" value={form.extra_charge ?? ''} onChange={e => set('extra_charge', e.target.value)} className={inputCls + ' text-green-700'} placeholder="0" />
              </label>
              <label className="block">
                <span className={labelCls}>Return</span>
                <input type="number" min="0" value={form.return_amount ?? ''} onChange={e => set('return_amount', e.target.value)} className={inputCls} placeholder="0" />
              </label>
              <label className="block rounded-xl bg-slate-50 p-3">
                <span className={labelCls}>Total Cash (auto)</span>
                <input type="number" value={form.total_cash ?? ''} readOnly className={autoCls + ' font-bold'} />
              </label>
              <label className="block">
                <span className={labelCls}>Cash Given</span>
                <input type="number" min="0" value={form.total_cash_given ?? ''} onChange={e => set('total_cash_given', e.target.value)} className={inputCls} placeholder="0" />
              </label>
              <label className="block rounded-xl bg-slate-50 p-3">
                <span className={labelCls}>Excess / Deficit (auto)</span>
                <input type="number" value={form.excess_deficit ?? ''} readOnly
                  className={`${autoCls} font-semibold ${Number(form.excess_deficit) < 0 ? 'text-red-700' : 'text-green-700'}`} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelCls}>Notes</span>
                <input type="text" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="Any notes..." />
              </label>
            </div>

            {saveErr && <p className="mt-3 text-sm text-red-600">{saveErr}</p>}

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
