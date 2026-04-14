import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Public read — used by the entry form to populate category dropdowns
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('categories_master')
    .select('id, name, type, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: data ?? [] });
}
