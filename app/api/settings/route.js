import { NextResponse } from 'next/server';
import { isAuthed } from '../../../lib/auth';
import { db, getAll } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const rent = Number(b.rent);
  if (!Number.isFinite(rent) || rent < 0) {
    return NextResponse.json({ error: 'Rent must be a number.' }, { status: 400 });
  }

  try {
    const r = await db()
      .from('settings')
      .upsert(
        {
          id: 1,
          house_name: String(b.houseName || '').trim().slice(0, 80),
          person: String(b.person || '').trim().slice(0, 80),
          rent,
        },
        { onConflict: 'id' }
      );
    if (r.error) throw new Error(r.error.message);
    return NextResponse.json({ status: 'ok', ...(await getAll()) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
