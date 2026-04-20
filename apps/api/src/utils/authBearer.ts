import { createClient, type User } from '@supabase/supabase-js';
import type { Config } from './config';

/**
 * Resuelve el usuario del header Authorization (access JWT del cliente).
 * Usa SUPABASE_ANON_KEY + Authorization (patrón SSR de Supabase); es más fiable que
 * auth.getUser(jwt) solo con service_role.
 */
export async function getBearerUser(
  config: Config,
  authHeader: string | undefined,
): Promise<{ user: User } | { error: string; code: string }> {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return { error: 'Missing bearer token', code: 'NO_TOKEN' };
  }
  if (!config.SUPABASE_URL) {
    return { error: 'Server missing Supabase configuration', code: 'NOT_CONFIGURED' };
  }

  if (config.SUPABASE_ANON_KEY) {
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    /** Hay que pasar el JWT explícito: sin sesión local, `getUser()` sin args no valida el header. */
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return { error: 'Invalid or expired session', code: 'INVALID_TOKEN' };
    }
    return { user: data.user };
  }

  if (!config.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: 'Set SUPABASE_ANON_KEY in apps/api/.env (same as VITE_SUPABASE_ANON_KEY)',
      code: 'NOT_CONFIGURED',
    };
  }

  const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return { error: 'Invalid or expired session', code: 'INVALID_TOKEN' };
  }
  return { user: userData.user };
}
