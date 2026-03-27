import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Lightweight ping to keep the Supabase free tier from pausing
  const { error } = await supabase.from('settings').select('id').limit(1);
  if (error) {
    console.error('Keep-alive ping failed:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
  console.log('Keep-alive ping succeeded:', new Date().toISOString());
  return res.status(200).json({ ok: true, ts: new Date().toISOString() });
}
