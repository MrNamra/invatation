import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function resolveSupabaseEnv(): { url: string; key: string } | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  );
  if (!rawUrl || !key) return null;
  const url = rawUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(resolveSupabaseEnv());
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  const env = resolveSupabaseEnv();
  if (!env) return null;
  if (cachedClient) return cachedClient;

  cachedClient = createClient(env.url, env.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
