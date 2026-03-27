import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { bookingId, roomName, nights, depositAmount, guestEmail, siteUrl } = req.body;

  if (!bookingId || !depositAmount || !siteUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: guestEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Depósito – ${roomName}`,
            description: `${nights} noche(s) · Caonabo 35`,
          },
          unit_amount: Math.round(depositAmount * 100), // cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${siteUrl}/?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?stripe=cancelled`,
      metadata: { bookingId: String(bookingId) },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
}
