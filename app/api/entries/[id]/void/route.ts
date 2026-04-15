import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLogger';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await request.json();
  const voidReason = body.void_reason;
  if (!voidReason) {
    return NextResponse.json({ message: 'Void reason required.' }, { status: 400 });
  }

  const { data: existing, error: selectError } = await supabaseAdmin
    .from('account_entries')
    .select('*')
    .eq('id', id)
    .single();

  if (selectError || !existing) {
    return NextResponse.json({ message: 'Entry not found.' }, { status: 404 });
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const isSameDay = String(existing.entry_date).substring(0, 10) === todayStr;
  if (session.role !== 'admin' && existing.entered_by !== session.id) {
    return NextResponse.json({ message: 'Cannot void others entries.' }, { status: 403 });
  }
  if (session.role !== 'admin' && !isSameDay) {
    return NextResponse.json({ message: 'Only same-day entries can be voided.' }, { status: 403 });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('account_entries')
    .update({ is_voided: true, void_reason: voidReason, voided_by: session.id, voided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ message: updateError?.message ?? 'Failed to void entry.' }, { status: 500 });
  }

  await logAudit({
    tableName: 'account_entries',
    recordId: updated.id,
    action: 'VOID',
    changedBy: session.id,
    changedAt: new Date().toISOString(),
    oldValue: existing,
    newValue: updated,
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
  });

  return NextResponse.json({ entry: updated });
}
