import { NextResponse } from 'next/server';
import { isAuthed } from '../../../lib/auth';
import { callSheet } from '../../../lib/sheet';

export const dynamic = 'force-dynamic';

// Returns { settings, records } straight from the Google Sheet.
export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  try {
    const data = await callSheet({ action: 'init' });
    return NextResponse.json({ settings: data.settings, records: data.records });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
