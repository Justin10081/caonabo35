// Calendar dates as 'YYYY-MM-DD' strings, anchored to the hotel's timezone.
// The DB guard (bookings_0_public_guard) rejects a check-in before "today in
// Santo Domingo", so the client must use the same clock — not the visitor's
// local date and not UTC (UTC rolls over at 8 pm in Santo Domingo).

export const HOTEL_TZ = 'America/Santo_Domingo';
export const MAX_NIGHTS = 30;          // mirrors C35_INVALID_STAY
export const MAX_ADVANCE_DAYS = 540;   // mirrors C35_INVALID_STAY

export function todaySD(now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: HOTEL_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const get = (type) => parts.find(p => p.type === type)?.value;
    const ymd = `${get('year')}-${get('month')}-${get('day')}`;
    if (isYmd(ymd)) return ymd;
  } catch { /* fall through */ }
  return now.toLocaleDateString('en-CA', { timeZone: HOTEL_TZ });
}

export function isYmd(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn, checkOut) {
  return Math.round((Date.parse(checkOut + 'T00:00:00Z') - Date.parse(checkIn + 'T00:00:00Z')) / 86400000);
}

// Same rules the DB guard enforces, so the guest hears about them before submitting.
// Returns null when the stay is valid, else { field, code }.
// minNights comes from settings.min_nights (client-side only; the DB guard doesn't check it).
export function validateStay(checkIn, checkOut, today = todaySD(), minNights = 1) {
  if (!isYmd(checkIn)) return { field: 'checkIn', code: 'missing_in' };
  if (!isYmd(checkOut)) return { field: 'checkOut', code: 'missing_out' };
  if (checkIn < today) return { field: 'checkIn', code: 'past' };
  if (checkIn > addDays(today, MAX_ADVANCE_DAYS)) return { field: 'checkIn', code: 'too_far' };
  const n = nightsBetween(checkIn, checkOut);
  if (n < 1) return { field: 'checkOut', code: 'order' };
  if (n > MAX_NIGHTS) return { field: 'checkOut', code: 'too_long' };
  const min = clampMinNights(minNights);
  if (n < min) return { field: 'checkOut', code: 'min_nights', min };
  return null;
}

export const clampMinNights = (v) => Math.min(MAX_NIGHTS, Math.max(1, Math.floor(Number(v)) || 1));

// Admin entries may be in the past (recording earlier stays) but never zero or negative nights.
export function validateAdminStay(checkIn, checkOut) {
  if (!isYmd(checkIn)) return { field: 'checkIn', code: 'missing_in' };
  if (!isYmd(checkOut)) return { field: 'checkOut', code: 'missing_out' };
  if (nightsBetween(checkIn, checkOut) < 1) return { field: 'checkOut', code: 'order' };
  return null;
}

export const STAY_ERROR_TEXT = {
  min_nights: ['La estadía mínima es de {n} noches.', 'The minimum stay is {n} nights.'],
  missing_in: ['Elige la fecha de entrada.', 'Choose a check-in date.'],
  missing_out: ['Elige la fecha de salida.', 'Choose a check-out date.'],
  past: ['La fecha de entrada no puede ser anterior a hoy.', 'Check-in can’t be earlier than today.'],
  too_far: ['Aceptamos reservas en línea hasta 18 meses de anticipación. Escríbenos por WhatsApp para fechas posteriores.', 'We take online bookings up to 18 months ahead. Message us on WhatsApp for later dates.'],
  order: ['La salida debe ser al menos un día después de la entrada.', 'Check-out must be at least one day after check-in.'],
  too_long: ['Las reservas en línea son de hasta 30 noches. Para estadías más largas, escríbenos por WhatsApp.', 'Online bookings are up to 30 nights. For longer stays, message us on WhatsApp.'],
};

export function stayErrorText(code, lang, n) {
  const m = STAY_ERROR_TEXT[code];
  return m ? m[lang === 'en' ? 1 : 0].replace('{n}', String(n ?? '')) : '';
}
