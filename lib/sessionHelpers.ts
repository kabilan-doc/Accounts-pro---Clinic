import { verifySessionToken } from './auth';

export function getSessionTokenFromHeaders(headers: { get(name: string): string | null }) {
  const cookieHeader = headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/clinic_session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  return verifySessionToken(token);
}
