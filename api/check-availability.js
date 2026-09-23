import { serviceClient, isYmd } from './_lib/shared.js';

const MAX_RANGE_DAYS = 400;
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

export default async function handler(req, res) {
  // Allow cross-origin requests from the same site
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const { check_in, check_out, room } = req.query || {};
  if (!isYmd(check_in) || !isYmd(check_out) || check_in >= check_out || dayDiff(check_in, check_out) > MAX_RANGE_DAYS) {
    return res.status(400).json({ error: 'Invalid dates' });
  }
  if (room !== undefined && (typeof room !== 'string' || !/^[1-9]\d?$/.test(room))) {
    return res.status(400).json({ error: 'Invalid room' });
  }

  try {
    const supabase = serviceClient();
    // Overlap: booking starts before our checkout AND ends after our check-in.
    let bq = supabase.from('bookings').select('room')
      .neq('status', 'cancelled').lt('check_in', check_out).gt('check_out', check_in);
    // Nights blocked by imported Airbnb/Booking.com calendars, or closed by the owner per night.
    let cq = supabase.from('channel_blocks').select('room_id').gte('date', check_in).lt('date', check_out);
    let nq = supabase.from('room_nights').select('room_id').eq('available', false).gte('date', check_in).lt('date', check_out);
    // Rooms closed entirely (the booking guard rejects these too).
    let rq = supabase.from('rooms').select('id').eq('available', false).not('name', 'is', null);
    if (room) {
      bq = bq.eq('room', Number(room));
      cq = cq.eq('room_id', room);
      nq = nq.eq('room_id', room);
      rq = rq.eq('id', room);
    }
    const [b, c, n, r] = await Promise.all([bq, cq, nq, rq]);
    const failed = [b, c, n, r].find(x => x.error);
    if (failed) {
      console.error('Availability check error:', failed.error.message);
      return res.status(500).json({ error: 'Availability check failed' });
    }

    const bookedRooms = [...new Set([
      ...(b.data || []).map(x => Number(x.room)),
      ...(c.data || []).map(x => Number(x.room_id)),
      ...(n.data || []).map(x => Number(x.room_id)),
      ...(r.data || []).map(x => Number(x.id)),
    ])].filter(x => Number.isInteger(x) && x > 0);
    return res.status(200).json({ bookedRooms });
  } catch (e) {
    console.error('Availability check error:', e.message);
    return res.status(500).json({ error: 'Availability check failed' });
  }
}
