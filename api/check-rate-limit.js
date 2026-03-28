import { createClient } from '@supabase/supabase-js';

export async function checkRateLimit(email, ip) {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', oneHourAgo);
  return (count || 0) >= 3; // block if 3+ bookings from same email in 1 hour
}
