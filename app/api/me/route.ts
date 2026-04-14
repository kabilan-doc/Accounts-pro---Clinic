import { NextResponse } from 'next/server';
import { getSessionTokenFromHeaders } from '@/lib/sessionHelpers';

export async function GET(request: Request) {
  const session = getSessionTokenFromHeaders(request.headers);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ id: session.id, role: session.role });
}
