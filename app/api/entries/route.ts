import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLogger';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const page = Number(searchParams.get('page') ?? '1');
  const entryType = searchParams.get('entry_type');
  const category = searchParams.get('category');
  const paymentMode = searchParams.get('payment_mode');
  const enteredBy = searchParams.get('entered_by');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  const query = supabaseAdmin.from('account_entries').select('*', { count: 'estimated' }).order('entry_date', { ascending: false });

  if (entryType) query.eq('entry_type', entryType);
  if (category) query.eq('category', category);
  if (paymentMode) query.eq('payment_mode', paymentMode);
  if (enteredBy) query.eq('entered_by', enteredBy);
  if (startDate) query.gte('entry_date', startDate);
  if (endDate) query.lte('entry_date', endDate);

  const { data, count, error } = await query.range((page - 1) * 20, page * 20 - 1);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [], count: count ?? 0, page, pageSize: 20 });
}

export async function POST(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { entry_date, entry_type, category, payment_mode, amount, description, subcategory, reference_number } = body;

  if (!entry_date || !entry_type || !category || !payment_mode || !amount || !description) {
    return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
  }

  const record = {
    entry_date,
    entry_type,
    category,
    payment_mode,
    amount,
    description,
    subcategory: subcategory || null,
    reference_number: reference_number || null,
    entered_by: session.id,
    is_voided: false,
    created_at: new Date().toISOString()
  };

  const { data: inserted, error } = await supabaseAdmin.from('account_entries').insert(record).select().single();
  if (error || !inserted) {
    return NextResponse.json({ message: error?.message ?? 'Failed to create entry.' }, { status: 500 });
  }

  await logAudit({
    tableName: 'account_entries',
    recordId: inserted.id,
    action: 'INSERT',
    changedBy: session.id,
    changedAt: new Date().toISOString(),
    oldValue: null,
    newValue: inserted,
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
  });

  return NextResponse.json({ entry: inserted });
}
