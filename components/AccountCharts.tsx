'use client';

import {
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// ─── shared palette ───────────────────────────────────────────────────────────
const PALETTE = [
  '#2563eb', '#16a34a', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
];

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(v);

const shortDate = (d: string) => {
  const parts = d.split('-');
  return `${parts[2]}/${parts[1]}`;
};

// ─── types ────────────────────────────────────────────────────────────────────
export interface DailyPoint {
  date: string;
  income: number;
  expense: number;
  net: number;
  cash: number;
  upi: number;
  card: number;
  count: number;
}

export interface CategoryPoint {
  name: string;
  value: number;
}

// ─── 1. Net balance trend line ────────────────────────────────────────────────
export function NetTrendChart({ data, syncId }: { data: DailyPoint[]; syncId?: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} syncId={syncId}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={shortDate}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <Tooltip
          formatter={(v: number) => [INR(v), 'Net Balance']}
          labelFormatter={shortDate}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        {/* Zero line — instantly shows deficit days */}
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
        <Line
          type="monotone"
          dataKey="net"
          name="Net Balance"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── 2. Income vs Expense grouped bar ─────────────────────────────────────────
export function IncomeExpenseBarChart({ data, syncId, maxDays = 14 }: { data: DailyPoint[]; syncId?: string; maxDays?: number }) {
  const sliced = data.slice(-maxDays);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sliced} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={2} syncId={syncId}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={shortDate}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <Tooltip
          formatter={(v: number, name: string) => [INR(v), name]}
          labelFormatter={shortDate}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="income"  name="Income"  fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── 2b. Cumulative Income vs Expense area chart ──────────────────────────────
export function IncomeExpenseCumulativeChart({ data }: { data: DailyPoint[] }) {
  const last14 = data.slice(-14);
  let cumInc = 0, cumExp = 0;
  const chartData = last14.map(d => {
    cumInc += d.income;
    cumExp += d.expense;
    return { date: d.date, 'Cum. Income': cumInc, 'Cum. Expense': cumExp };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={shortDate} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} width={52} />
        <Tooltip
          formatter={(v: number, name: string) => [INR(v), name]}
          labelFormatter={shortDate}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Area type="monotone" dataKey="Cum. Income"  stroke="#16a34a" strokeWidth={2.5} fill="url(#gradInc)" dot={false} activeDot={{ r: 5 }} />
        <Area type="monotone" dataKey="Cum. Expense" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradExp)" dot={false} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── 3. Category breakdown donut ─────────────────────────────────────────────
export function CategoryDonut({
  data,
  emptyLabel
}: {
  data: CategoryPoint[];
  emptyLabel: string;
}) {
  if (!data.length) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  const RADIAN = Math.PI / 180;
  const renderLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, name
  }: {
    cx: number; cy: number; midAngle: number;
    innerRadius: number; outerRadius: number; percent: number; name: string;
  }) => {
    if (percent < 0.06) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={100}
          labelLine={false}
          label={renderLabel}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number, name: string, props: { payload?: { value: number } }) => {
            const total = data.reduce((s, d) => s + d.value, 0);
            const pct = total > 0 ? ((props.payload?.value ?? 0) / total * 100).toFixed(1) : '0';
            return [`${INR(v)}  (${pct}%)`, name];
          }}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value, entry: { color?: string }) => (
            <span style={{ color: entry.color }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── 4. Payment mode distribution bar ────────────────────────────────────────
export function PaymentModeChart({ data }: { data: CategoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: '#475569' }}
          width={56}
        />
        <Tooltip
          formatter={(v: number) => [INR(v)]}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Bar dataKey="value" name="Amount" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── 5. Category bar chart (vertical, for fallback) ───────────────────────────
export function CategoryBarChart({ data }: { data: CategoryPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
        No data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <Tooltip
          formatter={(v: number) => [INR(v)]}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── 6. Day-of-week analysis bar — color-coded by performance ─────────────────
export function DayOfWeekChart({ data }: { data: CategoryPoint[] }) {
  const values = data.map(d => d.value).filter(v => v > 0);
  const max    = values.length > 0 ? Math.max(...values) : 1;
  const min    = values.length > 0 ? Math.min(...values) : 0;

  const barColor = (v: number): string => {
    if (v === 0) return '#e2e8f0';
    if (max === min) return '#2563eb';
    const ratio = (v - min) / (max - min);
    if (ratio >= 0.85) return '#1d4ed8';
    if (ratio >= 0.65) return '#2563eb';
    if (ratio >= 0.45) return '#3b82f6';
    if (ratio >= 0.25) return '#93c5fd';
    return '#cbd5e1';
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <Tooltip
          formatter={(v: number) => [INR(v), 'Avg Income']}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Bar dataKey="value" name="Avg Income" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((d, i) => (
            <Cell key={i} fill={barColor(d.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── 7. Cash vs Digital circular progress ring ───────────────────────────────
export function CashDigitalRing({ cashPct }: { cashPct: number }) {
  const r            = 28;
  const circumference = 2 * Math.PI * r;
  const cashDash     = Math.min(Math.max(cashPct, 0), 100) / 100 * circumference;
  const digitalPct   = 100 - cashPct;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={36} cy={36} r={r} fill="none" stroke="#e2e8f0" strokeWidth={7} />
          <circle
            cx={36} cy={36} r={r} fill="none"
            stroke="#2563eb" strokeWidth={7}
            strokeDasharray={`${cashDash} ${circumference}`}
            strokeLinecap="round"
          />
          <circle
            cx={36} cy={36} r={r} fill="none"
            stroke="#8b5cf6"
            strokeWidth={7}
            strokeDasharray={`${circumference - cashDash} ${circumference}`}
            strokeDashoffset={-cashDash}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] font-bold font-mono text-slate-800 leading-none">{cashPct}%</span>
          <span className="text-[8px] text-slate-400 leading-none mt-0.5">Cash</span>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
          <span className="text-slate-600">Cash <span className="font-semibold font-mono">{cashPct}%</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-500 flex-shrink-0" />
          <span className="text-slate-600">Digital <span className="font-semibold font-mono">{digitalPct}%</span></span>
        </div>
      </div>
    </div>
  );
}
