import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

export async function GET(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers as any);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  let query = supabaseAdmin
    .from('account_entries')
    .select('*')
    .eq('is_voided', false)
    .order('entry_date', { ascending: false });
  if (startDate) query = query.gte('entry_date', startDate);
  if (endDate) query = query.lte('entry_date', endDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const entries = data ?? [];

  // Build a simple HTML page that the browser can print to PDF
  const rows = entries.map((e: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
      <td>${i + 1}</td>
      <td>${e.entry_date}</td>
      <td style="color:${e.entry_type === 'income' ? '#16a34a' : '#dc2626'};font-weight:600">${e.entry_type.toUpperCase()}</td>
      <td>${e.category}</td>
      <td style="text-align:right">₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td>${e.payment_mode}</td>
      <td>${e.description ?? ''}</td>
      <td>${e.reference_number ?? ''}</td>
    </tr>`).join('');

  const totalIncome = entries.filter((e: any) => e.entry_type === 'income').reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalExpense = entries.filter((e: any) => e.entry_type === 'expense').reduce((s: number, e: any) => s + Number(e.amount), 0);
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Clinic Account Statement</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #111; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p { margin: 2px 0; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #1d4ed8; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  .summary { display: flex; gap: 24px; margin-top: 16px; }
  .card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 16px; }
  .card.expense { background: #fff1f2; border-color: #fecdd3; }
  .card.net { background: #f0fdf4; border-color: #bbf7d0; }
  .card label { font-size: 10px; color: #555; display: block; }
  .card strong { font-size: 15px; }
  @media print { @page { size: A4 landscape; margin: 15mm; } }
</style>
</head>
<body>
<h1>${process.env.NEXT_PUBLIC_CLINIC_NAME || 'Clinic'} — Account Statement</h1>
<p>Period: ${startDate || 'All time'} to ${endDate || 'Present'} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>

<div class="summary">
  <div class="card"><label>Total Income</label><strong style="color:#16a34a">${fmt(totalIncome)}</strong></div>
  <div class="card expense"><label>Total Expenses</label><strong style="color:#dc2626">${fmt(totalExpense)}</strong></div>
  <div class="card net"><label>Net Balance</label><strong style="color:#0369a1">${fmt(totalIncome - totalExpense)}</strong></div>
  <div class="card"><label>Total Entries</label><strong>${entries.length}</strong></div>
</div>

<table>
  <thead><tr><th>#</th><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Mode</th><th>Description</th><th>Reference</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}
