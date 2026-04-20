import { Router } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getBearerUser } from '../utils/authBearer';
import { loadConfig } from '../utils/config';
import { log } from '../utils/logger';

const config = loadConfig();

export const accountRouter = Router();

/**
 * Borra datos en public.* antes de auth.admin.deleteUser.
 * Evita fallos tipo "Database error deleting user" cuando la cascada o triggers en Auth fallan.
 */
async function purgePublicUserData(admin: SupabaseClient, userId: string): Promise<Error | null> {
  const { data: billRow } = await admin
    .from('subscriptions_billing')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (config.STRIPE_SECRET_KEY && billRow?.stripe_customer_id) {
    try {
      const stripe = new Stripe(config.STRIPE_SECRET_KEY);
      await stripe.customers.del(billRow.stripe_customer_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log('warn', 'account.stripe_customer_delete', { message: msg, userId });
    }
  }

  const { error: billErr } = await admin.from('subscriptions_billing').delete().eq('user_id', userId);
  if (billErr) return new Error(billErr.message);

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
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({
      ok: false,
      error: 'Server missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
      code: 'NOT_CONFIGURED',
    });
    return;
  }

  const auth = await getBearerUser(config, req.headers.authorization);
  if ('error' in auth) {
    const status = auth.code === 'NO_TOKEN' ? 401 : auth.code === 'NOT_CONFIGURED' ? 503 : 401;
    res.status(status).json({ ok: false, error: auth.error, code: auth.code });
    return;
  }

  const userId = auth.user.id;

  const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
