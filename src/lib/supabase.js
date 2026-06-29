import { createClient } from '@supabase/supabase-js';

// Publishable key is safe to ship in the client bundle (it only grants the
// permissions Row Level Security allows). Env vars override for self-hosting.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://rhhpshsyrvckouqtyeov.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sSNzAcbtyd94aQB7KpwdhQ_oFoPtsEx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // handle magic-link / OAuth redirect back to the app
  },
});
