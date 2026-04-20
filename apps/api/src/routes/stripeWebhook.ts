import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { loadConfig } from '../utils/config';
import { log } from '../utils/logger';

const config = loadConfig();

export const stripeWebhookRouter = Router();

function adminClient() {
  return createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function stripeClient(): Stripe | null {
  if (!config.STRIPE_SECRET_KEY) return null;
  return new Stripe(config.STRIPE_SECRET_KEY);
}

async function resolveUserIdForSubscription(
  admin: ReturnType<typeof adminClient>,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const meta = sub.metadata?.supabase_user_id;
  if (meta) return meta;
  const cid = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (!cid) return null;
  const { data } = await admin
    .from('subscriptions_billing')
    .select('user_id')
    .eq('stripe_customer_id', cid)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function syncSubscription(
  stripe: Stripe,
  admin: ReturnType<typeof adminClient>,
  sub: Stripe.Subscription,
): Promise<void> {
  const userId = await resolveUserIdForSubscription(admin, sub);
  if (!userId) {
    log('warn', 'stripe.sync_subscription.no_user', { subscriptionId: sub.id });
    return;
  }

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (!customerId) return;

  const priceId = sub.items.data[0]?.price?.id ?? null;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  const { error: upsertErr } = await admin.from('subscriptions_billing').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: priceId,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
    { onConflict: 'user_id' },
  );
  if (upsertErr) {
    log('error', 'stripe.sync_subscription.upsert', { message: upsertErr.message });
    throw new Error(upsertErr.message);
  }

  const { data: prof } = await admin.from('profiles').select('plan_tier').eq('id', userId).single();
  if (prof?.plan_tier === 'lifetime') {
    return;
  }

  const proLike = ['active', 'trialing', 'past_due'].includes(sub.status);
  const nextTier = proLike ? 'pro' : 'free';
  const { error: pErr } = await admin.from('profiles').update({ plan_tier: nextTier }).eq('id', userId);
  if (pErr) {
    log('error', 'stripe.sync_subscription.profile', { message: pErr.message });
    throw new Error(pErr.message);
  }
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  admin: ReturnType<typeof adminClient>,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode === 'payment' && session.metadata?.kind === 'lifetime') {
    const userId = session.metadata?.supabase_user_id;
    if (!userId) return;
    const { error } = await admin.from('profiles').update({ plan_tier: 'lifetime' }).eq('id', userId);
    if (error) throw new Error(error.message);
    return;
  }

  if (session.mode === 'subscription' && session.subscription) {
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    await syncSubscription(stripe, admin, sub);
  }
}

stripeWebhookRouter.post('/', async (req, res) => {
  const stripe = stripeClient();
  const secret = config.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    res.status(503).json({ ok: false, error: 'Webhook not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).json({ ok: false, error: 'Missing stripe-signature' });
    return;
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ ok: false, error: 'Expected raw body' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid signature';
    log('warn', 'stripe.webhook.signature', { message: msg });
    res.status(400).json({ ok: false, error: msg });
    return;
  }

  const admin = adminClient();

  const { error: insErr } = await admin.from('stripe_events').insert({
    id: event.id,
    type: event.type,
  });
  if (insErr) {
    if (insErr.code === '23505') {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }
    log('error', 'stripe.webhook.insert_event', { message: insErr.message });
    res.status(500).json({ ok: false });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutSessionCompleted(
          stripe,
          admin,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(stripe, admin, event.data.object as Stripe.Subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(stripe, admin, sub);
        break;
      }
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const subId =
          typeof inv.subscription === 'string'
            ? inv.subscription
            : inv.subscription?.id ?? null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(stripe, admin, sub);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const subId =
          typeof inv.subscription === 'string'
            ? inv.subscription
            : inv.subscription?.id ?? null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(stripe, admin, sub);
        }
        break;
      }
      default:
        log('info', 'stripe.webhook.unhandled', { type: event.type });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Handler error';
    log('error', 'stripe.webhook.handler', { message: msg, type: event.type });
    await admin.from('stripe_events').delete().eq('id', event.id);
    res.status(500).json({ ok: false, error: msg });
  }
});
