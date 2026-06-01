import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Server-only Supabase client using the SECRET service_role key. It bypasses
 *  RLS, so it must NEVER be imported into client code. Our `imagina_leads`
 *  table has RLS enabled with no policies, so this is the only way to read or
 *  write it — the soda app's anon/publishable keys see zero rows. */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[supabase-admin] missing SUPABASE_URL or SERVICE_ROLE_KEY");
    return null;
  }
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
