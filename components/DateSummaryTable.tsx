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
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Income</th>
              <th className="px-4 py-3">Expense</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Cash</th>
              <th className="px-4 py-3">UPI</th>
              <th className="px-4 py-3">Card</th>
              <th className="px-4 py-3">Entries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map(row => (
              <tr key={row.date} className="hover:bg-slate-50">
                <td className="px-4 py-4 font-medium text-slate-800">{row.date}</td>
                <td className="px-4 py-4">{formatINR(row.income)}</td>
                <td className="px-4 py-4">{formatINR(row.expense)}</td>
                <td className="px-4 py-4">{formatINR(row.net)}</td>
                <td className="px-4 py-4">{formatINR(row.cash)}</td>
                <td className="px-4 py-4">{formatINR(row.upi)}</td>
                <td className="px-4 py-4">{formatINR(row.card)}</td>
                <td className="px-4 py-4">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
