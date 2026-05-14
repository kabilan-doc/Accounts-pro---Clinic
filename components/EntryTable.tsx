'use client';

import { useState } from 'react';
import { formatINR } from '@/lib/formatCurrency';
import { ChevronLeft, ChevronRight, AlertTriangle, Pencil, Trash2, Download, CheckSquare } from 'lucide-react';

export interface EntryRow {
  id: string;
  entry_date: string;
  entry_type: 'income' | 'expense';
  category: string;
  subcategory?: string | null;
  payment_mode: string;
  amount: number;
  description: string;
  reference_number?: string | null;
  is_voided: boolean;
  void_reason?: string | null;
  entered_by_name?: string;
}

interface EntryTableProps {
  entries: EntryRow[];
  total: number;
  page: number;
  pageSize?: number;
  canVoid?: boolean;
  onPageChange: (page: number) => void;
  onVoidSuccess: () => void;
}

const INCOME_CATS  = ['Consultation', 'Pharmacy Sales', 'Lab / Investigations', 'Procedure', 'Other Income'];
const EXPENSE_CATS = ['Staff Salary', 'Rent', 'Medical Supplies', 'Electricity', 'Equipment', 'Lab Reagents', 'Miscellaneous'];
const MODES        = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit'];

// ── Category pill colours ─────────────────────────────────────────────────────
const CAT_COLOURS: Record<string, string> = {
  'Consultation':        'bg-blue-100 text-blue-700',
  'Pharmacy Sales':      'bg-purple-100 text-purple-700',
  'Lab / Investigations':'bg-teal-100 text-teal-700',
  'Procedure':           'bg-indigo-100 text-indigo-700',
  'Other Income':        'bg-green-100 text-green-700',
  'Staff Salary':        'bg-orange-100 text-orange-700',
  'Rent':                'bg-amber-100 text-amber-700',
  'Medical Supplies':    'bg-pink-100 text-pink-700',
  'Electricity':         'bg-yellow-100 text-yellow-700',
  'Equipment':           'bg-slate-200 text-slate-700',
  'Lab Reagents':        'bg-cyan-100 text-cyan-700',
  'Miscellaneous':       'bg-rose-100 text-rose-700',
};

