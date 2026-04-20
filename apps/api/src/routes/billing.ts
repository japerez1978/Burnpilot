import { Router } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { z } from 'zod';
import { loadConfig } from '../utils/config';
import { getBearerUser } from '../utils/authBearer';
import { log } from '../utils/logger';

const config = loadConfig();

export const billingRouter = Router();

function requireStripe(): Stripe | null {
  if (!config.STRIPE_SECRET_KEY) return null;
  return new Stripe(config.STRIPE_SECRET_KEY);
}

const checkoutBodySchema = z.object({
  interval: z.enum(['month', 'year']),
});

/** Asegura fila en subscriptions_billing y customer en Stripe. */
async function ensureStripeCustomer(
  stripe: Stripe,
  admin: SupabaseClient,
  userId: string,
  email: string | undefined,
): Promise<{ customerId: string } | { error: string }> {
  const { data: row } = await admin
    .from('subscriptions_billing')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  const existingId = row?.stripe_customer_id;
  if (typeof existingId === 'string' && existingId.length > 0) {
    return { customerId: existingId };
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { supabase_user_id: userId },
  });

  const { error: insErr } = await admin.from('subscriptions_billing').insert({
    user_id: userId,
    stripe_customer_id: customer.id,
    status: 'inactive',
  });
  if (insErr) {
    log('error', 'billing.ensure_customer_insert', { message: insErr.message, userId });
    return { error: insErr.message };
  }

  return { customerId: customer.id };
}

billingRouter.post('/billing/checkout-session', async (req, res) => {
  const stripe = requireStripe();
  if (!stripe) {
    res.status(503).json({ ok: false, error: 'Stripe not configured', code: 'STRIPE_DISABLED' });
    return;
  }

  const parsed = checkoutBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'Invalid body', code: 'VALIDATION' });
    return;
  }

  const priceId =
    parsed.data.interval === 'month'
      ? config.STRIPE_PRICE_ID_PRO_MONTHLY
      : config.STRIPE_PRICE_ID_PRO_YEARLY;
  if (!priceId) {
    res.status(503).json({ ok: false, error: 'Missing price id in env', code: 'MISSING_PRICE' });
    return;
  }

  const auth = await getBearerUser(config, req.headers.authorization);
  if ('error' in auth) {
    res.status(401).json({ ok: false, error: auth.error, code: auth.code });
    return;
  }

  const admin = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ensured = await ensureStripeCustomer(stripe, admin, auth.user.id, auth.user.email);
  if ('error' in ensured) {
    res.status(500).json({ ok: false, error: ensured.error, code: 'CUSTOMER_FAILED' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: ensured.customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.APP_URL.replace(/\/$/, '')}/settings/billing?checkout=success`,
      cancel_url: `${config.APP_URL.replace(/\/$/, '')}/settings/billing?checkout=cancel`,
      metadata: { supabase_user_id: auth.user.id },
      subscription_data: {
        metadata: { supabase_user_id: auth.user.id },
      },
      allow_promotion_codes: true,
    });

    res.json({ ok: true, data: { url: session.url } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Checkout failed';
    log('error', 'billing.checkout_session', { message: msg, userId: auth.user.id });
    res.status(500).json({ ok: false, error: msg, code: 'STRIPE_ERROR' });
  }
});

billingRouter.post('/billing/lifetime-checkout', async (req, res) => {
  const stripe = requireStripe();
  if (!stripe) {
    res.status(503).json({ ok: false, error: 'Stripe not configured', code: 'STRIPE_DISABLED' });
    return;
  }

  if (!config.STRIPE_PRICE_ID_LIFETIME) {
    res.status(503).json({ ok: false, error: 'Missing lifetime price id', code: 'MISSING_PRICE' });
    return;
  }

  const auth = await getBearerUser(config, req.headers.authorization);
  if ('error' in auth) {
    res.status(401).json({ ok: false, error: auth.error, code: auth.code });
    return;
  }

  const admin = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ensured = await ensureStripeCustomer(stripe, admin, auth.user.id, auth.user.email);
  if ('error' in ensured) {
    res.status(500).json({ ok: false, error: ensured.error, code: 'CUSTOMER_FAILED' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: ensured.customerId,
      line_items: [{ price: config.STRIPE_PRICE_ID_LIFETIME, quantity: 1 }],
      success_url: `${config.APP_URL.replace(/\/$/, '')}/settings/billing?checkout=success`,
      cancel_url: `${config.APP_URL.replace(/\/$/, '')}/settings/billing?checkout=cancel`,
      metadata: { supabase_user_id: auth.user.id, kind: 'lifetime' },
    });

    res.json({ ok: true, data: { url: session.url } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Checkout failed';
    log('error', 'billing.lifetime_checkout', { message: msg, userId: auth.user.id });
    res.status(500).json({ ok: false, error: msg, code: 'STRIPE_ERROR' });
  }
});

billingRouter.post('/billing/portal-session', async (req, res) => {
  const stripe = requireStripe();
  if (!stripe) {
    res.status(503).json({ ok: false, error: 'Stripe not configured', code: 'STRIPE_DISABLED' });
    return;
  }

  const auth = await getBearerUser(config, req.headers.authorization);
  if ('error' in auth) {
    res.status(401).json({ ok: false, error: auth.error, code: auth.code });
    return;
  }

  const admin = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row } = await admin
    .from('subscriptions_billing')
    .select('stripe_customer_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (!row?.stripe_customer_id) {
    res.status(400).json({
      ok: false,
      error: 'No hay cliente de facturación. Contrata Pro primero.',
      code: 'NO_CUSTOMER',
    });
    return;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${config.APP_URL.replace(/\/$/, '')}/settings/billing`,
    });
    res.json({ ok: true, data: { url: session.url } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Portal failed';
    log('error', 'billing.portal_session', { message: msg, userId: auth.user.id });
    res.status(500).json({ ok: false, error: msg, code: 'STRIPE_ERROR' });
  }
});
