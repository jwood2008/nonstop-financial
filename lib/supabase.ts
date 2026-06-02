import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase browser client. Reads the public env vars; if they're missing the
 * app falls back to the local-only auth used during the preview (so nothing
 * breaks before the keys are wired up).
 *
 *   NEXT_PUBLIC_SUPABASE_URL       https://<project-id>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  the project's anon/public key
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
