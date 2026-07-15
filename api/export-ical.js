import { createClient } from '@supabase/supabase-js';

function toICalDate(dateStr) {
  return dateStr.replace(/-/g, '');
}

export default async function handler(req, res) {
  // SECURITY: this feed is fetchable by URL (calendar apps subscribe to it), so it MUST carry a
  // secret token — otherwise anyone could pull every guest's stay. Reuses CRON_SECRET (already set).
  // Subscribe with:  https://caonabo35.com/api/export-ical?token=<CRON_SECRET>
  const token = req.query?.token;
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id,room,guest,check_in,check_out,nights,status')
    .in('status', ['confirmed', 'checked_in', 'pending']);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Caonabo35//Reservas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Caonabo 35 - Reservas',
    'X-WR-TIMEZONE:America/Santo_Domingo',
  ];

  for (const b of (bookings || [])) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:caonabo35-${b.id}@caonabo35.com`);
    lines.push(`DTSTART;VALUE=DATE:${toICalDate(b.check_in)}`);
    lines.push(`DTEND;VALUE=DATE:${toICalDate(b.check_out)}`);
    lines.push(`SUMMARY:Hab ${b.room} · ${b.guest}`);
    // No email / phone / total in a URL-fetchable feed — dates + room + status only.
    lines.push(`DESCRIPTION:${b.nights} noche(s) · ${b.status}`);
    lines.push(`STATUS:${b.status === 'confirmed' || b.status === 'checked_in' ? 'CONFIRMED' : 'TENTATIVE'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="caonabo35.ics"');
  return res.status(200).send(lines.join('\r\n'));
}
