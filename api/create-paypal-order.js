import { serviceClient, parseId, requiredDeposit, loadRoom, roomName, setJsonCors } from './_lib/shared.js';

// Deposit is 30% of the stay total, minimum $20 — computed SERVER-SIDE from the DB, never from the client.
export { requiredDeposit };

export default async function handler(req, res) {
  setJsonCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const bookingId = parseId(body.bookingId);
  if (!bookingId) return res.status(400).json({ error: 'Invalid request' });

  const clientId = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) return res.status(503).json({ error: 'Payments unavailable' });

  try {
    const supabase = serviceClient();
    // SECURITY: look the booking up server-side and compute the amount from its real total.
    // The client cannot dictate what it pays.
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id,total,nights,room,paid,status')
      .eq('id', bookingId)
      .maybeSingle();
    if (error) { console.error('create-paypal-order lookup error:', error.message); return res.status(500).json({ error: 'Server error' }); }
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(409).json({ error: 'Booking cancelled' });
    if (booking.paid) return res.status(409).json({ error: 'Booking already paid' });

    const depositAmount = requiredDeposit(booking.total);
    const roomRow = await loadRoom(supabase, booking.room).catch(() => null);
    const rName = roomName(roomRow, booking.room);

    const authRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const { access_token } = authRes.ok ? await authRes.json().catch(() => ({})) : {};
    if (!access_token) return res.status(502).json({ error: 'Failed to create PayPal order' });

    // Amount + reference_id are set from server-trusted values
    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: String(booking.id),
          description: `Depósito – ${rName} · ${Number(booking.nights) || 0} noche(s) · Caonabo 35`.slice(0, 127),
          amount: { currency_code: 'USD', value: depositAmount.toFixed(2) },
        }],
      }),
    });
    const order = await orderRes.json().catch(() => ({}));

    if (order.id) return res.status(200).json({ orderID: order.id, depositAmount });
    console.error('PayPal order error:', order?.name || orderRes.status);
    return res.status(500).json({ error: 'Failed to create PayPal order' });
  } catch (e) {
    console.error('create-paypal-order error:', e.message);
    return res.status(500).json({ error: 'Failed to create PayPal order' });
  }
}
