// Shared server helpers. The leading underscore keeps Vercel from deploying this as a function.
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { createHash, timingSafeEqual } from 'node:crypto';

export function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let resendClient = null;
export function getResend() {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// resend v6 never throws on API errors; it resolves { data, error }. Normalise to a throw.
export async function sendEmail(payload, options) {
  const result = await getResend().emails.send(payload, options);
  if (!result || result.error) {
    const e = new Error(result?.error?.message || 'Email provider error');
    e.provider = result?.error;
    throw e;
  }
  return result.data;
}

export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// For plain-text channels (WhatsApp, push): one line, no control characters.
export function oneLine(v, max = 300) {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

// Constant-time compare; false whenever either side is missing so an unset env var never matches.
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function bearerToken(req) {
  const h = req?.headers?.authorization;
  if (typeof h !== 'string') return '';
  const m = h.match(/^Bearer\s+(\S+)\s*$/i);
  return m ? m[1] : '';
}

export function isCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  return !!secret && safeEqual(bearerToken(req), secret);
}

// A valid Supabase session is not enough: the user must be on the public.admins allow-list.
export async function isAdminToken(sb, token) {
  if (!token || token.length > 8192) return false;
  try {
    const { data, error } = await sb.auth.getUser(token);
    const uid = data?.user?.id;
    if (error || !uid) return false;
    const { data: row, error: aErr } = await sb.from('admins').select('user_id').eq('user_id', uid).maybeSingle();
    return !aErr && !!row;
  } catch {
    return false;
  }
}

export function parseId(v) {
  let n = NaN;
  if (typeof v === 'number') n = v;
  else if (typeof v === 'string' && /^\d{1,15}$/.test(v.trim())) n = Number(v.trim());
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isYmd(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function todayInSantoDomingo(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' });
}

// Deposit is 30% of the stay total, minimum $20 — always computed from the DB row.
export function requiredDeposit(total) {
  return Math.max(20, Math.round(Number(total || 0) * 0.30));
}

// Room display name from the rooms row (bookings.room 1..7 ↔ rooms.id '1'..'7', name "Habitación 201").
export function roomName(roomRow, roomNumber) {
  return (roomRow && roomRow.name) || `Habitación ${roomNumber}`;
}
export function roomShortLabel(roomRow, roomNumber) {
  const m = String(roomRow?.name || '').match(/(\d{2,4})\s*$/);
  if (m) return `Hab ${m[1]}`;
  return roomRow?.name || `Hab ${roomNumber}`;
}
export async function loadRoom(sb, roomNumber) {
  const { data } = await sb.from('rooms').select('id,name').eq('id', String(roomNumber)).maybeSingle();
  return data || null;
}

// ntfy's JSON publish endpoint carries UTF-8 in the body; the header form rejects emoji titles
// (Node fetch only allows ByteString header values), which silently killed every push before.
export async function sendPush(title, message, { tags = [], priority = 4 } = {}) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return false;
  try {
    const r = await fetch('https://ntfy.sh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, title, message, tags, priority }),
    });
    if (!r.ok) console.error('ntfy error: HTTP', r.status);
    return r.ok;
  } catch (e) {
    console.error('ntfy error:', e.message);
    return false;
  }
}

export function setJsonCors(res, methods = 'POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
