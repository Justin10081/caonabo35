import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Deposit is 30% of the stay total, minimum $20 — computed SERVER-SIDE from the DB, never from the client.
export function requiredDeposit(total) {
  return Math.max(20, Math.round(Number(total || 0) * 0.30));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });

  // SECURITY: look the booking up server-side and compute the amount from its real total.
  // The client cannot dictate what it pays.
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id,total,nights,room,paid')
    .eq('id', bookingId)
    .single();
  if (error || !booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.paid) return res.status(409).json({ error: 'Booking already paid' });

  const depositAmount = requiredDeposit(booking.total);
  const roomName = `Habitación ${booking.room}`;

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

  // Create PayPal order — amount + reference_id are set from server-trusted values
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
        description: `Depósito – ${roomName} · ${booking.nights} noche(s) · Caonabo 35`,
        amount: { currency_code: 'USD', value: depositAmount.toFixed(2) },
      }],
    }),
  });
  const order = await orderRes.json();

  if (order.id) {
    res.status(200).json({ orderID: order.id, depositAmount });
  } else {
    console.error('PayPal order error:', order);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
}
