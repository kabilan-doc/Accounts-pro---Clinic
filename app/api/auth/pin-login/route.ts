import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSessionToken, getSessionCookieOptions, verifyPin } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const { id, pin, admin } = body;

  if (!pin || (!admin && !id)) {
    return NextResponse.json({ message: 'Missing credentials.' }, { status: 400 });
  }

  let profile: Record<string, unknown> = {};
  let profileFound = false;

  if (admin) {
    // Admin login: try PIN against all active admin profiles
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (!admins?.length) {
      return NextResponse.json({ message: 'No admin account found.' }, { status: 404 });
    }

    // Find the admin whose PIN matches
    for (const a of admins) {
      if (verifyPin(pin, a.pin_hash as string)) {
        profile = a;
        profileFound = true;
        break;
      }
    }

    if (!profileFound) {
      return NextResponse.json({ message: 'Incorrect admin PIN.' }, { status: 401 });
    }
  } else {
    // Staff login: match by profile id
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    profile = data;
    profileFound = true;
  }

  if (!profile.is_active) {
    return NextResponse.json({ message: 'Account not active.' }, { status: 403 });
  }

  const lockedUntil = profile.locked_until ? new Date(profile.locked_until as string) : null;
  if (lockedUntil && lockedUntil > new Date()) {
    const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json({ message: `Account locked, try after ${minutes} minutes.` }, { status: 403 });
  }

  if (!admin) {
    // PIN check for staff (admin PIN already verified above)
    const validPin = verifyPin(pin, profile.pin_hash as string);
    if (!validPin) {
      const attempts = (profile.failed_attempts as number) + 1;
      const updates: Record<string, unknown> = { failed_attempts: attempts };
      if (attempts >= 5) {
        updates.locked_until = new Date(Date.now() + 15 * 60000).toISOString();
      }
      await supabaseAdmin.from('profiles').update(updates).eq('id', profile.id);
      return NextResponse.json({ message: 'Incorrect PIN.' }, { status: 401 });
    }
  }

  // Reset failed attempts on success
  await supabaseAdmin
    .from('profiles')
    .update({ failed_attempts: 0, locked_until: null })
    .eq('id', profile.id);

  const token = createSessionToken({ id: profile.id as string, role: profile.role as string });
  const response = NextResponse.json({ success: true });
  response.cookies.set('clinic_session', token, getSessionCookieOptions());
  return response;
}
