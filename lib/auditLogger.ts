import { supabaseAdmin } from './supabaseAdmin';

interface AuditPayload {
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'VOID';
  changedBy: string;
  changedAt: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
}

export async function logAudit(payload: AuditPayload) {
  await supabaseAdmin.from('audit_log').insert({
    table_name: payload.tableName,
    record_id: payload.recordId,
    action: payload.action,
    changed_by: payload.changedBy,
    changed_at: payload.changedAt,
    old_value: payload.oldValue,
    new_value: payload.newValue,
    ip_address: payload.ipAddress
  });
}
