import { createClient } from '@supabase/supabase-js';

// Import Airbnb / Booking.com iCal feeds into channel_blocks so a booking made on any
// channel blocks those dates on caonabo35.com. Runs from the daily Vercel cron (Authorization:
// Bearer CRON_SECRET, added automatically by Vercel) or from the admin "Sync now" button
// (Authorization: Bearer <the admin's Supabase access token>).

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

// Minimal, tolerant iCal parser: returns [{start:'YYYY-MM-DD', end:'YYYY-MM-DD', summary}] for each VEVENT.
function parseIcs(text) {
  // Unfold folded lines (RFC5545: a leading space/tab continues the previous line).
  const unfolded = String(text || '').replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const events = [];
  let cur = null;
  const toDate = (val) => {
    const m = String(val).match(/(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
  };
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') cur = {};
    else if (line === 'END:VEVENT') { if (cur && cur.start && cur.end) events.push(cur); cur = null; }
    else if (cur) {
      if (/^DTSTART/i.test(line)) cur.start = toDate(line.split(':').pop());
      else if (/^DTEND/i.test(line)) cur.end = toDate(line.split(':').pop());
      else if (/^SUMMARY/i.test(line)) cur.summary = line.slice(line.indexOf(':') + 1).trim();
    }
  }
  return events;
}

// Expand [start, end) into the nights it blocks (DTEND is the checkout day = not blocked).
function nightsBetween(start, end) {
  const out = [];
  const d = new Date(start + 'T00:00:00Z');
  const stop = new Date(end + 'T00:00:00Z');
  let guard = 0;
  while (d < stop && guard++ < 800) { out.push(ymd(d)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ── auth: Vercel cron (Bearer CRON_SECRET) OR an authenticated admin (Bearer Supabase token) ──
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  let allowed = false;
  if (process.env.CRON_SECRET && bearer && bearer === process.env.CRON_SECRET) allowed = true;
  else if (bearer) { try { const { data } = await supabase.auth.getUser(bearer); if (data?.user) allowed = true; } catch {} }
  if (!allowed) return res.status(401).json({ error: 'Unauthorized' });

  const { data: feeds, error: feedErr } = await supabase
    .from('channel_calendars').select('*').eq('active', true);
  if (feedErr) return res.status(500).json({ error: feedErr.message });
  if (!feeds || feeds.length === 0) return res.status(200).json({ ok: true, feeds: 0, blocks: 0, note: 'No calendars configured' });

  // Which rooms exist (for a whole-property feed with room_id = null).
  const { data: rooms } = await supabase.from('rooms').select('id');
  const allRoomIds = (rooms || []).map((r) => String(r.id));

  let totalBlocks = 0;
  const results = [];
  for (const feed of feeds) {
    try {
      const resp = await fetch(feed.ics_url, { headers: { 'User-Agent': 'caonabo35-sync/1.0' } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const events = parseIcs(await resp.text());
      const targetRooms = feed.room_id ? [String(feed.room_id)] : allRoomIds;
      const source = feed.source || 'airbnb';

      // Build the fresh block set for this feed's rooms.
      const rows = [];
      for (const rid of targetRooms) {
        for (const ev of events) {
          for (const date of nightsBetween(ev.start, ev.end)) {
            rows.push({ room_id: rid, date, source, label: ev.summary || 'Reservado' });
          }
        }
      }
      // Replace: clear this source's blocks for these rooms, then insert the fresh set.
      await supabase.from('channel_blocks').delete().eq('source', source).in('room_id', targetRooms);
      if (rows.length) {
        const { error: insErr } = await supabase.from('channel_blocks').upsert(rows, { onConflict: 'room_id,date,source' });
        if (insErr) throw insErr;
      }
      totalBlocks += rows.length;
      await supabase.from('channel_calendars').update({ last_synced: new Date().toISOString(), last_status: `ok · ${events.length} reservas · ${rows.length} noches` }).eq('id', feed.id);
      results.push({ id: feed.id, label: feed.label, events: events.length, blocks: rows.length });
    } catch (e) {
      await supabase.from('channel_calendars').update({ last_synced: new Date().toISOString(), last_status: `error: ${e.message}` }).eq('id', feed.id);
      results.push({ id: feed.id, label: feed.label, error: e.message });
    }
  }
  return res.status(200).json({ ok: true, feeds: feeds.length, blocks: totalBlocks, results });
}
