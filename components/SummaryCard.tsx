import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  amount: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'green' | 'red' | 'blue' | 'slate' | 'purple' | 'orange';
  trend?: 'up' | 'down' | 'neutral';
}

const colorMap = {
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',  amount: 'text-green-700' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',      amount: 'text-red-600'   },
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',    amount: 'text-blue-700'  },
  slate:  { bg: 'bg-white',     icon: 'bg-slate-100 text-slate-600',  amount: 'text-slate-900' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600',amount: 'text-purple-700'},
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600',amount: 'text-orange-700'},
};

export function SummaryCard({ title, amount, subtitle, icon: Icon, color = 'slate', trend }: SummaryCardProps) {
  const c = colorMap[color];
  return (
    <div className={`${c.bg} flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`${c.icon} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <p className={`text-2xl font-bold tabular-nums ${c.amount}`}>{amount}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}
