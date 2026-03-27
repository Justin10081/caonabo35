import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// Disable body parser so we can verify Stripe signature on raw body
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) return res.status(200).json({ received: true });

    // Mark booking confirmed + paid in Supabase
    const { data: booking, error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', paid: true })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (booking) {
      const FROM_EMAIL = 'Caonabo 35 <onboarding@resend.dev>';
      const roomName = `Habitación ${booking.room}`;
      const depositPaid = (session.amount_total / 100).toFixed(2);
      const remaining = Math.max(0, booking.total - session.amount_total / 100).toFixed(2);

      // ── Confirmation email to guest ────────────────────────────────
      if (booking.email) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: booking.email,
          subject: `🎉 Pago recibido – Reserva confirmada · ${roomName} · Caonabo 35`,
          html: `
            <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#2A1F16;">
              <div style="background:#2A1F16;padding:2rem;text-align:center;">
                <h1 style="color:#C4973A;font-size:1.8rem;margin:0;letter-spacing:.1em;">CAONABO 35</h1>
                <p style="color:#E8C97A;font-size:.75rem;letter-spacing:.2em;margin:.3rem 0 0;">SANTO DOMINGO · R.D.</p>
              </div>
              <div style="padding:2.5rem 2rem;background:#FAFAF8;">
                <p style="font-size:1.05rem;">Estimado/a <strong>${booking.guest}</strong>,</p>
                <p style="color:#2E7D32;font-weight:bold;font-size:1.05rem;">✅ ¡Su pago fue recibido y su reserva está <u>confirmada</u>!</p>
                <div style="background:#fff;border:2px solid #C4973A;border-radius:8px;padding:1.5rem;margin:1.5rem 0;">
                  <h3 style="color:#C4973A;margin:0 0 1rem;font-size:.8rem;letter-spacing:.15em;text-transform:uppercase;">Detalles de su Reserva</h3>
                  <table style="width:100%;border-collapse:collapse;">
                    <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;">Habitación</td><td style="font-weight:bold;">${roomName}</td></tr>
                    <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;">Check-in</td><td style="font-weight:bold;">${booking.check_in}</td></tr>
                    <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;">Check-out</td><td style="font-weight:bold;">${booking.check_out}</td></tr>
                    <tr><td style="padding:.4rem 0;color:#666;font-size:.9rem;">Noches</td><td style="font-weight:bold;">${booking.nights}</td></tr>
                    <tr style="border-top:1px solid #eee;">
                      <td style="padding:.7rem 0 0;color:#666;font-size:.9rem;">Depósito pagado</td>
                      <td style="padding:.7rem 0 0;font-weight:bold;color:#2E7D32;">$${depositPaid} ✓</td>
                    </tr>
                    <tr>
                      <td style="padding:.4rem 0;color:#666;font-size:.9rem;">Saldo al llegar</td>
                      <td style="padding:.4rem 0;font-weight:bold;color:#C4973A;">$${remaining} + ITBIS</td>
                    </tr>
                  </table>
                </div>
                <div style="background:#FFF8E1;border-left:4px solid #C4973A;padding:1rem 1.25rem;margin-bottom:1.5rem;border-radius:0 4px 4px 0;">
                  <p style="margin:0;font-size:.9rem;font-weight:bold;color:#2A1F16;">Información de llegada</p>
                  <p style="margin:.4rem 0 0;font-size:.88rem;color:#555;">📍 Av. Caonabo #35, 2do Piso · Santo Domingo, R.D.<br/>🕐 Check-in: a partir de las 3:00 PM<br/>🕐 Check-out: antes de las 12:00 PM</p>
                </div>
                <p style="font-size:.9rem;color:#666;">¿Preguntas? Escríbanos por WhatsApp.</p>
                <p style="margin-top:2rem;">Con gusto le esperamos,<br/><strong>Equipo Caonabo 35</strong></p>
              </div>
              <div style="background:#2A1F16;padding:1rem;text-align:center;">
                <p style="color:#8B6B4E;font-size:.75rem;margin:0;">Av. Caonabo #35, 2do Piso · Santo Domingo, R.D.</p>
              </div>
            </div>
          `,
        }).catch(e => console.error('Confirmation email error:', e));
      }

      // ── Push notification to admin ─────────────────────────────────
      const topic = process.env.NTFY_TOPIC;
      if (topic) {
        await fetch(`https://ntfy.sh/${topic}`, {
          method: 'POST',
          headers: {
            'Title': `💳 Depósito recibido – ${booking.guest}`,
            'Priority': 'high',
            'Tags': 'money,white_check_mark',
            'Content-Type': 'text/plain',
          },
          body: `$${depositPaid} · ${roomName} · ${booking.check_in} → ${booking.check_out}`,
        }).catch(() => {});
      }
    }
  }

  res.status(200).json({ received: true });
}
