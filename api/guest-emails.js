import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Automated guest emails, sent once per booking:
//  · pre-arrival  (within ~3 days before check-in): directions, check-in time, WhatsApp
//  · post-stay    (within ~3 days after check-out): thank-you + a verified-review link (?rev=<id>)
// Deduped via bookings.prearrival_sent_at / review_email_sent_at. Triggered by the daily cron
// (Authorization: Bearer CRON_SECRET) or silently when the admin opens the panel (admin token).
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'Caonabo 35 <onboarding@resend.dev>';
const REPLY_TO   = process.env.REPLY_TO;
const SITE = 'https://caonabo35.com';

const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const shell = (inner) => `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#F7F3EE;color:#2A1F16;border:1px solid #e8ddcb">
  <div style="background:#2A1F16;padding:1.4rem;text-align:center"><span style="color:#C4973A;font-size:1.3rem;letter-spacing:.15em">CAONABO 35</span></div>
  <div style="padding:1.6rem 1.5rem;line-height:1.6;font-size:15px">${inner}</div>
  <div style="padding:1rem 1.5rem;background:#efe9e0;font-size:12px;color:#8B6B4E;text-align:center">Av. Caonabo #35, 2do Piso · Santo Domingo, R.D.</div>
</div>`;

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  let allowed = false;
  if (process.env.CRON_SECRET && bearer && bearer === process.env.CRON_SECRET) allowed = true;
  else if (bearer) { try { const { data } = await supabase.auth.getUser(bearer); if (data?.user) allowed = true; } catch {} }
  if (!allowed) return res.status(401).json({ error: 'Unauthorized' });

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' });
  const { data: settings } = await supabase.from('settings').select('whatsapp,checkIn,check_in,phone,guest_emails_on').eq('id', 1).single().catch(() => ({ data: null }));
  // Owner-controlled master switch — off until they've reviewed the templates and turned it on.
  if (!settings?.guest_emails_on) return res.status(200).json({ ok: true, disabled: true });
  const wa = (settings?.whatsapp || '18096033038').replace(/\D/g, '');
  const waLink = `https://wa.me/${wa}`;

  const sent = { prearrival: 0, poststay: 0, errors: [] };

  // ── Pre-arrival: arrivals in the next 3 days, not yet emailed ──
  const { data: arrivals } = await supabase.from('bookings')
    .select('id,guest,email,check_in,check_out')
    .in('status', ['confirmed', 'checked_in'])
    .gte('check_in', today).lte('check_in', addDays(today, 3))
    .is('prearrival_sent_at', null);
  for (const b of (arrivals || [])) {
    if (!b.email) continue;
    try {
      await resend.emails.send({
        from: FROM_EMAIL, to: b.email, reply_to: REPLY_TO || undefined,
        subject: `Tu llegada a Caonabo 35 · ${b.check_in}`,
        html: shell(`<p>Hola ${b.guest || ''},</p>
          <p>¡Te esperamos pronto en <b>Caonabo 35</b>! Aquí los detalles de tu llegada:</p>
          <ul style="padding-left:1.1rem">
            <li><b>Dirección:</b> Av. Caonabo #35, 2do Piso, Santo Domingo</li>
            <li><b>Check-in:</b> desde las 3:00 PM el ${b.check_in}</li>
            <li><b>Check-out:</b> hasta las 12:00 PM el ${b.check_out}</li>
          </ul>
          <p>Si necesitas indicaciones, estacionamiento o quieres coordinar tu llegada desde el aeropuerto, escríbenos por WhatsApp y con gusto te ayudamos.</p>
          <p style="text-align:center;margin:1.4rem 0"><a href="${waLink}" style="background:#25D366;color:#fff;padding:.7rem 1.4rem;border-radius:999px;text-decoration:none;font-family:Arial">Escríbenos por WhatsApp</a></p>
          <p>Un cordial saludo,<br/>El equipo de Caonabo 35</p>`),
      });
      await supabase.from('bookings').update({ prearrival_sent_at: new Date().toISOString() }).eq('id', b.id);
      sent.prearrival++;
    } catch (e) { sent.errors.push(`prearrival ${b.id}: ${e.message}`); }
  }

  // ── Post-stay review request: checked out in the last 3 days, not yet emailed ──
  const { data: departures } = await supabase.from('bookings')
    .select('id,guest,email,check_out')
    .in('status', ['finalizada', 'checked_in', 'confirmed'])
    .lte('check_out', today).gte('check_out', addDays(today, -3))
    .is('review_email_sent_at', null);
  for (const b of (departures || [])) {
    if (!b.email) continue;
    try {
      const reviewLink = `${SITE}/?rev=${b.id}`;
      await resend.emails.send({
        from: FROM_EMAIL, to: b.email, reply_to: REPLY_TO || undefined,
        subject: `¡Gracias por tu estadía en Caonabo 35!`,
        html: shell(`<p>Hola ${b.guest || ''},</p>
          <p>Gracias por hospedarte en <b>Caonabo 35</b>. Esperamos que hayas disfrutado tu estadía en Santo Domingo.</p>
          <p>¿Nos regalas 30 segundos para contarnos cómo estuvo? Tu reseña ayuda muchísimo a nuestra pequeña posada familiar.</p>
          <p style="text-align:center;margin:1.4rem 0"><a href="${reviewLink}" style="background:#C4973A;color:#2A1F16;padding:.75rem 1.6rem;border-radius:6px;text-decoration:none;font-family:Arial;font-weight:bold">Dejar mi reseña</a></p>
          <p>¡Esperamos recibirte de nuevo pronto!<br/>El equipo de Caonabo 35</p>`),
      });
      await supabase.from('bookings').update({ review_email_sent_at: new Date().toISOString() }).eq('id', b.id);
      sent.poststay++;
    } catch (e) { sent.errors.push(`poststay ${b.id}: ${e.message}`); }
  }

  return res.status(200).json({ ok: true, ...sent });
}
