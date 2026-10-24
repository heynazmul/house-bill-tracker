import { NextResponse } from 'next/server';
import { isAuthed } from '../../../lib/auth';
import { callSheet } from '../../../lib/sheet';
import { calcBill } from '../../../lib/calc';

export const dynamic = 'force-dynamic';

const isBlank = (v) => v === '' || v === null || v === undefined;
const toNum = (v) => (isBlank(v) ? 0 : Number(v));

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const month = String(b.month || '').trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Please choose a valid month.' }, { status: 400 });
  }
  if (isBlank(b.oldReading) || isBlank(b.newReading)) {
    return NextResponse.json({ error: 'Enter both meter readings.' }, { status: 400 });
  }

  const oldReading = Number(b.oldReading);
  const newReading = Number(b.newReading);
  const rent = toNum(b.rent);
  const gas = toNum(b.gas);
  const other = toNum(b.other);
  if (![oldReading, newReading, rent, gas, other].every(Number.isFinite)) {
    return NextResponse.json({ error: 'Numbers only, please.' }, { status: 400 });
  }
  if (newReading < oldReading) {
    return NextResponse.json({ error: 'New reading cannot be less than old reading.' }, { status: 400 });
  }

  try {
    // Always calculate on the server with the rates currently in the Settings tab.
    const { settings } = await callSheet({ action: 'init' });
    const bill = calcBill({ oldReading, newReading, rent, gas, other }, settings);
    const record = {
      receiptNo: `${settings.prefix || 'RC'}-${month.replace('-', '')}`,
      month,
      oldReading,
      newReading,
      ...bill,
      rent,
      gas,
      other,
      note: String(b.note || '').slice(0, 200),
    };

    const result = await callSheet({ action: 'save', record, overwrite: Boolean(b.overwrite) });
    if (result.status === 'exists') return NextResponse.json({ status: 'exists' });
    return NextResponse.json({ status: 'ok', record, records: result.records, settings });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
