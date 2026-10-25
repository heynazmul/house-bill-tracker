import { NextResponse } from 'next/server';
import { isAuthed } from '../../../lib/auth';
import { db, getAll, toMemo } from '../../../lib/db';
import { calcMemo } from '../../../lib/calc';

export const dynamic = 'force-dynamic';

const blank = (v) => v === '' || v === null || v === undefined;
const bad = (error) => NextResponse.json({ error }, { status: 400 });

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const month = String(b.month || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return bad('Please choose a valid month.');
  if (blank(b.oldReading) || blank(b.newReading)) return bad('Enter both meter readings.');

  const oldReading = Number(b.oldReading);
  const newReading = Number(b.newReading);
  const rent = blank(b.rent) ? 0 : Number(b.rent);
  if (![oldReading, newReading, rent].every(Number.isFinite) || oldReading < 0 || rent < 0) {
    return bad('Numbers only, please.');
  }
  if (newReading < oldReading) return bad('New reading cannot be less than old reading.');

  try {
    const c = db();
    const found = await c.from('memos').select('month').eq('month', month);
    if (found.error) throw new Error(found.error.message);
    if (found.data.length > 0 && !b.overwrite) return NextResponse.json({ status: 'exists' });

    // Always calculated on the server, so the saved numbers cannot be tampered with.
    const calc = calcMemo({ oldReading, newReading, rent });
    const row = {
      month,
      memo_no: `RC-${month.replace('-', '')}`,
      old_reading: oldReading,
      new_reading: newReading,
      units: calc.units,
      rate: calc.rate,
      electricity: calc.electricity,
      rent,
      total: calc.total,
      updated_at: new Date().toISOString(),
    };
    const saved = await c.from('memos').upsert(row, { onConflict: 'month' });
    if (saved.error) throw new Error(saved.error.message);

    const all = await getAll();
    return NextResponse.json({ status: 'ok', memo: toMemo(row), ...all });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
