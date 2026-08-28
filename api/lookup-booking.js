import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  // SECURITY: require BOTH email and phone — the email alone must not unlock a stranger's history.
  const { email, phone } = req.body || {};
  if (!email || !phone) return res.status(400).json({ error: 'Email and phone required' });

  // A 1-2 digit "phone" would match a large share of stored numbers via the suffix
  // comparison below, which would reduce the second factor to nothing.
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.length < 6) return res.status(400).json({ error: 'Phone number too short' });

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const cleanPhone = digits;

  const { data, error } = await supabase
    .from('bookings')
    // no internal notes, no totals in a public lookup — only what the guest needs to see their stay
    .select('id,guest,room,check_in,check_out,nights,guests,status,paid,created_at,phone')
    .eq('email', email.trim().toLowerCase())
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });

  // Match the phone server-side (digits-only) as the second factor, then strip it from the response.
  // Compare the last 6 digits both ways (country/area-code prefixes vary in how guests
  // type them). Anchoring on a fixed-length tail stops a very short stored or supplied
  // number from matching everything, which a plain endsWith() allowed.
  const tail = (v, n = 6) => {
    const d = String(v || '').replace(/[^0-9]/g, '');
    return d.length >= n ? d.slice(-n) : null;
  };
  const wanted = tail(cleanPhone);
  const matched = (data || [])
    .filter(b => { const got = tail(b.phone); return wanted && got && wanted === got; })
    .slice(0, 5)
    .map(({ phone, ...rest }) => rest);

  if (matched.length === 0) return res.status(404).json({ error: 'No bookings found' });

  return res.status(200).json({ bookings: matched });
}
