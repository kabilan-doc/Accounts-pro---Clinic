import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

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
    .from('categories_master')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(request: Request) {
  if (!adminOnly(request)) {
    return NextResponse.json({ message: 'Admin only.' }, { status: 403 });
  }

  const body = await request.json();
  const { name, type } = body;

  if (!name || !type) {
    return NextResponse.json({ message: 'name and type are required.' }, { status: 400 });
  }
  if (!['income', 'expense', 'both'].includes(type)) {
    return NextResponse.json({ message: 'type must be income, expense, or both.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('categories_master')
    .insert({ name, type, is_active: true })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}

export async function PATCH(request: Request) {
  if (!adminOnly(request)) {
    return NextResponse.json({ message: 'Admin only.' }, { status: 403 });
  }

  const body = await request.json();
  const { id, name, type, is_active } = body;

  if (!id) {
    return NextResponse.json({ message: 'Category id required.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type;
  if (typeof is_active === 'boolean') updates.is_active = is_active;

  const { data, error } = await supabaseAdmin
    .from('categories_master')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}
