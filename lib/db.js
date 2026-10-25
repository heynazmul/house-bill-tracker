import { createClient } from '@supabase/supabase-js';
import { DEFAULT_RENT } from './config';

let client;

// Server-only. SUPABASE_SERVICE_ROLE_KEY must never be a NEXT_PUBLIC_ variable.
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

const n = (v) => Number(v);

export function toMemo(r) {
  return {
    month: r.month,
    memoNo: r.memo_no,
    oldReading: n(r.old_reading),
    newReading: n(r.new_reading),
    units: n(r.units),
    rate: n(r.rate),
    electricity: n(r.electricity),
    rent: n(r.rent),
    total: n(r.total),
  };
}

export function toSettings(r) {
  return {
    houseName: r?.house_name ?? '',
    person: r?.person ?? '',
    rent: r ? n(r.rent) : DEFAULT_RENT,
  };
}

function fail(error) {
  throw new Error(
    /relation .* does not exist|schema cache|Could not find the table/i.test(error.message)
      ? 'The database tables are missing. Run supabase/schema.sql in the Supabase SQL Editor.'
      : error.message
  );
}

export async function getAll() {
  const c = db();
  const [m, s] = await Promise.all([
    c.from('memos').select('*').order('month', { ascending: false }),
    c.from('settings').select('*').eq('id', 1),
  ]);
  if (m.error) fail(m.error);
  if (s.error) fail(s.error);
  return { memos: m.data.map(toMemo), settings: toSettings(s.data[0]) };
}
