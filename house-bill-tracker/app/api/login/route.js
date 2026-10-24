import { NextResponse } from 'next/server';
import { checkPassword, sessionCookie } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const c = sessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
