import { serviceClient, safeEqual, bearerToken, isAdminToken, roomShortLabel } from './_lib/shared.js';

const CRLF = '\r\n';
const SITE_URL = 'https://caonabo35.com';

function toICalDate(dateStr) {
  return String(dateStr).slice(0, 10).replace(/-/g, '');
}

// RFC 5545 §3.3.11 TEXT escaping.
export function icalText(v) {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
}

// RFC 5545 §3.1: lines longer than 75 octets are folded (CRLF + space), never splitting a UTF-8 char.
export function foldLine(line) {
  if (Buffer.byteLength(line, 'utf8') <= 75) return line;
  const out = [];
  let cur = '', bytes = 0, limit = 75;
  for (const ch of line) {
    const b = Buffer.byteLength(ch, 'utf8');
    if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0; limit = 74; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join(CRLF + ' ');
}

const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function buildCalendar(bookings, roomsById, { calName = 'Caonabo 35 - Reservas', now = new Date() } = {}) {
  const dtstamp = stamp(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Caonabo35//Reservas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icalText(calName)}`,
    'X-WR-TIMEZONE:America/Santo_Domingo',
  ];
  for (const b of bookings || []) {
    const label = roomShortLabel(roomsById.get(String(b.room)), b.room);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:caonabo35-${b.id}@caonabo35.com`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toICalDate(b.check_in)}`);
    lines.push(`DTEND;VALUE=DATE:${toICalDate(b.check_out)}`);
    lines.push(`SUMMARY:${icalText(`${label} · ${b.guest || 'Huésped'}`)}`);
    // No email / phone / total in a URL-fetchable feed — dates + room + status only.
    lines.push(`DESCRIPTION:${icalText(`${Number(b.nights) || 0} noche(s) · ${b.status || 'pending'}`)}`);
    lines.push(`STATUS:${['confirmed', 'checked_in', 'finalizada'].includes(b.status) ? 'CONFIRMED' : 'TENTATIVE'}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();

  let supabase;
  try { supabase = serviceClient(); } catch { return res.status(500).json({ error: 'Server error' }); }

  // Calendar apps subscribe with ?token=<ICAL_TOKEN> (never CRON_SECRET: that URL gets shared with
  // Airbnb/Booking/Google, and the cron secret also unlocks backups); the admin panel uses its session.
  const token = typeof req.query?.token === 'string' ? req.query.token : '';
  const tokenOk = !!token && safeEqual(token, process.env.ICAL_TOKEN);
  const isAdmin = !tokenOk && (await isAdminToken(supabase, bearerToken(req)));
  if (!tokenOk && !isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ?links=1 (admin session only): the subscription URLs the owner pastes into Airbnb /
  // Booking.com, so the token never has to be passed around by hand.
  if (req.query?.links === '1') {
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });
    res.setHeader('Cache-Control', 'private, no-store');
    const icalToken = process.env.ICAL_TOKEN || '';
    if (!icalToken) return res.status(200).json({ configured: false, all: null, rooms: [] });
    const { data: rooms, error: roomErr } = await supabase.from('rooms').select('id,name');
    if (roomErr) {
      console.error('export-ical links error:', roomErr.message);
      return res.status(500).json({ error: 'Export failed' });
    }
    const base = `${SITE_URL}/api/export-ical?token=${encodeURIComponent(icalToken)}`;
    const list = (rooms || [])
      .filter(r => /^[1-9]$/.test(String(r.id)))
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map(r => ({ room: Number(r.id), label: roomShortLabel(r, r.id), url: `${base}&room=${r.id}` }));
    return res.status(200).json({ configured: true, all: base, rooms: list });
  }

  const roomParam = req.query?.room;
  if (roomParam !== undefined && (typeof roomParam !== 'string' || !/^[1-9]\d?$/.test(roomParam))) {
    return res.status(400).json({ error: 'Invalid room' });
  }

  try {
    let q = supabase.from('bookings').select('id,room,guest,check_in,check_out,nights,status');
    if (roomParam) q = q.eq('room', Number(roomParam));
    const [{ data: bookings, error }, { data: rooms, error: roomErr }] = await Promise.all([
      q.order('check_in', { ascending: true }),
      supabase.from('rooms').select('id,name'),
    ]);
    if (error || roomErr) {
      console.error('export-ical error:', (error || roomErr).message);
      return res.status(500).json({ error: 'Export failed' });
    }
    const roomsById = new Map((rooms || []).map(r => [String(r.id), r]));
    const active = (bookings || []).filter(b => b.status !== 'cancelled' && b.check_in && b.check_out);
    const roomLabel = roomParam ? roomShortLabel(roomsById.get(roomParam), roomParam) : '';
    const ics = buildCalendar(active, roomsById, {
      calName: roomLabel ? `Caonabo 35 - ${roomLabel}` : 'Caonabo 35 - Reservas',
    });
    const file = roomLabel ? `caonabo35-${roomLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics` : 'caonabo35.ics';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(ics);
  } catch (e) {
    console.error('export-ical error:', e.message);
    return res.status(500).json({ error: 'Export failed' });
  }
}
