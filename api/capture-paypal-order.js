import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { orderID, bookingId } = req.body;

  // Get PayPal access token
  const authRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const { access_token } = await authRes.json();

  // Capture the payment
  const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
  });
  const capture = await captureRes.json();

  if (capture.status !== 'COMPLETED') {
    console.error('PayPal capture failed:', capture);
    return res.status(400).json({ error: 'Payment not completed' });
  }

  const amountPaid = parseFloat(
    capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0
  );

  // Mark booking confirmed + paid in Supabase
  const { data: booking, error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed', paid: true })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  // Send confirmation email to guest
  if (booking?.email) {
    const roomName = `Habitación ${booking.room}`;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'Caonabo 35 <onboarding@resend.dev>';

    await resend.emails.send({
      from: FROM_EMAIL,
      to: booking.email,
      subject: `🎉 ¡Pago recibido y reserva confirmada! – ${roomName} · Caonabo 35`,
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#2A1F16;">
          <div style="background:#2A1F16;padding:2rem;text-align:center;">
            <h1 style="color:#C4973A;font-size:1.8rem;margin:0;letter-spacing:.1em;">CAONABO 35</h1>
            <p style="color:#E8C97A;font-size:.75rem;letter-spacing:.2em;margin:.3rem 0 0;">SANTO DOMINGO · R.D.</p>
          </div>
          <div style="padding:2.5rem 2rem;background:#FAFAF8;">
            <p style="font-size:1.05rem;">Estimado/a <strong>${booking.guest}</strong>,</p>
            <p style="color:#2E7D32;font-weight:bold;font-size:1.1rem;">✅ ¡Su pago fue recibido y su reserva está <u>confirmada</u>!</p>
            <div style="background:#fff;border:2px solid #C4973A;border-radius:8px;padding:1.5rem;margin:1.5rem 0;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:.5rem 0;color:#666;border-bottom:1px solid #f0e8dc;">Habitación</td><td style="font-weight:bold;border-bottom:1px solid #f0e8dc;">${roomName}</td></tr>
                <tr><td style="padding:.5rem 0;color:#666;border-bottom:1px solid #f0e8dc;">Check-in</td><td style="font-weight:bold;border-bottom:1px solid #f0e8dc;">${booking.check_in}</td></tr>
                <tr><td style="padding:.5rem 0;color:#666;border-bottom:1px solid #f0e8dc;">Check-out</td><td style="font-weight:bold;border-bottom:1px solid #f0e8dc;">${booking.check_out}</td></tr>
                <tr><td style="padding:.5rem 0;color:#666;border-bottom:1px solid #f0e8dc;">Noches</td><td style="font-weight:bold;border-bottom:1px solid #f0e8dc;">${booking.nights}</td></tr>
                <tr><td style="padding:.5rem 0;color:#666;border-bottom:1px solid #f0e8dc;">Depósito pagado</td><td style="font-weight:bold;color:#2E7D32;border-bottom:1px solid #f0e8dc;">$${amountPaid.toFixed(2)} USD</td></tr>
                <tr><td style="padding:.5rem 0;color:#666;">Saldo al llegar</td><td style="font-weight:bold;">$${Math.max(0, booking.total - amountPaid).toFixed(2)} USD</td></tr>
              </table>
            </div>
            <div style="background:#FFF8E1;border-left:4px solid #C4973A;padding:1rem 1.25rem;border-radius:0 4px 4px 0;margin-bottom:1.5rem;">
              <p style="margin:0;font-weight:bold;">Información de llegada</p>
              <p style="margin:.5rem 0 0;font-size:.88rem;color:#555;">
                📍 Av. Caonabo #35, 2do Piso · Santo Domingo, R.D.<br/>
                🕐 Check-in: a partir de las 3:00 PM<br/>
                🕑 Check-out: hasta las 12:00 PM
              </p>
            </div>
            <p style="font-size:.85rem;color:#888;">¿Preguntas? Escríbenos por WhatsApp y le atendemos con gusto.</p>
          </div>
          <div style="background:#2A1F16;padding:1rem;text-align:center;">
            <p style="color:#8B6B4E;font-size:.75rem;margin:0;">Av. Caonabo #35, 2do Piso · Santo Domingo, R.D. · caonabo35.com</p>
          </div>
        </div>
      `,
    }).catch(e => console.error('Email error:', e));
  }

  // Notify admin via ntfy push notification
  const topic = process.env.NTFY_TOPIC;
  if (topic) {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Title': `💳 Depósito PayPal recibido – ${booking.guest}`,
        'Priority': 'high',
        'Tags': 'money,white_check_mark',
        'Content-Type': 'text/plain',
      },
      body: `$${amountPaid.toFixed(2)} · Hab. ${booking.room} · ${booking.check_in} → ${booking.check_out}`,
    }).catch(() => {});
  }

  res.status(200).json({ success: true, amountPaid });
}
