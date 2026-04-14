import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'default-session-secret';

export function hashPin(pin: string) {
  return bcrypt.hashSync(pin, 12);
}

export function verifyPin(pin: string, hash: string) {
  return bcrypt.compareSync(pin, hash);
}

export function createSessionToken(payload: { id: string; role: string }) {
  const body = JSON.stringify({ ...payload, iat: Date.now() });
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('hex');
  return Buffer.from(`${body}.${signature}`).toString('base64');
}

export function verifySessionToken(token: string) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot === -1) return null;
    const body = decoded.substring(0, lastDot);
    const signature = decoded.substring(lastDot + 1);
    if (!body || !signature) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('hex');
    if (signature !== expected) return null;
    return JSON.parse(body) as { id: string; role: string; iat: number };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24
  };
}
