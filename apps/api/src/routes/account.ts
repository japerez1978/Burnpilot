import { Router } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadConfig } from '../utils/config';
import { log } from '../utils/logger';

const config = loadConfig();

export const accountRouter = Router();

/**
 * Borra datos en public.* antes de auth.admin.deleteUser.
 * Evita fallos tipo "Database error deleting user" cuando la cascada o triggers en Auth fallan.
 */
async function purgePublicUserData(admin: SupabaseClient, userId: string): Promise<Error | null> {
  const { error: toolsErr } = await admin.from('tools').delete().eq('user_id', userId);
  if (toolsErr) return new Error(toolsErr.message);

  const { error: projectsErr } = await admin.from('projects').delete().eq('user_id', userId);
  if (projectsErr) return new Error(projectsErr.message);

  const { error: profileErr } = await admin.from('profiles').delete().eq('id', userId);
  if (profileErr) return new Error(profileErr.message);

  return null;
}

/** Borra datos públicos y el usuario en Auth. Requiere service role. */
accountRouter.delete('/account', async (req, res) => {
  const raw = req.headers.authorization;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ ok: false, error: 'Missing bearer token', code: 'NO_TOKEN' });
    return;
  }

  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({
      ok: false,
      error: 'Server missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
      code: 'NOT_CONFIGURED',
    });
    return;
  }

  const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    res.status(401).json({ ok: false, error: 'Invalid or expired session', code: 'INVALID_TOKEN' });
    return;
  }

  const userId = userData.user.id;

  const purgeErr = await purgePublicUserData(admin, userId);
  if (purgeErr) {
    log('error', 'account.purge_failed', { message: purgeErr.message, userId });
    res.status(500).json({ ok: false, error: purgeErr.message, code: 'PURGE_FAILED' });
    return;
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    log('error', 'account.delete_failed', { message: delErr.message, userId });
    res.status(500).json({ ok: false, error: delErr.message, code: 'DELETE_FAILED' });
    return;
  }

  log('info', 'account.deleted', { userId });
  res.status(204).send();
});
