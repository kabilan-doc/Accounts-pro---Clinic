'use client';

import { useState } from 'react';
import { formatINR } from '@/lib/formatCurrency';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

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

export function EntryTable({
  entries,
  total,
  page,
  pageSize = 20,
  canVoid = false,
  onPageChange,
  onVoidSuccess
}: EntryTableProps) {
  const [voidTarget, setVoidTarget] = useState<EntryRow | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleVoidSubmit = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      setVoidError('Please enter a void reason.');
      return;
    }
    setVoidLoading(true);
    setVoidError('');
    try {
      const res = await fetch(`/api/entries/${voidTarget.id}/void`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ void_reason: voidReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setVoidError(data.message || 'Failed to void entry.');
      } else {
        setVoidTarget(null);
        setVoidReason('');
        onVoidSuccess();
      }
    } catch {
      setVoidError('Network error.');
    } finally {
      setVoidLoading(false);
    }
  };

  return (
    <>
      {/* ── table ── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Mode</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Description</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              {canVoid && (
                <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {entries.length === 0 && (
              <tr>
                <td colSpan={canVoid ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                  No entries found
                </td>
              </tr>
            )}
            {entries.map(row => (
              <tr
                key={row.id}
                className={`transition hover:bg-slate-50 ${row.is_voided ? 'opacity-50' : ''}`}
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                  {row.entry_date}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    row.entry_type === 'income'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {row.entry_type === 'income' ? 'Income' : 'Expense'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <span className={row.is_voided ? 'line-through' : ''}>{row.category}</span>
                  {row.subcategory && (
                    <span className="ml-1 text-xs text-slate-400">· {row.subcategory}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.payment_mode}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                  <span className={row.is_voided ? 'line-through' : ''}>
                    {formatINR(row.amount)}
                  </span>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-slate-600" title={row.description}>
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
                      <button
                        type="button"
                        onClick={() => { setVoidTarget(row); setVoidReason(''); setVoidError(''); }}
                        className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        Void
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
          <span>
            Page {page} of {totalPages} &nbsp;·&nbsp; {total} total entries
          </span>
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

      {/* ── void modal ── */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">Void Entry</h3>
            <p className="mt-2 text-sm text-slate-600">
              You are about to void{' '}
              <span className="font-semibold">{voidTarget.category}</span> —{' '}
              {formatINR(voidTarget.amount)} on {voidTarget.entry_date}.
              This cannot be undone.
            </p>

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

            {voidError && (
              <p className="mt-2 text-sm text-red-600">{voidError}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVoidSubmit}
                disabled={voidLoading}
                className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {voidLoading ? 'Voiding…' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
