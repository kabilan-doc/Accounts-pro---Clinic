import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  let query = supabaseAdmin.from('account_entries').select('*').order('entry_date', { ascending: false });
  if (startDate) query = query.gte('entry_date', startDate);
  if (endDate) query = query.lte('entry_date', endDate);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((entry: any) =>
    [entry.entry_date, entry.entry_type, entry.category, entry.subcategory ?? '', entry.payment_mode, entry.amount, entry.description, entry.reference_number ?? '', entry.is_voided ? 'VOIDED' : 'ACTIVE'].join(',')
  );

  const csv = ['Date,Type,Category,Subcategory,Payment Mode,Amount,Description,Reference,Status', ...rows].join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="clinic-entries.csv"'
    }
  });
}
