import { RATE } from './config';

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Used by the browser (live preview) and the server (the numbers that get saved).
export function calcMemo({ oldReading, newReading, rent }, rate = RATE) {
  const units = round2(newReading - oldReading);
  const electricity = round2(units * rate);
  return { units, rate, electricity, total: round2(electricity + rent) };
}
