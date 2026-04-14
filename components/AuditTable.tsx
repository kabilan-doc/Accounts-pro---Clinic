'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface AuditRow {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'VOID';
  changed_by: string;
  changed_at: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address?: string | null;
  changed_by_name?: string;
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  VOID:   'bg-red-100   text-red-700'
};

function DiffView({
  oldVal,
  newVal
}: {
  oldVal: Record<string, unknown> | null;
  newVal: Record<string, unknown> | null;
}) {
  const keys = Array.from(
    new Set([
      ...Object.keys(oldVal ?? {}),
      ...Object.keys(newVal ?? {})
    ])
  ).filter(k => !['id', 'created_at'].includes(k));

  const changed = keys.filter(
    k => JSON.stringify((oldVal ?? {})[k]) !== JSON.stringify((newVal ?? {})[k])
  );

  if (!changed.length) return <p className="text-xs text-slate-400">No field changes recorded</p>;

  return (
    <div className="space-y-1">
      {changed.map(k => (
        <div key={k} className="grid grid-cols-[120px_1fr_1fr] gap-2 text-xs">
          <span className="font-medium text-slate-600">{k}</span>
          <span className="truncate rounded bg-red-50 px-1 py-0.5 text-red-700 line-through">
            {String((oldVal ?? {})[k] ?? '—')}
          </span>
          <span className="truncate rounded bg-green-50 px-1 py-0.5 text-green-700">
            {String((newVal ?? {})[k] ?? '—')}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded(prev => (prev === id ? null : id));

  const fmt = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Time (IST)</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Table</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                No audit records found
              </td>
            </tr>
          )}
          {rows.map(row => (
            <>
              <tr
                key={row.id}
                className="cursor-pointer transition hover:bg-slate-50"
                onClick={() => toggle(row.id)}
              >
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {fmt(row.changed_at)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {row.table_name}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${ACTION_COLORS[row.action] ?? 'bg-slate-100 text-slate-600'}`}>
                    {row.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.changed_by_name ?? row.changed_by.slice(0, 8) + '…'}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    {expanded === row.id ? 'Hide diff' : 'Show diff'}
                    {expanded === row.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </td>
              </tr>
              {expanded === row.id && (
                <tr key={`${row.id}-diff`} className="bg-slate-50">
                  <td colSpan={5} className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>Record: <code className="rounded bg-slate-200 px-1">{row.record_id}</code></span>
                        {row.ip_address && <span>IP: {row.ip_address}</span>}
                      </div>
                      <DiffView oldVal={row.old_value} newVal={row.new_value} />
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
