import { isYmd } from './dates.js';

export const TAX_RATE = 0;

export const nights = (cin, cout) => Math.max(1, Math.round((new Date(cout) - new Date(cin)) / 86400000));

export const fmtMoney = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// room_nights rows (the admin's per-night grid), keyed `${roomId}|${YYYY-MM-DD}` in a Map or
// plain object → { price, available }. A price is the exact nightly amount the guest pays.
export const nightKey = (roomId, ymd) => `${roomId}|${ymd}`;
export function nightRow(roomNights, roomId, ymd) {
  if (!roomNights || roomId == null) return undefined;
  const k = nightKey(roomId, ymd);
  return typeof roomNights.get === 'function' ? roomNights.get(k) : roomNights[k];
}
export const nightPrice = (row) => (row && row.price != null && Number(row.price) > 0) ? Number(row.price) : null;

// Recurring month/day season; start > end wraps the year (e.g. 12/15 → 01/05).
export function inRecurringSeason(s, mmdd) {
  const sMD = parseInt(s.startMonth, 10) * 100 + parseInt(s.startDay, 10);
  const eMD = parseInt(s.endMonth, 10) * 100 + parseInt(s.endDay, 10);
  if (!Number.isFinite(sMD) || !Number.isFinite(eMD)) return false;
  return sMD <= eMD ? (mmdd >= sMD && mmdd <= eMD) : (mmdd >= sMD || mmdd <= eMD);
}
export function activeRecurringSeason(seasons, ymd) {
  if (!isYmd(ymd)) return null;
  const mmdd = Number(ymd.slice(5, 7)) * 100 + Number(ymd.slice(8, 10));
  return (seasons || []).find(s => s && s.type !== 'range' && inRecurringSeason(s, mmdd)) || null;
}

// Returns the effective nightly rate for one date, honoring (1) the per-night price from the
// admin grid (room_nights), (2) explicit date-range temporary rates (auto-expire because a past
// range can't match a future night), then (3) legacy recurring month/day % seasons, else the base.
export function nightlyRate(roomPrice, ymd, mmdd, seasons, roomId, roomNights = null) {
  const own = nightPrice(nightRow(roomNights, roomId, ymd));
  if (own != null) return { rate: own, pct: 0, seasonal: true, custom: true };
  const ranges = (seasons || []).filter(s => s && s.type === 'range' && s.start && s.end
    && ymd >= s.start && ymd <= s.end
    && (!s.room || s.room === 'all' || String(s.room) === String(roomId)));
  if (ranges.length) {
    const specific = ranges.filter(s => s.room && s.room !== 'all');   // a room-specific rule beats an "all rooms" rule
    const pool = specific.length ? specific : ranges;
    const rateOf = s => s.mode === 'pct' ? Math.round(roomPrice * (1 + (s.pct || 0) / 100)) : (Number(s.price) || roomPrice);
    const pick = pool.reduce((a, b) => rateOf(b) > rateOf(a) ? b : a);
    return { rate: rateOf(pick), pct: pick.mode === 'pct' ? (pick.pct || 0) : 0, seasonal: true };
  }
  let pct = 0;
  (seasons || []).forEach(s => {
    if (!s || s.type === 'range') return;
    if (inRecurringSeason(s, mmdd)) pct = Math.max(pct, s.pct || 0);
  });
  if (pct > 0) return { rate: Math.round(roomPrice * (1 + pct / 100)), pct, seasonal: true };
  return { rate: roomPrice, pct: 0, seasonal: false };
}

// Per-night pricing, so partial-season stays are priced correctly.
export function calcPrice(roomPrice, checkIn, checkOut, discount, seasons = [], roomId = null, roomNights = null) {
  const n = nights(checkIn, checkOut);
  const pad = x => String(x).padStart(2, '0');
  let subtotal = 0, maxPct = 0, seasonalApplied = false;
  if (checkIn && checkOut && n > 0) {
    const start = new Date(checkIn + "T00:00:00");
    for (let i = 0; i < n; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const mmdd = (d.getMonth() + 1) * 100 + d.getDate();
      const nr = nightlyRate(roomPrice, ymd, mmdd, seasons, roomId, roomNights);
      subtotal += nr.rate;
      if (nr.seasonal) { seasonalApplied = true; maxPct = Math.max(maxPct, nr.pct); }
    }
  } else {
    subtotal = roomPrice * n;
  }
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  let total = subtotal + tax;
  let discountAmt = 0;
  if (discount) {
    discountAmt = discount.type === 'percent'
      ? Math.round(total * discount.amount) / 100
      : Math.min(discount.amount, total);
    total = Math.max(0, total - discountAmt);
  }
  return { nights: n, subtotal, tax, total, discountAmt, seasonalPct: maxPct, seasonal: seasonalApplied };
}

// Direct-booking nightly rate after the room's own % discount (rooms.discount).
export function discountedRate(price, discountPct) {
  const p = Number(price) || 0;
  const d = Number(discountPct) || 0;
  return d > 0 ? Math.round(p * (1 - d / 100)) : p;
}

// THE price of a stay. Room card, booking-modal breakdown and the submitted total
// all come from here, so a guest can never see three different numbers again.
// Without valid dates it still returns the nightly rates (for the room card).
export function quoteFor(room, checkIn, checkOut, { seasons = [], promo = null, roomNights = null } = {}) {
  const baseRate = Number(room?.price) || 0;
  const discountPct = Number(room?.discount) > 0 ? Number(room.discount) : 0;
  const rate = discountedRate(baseRate, discountPct);
  const out = { baseRate, rate, discountPct, discounted: rate < baseRate, valid: false };
  if (!(isYmd(checkIn) && isYmd(checkOut) && checkIn < checkOut)) return out;
  const p = calcPrice(rate, checkIn, checkOut, promo, seasons, room?.id, roomNights);
  const undiscounted = calcPrice(baseRate, checkIn, checkOut, null, seasons, room?.id, roomNights);
  return {
    ...out,
    valid: true,
    nights: p.nights,
    subtotal: p.subtotal,
    tax: p.tax,
    total: p.total,
    promoAmt: p.discountAmt,
    seasonal: p.seasonal,
    undiscountedSubtotal: undiscounted.subtotal,
    savings: Math.max(0, undiscounted.subtotal - p.subtotal),
  };
}
