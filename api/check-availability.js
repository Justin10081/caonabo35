import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Allow cross-origin requests from the same site
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const { check_in, check_out } = req.query;
  if (!check_in || !check_out) {
    return res.status(400).json({ error: 'Missing check_in or check_out' });
  }
  if (check_in >= check_out) {
    return res.status(400).json({ error: 'check_out must be after check_in' });
  }

  // Find confirmed/pending bookings that overlap with the requested period.
  // Overlap: booking starts before our checkout AND booking ends after our checkin.
  const { data, error } = await supabase
    .from('bookings')
    .select('room')
    .neq('status', 'cancelled')
    .lt('check_in', check_out)
    .gt('check_out', check_in);

  if (error) {
    console.error('Availability check error:', error);
    return res.status(500).json({ error: error.message });
  }

  const bookedRooms = [...new Set((data || []).map(b => b.room))];
  return res.status(200).json({ bookedRooms });
}
