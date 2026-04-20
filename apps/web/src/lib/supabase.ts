import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/** URL del dashboard = https://xxx.supabase.co — nunca /rest/v1/ (eso rompe Auth y otros paths). */
function normalizeSupabaseProjectUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');
}

function looksLikeSupabaseAnonKey(key: string): boolean {
  const t = key.trim();
  // Publishable (sb_…) o JWT anon (eyJ…) suelen ser largas; placeholders del tutorial suelen ser cortos o llevan <>.
  if (t.length < 32) return false;
  if (/[<>]/.test(t) || /completa del dashboard/i.test(t)) return false;
  return true;
}

export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseProjectUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  return Boolean(url && key && looksLikeSupabaseAnonKey(key));
}

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase no está configurado. Crea apps/web/.env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    );
  }

  if (!browserClient) {
    const url = normalizeSupabaseProjectUrl(import.meta.env.VITE_SUPABASE_URL ?? '');
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
    browserClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }

  return browserClient;
}
