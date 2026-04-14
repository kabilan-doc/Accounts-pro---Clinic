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

export function DateSummaryTable({ rows }: { rows: DateSummaryRow[] }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Date</th>
              <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Income</th>
              <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Expense</th>
              <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Net</th>
              <th className="hidden sm:table-cell px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Cash</th>
              <th className="hidden sm:table-cell px-4 py-3 font-medium text-slate-600 whitespace-nowrap">UPI</th>
              <th className="hidden md:table-cell px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Card</th>
              <th className="hidden sm:table-cell px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Entries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map(row => (
              <tr key={row.date} className="hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{row.date}</td>
                <td className="px-4 py-3 text-green-700 font-medium">{formatINR(row.income)}</td>
                <td className="px-4 py-3 text-red-600">{formatINR(row.expense)}</td>
                <td className={`px-4 py-3 font-semibold ${row.net >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatINR(row.net)}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-slate-600">{formatINR(row.cash)}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-slate-600">{formatINR(row.upi)}</td>
                <td className="hidden md:table-cell px-4 py-3 text-slate-600">{formatINR(row.card)}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-slate-500">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
