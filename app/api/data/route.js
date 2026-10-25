import { NextResponse } from 'next/server';
import { isAuthed } from '../../../lib/auth';
import { getAll } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  try {
    return NextResponse.json(await getAll());
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
