'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Filter } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { EntryTable, type EntryRow } from '@/components/EntryTable';

const INCOME_CATS = ['Consultation', 'Pharmacy Sales', 'Lab / Investigations', 'Procedure', 'Other Income'];
const EXPENSE_CATS = ['Staff Salary', 'Rent', 'Medical Supplies', 'Electricity', 'Equipment', 'Lab Reagents', 'Miscellaneous'];
const ALL_CATS = [...INCOME_CATS, ...EXPENSE_CATS];
const MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit'];

function todayStr() { return new Date().toISOString().substring(0, 10); }
function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function HistoryPage() {
  // ── filters ────────────────────────────────────────────────────────────
  const [startDate,    setStartDate]    = useState(monthStartStr());
  const [endDate,      setEndDate]      = useState(todayStr());
  const [entryType,    setEntryType]    = useState('');
  const [category,     setCategory]     = useState('');
  const [paymentMode,  setPaymentMode]  = useState('');
  const [page,         setPage]         = useState(1);
  const [showFilters,  setShowFilters]  = useState(false);

  // ── data ───────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const buildQS = useCallback((p = page) => {
    const params = new URLSearchParams({ page: String(p) });
    if (startDate)   params.set('start_date',   startDate);
    if (endDate)     params.set('end_date',     endDate);
    if (entryType)   params.set('entry_type',   entryType);
    if (category)    params.set('category',     category);
    if (paymentMode) params.set('payment_mode', paymentMode);
    return params.toString();
  }, [page, startDate, endDate, entryType, category, paymentMode]);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/entries?${buildQS(p)}`);
      if (!res.ok) throw new Error('Failed to load entries');
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading entries');
    } finally {
      setLoading(false);
    }
  }, [buildQS, page]);

  useEffect(() => { load(1); setPage(1); }, [startDate, endDate, entryType, category, paymentMode]);
  useEffect(() => { load(page); }, [page]);

  const handlePageChange = (p: number) => { setPage(p); load(p); };

  // ── exports ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const qs = new URLSearchParams();
    if (startDate) qs.set('start_date', startDate);
    if (endDate)   qs.set('end_date',   endDate);
    window.open(`/api/export/csv?${qs}`, '_blank');
  };

  const exportPDF = () => {
    const qs = new URLSearchParams();
    if (startDate) qs.set('start_date', startDate);
    if (endDate)   qs.set('end_date',   endDate);
    window.open(`/api/export/pdf?${qs}`, '_blank');
  };

  return (
    <div className="container py-10">
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <Sidebar active="/history" />

        <section className="space-y-6 pb-24">
          {/* ── header ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-600">Ledger</p>
              <h1 className="text-3xl font-semibold text-slate-900">Entry History</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowFilters(f => !f)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Filter size={15} /> Filters
              </button>
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Download size={15} /> CSV
              </button>
              <button
                type="button"
                onClick={exportPDF}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <FileText size={15} /> PDF
              </button>
            </div>
          </div>

          {/* ── filter panel ── */}
          {showFilters && (
            <div className="card space-y-4">
              <h3 className="font-semibold text-slate-700">Filter entries</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Type</span>
                  <select
                    value={entryType}
                    onChange={e => setEntryType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">All types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Category</span>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">All categories</option>
                    {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Payment mode</span>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">All modes</option>
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={() => { setStartDate(monthStartStr()); setEndDate(todayStr()); setEntryType(''); setCategory(''); setPaymentMode(''); }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Reset filters
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── table ── */}
          <div className="space-y-3">
            {loading ? (
              <div className="h-60 animate-pulse rounded-3xl bg-slate-100" />
            ) : (
              <EntryTable
                entries={entries}
                total={total}
                page={page}
                canVoid
                onPageChange={handlePageChange}
                onVoidSuccess={() => load(page)}
              />
            )}
          </div>
        </section>
      </div>

      <BottomNav active="/history" />
    </div>
  );
}
