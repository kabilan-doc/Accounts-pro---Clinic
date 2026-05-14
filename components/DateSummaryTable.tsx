import { formatINR } from '@/lib/formatCurrency';

interface DateSummaryRow {
  date: string;
  income: number;
  expense: number;
  net: number;
  cash: number;
  upi: number;
  card: number;
  count: number;
}

const Num = ({ v, cls = '' }: { v: number; cls?: string }) => (
  <span className={`font-mono tabular-nums ${cls}`}>{formatINR(v)}</span>
);

export function DateSummaryTable({ rows }: { rows: DateSummaryRow[] }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Date</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Income</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Expense</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Net</th>
              <th className="hidden sm:table-cell px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Cash</th>
              <th className="hidden sm:table-cell px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">UPI</th>
              <th className="hidden md:table-cell px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Card</th>
              <th className="hidden sm:table-cell px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Entries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => {
              const highExpense = row.income > 0 && row.expense > row.income * 0.1;
              const isEven = idx % 2 === 0;
              const rowBg = highExpense
                ? 'bg-red-50/60 hover:bg-red-100/60'
                : isEven
                ? 'bg-white hover:bg-slate-50/80'
                : 'bg-slate-50/40 hover:bg-slate-100/60';
              const stickyBg = highExpense ? 'bg-red-50' : isEven ? 'bg-white' : 'bg-slate-50';

              return (
                <tr key={row.date} className={`transition-colors duration-100 ${rowBg}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 font-semibold text-slate-700 whitespace-nowrap font-mono text-sm ${stickyBg}`}>
                    {row.date}
                    {highExpense && (
                      <span className="ml-2 inline-block rounded-full bg-red-200 px-1.5 py-0.5 text-[10px] font-bold text-red-700 leading-none">High Exp</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><Num v={row.income} cls="font-semibold text-green-700" /></td>
                  <td className="px-4 py-3"><Num v={row.expense} cls={highExpense ? 'font-bold text-red-700' : 'text-red-500'} /></td>
                  <td className="px-4 py-3"><Num v={row.net} cls={`font-semibold ${row.net >= 0 ? 'text-blue-700' : 'text-red-600'}`} /></td>
                  <td className="hidden sm:table-cell px-4 py-3"><Num v={row.cash} cls="text-slate-600" /></td>
                  <td className="hidden sm:table-cell px-4 py-3"><Num v={row.upi} cls="text-slate-600" /></td>
                  <td className="hidden md:table-cell px-4 py-3"><Num v={row.card} cls="text-slate-600" /></td>
                  <td className="hidden sm:table-cell px-4 py-3 font-mono text-slate-500">{row.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
