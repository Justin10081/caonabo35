import { createClient } from '@supabase/supabase-js';

// A guest submits a review via the link in their post-stay email (?rev=<bookingId>).
// Verified: only a real, completed booking can review, once. Stored unapproved until the admin publishes it.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { bookingId, rating, body } = req.body || {};
  const r = Math.max(1, Math.min(5, parseInt(rating) || 0));
  if (!bookingId || !r || !String(body || '').trim()) return res.status(400).json({ error: 'Faltan datos' });

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: booking } = await supabase
    .from('bookings').select('id,guest,status,check_out').eq('id', bookingId).single();
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

  // Must be a real completed stay (checked out or marked finalizada) — that's what makes the review verified.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' });
  const stayed = booking.status === 'finalizada' || booking.status === 'checked_in' || (booking.check_out && booking.check_out <= today);
  if (!stayed) return res.status(403).json({ error: 'La reseña solo está disponible después de tu estadía' });

  const { data: existing } = await supabase.from('reviews').select('id').eq('booking_id', bookingId).limit(1);
  if (existing && existing.length) return res.status(409).json({ error: 'Ya recibimos tu reseña. ¡Gracias!' });

  const { error } = await supabase.from('reviews').insert([{
    name: booking.guest || 'Huésped', rating: r, body: String(body).trim().slice(0, 1000),
    approved: false, booking_id: bookingId, source: 'guest',
  }]);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
