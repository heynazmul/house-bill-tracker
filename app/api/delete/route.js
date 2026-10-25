import { NextResponse } from 'next/server';
import { isAuthed } from '../../../lib/auth';
import { db, getAll } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const month = String(b.month || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month.' }, { status: 400 });
  }

  try {
    const r = await db().from('memos').delete().eq('month', month);
    if (r.error) throw new Error(r.error.message);
    return NextResponse.json({ status: 'ok', ...(await getAll()) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
