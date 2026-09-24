// Pure helpers for the owner back-office (kept here so they can be unit-tested).
import { nightsBetween } from './dates.js';

export const REV_STATUSES = ['confirmed', 'checked_in', 'finalizada'];
export const isRev = (b) => REV_STATUSES.includes(b?.status);

// Only the online travel agencies charge commission; WhatsApp/phone/direct don't.
export const OTA_SOURCES = ['Airbnb', 'Booking.com'];
export const OTA_RATE = 0.175;
export const isOta = (b) => OTA_SOURCES.includes(b?.source);

export const BOOKING_SOURCES = ['Direct', 'Airbnb', 'Booking.com', 'WhatsApp', 'Teléfono'];

export const STATUS_OPTIONS = [
  ['confirmed', 'Confirmada'],
  ['pending', 'Pendiente'],
  ['checked_in', '🏨 En el hotel'],
  ['finalizada', '✓ Finalizada'],
  ['cancelled', 'Cancelada'],
];

// Whole percentages that always add up to 100 (largest-remainder rounding).
export function sharePercents(counts) {
  const total = counts.reduce((s, c) => s + c, 0);
  if (!total) return counts.map(() => 0);
  const raw = counts.map(c => (c * 100) / total);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((s, v) => s + v, 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
  return out;
}

// Every source among revenue bookings, known channels first, so the chart sums to 100%.
export function channelBreakdown(bookings) {
  const rev = (bookings || []).filter(isRev);
  const by = new Map();
  rev.forEach(b => {
    const k = b.source || 'Direct';
    const e = by.get(k) || { source: k, count: 0, revenue: 0 };
    e.count++; e.revenue += Number(b.total) || 0;
    by.set(k, e);
  });
  const order = (s) => { const i = BOOKING_SOURCES.indexOf(s); return i < 0 ? 99 : i; };
  const rows = [...by.values()].sort((a, b) => order(a.source) - order(b.source) || b.count - a.count);
  const pcts = sharePercents(rows.map(r => r.count));
  return rows.map((r, i) => ({ ...r, pct: pcts[i] }));
}

export const otaCommission = (bookings) =>
  Math.round((bookings || []).filter(b => isRev(b) && isOta(b)).reduce((s, b) => s + (Number(b.total) || 0) * OTA_RATE, 0));

// "$1,234.50" / "303" / "" → number (NaN when not a usable amount).
export function parseMoney(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN;
  const s = String(v ?? '').replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100) / 100;
}

// What an admin create/edit saves. Nights always follow the dates. The total only moves
// when the stay (room or dates) changed — editing a phone number must never re-price a
// booking — and a total the admin typed (e.g. the exact Airbnb payout) always wins.
// quote(draft) → { valid, total } for the draft's room and dates.
export function bookingTotals(original, draft, quote) {
  const nights = nightsBetween(draft.checkIn, draft.checkOut);
  const stayChanged = !original
    || String(original.room) !== String(draft.room)
    || original.checkIn !== draft.checkIn
    || original.checkOut !== draft.checkOut;
  if (draft.totalTouched) return { nights, total: parseMoney(draft.total), repriced: false, stayChanged };
  if (stayChanged) {
    const q = quote(draft);
    return { nights, total: q && q.valid ? q.total : NaN, repriced: true, stayChanged };
  }
  return { nights, total: Number(original.total) || 0, repriced: false, stayChanged };
}

export function mapBookingRow(r) {
  return {
    id: r.id, guest: r.guest, email: r.email, phone: r.phone,
    room: r.room, checkIn: r.check_in, checkOut: r.check_out,
    nights: r.nights, guests: r.guests, total: Number(r.total) || 0,
    status: r.status, paid: !!r.paid, source: r.source, notes: r.notes,
    idType: r.id_type, idNumber: r.id_number, idPhotoUrl: r.id_photo_url || '',
    createdAt: r.created_at,
  };
}

// Fingerprint of everything the admin shows, so the polling fallback notices edits made on
// another device (dates, room, total, contact…), not just status/paid.
const SIG_FIELDS = ['guest', 'email', 'phone', 'room', 'checkIn', 'checkOut', 'nights', 'guests', 'total', 'status', 'paid', 'source', 'notes', 'idType', 'idNumber'];
export const bookingSig = (b) => JSON.stringify(SIG_FIELDS.map(f => b[f] ?? null).concat((b.idPhotoUrl || '').length));

export function bookingsChanged(prev, next) {
  if (prev.length !== next.length) return true;
  const old = new Map(prev.map(b => [b.id, bookingSig(b)]));
  return next.some(b => old.get(b.id) !== bookingSig(b));
}
