'use client';

import { useEffect, useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
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

export default function AccountsPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [rows, setRows]           = useState<DailyAccount[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<Record<string, string>>(EMPTY_FORM_2026);
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState('');

  // FY2025 = year 2025 (April 2025 – March 2026, historical format)
  // FY2026 = year 2026 onwards (new format)
  const isFY2025 = year === 2025;

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
    setSaveErr('');
    setShowModal(true);
  }

  // FY2026 auto-calc
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

  // FY2025 auto-calc
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
      load(year, month);
    } catch { setSaveErr('Network error.'); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-400 [appearance:textfield]';
  const autoCls  = inputCls + ' bg-slate-100 cursor-not-allowed';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  // ── Table headers ──
  const headers2026 = ['Date','Day','Medicine','OP#','OP Charges','Trip/Others','Total Sales','GPay','Expense','GPay+Exp','Extra','Return','Total Cash','Cash Given','Excess/Deficit','Notes'];
  const headers2025 = ['Date','Day','Total Sale','OP Charges','Injection','Medicine','GPay','Expense','GPay+Exp','Extra','Return','Total Cash','Cash Given','Excess/Deficit','Notes'];

  return (
    <div className="w-full px-4 py-6">
      <div className="grid gap-4 xl:grid-cols-[288px_1fr]">
        <Sidebar active="/accounts" />

        <section className="animate-fadeIn space-y-6 pb-24">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-700">Daily Accounts</p>
              <h1 className="text-3xl font-semibold text-slate-900">Accounts Ledger</h1>
              <p className="mt-1 text-sm text-slate-500">
                {MONTHS.find(m => m.value === month)?.label} {year} — Dr. Kabilan's Clinic
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
              <button
                onClick={openModal}
                className="flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
              >
                <PlusCircle size={18} /> Add Entry
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-x-auto p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton h-10 rounded-xl" style={{ animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">{error}</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                    {(isFY2025 ? headers2025 : headers2026).map(h => (
                      <th key={h} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const ed = r.excess_deficit ?? 0;
                    const rowBg  = ed < 0 ? 'bg-red-50' : ed > 0 ? 'bg-green-50' : '';
                    const edColor = ed < 0 ? 'text-red-700 font-semibold' : ed > 0 ? 'text-green-700 font-semibold' : 'text-slate-500';
                    const dateStr = new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                    return (
                      <tr key={r.id} className={`border-b border-slate-100 ${rowBg} transition hover:brightness-95`}>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">{dateStr}</td>
                        <td className="px-3 py-2 text-slate-500">{r.day_name ?? '—'}</td>

                        {isFY2025 ? (
                          <>
                            <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmt(r.total_sale_amount)}</td>
                            <td className="px-3 py-2 text-right">{fmt(r.total_op_charges)}</td>
                            <td className="px-3 py-2 text-right text-purple-700">{fmt(r.injection)}</td>
                            <td className="px-3 py-2 text-right">{fmt(r.total_medicine_sales)}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-right">{fmt(r.total_medicine_sales)}</td>
                            <td className="px-3 py-2 text-center text-slate-600">{r.no_of_op || '—'}</td>
                            <td className="px-3 py-2 text-right">{fmt(r.total_op_charges)}</td>
                            <td className="px-3 py-2 text-right">{fmt(r.trip_and_others)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmt(r.total_sales)}</td>
                          </>
                        )}

                        <td className="px-3 py-2 text-right text-blue-700">{fmt(r.gpay)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{fmt(r.expense)}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{fmt(r.gpay_and_expense)}</td>
                        <td className="px-3 py-2 text-right text-green-700">{fmt(r.extra_charge)}</td>
                        <td className="px-3 py-2 text-right text-red-500">{fmt(r.return_amount)}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">{fmt(r.total_cash)}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.total_cash_given)}</td>
                        <td className={`px-3 py-2 text-right ${edColor}`}>{fmtED(ed)}</td>
                        <td className="max-w-[160px] truncate px-3 py-2 text-slate-500" title={r.notes ?? ''}>{r.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-semibold text-slate-800 text-xs">
                      <td className="px-3 py-3" colSpan={2}>TOTALS ({rows.length} days)</td>

                      {isFY2025 ? (
                        <>
                          <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'total_sale_amount'))}</td>
                          <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'total_op_charges'))}</td>
                          <td className="px-3 py-3 text-right text-purple-700">₹{fmt(sum(rows,'injection'))}</td>
                          <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'total_medicine_sales'))}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'total_medicine_sales'))}</td>
                          <td className="px-3 py-3 text-center">{rows.reduce((s,r) => s + (r.no_of_op||0), 0)}</td>
                          <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'total_op_charges'))}</td>
                          <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'trip_and_others'))}</td>
                          <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'total_sales'))}</td>
                        </>
                      )}

                      <td className="px-3 py-3 text-right text-blue-700">₹{fmt(sum(rows,'gpay'))}</td>
                      <td className="px-3 py-3 text-right text-red-600">₹{fmt(sum(rows,'expense'))}</td>
                      <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'gpay_and_expense'))}</td>
                      <td className="px-3 py-3 text-right text-green-700">₹{fmt(sum(rows,'extra_charge'))}</td>
                      <td className="px-3 py-3 text-right text-red-500">₹{fmt(sum(rows,'return_amount'))}</td>
                      <td className="px-3 py-3 text-right font-bold">₹{fmt(sum(rows,'total_cash'))}</td>
                      <td className="px-3 py-3 text-right">₹{fmt(sum(rows,'total_cash_given'))}</td>
                      <td className={`px-3 py-3 text-right ${sum(rows,'excess_deficit') < 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {fmtED(sum(rows,'excess_deficit'))}
                      </td>
                      <td className="px-3 py-3" />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </section>
      </div>
      <BottomNav active="/accounts" />

      {/* Add Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add Daily Entry</h2>
                {isFY2025 && <p className="text-xs text-amber-600 mt-0.5">FY2025 format — includes Injection & Total Sale</p>}
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-xl p-2 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Common: Date & Day */}
              <label className="block">
                <span className={labelCls}>Date *</span>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </label>
              <label className="block">
                <span className={labelCls}>Day</span>
                <input type="text" value={form.day_name} onChange={e => set('day_name', e.target.value)}
                  placeholder="MONDAY" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </label>

              {isFY2025 ? (
                /* ── FY2025 Fields ── */
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
                /* ── FY2026 Fields ── */
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
                    <span className={labelCls}>Trip & Others</span>
                    <input type="number" min="0" value={form.trip_and_others ?? ''} onChange={e => set('trip_and_others', e.target.value)} className={inputCls} placeholder="0" />
                  </label>
                  <label className="block rounded-xl bg-slate-50 p-3">
                    <span className={labelCls}>Total Sales (auto)</span>
                    <input type="number" value={form.total_sales ?? ''} readOnly className={autoCls} />
                  </label>
                </>
              )}

              {/* Common fields */}
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
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
