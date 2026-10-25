import crypto from 'crypto';
import { cookies } from 'next/headers';

export const COOKIE_NAME = 'hbt_session';

function sessionToken() {
  return crypto
    .createHmac('sha256', process.env.SESSION_SECRET || '')
    .update(process.env.APP_PASSWORD || '')
    .digest('hex');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function checkPassword(password) {
  const expected = process.env.APP_PASSWORD || '';
  return expected.length > 0 && safeEqual(password ?? '', expected);
}

export function sessionCookie() {
  return {
    name: COOKIE_NAME,
    value: sessionToken(),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export function isAuthed() {
  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) return false;
  const value = cookies().get(COOKIE_NAME)?.value;
  return Boolean(value) && safeEqual(value, sessionToken());
}
