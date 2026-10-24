// Shared by the browser (live preview) and the server (the number that gets saved).

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// slabs: [{ upTo: number | null, rate: number }] sorted small -> large, null = "everything above"
export function calcElectricity(units, s) {
  const slabs = (s.slabs || []).filter((x) => x && Number.isFinite(Number(x.rate)));
  if (!s.useSlabs || slabs.length === 0) {
    return round2(units * (Number(s.flatRate) || 0));
  }
  let total = 0;
  let prev = 0;
  for (const sl of slabs) {
    if (units <= prev) break;
    const upper = sl.upTo == null ? Infinity : Number(sl.upTo);
    total += (Math.min(units, upper) - prev) * Number(sl.rate);
    prev = upper;
  }
  const last = slabs[slabs.length - 1];
  if (last.upTo != null && units > Number(last.upTo)) {
    total += (units - Number(last.upTo)) * Number(last.rate); // above the last defined slab
  }
  return round2(total);
}

export function calcBill({ oldReading, newReading, rent, gas, other }, s) {
  const units = round2(newReading - oldReading);
  const electricity = calcElectricity(units, s);
  const vat = round2((electricity * (Number(s.vat) || 0)) / 100);
  const demand = Number(s.demand) || 0;
  const total = round2(electricity + vat + demand + rent + gas + other);
  return { units, electricity, vat, demand, total };
}