function CatPill({ category, voided }: { category: string; voided: boolean }) {
  const cls = CAT_COLOURS[category] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cls} ${voided ? 'opacity-50 line-through' : ''}`}>
      {category}
    </span>
  );
}

// ── Bulk CSV export ───────────────────────────────────────────────────────────
function exportRowsCSV(rows: EntryRow[]) {
  const header = ['Date', 'Type', 'Category', 'Amount', 'Mode', 'Description', 'Reference', 'Status'];
  const lines  = rows.map(r => [
    r.entry_date,
    r.entry_type,
    r.category,
    r.amount,
    r.payment_mode,
    `"${(r.description ?? '').replace(/"/g, '""')}"`,
    r.reference_number ?? '',
    r.is_voided ? 'Voided' : 'Active'
  ].join(','));
  const csv  = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `entries_export_${new Date().toISOString().substring(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EntryTable({
  entries,
  total,
  page,
  pageSize = 20,
  canVoid = false,
  onPageChange,
  onVoidSuccess
}: EntryTableProps) {
  // ── void state ───────────────────────────────────────────────────────────
  const [voidTarget,  setVoidTarget]  = useState<EntryRow | null>(null);
  const [voidReason,  setVoidReason]  = useState('');
  const [voidError,   setVoidError]   = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  // ── edit state ───────────────────────────────────────────────────────────
  const [editTarget,    setEditTarget]    = useState<EntryRow | null>(null);
  const [editAmount,    setEditAmount]    = useState('');
  const [editCategory,  setEditCategory]  = useState('');
  const [editMode,      setEditMode]      = useState('');
  const [editDesc,      setEditDesc]      = useState('');
  const [editDate,      setEditDate]      = useState('');
  const [editType,      setEditType]      = useState<'income' | 'expense'>('income');
  const [editError,     setEditError]     = useState('');
  const [editLoading,   setEditLoading]   = useState(false);

  // ── bulk selection state ─────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const activeEntries = entries.filter(e => !e.is_voided);
  const allActiveSelected = activeEntries.length > 0 && activeEntries.every(e => selected.has(e.id));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allActiveSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(activeEntries.map(e => e.id)));
    }
  };

  const selectedRows = entries.filter(e => selected.has(e.id));

  // ── void handlers ─────────────────────────────────────────────────────────
  const handleVoidSubmit = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) { setVoidError('Please enter a void reason.'); return; }
    setVoidLoading(true); setVoidError('');
    try {
      const res = await fetch(`/api/entries/${voidTarget.id}/void`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ void_reason: voidReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setVoidError(data.message || 'Failed to void entry.'); }
      else { setVoidTarget(null); setVoidReason(''); onVoidSuccess(); }
    } catch { setVoidError('Network error.'); }
    finally { setVoidLoading(false); }
  };

  const handleBulkVoid = async () => {
    if (!voidReason.trim()) { setVoidError('Please enter a void reason.'); return; }
    setVoidLoading(true); setVoidError('');
    let failed = 0;
    for (const id of selected) {
      try {
        const res = await fetch(`/api/entries/${id}/void`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ void_reason: voidReason.trim() })
        });
        if (!res.ok) failed++;
      } catch { failed++; }
    }
    setVoidLoading(false);
    if (failed > 0) { setVoidError(`${failed} entries could not be voided (permission or server error).`); }
    else { setVoidTarget(null); setVoidReason(''); setSelected(new Set()); onVoidSuccess(); }
  };

  // ── edit handlers ─────────────────────────────────────────────────────────
  const openEdit = (row: EntryRow) => {
    setEditTarget(row);
    setEditAmount(String(row.amount));
    setEditCategory(row.category);
    setEditMode(row.payment_mode);
    setEditDesc(row.description ?? '');
    setEditDate(row.entry_date);
    setEditType(row.entry_type);
    setEditError('');
  };

  const handleEditSubmit = async () => {
    if (!editTarget) return;
    if (!editAmount || isNaN(Number(editAmount)) || Number(editAmount) <= 0) {
      setEditError('Enter a valid amount.'); return;
    }
    setEditLoading(true); setEditError('');
    try {
      const res = await fetch(`/api/entries/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amount:       Number(editAmount),
          category:     editCategory,
          payment_mode: editMode,
          description:  editDesc,
          entry_date:   editDate,
          entry_type:   editType
        })
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.message || 'Failed to update entry.'); }
      else { setEditTarget(null); onVoidSuccess(); }
    } catch { setEditError('Network error.'); }
    finally { setEditLoading(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const catList    = editType === 'income' ? INCOME_CATS : EXPENSE_CATS;

  return (
    <>
      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
          <CheckSquare size={16} className="text-brand-600" />
          <span className="text-sm font-semibold text-brand-700">{selected.size} selected</span>
          <button
            type="button"
            onClick={() => exportRowsCSV(selectedRows)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={13} /> Export CSV
          </button>
          {canVoid && (
            <button
              type="button"
              onClick={() => { setVoidTarget({ id: '__bulk__' } as EntryRow); setVoidReason(''); setVoidError(''); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              <Trash2 size={13} /> Void selected
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Mobile card list (< sm) ── */}
      <div className="sm:hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
        {entries.length === 0 && (
          <p className="px-4 py-10 text-center text-slate-400 text-sm">No entries found</p>
        )}
        {entries.map(row => (
          <div key={row.id} className={`p-4 ${row.is_voided ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {canVoid && !row.is_voided && (
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                  />
                )}
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  row.entry_type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {row.entry_type === 'income' ? 'Income' : 'Expense'}
                </span>
                <span className="text-xs text-slate-500">{row.entry_date}</span>
                {row.is_voided && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    <AlertTriangle size={10} /> Voided
                  </span>
                )}
              </div>
              <span className={`font-bold text-sm whitespace-nowrap ${row.is_voided ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                {formatINR(row.amount)}
              </span>
            </div>
            <div className="mt-1.5">
              <CatPill category={row.category} voided={row.is_voided} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{row.payment_mode} · {row.description || '—'}</p>
            {canVoid && !row.is_voided && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 flex items-center gap-1"
                >
                  <Pencil size={11} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => { setVoidTarget(row); setVoidReason(''); setVoidError(''); }}
                  className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  Void
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Desktop table (sm+) ── */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {canVoid && (
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allActiveSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                    title="Select all active"
                  />
                </th>
              )}
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
              <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-slate-600">Mode</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
              <th className="hidden lg:table-cell px-4 py-3 text-left font-medium text-slate-600">Description</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              {canVoid && <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {entries.length === 0 && (
              <tr>
                <td colSpan={canVoid ? 9 : 7} className="px-4 py-10 text-center text-slate-400">
                  No entries found
                </td>
              </tr>
            )}
            {entries.map((row, idx) => {
              const rowBg = row.is_voided
                ? 'opacity-50'
                : selected.has(row.id)
                ? 'bg-brand-50'
                : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/60';
              return (
                <tr key={row.id} className={`transition-colors duration-100 ${rowBg}`}>
                  {canVoid && (
                    <td className="px-3 py-3">
                      {!row.is_voided && (
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                        />
                      )}
                    </td>
                  )}
                  <td className={`sticky left-0 z-10 whitespace-nowrap px-4 py-3 font-medium text-slate-700 font-mono text-xs ${selected.has(row.id) ? 'bg-brand-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    {row.entry_date}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      row.entry_type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {row.entry_type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CatPill category={row.category} voided={row.is_voided} />
                    {row.subcategory && (
                      <span className="ml-1 text-xs text-slate-400">· {row.subcategory}</span>
                    )}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-slate-600">{row.payment_mode}</td>
                  <td className="px-4 py-3 text-right font-semibold font-mono text-slate-800">
                    <span className={row.is_voided ? 'line-through text-slate-400' : ''}>{formatINR(row.amount)}</span>
                  </td>
                  <td className="hidden lg:table-cell max-w-[200px] truncate px-4 py-3 text-slate-600" title={row.description}>
                    {row.description}
                    {row.reference_number && (
                      <span className="ml-1 text-xs text-slate-400">#{row.reference_number}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.is_voided ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        <AlertTriangle size={11} /> VOIDED
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-600">
                        Active
                      </span>
                    )}
                  </td>
                  {canVoid && (
                    <td className="px-4 py-3">
                      {!row.is_voided && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            title="Edit entry"
                            className="rounded-xl bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setVoidTarget(row); setVoidReason(''); setVoidError(''); }}
                            className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            Void
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
          <span>Page {page} of {totalPages} &nbsp;·&nbsp; {total} total entries</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── void / bulk-void modal ── */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:px-4">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">
              {voidTarget.id === '__bulk__' ? `Void ${selected.size} entries` : 'Void Entry'}
            </h3>
            {voidTarget.id !== '__bulk__' && (
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold">{voidTarget.category}</span> — {formatINR(voidTarget.amount)} on {voidTarget.entry_date}. This cannot be undone.
              </p>
            )}
            {voidTarget.id === '__bulk__' && (
              <p className="mt-2 text-sm text-slate-600">
                You are about to void {selected.size} selected entries. This cannot be undone.
              </p>
            )}
            <label className="mt-5 block">
              <span className="text-sm font-medium text-slate-700">Void reason *</span>
              <textarea
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                rows={3}
                placeholder="Entered duplicate / incorrect amount / wrong category…"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
            {voidError && <p className="mt-2 text-sm text-red-600">{voidError}</p>}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setVoidTarget(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button"
                onClick={voidTarget.id === '__bulk__' ? handleBulkVoid : handleVoidSubmit}
                disabled={voidLoading}
                className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {voidLoading ? 'Voiding…' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── edit modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:px-4">
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-slate-900">Edit Entry</h3>
            <p className="mt-1 text-sm text-slate-500">Changes are logged to the audit trail.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Date</span>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-600">Type</span>
                <select value={editType} onChange={e => { setEditType(e.target.value as 'income' | 'expense'); setEditCategory(''); }}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-600">Category</span>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Select category</option>
                  {catList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-600">Payment Mode</span>
                <select value={editMode} onChange={e => setEditMode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Amount (₹)</span>
                <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                  min="0.01" step="0.01"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Description</span>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none" />
              </label>
            </div>

            {editError && <p className="mt-3 text-sm text-red-600">{editError}</p>}

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setEditTarget(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleEditSubmit} disabled={editLoading}
                className="flex-1 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {editLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
