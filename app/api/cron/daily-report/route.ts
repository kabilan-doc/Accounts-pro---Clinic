import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { formatINR } from '@/lib/formatCurrency';
import { formatIST } from '@/lib/dateUtils';

const WHATSAPP_RECIPIENTS = process.env.WHATSAPP_RECIPIENTS?.split(',').map(n => n.trim()).filter(Boolean) ?? [];

export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().substring(0, 10);
  const { data: entries, error } = await supabaseAdmin
    .from('account_entries')
    .select('*')
    .eq('entry_date', today)
    .eq('is_voided', false);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const incomeEntries = entries?.filter((entry: any) => entry.entry_type === 'income') ?? [];
  const expenseEntries = entries?.filter((entry: any) => entry.entry_type === 'expense') ?? [];

  const incomeTotal = incomeEntries.reduce((sum: number, entry: any) => sum + Number(entry.amount), 0);
  const expenseTotal = expenseEntries.reduce((sum: number, entry: any) => sum + Number(entry.amount), 0);
  const netBalance = incomeTotal - expenseTotal;

  const grouped = (rows: any[]) => rows.reduce((acc: Record<string, number>, cur) => {
    acc[cur.category] = (acc[cur.category] || 0) + Number(cur.amount);
    return acc;
  }, {} as Record<string, number>);

  const incomeByCategory = grouped(incomeEntries);
  const expenseByCategory = grouped(expenseEntries);
  const paymentBreakdown = entries?.reduce((acc: Record<string, number>, entry: any) => {
    acc[entry.payment_mode] = (acc[entry.payment_mode] || 0) + Number(entry.amount);
    return acc;
  }, {} as Record<string, number>) ?? {};

  const lines = [
    `📊 *${process.env.NEXT_PUBLIC_CLINIC_NAME || 'Clinic'} — Daily Summary*`,
    `📅 Date: ${formatIST(today, 'dd MMM yyyy')}`,
    '',
    '💰 *INCOME*',
    ...Object.entries(incomeByCategory).map(([category, amount]) => `• ${category}: ${formatINR(amount)}`),
    `• Total Income: ${formatINR(incomeTotal)}`,
    '',
    '💸 *EXPENSES*',
    ...Object.entries(expenseByCategory).map(([category, amount]) => `• ${category}: ${formatINR(amount)}`),
    `• Total Expenses: ${formatINR(expenseTotal)}`,
    '',
    `✅ *Net Balance: ${formatINR(netBalance)}*`,
    '',
    '💳 *Payment Breakdown*',
    ...Object.entries(paymentBreakdown).map(([mode, amount]) => `• ${mode}: ${formatINR(amount)}`),
    '',
    `📝 Total Entries: ${entries?.length ?? 0}`,
    '_Sent automatically at 11:00 PM_'
  ];

  const message = lines.join('\n');
  const sendResult = await sendWhatsAppMessage(message, WHATSAPP_RECIPIENTS);

  await supabaseAdmin.from('daily_summary_log').insert({
    summary_date: today,
    total_income: incomeTotal,
    total_expense: expenseTotal,
    net_balance: netBalance,
    cash_income: paymentBreakdown.Cash ?? 0,
    upi_income: paymentBreakdown.UPI ?? 0,
    card_income: paymentBreakdown.Card ?? 0,
    whatsapp_sent: sendResult.success,
    whatsapp_sent_at: sendResult.success ? new Date().toISOString() : null,
    created_at: new Date().toISOString()
  });

  return NextResponse.json({ success: true, message: 'Daily report processed.' });
}
