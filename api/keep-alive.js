import { serviceClient } from './_lib/shared.js';

export default async function handler(req, res) {
  // Deliberately unauthenticated: it only selects settings.id, and refusing it when CRON_SECRET is
  // missing would let the free-tier project pause (7 days idle takes booking and admin down).

  // Lightweight ping to keep the Supabase free tier from pausing
  try {
    const { error } = await serviceClient().from('settings').select('id').limit(1);
    if (error) {
      console.error('Keep-alive ping failed:', error.message);
      return res.status(500).json({ ok: false });
    }
  } catch (e) {
    console.error('Keep-alive ping failed:', e.message);
    return res.status(500).json({ ok: false });
  }
  console.log('Keep-alive ping succeeded:', new Date().toISOString());
  return res.status(200).json({ ok: true, ts: new Date().toISOString() });
}
