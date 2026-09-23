import { serviceClient, safeEqual, parseId, UUID_RE, todayInSantoDomingo, oneLine, setJsonCors } from './_lib/shared.js';

const MAX_BODY = 1000;
const MAX_NAME = 60;

// A guest reviews via the link in their post-stay email (?rev=<bookingId>&t=<review_token>).
// The unguessable review_token is what makes the review verified; the booking id alone proves nothing.
// Stored unapproved until the admin publishes it.
export default async function handler(req, res) {
  setJsonCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const input = req.body && typeof req.body === 'object' ? req.body : {};
  const bookingId = parseId(input.bookingId);
  const token = typeof input.token === 'string' ? input.token.trim() : '';
  const rating = typeof input.rating === 'number' || typeof input.rating === 'string' ? Number(input.rating) : NaN;
  const body = typeof input.body === 'string' ? input.body.replace(/\r\n?/g, '\n').trim() : '';
  const name = typeof input.name === 'string' ? oneLine(input.name, MAX_NAME) : '';
  if (input.name !== undefined && input.name !== null && typeof input.name !== 'string') return res.status(400).json({ error: 'Faltan datos' });
  if (!bookingId || !UUID_RE.test(token)) return res.status(403).json({ error: 'Enlace no válido' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || body.length < 2 || body.length > MAX_BODY) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const supabase = serviceClient();
    const { data: booking, error: bErr } = await supabase
      .from('bookings').select('id,guest,status,check_out,review_token').eq('id', bookingId).maybeSingle();
    if (bErr) { console.error('submit-review lookup error:', bErr.message); return res.status(500).json({ error: 'No se pudo guardar la reseña' }); }
    if (!booking || !safeEqual(String(booking.review_token || ''), token)) return res.status(403).json({ error: 'Enlace no válido' });

    const today = todayInSantoDomingo();
    const stayed = ['finalizada', 'checked_in', 'confirmed'].includes(booking.status) && booking.check_out && String(booking.check_out) < today;
    if (!stayed) return res.status(403).json({ error: 'La reseña solo está disponible después de tu estadía' });

    const { data: existing, error: exErr } = await supabase.from('reviews').select('id').eq('booking_id', bookingId).limit(1);
    if (exErr) { console.error('submit-review exists error:', exErr.message); return res.status(500).json({ error: 'No se pudo guardar la reseña' }); }
    if (existing && existing.length) return res.status(409).json({ error: 'Ya recibimos tu reseña. ¡Gracias!' });

    const { error } = await supabase.from('reviews').insert([{
      name: name || oneLine(booking.guest, MAX_NAME) || 'Huésped',
      rating, body, approved: false, booking_id: bookingId, source: 'guest',
    }]);
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Ya recibimos tu reseña. ¡Gracias!' });
      console.error('submit-review insert error:', error.message);
      return res.status(500).json({ error: 'No se pudo guardar la reseña' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('submit-review error:', e.message);
    return res.status(500).json({ error: 'No se pudo guardar la reseña' });
  }
}
