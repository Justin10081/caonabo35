import { serviceClient, setJsonCors } from './_lib/shared.js';

// PostgREST treats `*` as `%` in (i)like patterns, so it is escaped along with the SQL wildcards.
export function escapeLike(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/([%_*])/g, '\\$1');
}

// Fixed-length digit tail. Anchoring on 6 digits stops a very short stored or supplied number
// from matching everything, which a plain endsWith() allowed.
const tail = (v, n = 6) => {
  const d = String(v || '').replace(/[^0-9]/g, '');
  return d.length >= n ? d.slice(-n) : null;
};

export default async function handler(req, res) {
  setJsonCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  // SECURITY: require BOTH email and phone — the email alone must not unlock a stranger's history.
  const { email, phone } = req.body && typeof req.body === 'object' ? req.body : {};
  if (typeof email !== 'string' || typeof phone !== 'string') return res.status(400).json({ error: 'Email and phone required' });
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || cleanEmail.length > 254 || !cleanEmail.includes('@') || phone.length > 64) {
    return res.status(400).json({ error: 'Email and phone required' });
  }
  const wanted = tail(phone);
  if (!wanted) return res.status(400).json({ error: 'Phone number too short' });

  try {
    const supabase = serviceClient();
    const { data, error } = await supabase
      .from('bookings')
      // Only what the guest needs to see their stay: no notes, no ID data, no tokens.
      .select('id,guest,email,room,check_in,check_out,nights,guests,total,status,paid,created_at,phone')
      .ilike('email', escapeLike(cleanEmail))
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) { console.error('lookup-booking error:', error.message); return res.status(500).json({ error: 'Lookup failed' }); }

    const matched = (data || [])
      .filter(b => String(b.email || '').trim().toLowerCase() === cleanEmail)
      .filter(b => tail(b.phone) === wanted)
      .slice(0, 5)
      .map(({ phone: _p, email: _e, total, ...rest }) => ({ ...rest, total: total == null ? null : Number(total) }));

    if (matched.length === 0) return res.status(404).json({ error: 'No bookings found' });
    return res.status(200).json({ bookings: matched });
  } catch (e) {
    console.error('lookup-booking error:', e.message);
    return res.status(500).json({ error: 'Lookup failed' });
  }
}
