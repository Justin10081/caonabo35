import { serviceClient, isCronRequest } from './_lib/shared.js';

export default async function handler(req, res) {
  // Vercel cron sends "Authorization: Bearer <CRON_SECRET>"; with CRON_SECRET unset nothing is accepted.
  if (!isCronRequest(req)) return res.status(401).json({ error: 'Unauthorized' });

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
