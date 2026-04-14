'use client';

import { useState } from 'react';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Field {
  key: string;
  label: string;
  sub: string;
  color: string;
}

const INCOME_FIELDS: Field[] = [
  { key: 'op',    label: 'OP',            sub: 'Consultation',   color: 'blue'   },
  { key: 'med',   label: 'Medicine',      sub: 'Pharmacy Sales', color: 'green'  },
  { key: 'trip',  label: 'Trip / Others', sub: 'Other Income',   color: 'purple' },
  { key: 'extra', label: 'Extra Charge',  sub: 'Other Income',   color: 'orange' },
];

export function EntryForm() {
  const today = new Date().toISOString().substring(0, 10);
  const [date, setDate] = useState(today);

  // income fields
  const [op,    setOp]    = useState('');
  const [med,   setMed]   = useState('');
  const [trip,  setTrip]  = useState('');
  const [extra, setExtra] = useState('');
  const [gpay,  setGpay]  = useState('');
  const [noOfOp, setNoOfOp] = useState('');

  // expense / deductions
  const [expense, setExpense] = useState('');
  const [returns, setReturns] = useState('');

  // cash reconciliation
  const [cashGiven, setCashGiven] = useState('');
  const [notes, setNotes]         = useState('');

  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const n = (v: string) => parseFloat(v) || 0;

  const totalIncome  = n(op) + n(med) + n(trip) + n(extra);
  const gpayAmt      = n(gpay);
  const totalExpense = n(expense) + n(returns);

  // matches accounts page formula: totalSales - gpay - expense + extra - returns
  // totalSales = op + med + trip (no extra in accounts total_sales)
  const totalSales   = n(op) + n(med) + n(trip);
  const gpayExpense  = gpayAmt + n(expense);
  const totalCash    = totalSales - gpayAmt - n(expense) + n(extra) - n(returns);
  const excessDeficit = n(cashGiven) - totalCash;

  const handleSubmit = async () => {
    setMessage(null);
    if (totalIncome === 0 && totalExpense === 0) {
      setMessage({ text: 'Enter at least one amount.', ok: false });
      return;
    }
    setLoading(true);

    const entries: object[] = [];
    const src = `Daily entry ${date}`;

    if (n(op)    > 0) entries.push({ entry_date: date, entry_type: 'income', category: 'Consultation',   payment_mode: 'Cash', amount: n(op),    description: src, subcategory: 'OP' });
    if (n(med)   > 0) entries.push({ entry_date: date, entry_type: 'income', category: 'Pharmacy Sales', payment_mode: 'Cash', amount: n(med),   description: src });
    if (n(trip)  > 0) entries.push({ entry_date: date, entry_type: 'income', category: 'Other Income',   payment_mode: 'Cash', amount: n(trip),  description: src, subcategory: 'Trip/Others' });
    if (n(extra) > 0) entries.push({ entry_date: date, entry_type: 'income', category: 'Other Income',   payment_mode: 'Cash', amount: n(extra), description: src, subcategory: 'Extra Charge' });

    // GPay: record as UPI income so payment-mode totals are correct
    if (n(gpay) > 0) entries.push({ entry_date: date, entry_type: 'income', category: 'Other Income', payment_mode: 'UPI', amount: n(gpay), description: `${src} — GPay collected`, subcategory: 'GPay' });

    if (n(expense) > 0) entries.push({ entry_date: date, entry_type: 'expense', category: 'Miscellaneous', payment_mode: 'Cash', amount: n(expense), description: src });
    if (n(returns) > 0) entries.push({ entry_date: date, entry_type: 'expense', category: 'Returns',       payment_mode: 'Cash', amount: n(returns), description: src });

    try {
      // Save individual entries
      const results = await Promise.all(
        entries.map(e =>
          fetch('/api/entries', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(e)
          }).then(r => r.json())
        )
      );
      const failed = results.filter((r: any) => r.error || r.message?.includes('error'));
      if (failed.length) {
        setMessage({ text: 'Some entries failed. Check network.', ok: false });
        return;
      }

      // Sync to daily_accounts so Accounts Ledger stays up to date
      const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
      const dayName = days[new Date(date + 'T00:00:00').getDay()];
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          _fy:                   2026,
          date,
          day_name:              dayName,
          total_medicine_sales:  n(med),
          no_of_op:              n(noOfOp),
          total_op_charges:      n(op),
          trip_and_others:       n(trip),
          total_sales:           totalSales,
          gpay:                  n(gpay),
          expense:               n(expense),
          gpay_and_expense:      gpayExpense,
          extra_charge:          n(extra),
          return_amount:         n(returns),
          total_cash:            totalCash,
          total_cash_given:      n(cashGiven),
          excess_deficit:        excessDeficit,
          notes:                 notes || null,
        })
      });

      setMessage({ text: `Saved ${entries.length} entries for ${date}.`, ok: true });
      setOp(''); setMed(''); setTrip(''); setExtra('');
      setGpay(''); setExpense(''); setReturns('');
      setNoOfOp(''); setCashGiven(''); setNotes('');
    } catch {
      setMessage({ text: 'Network error.', ok: false });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 [appearance:textfield]';
  const autoCls  = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-right text-lg font-semibold text-slate-500 cursor-not-allowed [appearance:textfield]';

  return (
    <div className="space-y-6">

      {/* Date */}
      <div className="card">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Date</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      {/* Income */}
      <div className="card space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-green-700">Income</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* No. of OP */}
          <label className="block">
            <span className="text-sm font-medium text-slate-700">No. of OP <span className="text-xs text-slate-400">(Patient count)</span></span>
            <input
              type="number"
              min="0"
              step="1"
              value={noOfOp}
              onChange={e => setNoOfOp(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </label>

          {INCOME_FIELDS.map(f => {
            const vals: Record<string, string> = { op, med, trip, extra };
            const setters: Record<string, (v: string) => void> = { op: setOp, med: setMed, trip: setTrip, extra: setExtra };
            return (
              <label key={f.key} className="block">
                <span className="text-sm font-medium text-slate-700">
                  {f.label} <span className="text-xs text-slate-400">({f.sub})</span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={vals[f.key]}
                  onChange={e => setters[f.key](e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </label>
            );
          })}
        </div>

        {/* GPay row */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <label className="block">
            <span className="text-sm font-medium text-blue-800">
              GPay / UPI <span className="text-xs text-blue-500">(how much of the above was received via GPay)</span>
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={gpay}
              onChange={e => setGpay(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-right text-lg font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 [appearance:textfield]"
            />
          </label>
        </div>

        {/* Income totals */}
        <div className="grid grid-cols-3 gap-3 rounded-2xl bg-green-50 p-4 text-center">
          <div>
            <p className="text-xs text-slate-500">Total Income</p>
            <p className="text-xl font-bold text-green-700">₹{fmt(totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">GPay (UPI)</p>
            <p className="text-xl font-bold text-blue-700">₹{fmt(gpayAmt)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Cash</p>
            <p className="text-xl font-bold text-slate-700">₹{fmt(totalIncome - gpayAmt)}</p>
          </div>
        </div>
      </div>

      {/* Expense */}
      <div className="card space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-red-700">Expense / Deductions</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Expense <span className="text-xs text-slate-400">(Miscellaneous)</span></span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={expense}
              onChange={e => setExpense(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Returns <span className="text-xs text-slate-400">(Refunds)</span></span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={returns}
              onChange={e => setReturns(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </label>
        </div>
      </div>

      {/* Cash Reconciliation */}
      <div className="card space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-700">Cash Reconciliation</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block rounded-xl bg-slate-50 p-3">
            <span className="text-sm font-medium text-slate-600">Total Cash <span className="text-xs text-slate-400">(auto)</span></span>
            <input type="number" value={totalCash.toFixed(2)} readOnly className={autoCls + ' font-bold'} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Total Cash Given</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cashGiven}
              onChange={e => setCashGiven(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </label>

          <label className={`block rounded-xl p-3 sm:col-span-2 ${excessDeficit < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <span className="text-sm font-medium text-slate-600">Excess / Deficit <span className="text-xs text-slate-400">(Cash Given − Total Cash, auto)</span></span>
            <input
              type="number"
              value={cashGiven ? excessDeficit.toFixed(2) : ''}
              readOnly
              className={`mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-right text-lg font-bold cursor-not-allowed [appearance:textfield] ${
                excessDeficit < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
              placeholder="—"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Notes</span>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any notes for the day..."
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      {/* Net summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-slate-500">Total Income</p>
          <p className="text-2xl font-bold text-green-700">₹{fmt(totalIncome)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500">Total Expense</p>
          <p className="text-2xl font-bold text-red-600">₹{fmt(totalExpense)}</p>
        </div>
        <div className={`card text-center ${(totalIncome - totalExpense) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-xs text-slate-500">Net Balance</p>
          <p className={`text-2xl font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            ₹{fmt(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded-3xl bg-brand-600 py-4 text-lg font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : `Save Entries for ${date}`}
      </button>

      {message && (
        <p className={`text-sm font-medium ${message.ok ? 'text-green-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
