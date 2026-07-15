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

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const cleanPhone = String(phone).replace(/[^0-9]/g, '');

  const { data, error } = await supabase
    .from('bookings')
    // no internal notes, no totals in a public lookup — only what the guest needs to see their stay
    .select('id,guest,room,check_in,check_out,nights,guests,status,paid,created_at,phone')
    .eq('email', email.trim().toLowerCase())
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });

  // Match the phone server-side (digits-only) as the second factor, then strip it from the response.
  const matched = (data || [])
    .filter(b => String(b.phone || '').replace(/[^0-9]/g, '').endsWith(cleanPhone) || cleanPhone.endsWith(String(b.phone || '').replace(/[^0-9]/g, '')))
    .slice(0, 5)
    .map(({ phone, ...rest }) => rest);

  if (matched.length === 0) return res.status(404).json({ error: 'No bookings found' });

  return res.status(200).json({ bookings: matched });
}
