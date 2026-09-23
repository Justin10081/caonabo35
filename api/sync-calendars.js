import { serviceClient, isCronRequest, bearerToken, isAdminToken } from './_lib/shared.js';

// Import Airbnb / Booking.com iCal feeds into channel_blocks so a booking made on any
// channel blocks those dates on caonabo35.com. Runs daily from /api/daily-backup (runSync) and
// from the admin "Sync now" button (Authorization: Bearer <admin's Supabase access token>).

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

// Minimal, tolerant iCal parser: returns [{start:'YYYY-MM-DD', end:'YYYY-MM-DD', summary}] for each VEVENT.
export function parseIcs(text) {
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

function assertPublicHttps(u) {
  if (u.protocol !== 'https:') throw new Error('only https feeds are allowed');
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.includes(':') ||
      /^(0|10|127)\./.test(h) || /^169\.254\./.test(h) || /^192\.168\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) {
    throw new Error('feed host not allowed');
  }
}

// https only, ≤3 redirects (each re-checked), 8 s overall timeout, 2 MB body cap.
export async function fetchFeed(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    let current = new URL(url);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      assertPublicHttps(current);
      const resp = await fetch(current, {
        redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'caonabo35-sync/1.0' },
      });
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('location');
        try { await resp.body?.cancel(); } catch {}
        if (!loc) throw new Error(`HTTP ${resp.status} without location`);
        current = new URL(loc, current);
        continue;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const declared = Number(resp.headers.get('content-length') || 0);
      if (declared > MAX_BYTES) throw new Error('feed too large');
      if (!resp.body) return '';
      const reader = resp.body.getReader();
      const chunks = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) { try { await reader.cancel(); } catch {} throw new Error('feed too large'); }
        chunks.push(value);
      }
      return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
    }
    throw new Error('too many redirects');
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('timeout');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Core logic, callable from daily-backup (the Hobby plan allows only two crons) or the handler below.
export async function runSync(supabase) {
  const { data: feeds, error: feedErr } = await supabase
    .from('channel_calendars').select('*').eq('active', true);
  if (feedErr) throw new Error('could not load channel calendars');
  if (!feeds || feeds.length === 0) return { feeds: 0, blocks: 0, note: 'No calendars configured' };

  // Only the real rooms ('1'..'7', named); legacy '201'..'208' rows have no name.
  const { data: rooms, error: roomErr } = await supabase.from('rooms').select('id,name').not('name', 'is', null);
  if (roomErr) throw new Error('could not load rooms');
  const allRoomIds = (rooms || []).map((r) => String(r.id)).filter((id) => /^\d{1,2}$/.test(id));

  let totalBlocks = 0;
  const results = [];
  for (const feed of feeds) {
    try {
      const targetRooms = feed.room_id ? [String(feed.room_id)] : allRoomIds;
      if (targetRooms.length === 0 || targetRooms.some((r) => !allRoomIds.includes(r))) throw new Error('unknown room');
      const events = parseIcs(await fetchFeed(feed.ics_url));
      const source = feed.source || 'airbnb';

      // Build the fresh block set for this feed's rooms.
      const rows = [];
      for (const rid of targetRooms) {
        for (const ev of events) {
          for (const date of nightsBetween(ev.start, ev.end)) {
            rows.push({ room_id: rid, date, source, label: String(ev.summary || 'Reservado').slice(0, 200) });
          }
        }
      }
      // Replace: clear this source's blocks for these rooms, then insert the fresh set.
      const { error: delErr } = await supabase.from('channel_blocks').delete().eq('source', source).in('room_id', targetRooms);
      if (delErr) throw new Error('could not clear old blocks');
      if (rows.length) {
        const { error: insErr } = await supabase.from('channel_blocks').upsert(rows, { onConflict: 'room_id,date,source' });
        if (insErr) throw new Error('could not save blocks');
      }
      totalBlocks += rows.length;
      await supabase.from('channel_calendars').update({ last_synced: new Date().toISOString(), last_status: `ok · ${events.length} reservas · ${rows.length} noches` }).eq('id', feed.id);
      results.push({ id: feed.id, label: feed.label, events: events.length, blocks: rows.length });
    } catch (e) {
      await supabase.from('channel_calendars').update({ last_synced: new Date().toISOString(), last_status: `error: ${e.message}` }).eq('id', feed.id);
      results.push({ id: feed.id, label: feed.label, error: e.message });
    }
  }
  return { feeds: feeds.length, blocks: totalBlocks, results };
}

export default async function handler(req, res) {
  let supabase;
  try { supabase = serviceClient(); } catch { return res.status(500).json({ error: 'Server error' }); }

  // ── auth: cron (Bearer CRON_SECRET) OR a Supabase user on the admins allow-list ──
  const allowed = isCronRequest(req) || (await isAdminToken(supabase, bearerToken(req)));
  if (!allowed) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const out = await runSync(supabase);
    return res.status(200).json({ ok: true, ...out });
  } catch (e) {
    console.error('sync-calendars error:', e.message);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
