import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Send a push notification to dad's phone via ntfy.sh (free, no account needed)
async function sendPushNotification(title, message) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return; // skip if not configured
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': 'high',
        'Tags': 'hotel,bell',
        'Content-Type': 'text/plain',
      },
      body: message,
    });
  } catch (e) {
    console.error('ntfy error:', e.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, booking, room } = req.body;

  const FROM_EMAIL = 'Caonabo 35 <onboarding@resend.dev>';
  const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || 'admin@caonabo35.com';

  try {
    if (type === 'guest_confirmation') {
      // ── Email to guest ──────────────────────────────────────────────
      await resend.emails.send({
        from: FROM_EMAIL,
        to: booking.email,
        subject: `✅ Reserva confirmada – ${room.name} · Caonabo 35`,
        html: `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#2A1F16;">
            <div style="background:#2A1F16;padding:2rem;text-align:center;">
              <h1 style="color:#C4973A;font-size:1.8rem;margin:0;letter-spacing:.1em;">CAONABO 35</h1>
              <p style="color:#E8C97A;font-size:.75rem;letter-spacing:.2em;margin:.3rem 0 0;">SANTO DOMINGO · R.D.</p>
            </div>
            <div style="padding:2.5rem 2rem;background:#FAFAF8;">
              <p style="font-size:1.05rem;">Estimado/a <strong>${booking.guest}</strong>,</p>
              <p>Su reserva ha sido recibida y está pendiente de confirmación. Nuestro equipo se pondrá en contacto con usted a la brevedad.</p>

              <div style="background:#fff;border:1px solid #E8C97A;border-radius:8px;padding:1.5rem;margin:1.5rem 0;">
                <h3 style="color:#C4973A;margin:0 0 1rem;font-size:.8rem;letter-spacing:.15em;text-transform:uppercase;">Detalles de su Reserva</h3>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;">Habitación</td><td style="padding:.4rem 0;font-weight:bold;">${room.name}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;">Check-in</td><td style="padding:.4rem 0;font-weight:bold;">${booking.checkIn}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;">Check-out</td><td style="padding:.4rem 0;font-weight:bold;">${booking.checkOut}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;">Noches</td><td style="padding:.4rem 0;font-weight:bold;">${booking.nights}</td></tr>
                  <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;">Huéspedes</td><td style="padding:.4rem 0;font-weight:bold;">${booking.guests}</td></tr>
                  <tr style="border-top:1px solid #eee;">
                    <td style="padding:.7rem 0 0;color:#666;font-size:.9rem;">Total estimado</td>
                    <td style="padding:.7rem 0 0;font-weight:bold;font-size:1.1rem;color:#C4973A;">$${booking.total} + ITBIS</td>
                  </tr>
                </table>
              </div>

              <p style="font-size:.9rem;color:#666;">Si tiene alguna pregunta, responda este correo o escríbanos por WhatsApp.</p>
              <p style="margin-top:2rem;">Con gusto le esperamos,<br/><strong>Equipo Caonabo 35</strong></p>
            </div>
            <div style="background:#2A1F16;padding:1rem;text-align:center;">
              <p style="color:#8B6B4E;font-size:.75rem;margin:0;">Av. Caonabo #35, 2do Piso · Santo Domingo, R.D.</p>
            </div>
          </div>
        `,
      });
    }

    if (type === 'admin_notification') {
      // ── Email to admin ──────────────────────────────────────────────
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
              <tr><td style="padding:.4rem 0;color:#666;">Huéspedes</td><td>${booking.guests}</td></tr>
              <tr><td style="padding:.4rem 0;color:#666;">Total</td><td><strong>$${booking.total}</strong></td></tr>
              ${booking.notes ? `<tr><td style="padding:.4rem 0;color:#666;">Notas</td><td>${booking.notes}</td></tr>` : ''}
            </table>
            <p style="margin-top:1.5rem;font-size:.85rem;color:#999;">Ve al panel de administración para confirmar o gestionar esta reserva.</p>
          </div>
        `,
      });

      // ── Push notification to phone (ntfy.sh) ───────────────────────
      await sendPushNotification(
        `🏨 Nueva reserva – ${room.name}`,
        `${booking.guest} · ${booking.checkIn} → ${booking.checkOut} · $${booking.total}\nTel: ${booking.phone}`
      );
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: err.message });
  }
}
