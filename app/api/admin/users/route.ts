import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';
import { hashPin } from '@/lib/auth';

function adminOnly(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session || session.role !== 'admin') return null;
  return session;
}

export async function GET(request: Request) {
  if (!adminOnly(request)) {
    return NextResponse.json({ message: 'Admin only.' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, phone_number, is_active, failed_attempts, locked_until, created_at')
    .order('full_name', { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: Request) {
  if (!adminOnly(request)) {
    return NextResponse.json({ message: 'Admin only.' }, { status: 403 });
  }

  const body = await request.json();
  const { full_name, role, pin, phone_number } = body;

  if (!full_name || !role || !pin) {
    return NextResponse.json({ message: 'full_name, role, and pin are required.' }, { status: 400 });
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ message: 'PIN must be exactly 4 digits.' }, { status: 400 });
  }

  const pin_hash = hashPin(pin);

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({ full_name, role, pin_hash, phone_number: phone_number || null, is_active: true, failed_attempts: 0 })
    .select('id, full_name, role, phone_number, is_active, created_at')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}

export async function PATCH(request: Request) {
  if (!adminOnly(request)) {
    return NextResponse.json({ message: 'Admin only.' }, { status: 403 });
  }

  const body = await request.json();
  const { id, is_active, new_pin, phone_number } = body;

  if (!id) {
    return NextResponse.json({ message: 'User id required.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof is_active === 'boolean') updates.is_active = is_active;
  if (phone_number !== undefined) updates.phone_number = phone_number;
  if (new_pin) {
    if (!/^\d{4}$/.test(new_pin)) {
      return NextResponse.json({ message: 'PIN must be exactly 4 digits.' }, { status: 400 });
    }
    updates.pin_hash = hashPin(new_pin);
    updates.failed_attempts = 0;
    updates.locked_until = null;
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, full_name, role, phone_number, is_active')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
