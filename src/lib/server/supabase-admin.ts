import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

let cached: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = publicEnv.PUBLIC_SUPABASE_URL?.trim();
  const secret = privateEnv.SUPABASE_SECRET_KEY?.trim() || privateEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !secret) {
    cached = null;
    return cached;
  }

  cached = createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: { 'X-Client-Info': 'arenabook-admin-assistant' }
    }
  });
  return cached;
}

export function supabaseAdminConfigured() {
  return Boolean(publicEnv.PUBLIC_SUPABASE_URL?.trim() && (privateEnv.SUPABASE_SECRET_KEY?.trim() || privateEnv.SUPABASE_SERVICE_ROLE_KEY?.trim()));
}
