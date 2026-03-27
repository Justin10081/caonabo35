export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { depositAmount, roomName, nights, bookingId } = req.body;

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

  // Create PayPal order
  const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: String(bookingId),
        description: `Depósito – ${roomName} · ${nights} noche(s) · Caonabo 35`,
        amount: {
          currency_code: 'USD',
          value: depositAmount.toFixed(2),
        },
      }],
    }),
  });

  const order = await orderRes.json();

  if (order.id) {
    res.status(200).json({ orderID: order.id });
  } else {
    console.error('PayPal order error:', order);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
}
