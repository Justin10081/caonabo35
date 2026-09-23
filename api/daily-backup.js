import { serviceClient, sendEmail, isCronRequest } from './_lib/shared.js';
import { runGuestEmails } from './guest-emails.js';
import { runSync } from './sync-calendars.js';

// Quote every cell, double embedded quotes, and defuse spreadsheet formulas (=, +, -, @, tab, CR).
export function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function bookingsCsv(bookings) {
  const headers = ['ID','Huésped','Email','Teléfono','Habitación','Check-in','Check-out','Noches','Huéspedes','Total','Estado','Pagado','Fuente','Notas','ID_Tipo','ID_Numero','Creado'];
  const rows = (bookings || []).map(b => [
    b.id, b.guest, b.email, b.phone, b.room,
    b.check_in, b.check_out, b.nights, b.guests,
    b.total, b.status, b.paid ? 'Sí' : 'No',
    b.source, b.notes, b.id_type, b.id_number,
    b.created_at ? String(b.created_at).slice(0, 10) : '',
  ].map(csvCell).join(','));
  // BOM so Excel opens the accents as UTF-8.
  return '﻿' + [headers.map(csvCell).join(','), ...rows].join('\r\n');
}

export default async function handler(req, res) {
  // Vercel cron sends "Authorization: Bearer <CRON_SECRET>"; with CRON_SECRET unset nothing is accepted.
  if (!isCronRequest(req)) return res.status(401).json({ error: 'Unauthorized' });

  let supabase;
  try { supabase = serviceClient(); } catch { return res.status(500).json({ error: 'Server error' }); }

  // Explicit columns: select('*') would also pull every ID photo (base64 data URLs) into memory.
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id,guest,email,phone,room,check_in,check_out,nights,guests,total,status,paid,source,notes,id_type,id_number,created_at')
    .order('created_at', { ascending: false });

  let backup;
  if (error) {
    console.error('daily-backup query error:', error.message);
    backup = { error: 'query failed' };
  } else {
    const csv = bookingsCsv(bookings);
    const today = new Date().toISOString().slice(0, 10);
    const adminEmail = process.env.ADMIN_EMAIL || 'caonabo35@gmail.com';
    try {
      await sendEmail({
        from: process.env.FROM_EMAIL || 'reservas@caonabo35.com',
        to: adminEmail,
        subject: `📊 Backup Caonabo 35 — ${today} (${bookings.length} reservas)`,
        html: `<p>Backup diario automático de Caonabo 35.</p><p><strong>${bookings.length} reservas</strong> al ${today}.</p><p>El archivo CSV está adjunto.</p>`,
        attachments: [{
          filename: `caonabo35-backup-${today}.csv`,
          content: Buffer.from(csv).toString('base64'),
        }],
      });
      backup = { count: bookings.length };
    } catch (e) {
      console.error('daily-backup email error:', e.message);
      backup = { error: 'email failed' };
    }
  }

  // Each daily job is isolated so one failure doesn't skip the others.
  let emails = null;
  try { emails = await runGuestEmails(supabase); } catch (e) { emails = { error: e.message }; }

  let sync = null;
  try { sync = await runSync(supabase); } catch (e) { sync = { error: e.message }; }

  return res.status(backup.error ? 500 : 200).json({ ok: !backup.error, backup, emails, sync });
}
