import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLogger';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await request.json();
  const { amount, category, payment_mode, description, entry_date, entry_type } = body;

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('account_entries').select('*').eq('id', id).single();
  if (fetchError || !existing) return NextResponse.json({ message: 'Entry not found.' }, { status: 404 });
  if (existing.is_voided) return NextResponse.json({ message: 'Cannot edit a voided entry.' }, { status: 400 });

  const todayStr = new Date().toISOString().substring(0, 10);
  const isSameDay = String(existing.entry_date).substring(0, 10) === todayStr;
  if (session.role !== 'admin' && existing.entered_by !== session.id) {
    return NextResponse.json({ message: 'Cannot edit entries created by others.' }, { status: 403 });
  }
  if (session.role !== 'admin' && !isSameDay) {
    return NextResponse.json({ message: 'Non-admins can only edit same-day entries.' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (amount !== undefined)       updates.amount       = Number(amount);
  if (category)                   updates.category     = category;
  if (payment_mode)               updates.payment_mode = payment_mode;
  if (description !== undefined)  updates.description  = description;
  if (entry_date)                 updates.entry_date   = entry_date;
  if (entry_type)                 updates.entry_type   = entry_type;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('account_entries').update(updates).eq('id', id).select().single();
  if (updateError || !updated) {
    return NextResponse.json({ message: updateError?.message ?? 'Failed to update entry.' }, { status: 500 });
  }

  await logAudit({
    tableName: 'account_entries',
    recordId: updated.id,
    action: 'UPDATE',
    changedBy: session.id,
    changedAt: new Date().toISOString(),
    oldValue: existing,
    newValue: updated,
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
  });

  return NextResponse.json({ entry: updated });
}
