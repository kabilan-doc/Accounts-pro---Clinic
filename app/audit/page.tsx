'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { AuditTable, type AuditRow } from '@/components/AuditTable';

export default function AuditPage() {
  const [rows,    setRows]    = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // filters
  const [action,    setAction]    = useState('');
  const [table,     setTable]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (action)    params.set('action',     action);
    if (table)     params.set('table',      table);
    if (startDate) params.set('start_date', startDate);
    if (endDate)   params.set('end_date',   endDate);

    try {
      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) throw new Error('Failed to load audit log');
      const data = await res.json();
      setRows(data.audit ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading audit log');
    } finally {
      setLoading(false);
    }
  }, [action, table, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 py-6">
      <div className="grid gap-4 xl:grid-cols-[288px_1fr]">
        <Sidebar active="/audit" />

        <section className="space-y-6 pb-24">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-600">Audit</p>
            <h1 className="text-3xl font-semibold text-slate-900">Change History</h1>
            <p className="mt-1 text-sm text-slate-500">
              Append-only log of every INSERT, UPDATE, and VOID — cannot be edited or deleted.
            </p>
          </div>

          <div className="card space-y-4">
            <h3 className="font-semibold text-slate-700">Filters</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Action</span>
                <select value={action} onChange={e => setAction(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">All actions</option>
                  <option value="INSERT">INSERT</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="VOID">VOID</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Table</span>
                <select value={table} onChange={e => setTable(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">All tables</option>
                  <option value="account_entries">account_entries</option>
                  <option value="profiles">profiles</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">From</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">To</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={load}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Apply
              </button>
              <button type="button"
                onClick={() => { setAction(''); setTable(''); setStartDate(''); setEndDate(''); }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Reset
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="h-60 animate-pulse rounded-3xl bg-slate-100" />
          ) : (
            <>
              <p className="text-sm text-slate-500">{rows.length} record{rows.length !== 1 ? 's' : ''} found</p>
              <AuditTable rows={rows} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
