import {
  serviceClient, sendEmail, esc, oneLine, parseId, requiredDeposit, loadRoom, roomName, sendPush, setJsonCors,
} from './_lib/shared.js';

const PAYPAL_API = 'https://api-m.paypal.com';
export const ORDER_ID_RE = /^[A-Z0-9]{10,24}$/;

const cents = (v) => Math.round(Number(v) * 100);

// The order must be APPROVED, reference THIS booking and carry exactly the server-computed deposit
// BEFORE anything is captured; otherwise a cheap order made for one booking could be replayed on another.
export function orderMatchesBooking(order, booking) {
  if (!order || order.status !== 'APPROVED') return false;
  const units = Array.isArray(order.purchase_units) ? order.purchase_units : [];
  if (units.length !== 1) return false;
  const pu = units[0];
  if (String(pu?.reference_id) !== String(booking.id)) return false;
  if (pu?.amount?.currency_code !== 'USD') return false;
  return cents(pu?.amount?.value) === cents(requiredDeposit(booking.total));
}

async function paypalToken() {
  const id = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) return null;
  const r = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => ({}));
  return j.access_token || null;
}

export default async function handler(req, res) {
  setJsonCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const orderID = typeof body.orderID === 'string' ? body.orderID.trim() : '';
  const bookingId = parseId(body.bookingId);
  if (!ORDER_ID_RE.test(orderID) || !bookingId) return res.status(400).json({ error: 'Invalid request' });

  try {
    const supabase = serviceClient();
    const { data: existing, error: lookupErr } = await supabase
      .from('bookings').select('id,total,paid,status').eq('id', bookingId).maybeSingle();
    if (lookupErr) { console.error('capture lookup error:', lookupErr.message); return res.status(500).json({ error: 'Server error' }); }
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    if (existing.status === 'cancelled') return res.status(409).json({ error: 'Booking cancelled' });
    if (existing.paid) return res.status(409).json({ error: 'Booking already paid' });

    const access_token = await paypalToken();
    if (!access_token) return res.status(502).json({ error: 'Payment provider unavailable' });

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${encodeURIComponent(orderID)}`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    });
    const order = orderRes.ok ? await orderRes.json().catch(() => null) : null;
    if (!orderMatchesBooking(order, existing)) {
      console.error('PayPal order rejected before capture', { bookingId, status: order?.status, ref: order?.purchase_units?.[0]?.reference_id });
      return res.status(400).json({ error: 'Payment does not match this booking' });
    }

    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `c35-capture-${orderID}`,
      },
    });
    const capture = await captureRes.json().catch(() => ({}));
    if (capture.status !== 'COMPLETED') {
      console.error('PayPal capture failed:', capture?.name || captureRes.status);
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const cap = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const amountPaid = parseFloat(cap?.amount?.value || 0);
    const ref = capture.purchase_units?.[0]?.reference_id;
    if ((ref !== undefined && String(ref) !== String(bookingId)) || amountPaid + 0.01 < requiredDeposit(existing.total)) {
      // Captured but inconsistent: money moved, so flag loudly for a human instead of confirming.
      console.error('PayPal capture inconsistent with booking', { bookingId, ref, amountPaid });
      return res.status(400).json({ error: 'Payment does not match this booking' });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', paid: true })
      .eq('id', bookingId)
      .select('id,guest,email,room,check_in,check_out,nights,total')
      .maybeSingle();
    if (error || !booking) {
      console.error('Captured PayPal payment but failed to mark booking paid', { bookingId, orderID, err: error?.message });
      return res.status(500).json({ error: 'Payment received; booking update pending' });
    }

    const roomRow = await loadRoom(supabase, booking.room).catch(() => null);
    const rName = roomName(roomRow, booking.room);

    if (booking.email) {
      const FROM_EMAIL = process.env.FROM_EMAIL || 'Caonabo 35 <onboarding@resend.dev>';
      await sendEmail({
        from: FROM_EMAIL,
        to: String(booking.email).trim(),
        subject: `🎉 ¡Pago recibido y reserva confirmada! – ${rName} · Caonabo 35`,
        html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#2A1F16;">
          <div style="background:#2A1F16;padding:2rem;text-align:center;">
            <h1 style="color:#C4973A;font-size:1.8rem;margin:0;letter-spacing:.1em;">CAONABO 35</h1>
            <p style="color:#E8C97A;font-size:.75rem;letter-spacing:.2em;margin:.3rem 0 0;">SANTO DOMINGO · R.D.</p>
          </div>
          <div style="padding:2.5rem 2rem;background:#FAFAF8;">
            <p style="font-size:1.05rem;">Estimado/a <strong>${esc(booking.guest)}</strong>,</p>
            <p style="color:#2E7D32;font-weight:bold;font-size:1.1rem;">✅ ¡Su pago fue recibido y su reserva está <u>confirmada</u>!</p>
            <div style="background:#fff;border:2px solid #C4973A;border-radius:8px;padding:1.5rem;margin:1.5rem 0;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:.5rem 0;color:#666;border-bottom:1px solid #f0e8dc;">Habitación</td><td style="font-weight:bold;border-bottom:1px solid #f0e8dc;">${esc(rName)}</td></tr>
                <tr><td style="padding:.5rem 0;color:#666;border-bottom:1px solid #f0e8dc;">Check-in</td><td style="font-weight:bold;border-bottom:1px solid #f0e8dc;">${esc(booking.check_in)}</td></tr>
                <tr><td style="padding:.5rem 0;color:#666;border-bottom:1px solid #f0e8dc;">Check-out</td><td style="font-weight:bold;border-bottom:1px solid #f0e8dc;">${esc(booking.check_out)}</td></tr>
                <tr><td style="padding:.5rem 0;color:#666;border-bottom:1px solid #f0e8dc;">Noches</td><td style="font-weight:bold;border-bottom:1px solid #f0e8dc;">${Number(booking.nights) || 0}</td></tr>
                <tr><td style="padding:.5rem 0;color:#666;border-bottom:1px solid #f0e8dc;">Depósito pagado</td><td style="font-weight:bold;color:#2E7D32;border-bottom:1px solid #f0e8dc;">$${amountPaid.toFixed(2)} USD</td></tr>
                <tr><td style="padding:.5rem 0;color:#666;">Saldo al llegar</td><td style="font-weight:bold;">$${Math.max(0, Number(booking.total || 0) - amountPaid).toFixed(2)} USD</td></tr>
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
      }, { idempotencyKey: `c35-paypal-${orderID}` }).catch(e => console.error('Email error:', e.message));
    }

    await sendPush(
      `💳 Depósito PayPal recibido – ${oneLine(booking.guest, 120)}`,
      `$${amountPaid.toFixed(2)} · ${oneLine(rName, 80)} · ${booking.check_in} → ${booking.check_out}`,
      { tags: ['money', 'white_check_mark'] }
    );

    return res.status(200).json({ success: true, amountPaid });
  } catch (e) {
    console.error('capture-paypal-order error:', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
