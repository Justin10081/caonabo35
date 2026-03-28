import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export default async function handler(req, res) {
  // Only allow cron calls (Vercel sets this header)
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const headers = ['ID','Huésped','Email','Teléfono','Habitación','Check-in','Check-out','Noches','Huéspedes','Total','Estado','Pagado','Fuente','Notas','ID_Tipo','ID_Numero','Creado'];
  const rows = (bookings || []).map(b => [
    b.id, b.guest, b.email, b.phone, b.room,
    b.check_in, b.check_out, b.nights, b.guests,
    b.total, b.status, b.paid ? 'Sí' : 'No',
    b.source, (b.notes||'').replace(/,/g,''), b.id_type, b.id_number,
    b.created_at ? b.created_at.slice(0,10) : ''
  ].map(v => `"${v||''}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const today = new Date().toISOString().slice(0,10);
  const adminEmail = process.env.ADMIN_EMAIL || 'caonabo35@gmail.com';

  await resend.emails.send({
    from: process.env.FROM_EMAIL || 'reservas@caonabo35.com',
    to: adminEmail,
    subject: `📊 Backup Caonabo 35 — ${today} (${bookings.length} reservas)`,
    html: `<p>Backup diario automático de Caonabo 35.</p><p><strong>${bookings.length} reservas</strong> al ${today}.</p><p>El archivo CSV está adjunto.</p>`,
    attachments: [{
      filename: `caonabo35-backup-${today}.csv`,
      content: Buffer.from(csv).toString('base64'),
    }]
  });

  return res.status(200).json({ ok: true, count: bookings.length });
}
