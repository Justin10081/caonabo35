import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL     = process.env.FROM_EMAIL     || 'Caonabo 35 <onboarding@resend.dev>';
const ADMIN_EMAIL    = process.env.VITE_ADMIN_EMAIL || 'admin@caonabo35.com';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP  || '';
const BANK_NAME      = process.env.BANK_NAME       || 'Banco Popular';
const BANK_ACCOUNT   = process.env.BANK_ACCOUNT    || '';
const BANK_HOLDER    = process.env.BANK_HOLDER     || '';
const BANK_TYPE      = process.env.BANK_TYPE       || 'Cuenta de Ahorros';

// ── WhatsApp notification via CallMeBot (free) ────────────────────────────
async function sendWhatsApp(message) {
  const phone  = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return;
  try {
    const text = encodeURIComponent(message);
    await fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${apikey}`);
  } catch (e) {
    console.error('CallMeBot error:', e.message);
  }
}

// ── Push notification via ntfy.sh ─────────────────────────────────────────
async function sendPushNotification(title, message) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: { 'Title': title, 'Priority': 'high', 'Tags': 'hotel,bell', 'Content-Type': 'text/plain' },
      body: message,
    });
  } catch (e) {
    console.error('ntfy error:', e.message);
  }
}

// ── Bank transfer HTML block ──────────────────────────────────────────────
function bankTransferBlock() {
  if (!BANK_ACCOUNT) return '';
  return `
    <div style="background:#E8F5E9;border-left:4px solid #2E7D32;padding:1.25rem 1.5rem;border-radius:0 6px 6px 0;margin:1.5rem 0;">
      <p style="margin:0 0 .6rem;font-weight:bold;color:#1B5E20;font-size:.95rem;">💳 Cómo garantizar su reserva</p>
      <p style="margin:0 0 .75rem;font-size:.88rem;color:#2A1F16;line-height:1.6;">
        Para confirmar su habitación, realice una transferencia bancaria con los datos a continuación
        y envíenos el <strong>comprobante por WhatsApp</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
        <tr><td style="padding:.3rem 0;color:#555;width:45%;">Banco</td><td style="font-weight:bold;">${BANK_NAME}</td></tr>
        <tr><td style="padding:.3rem 0;color:#555;">Tipo de cuenta</td><td style="font-weight:bold;">${BANK_TYPE}</td></tr>
        <tr><td style="padding:.3rem 0;color:#555;">Número de cuenta</td><td style="font-weight:bold;color:#1B5E20;font-size:1rem;">${BANK_ACCOUNT}</td></tr>
        <tr><td style="padding:.3rem 0;color:#555;">A nombre de</td><td style="font-weight:bold;">${BANK_HOLDER}</td></tr>
      </table>
      ${ADMIN_WHATSAPP ? `<p style="margin:.9rem 0 0;font-size:.88rem;color:#2A1F16;">📲 Envíe el comprobante por WhatsApp al <strong>${ADMIN_WHATSAPP}</strong> y su reserva quedará confirmada.</p>` : ''}
    </div>
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Rate limiting: block same email booking more than 3x per hour
  const bookingEmail = req.body?.bookingData?.email;
  if (bookingEmail && req.body?.type === 'guest') {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count } = await sb.from('bookings').select('*', { count: 'exact', head: true })
      .eq('email', bookingEmail).gte('created_at', oneHourAgo);
    if ((count || 0) > 5) {
      return res.status(429).json({ error: 'Too many requests' });
    }
  }

  const { type, booking, room } = req.body;

  try {

    // ── 1. Guest confirmation (booking received) ──────────────────────────
    if (type === 'guest_confirmation') {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: booking.email,
        subject: `Reserva recibida – ${room.name} · Caonabo 35`,
        html: `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#2A1F16;">
            <div style="background:#2A1F16;padding:2rem;text-align:center;">
              <h1 style="color:#C4973A;font-size:1.8rem;margin:0;letter-spacing:.1em;">CAONABO 35</h1>
              <p style="color:#E8C97A;font-size:.75rem;letter-spacing:.2em;margin:.3rem 0 0;">SANTO DOMINGO · R.D.</p>
            </div>
            <div style="padding:2.5rem 2rem;background:#FAFAF8;">
              <p style="font-size:1.05rem;">Estimado/a <strong>${booking.guest}</strong>,</p>
              <p style="line-height:1.7;color:#444;">Su solicitud de reserva ha sido recibida. Para confirmar su habitación, realice la transferencia bancaria indicada abajo y envíenos el comprobante por WhatsApp.</p>
              <div style="background:#fff;border:1px solid #E8C97A;border-radius:8px;padding:1.5rem;margin:1.5rem 0;">
                <h3 style="color:#C4973A;margin:0 0 1rem;font-size:.8rem;letter-spacing:.15em;text-transform:uppercase;">Detalles de su Reserva</h3>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Habitación</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${room.name}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Check-in</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.checkIn}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Check-out</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.checkOut}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Noches</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.nights}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Huéspedes</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.guests}</td></tr>
                  <tr><td style="padding:.7rem 0 0;color:#666;font-size:.9rem;">Total</td><td style="padding:.7rem 0 0;font-weight:bold;font-size:1.1rem;color:#C4973A;">$${booking.total} USD</td></tr>
                </table>
              </div>
              ${bankTransferBlock()}
              <p style="font-size:.88rem;color:#888;line-height:1.6;margin-top:1rem;">¿Preguntas? Responda este correo o escríbanos por WhatsApp. Estamos para servirle.</p>
              <p style="margin-top:1.5rem;">Con gusto le esperamos,<br/><strong>Equipo Caonabo 35</strong></p>
            </div>
            <div style="background:#2A1F16;padding:1rem;text-align:center;">
              <p style="color:#8B6B4E;font-size:.75rem;margin:0;">Av. Caonabo #35, 2do Piso · Santo Domingo, R.D. · caonabo35.com</p>
            </div>
          </div>
        `,
      });
    }

    // ── 2. Admin notification (new booking) ──────────────────────────────
    if (type === 'admin_notification') {
      const waMsg =
        `🏨 *Nueva reserva – Caonabo 35*\n` +
        `👤 ${booking.guest}\n` +
        `🛏️ ${room.name}\n` +
        `📅 ${booking.checkIn} → ${booking.checkOut} (${booking.nights} noche${booking.nights>1?'s':''})\n` +
        `👥 ${booking.guests} huésped(es)\n` +
        `💰 $${booking.total} USD\n` +
        `📞 ${booking.phone}` +
        (booking.notes ? `\n📝 ${booking.notes}` : '');

      await sendWhatsApp(waMsg);
      await sendPushNotification(
        `🏨 Nueva reserva – ${room.name}`,
        `${booking.guest} · ${booking.checkIn} → ${booking.checkOut} · $${booking.total}\nTel: ${booking.phone}`
      );
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `🔔 Nueva reserva – ${room.name} (${booking.checkIn} → ${booking.checkOut})`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
            <h2 style="color:#C4973A;">Nueva Reserva Recibida</h2>
            <table style="width:100%;border-collapse:collapse;font-size:.95rem;">
              <tr><td style="padding:.4rem 0;color:#666;">Huésped</td><td><strong>${booking.guest}</strong></td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Email</td><td>${booking.email}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Teléfono</td><td>${booking.phone}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Habitación</td><td><strong>${room.name}</strong></td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Check-in</td><td>${booking.checkIn}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Check-out</td><td>${booking.checkOut}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Noches</td><td>${booking.nights}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Total</td><td><strong>$${booking.total} USD</strong></td></tr>
              ${booking.notes ? `<tr><td style="padding:.4rem 0;color:#666;">Notas</td><td>${booking.notes}</td></tr>` : ''}
            </table>
            <p style="margin-top:1.5rem;font-size:.85rem;color:#999;">Ingresa al panel de administración para confirmar esta reserva.</p>
          </div>
        `,
      });
    }

    // ── 3. Booking confirmed by admin ────────────────────────────────────
    if (type === 'booking_confirmed') {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: booking.email,
        subject: `🎉 ¡Reserva confirmada! – ${room.name} · Caonabo 35`,
        html: `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#2A1F16;">
            <div style="background:#2A1F16;padding:2rem;text-align:center;">
              <h1 style="color:#C4973A;font-size:1.8rem;margin:0;letter-spacing:.1em;">CAONABO 35</h1>
              <p style="color:#E8C97A;font-size:.75rem;letter-spacing:.2em;margin:.3rem 0 0;">SANTO DOMINGO · R.D.</p>
            </div>
            <div style="padding:2.5rem 2rem;background:#FAFAF8;">
              <p style="font-size:1.05rem;">Estimado/a <strong>${booking.guest}</strong>,</p>
              <p style="color:#2E7D32;font-weight:bold;font-size:1.05rem;">✅ Su reserva ha sido <u>confirmada</u>. ¡Le esperamos!</p>
              <div style="background:#fff;border:2px solid #C4973A;border-radius:8px;padding:1.5rem;margin:1.5rem 0;">
                <h3 style="color:#C4973A;margin:0 0 1rem;font-size:.8rem;letter-spacing:.15em;text-transform:uppercase;">Detalles de su Reserva</h3>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Habitación</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${room.name}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Check-in</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.checkIn}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Check-out</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.checkOut}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Noches</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.nights}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;border-bottom:1px solid #f5f0ea;">Huéspedes</td><td style="padding:.4rem 0;font-weight:bold;border-bottom:1px solid #f5f0ea;">${booking.guests}</td></tr>
                  <tr><td style="padding:.7rem 0 0;color:#666;font-size:.9rem;">Total</td><td style="padding:.7rem 0 0;font-weight:bold;font-size:1.1rem;color:#C4973A;">$${booking.total} USD</td></tr>
                </table>
              </div>
              <div style="background:#FFF8E1;border-left:4px solid #C4973A;padding:1rem 1.25rem;margin-bottom:1.5rem;border-radius:0 4px 4px 0;">
                <p style="margin:0;font-size:.9rem;font-weight:bold;">Información de llegada</p>
                <p style="margin:.4rem 0 0;font-size:.88rem;color:#555;line-height:1.8;">
                  📍 Av. Caonabo #35, 2do Piso · Santo Domingo, R.D.<br/>
                  🕐 Check-in: a partir de las 3:00 PM<br/>
                  🕑 Check-out: antes de las 12:00 PM
                </p>
              </div>
              <p style="font-size:.88rem;color:#888;">¿Preguntas? Escríbanos por WhatsApp${ADMIN_WHATSAPP ? ` al ${ADMIN_WHATSAPP}` : ''}. ¡Con gusto le atendemos!</p>
              <p style="margin-top:1.5rem;">Con gusto le esperamos,<br/><strong>Equipo Caonabo 35</strong></p>
            </div>
            <div style="background:#2A1F16;padding:1rem;text-align:center;">
              <p style="color:#8B6B4E;font-size:.75rem;margin:0;">Av. Caonabo #35, 2do Piso · Santo Domingo, R.D. · caonabo35.com</p>
            </div>
          </div>
        `,
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-email error:', err);
    res.status(500).json({ error: err.message });
  }
}
